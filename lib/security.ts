import crypto from 'node:crypto';
import { execute, selectOne } from '@/lib/db';

/**
 * Wspólny sekret do podpisów (sesje Auth.js, CSRF, nonce skracacza).
 * AUTH_SECRET to nazwa używana przez Auth.js, SESSION_SECRET zostaje dla
 * zgodności ze starym .env. Bez żadnego z nich generujemy losowy sekret,
 * co działa, ale wylogowuje wszystkich przy każdym restarcie.
 */
const globalForSecret = globalThis as typeof globalThis & { __wojtotekaSecret?: string };

export function appSecret(): string {
    const fromEnv = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
    if (fromEnv && fromEnv !== 'change-this-secret-key') return fromEnv;
    if (!globalForSecret.__wojtotekaSecret) {
        console.warn('[SECURITY] Brak AUTH_SECRET w .env. Używam losowego sekretu, sesje nie przetrwają restartu.');
        globalForSecret.__wojtotekaSecret = crypto.randomBytes(32).toString('hex');
    }
    return globalForSecret.__wojtotekaSecret;
}

export function hmac(value: string, secret = appSecret()): string {
    return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Adres IP pochodzi z nagłówków, które klient może ustawić sam. Zostawiamy
 * tylko znaki występujące w adresach IPv4/IPv6, więc żaden ładunek
 * (cudzysłowy, <, >, spacje) nie trafi do bazy, logów, maili ani panelu.
 */
export function sanitizeIp(value: unknown): string {
    if (!value) return 'unknown';
    const cleaned = String(value).replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45);
    return cleaned || 'unknown';
}

/** Nagłówek, którym Express przekazuje do Next.js już ustalony adres klienta. */
export const CLIENT_IP_HEADER = 'x-wojtoteka-client-ip';

export function parseCookieHeader(header: string | undefined | null, name: string): string | null {
    if (!header) return null;
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq).trim() === name) {
            try {
                return decodeURIComponent(part.slice(eq + 1).trim());
            } catch {
                return null;
            }
        }
    }
    return null;
}

// ---------- CSRF (podpisane podwójne ciasteczko) ----------
// Przeglądarka dostaje losowe ciasteczko httpOnly, a skrypt strony pobiera
// z /api/csrf-token jego podpis HMAC. Serwer sprawdza, czy nagłówek
// X-CSRF-Token to podpis ciasteczka. Obca strona nie przeczyta ani ciasteczka,
// ani odpowiedzi z /api/csrf-token, więc nie podrobi nagłówka.

export const CSRF_COOKIE = 'wt.csrf';

export function newCsrfSeed(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function csrfTokenFor(seed: string): string {
    return hmac(`csrf:${seed}`);
}

export function isValidCsrf(seed: string | null, token: unknown): boolean {
    if (!seed || typeof token !== 'string' || token.length !== 64) return false;
    return safeEqual(csrfTokenFor(seed), token);
}

// ---------- Próby logowania ----------

export type AccountType = 'admin' | 'sub_account';

export async function trackLoginAttempt(
    accountType: AccountType,
    identifier: string,
    ip: string,
    userAgent: string,
    success: boolean
): Promise<void> {
    try {
        await execute(
            'INSERT INTO login_attempts (account_type, account_identifier, ip_address, user_agent, was_successful) VALUES (?, ?, ?, ?, ?)',
            [accountType, identifier.slice(0, 255), ip, userAgent, success ? 1 : 0]
        );
    } catch (error) {
        console.error('Error tracking login attempt:', error);
    }
}

/** Nieudane próby na dane konto w ostatnich 15 minutach. */
export async function failedAttemptsForAccount(accountType: AccountType, identifier: string): Promise<number> {
    try {
        const row = await selectOne<{ attempts: number }>(
            `SELECT COUNT(*) AS attempts FROM login_attempts
             WHERE account_type = ? AND account_identifier = ? AND was_successful = 0
             AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
            [accountType, identifier]
        );
        return Number(row?.attempts ?? 0);
    } catch {
        return 0;
    }
}

/** Nieudane próby z danego IP w ostatnich 15 minutach (zastępuje limiter logowania). */
export async function failedAttemptsFromIp(accountType: AccountType, ip: string): Promise<number> {
    try {
        const row = await selectOne<{ attempts: number }>(
            `SELECT COUNT(*) AS attempts FROM login_attempts
             WHERE account_type = ? AND ip_address = ? AND was_successful = 0
             AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
            [accountType, ip]
        );
        return Number(row?.attempts ?? 0);
    } catch {
        return 0;
    }
}

export async function getIPInfo(ip: string): Promise<{ location: string; isp: string }> {
    const cleanIP = ip.replace('::ffff:', '');
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost') {
        return { location: 'Localhost', isp: 'Local' };
    }
    try {
        const response = await fetch(
            `http://ip-api.com/json/${encodeURIComponent(cleanIP)}?fields=status,country,regionName,city,isp,org`,
            { signal: AbortSignal.timeout(5000) }
        );
        const data = (await response.json()) as Record<string, string>;
        if (data.status === 'success') {
            return {
                location: [data.city, data.regionName, data.country].filter(Boolean).join(', ') || 'Nieznana',
                isp: data.isp || data.org || 'Nieznany'
            };
        }
    } catch {
        // brak sieci albo limit ip-api: alert i tak wychodzi, tylko bez lokalizacji
    }
    return { location: 'Nieznana', isp: 'Nieznany' };
}

/** Stała zwłoka przy błędnym logowaniu: ten sam czas dla złego loginu i złego hasła. */
export function loginDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
}

export function randomPassword(): string {
    // 12 znaków alfanumerycznych, bez znaków, które trudno przepisać z maila
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 12; i++) out += chars[crypto.randomInt(chars.length)];
    return out;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
