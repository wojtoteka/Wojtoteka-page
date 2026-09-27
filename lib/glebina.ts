import crypto from 'node:crypto';
import { select } from '@/lib/db';
import { appSecret } from '@/lib/security';

// Anty-cheat rankingu gry Głębina (OSTATNI ODDECH).
// Token = <znacznikCzasu>.<HMAC>, podpisany sekretem serwera. Nie wymaga stanu
// po stronie serwera, a jego wiek ogranicza, jak duży wynik da się uczciwie
// osiągnąć w danym czasie gry.

function secret(): string {
    return process.env.GLEBINA_TOKEN_SECRET || appSecret();
}

export const GLEBINA = {
    MIN_SESSION_MS: 3 * 1000,              // krócej nie da się zagrać na realny wynik
    MAX_SESSION_MS: 2 * 60 * 60 * 1000,    // długie zanurzenia nie tracą wyniku
    MAX_M_PER_S: 60,                       // fizyka gry pozwala na ok. 47 m/s
    SCORE_BUFFER: 60,                      // zapas na start zanurzenia
    HARD_CAP: 20000,                       // sufit niezależny od czasu
    MAX_ENTRIES_PER_IP: 3,                 // rodzina lub sieć publiczna dzieli adres
    NEW_ENTRY_WINDOW_MS: 7 * 24 * 60 * 60 * 1000,
    NEW_ENTRIES_PER_WINDOW: 3,
    OWNER_COOKIE: 'glebina_owner',
    OWNER_COOKIE_MAX_AGE_MS: 14 * 24 * 60 * 60 * 1000
} as const;

// Ciasteczko wiąże przeglądarkę z jednym nickiem, żeby przy wspólnym IP jedna
// osoba nie zajęła wszystkich slotów. Podpis chroni tylko przed podszyciem
// się pod cudzy nick, nie przed usunięciem ciasteczka.
export function signOwner(nick: string): string {
    const encoded = Buffer.from(nick, 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', secret()).update(encoded).digest('hex').slice(0, 32);
    return `${encoded}.${sig}`;
}

export function verifyOwnerCookie(raw: string | null): string | null {
    if (typeof raw !== 'string' || raw.length > 200) return null;
    const idx = raw.lastIndexOf('.');
    if (idx <= 0) return null;
    const encoded = raw.slice(0, idx);
    const sig = raw.slice(idx + 1);
    if (!sig || !/^[a-f0-9]+$/.test(sig)) return null;

    const expected = crypto.createHmac('sha256', secret()).update(encoded).digest('hex').slice(0, 32);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    try {
        return Buffer.from(encoded, 'base64url').toString('utf8');
    } catch {
        return null;
    }
}

export function signToken(): string {
    const ts = Date.now().toString(36);
    const mac = crypto.createHmac('sha256', secret()).update(ts).digest('hex');
    return `${ts}.${mac}`;
}

export function verifyToken(token: unknown): { age: number } | null {
    if (typeof token !== 'string' || token.length > 100) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [ts, mac] = parts;
    if (!ts || !mac || !/^[a-f0-9]+$/.test(mac)) return null;

    const expected = Buffer.from(crypto.createHmac('sha256', secret()).update(ts).digest('hex'), 'hex');
    const given = Buffer.from(mac, 'hex');
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

    const issuedAt = parseInt(ts, 36);
    if (!Number.isFinite(issuedAt)) return null;
    const age = Date.now() - issuedAt;
    if (age < GLEBINA.MIN_SESSION_MS || age > GLEBINA.MAX_SESSION_MS) return null;
    return { age };
}

export function validateNick(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const nick = raw.trim().replace(/\s+/g, ' ');
    return /^[\p{L}0-9 _-]{2,16}$/u.test(nick) ? nick : null;
}

export function getTop5() {
    return select<{ nick: string; score: number }>(
        'SELECT nick, score FROM glebina_scores ORDER BY score DESC, created_at ASC LIMIT 5'
    );
}
