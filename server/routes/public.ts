import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { execute, select, selectOne } from '@/lib/db';
import { mailer } from '@/lib/mailer';
import { Message } from '@/lib/models/message';
import { ApiKey } from '@/lib/models/api-key';
import { ApiMessage, type ApiMessageInput } from '@/lib/models/api-message';
import { getActiveBioLinks, getAnnouncementsFor, getSettings } from '@/lib/site';
import { EMAIL_REGEX, CSRF_COOKIE, hmac, newCsrfSeed, parseCookieHeader, safeEqual } from '@/lib/security';
import { expiryFromHours, generateUniqueCode, validateShortUrl } from '@/lib/shortener';
import { GLEBINA, getTop5, signOwner, signToken, validateNick, verifyOwnerCookie, verifyToken } from '@/lib/glebina';
import { secureCookies } from '@/lib/auth/constants';
import { describeError } from '@/lib/errors';
import { csrfSeed, issueCsrfToken, limits, str, validateOrigin, verifyCsrf } from '@/server/middleware';

export const publicRouter = Router();

async function verifyHCaptcha(token: string): Promise<boolean> {
    try {
        const response = await fetch('https://hcaptcha.com/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret: process.env.HCAPTCHA_SECRET || '', response: token }),
            signal: AbortSignal.timeout(10000)
        });
        const data = (await response.json()) as { success: boolean; 'error-codes'?: string[] };
        if (!data.success) console.warn('[SECURITY] hCaptcha verification failed:', data['error-codes'] || data);
        return data.success === true;
    } catch (error) {
        console.error('hCaptcha verification error:', describeError(error));
        return false;
    }
}

publicRouter.get('/csrf-token', issueCsrfToken);

// ---------- Formularz kontaktowy ----------

publicRouter.post('/contact', limits.contact, validateOrigin, verifyCsrf, async (req: Request, res: Response) => {
    try {
        const name = str(req.body.name).trim();
        const email = str(req.body.email).trim();
        const subject = str(req.body.subject).trim();
        const message = str(req.body.message).trim();
        const hcaptchaToken = str(req.body.hcaptchaToken);
        const ip = req.realIP;

        if (await Message.isIPBanned(ip)) {
            res.status(403).json({ message: 'Twój adres IP został zablokowany za spam lub nadużycia.' });
            return;
        }
        if (!name || !email || !subject || !message) {
            res.status(400).json({ message: 'Uzupełnij wszystkie pola.' });
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            res.status(400).json({ message: 'Sprawdź adres email, wygląda na niepełny.' });
            return;
        }
        if (name.length > 255 || email.length > 255 || subject.length > 255 || message.length > 5000) {
            res.status(400).json({ message: 'Wiadomość jest za długa (treść do 5000 znaków).' });
            return;
        }
        if (!hcaptchaToken) {
            res.status(400).json({ message: 'Zaznacz weryfikację hCaptcha pod formularzem.' });
            return;
        }
        if (!(await verifyHCaptcha(hcaptchaToken))) {
            res.status(400).json({ message: 'Weryfikacja hCaptcha nie przeszła. Zaznacz ją jeszcze raz.' });
            return;
        }

        const id = await Message.create({ name, email, subject, message, ip_address: ip });
        await mailer.sendNewMessageNotification({ name, email, subject, message, ip });

        res.status(200).json({ message: 'Wiadomość wysłana. Odpowiem na podany adres email.', id });
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({ message: 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.' });
    }
});

// ---------- Dane dla strony ----------

publicRouter.get('/announcements', async (req, res) => {
    const page = str(req.query.page).trim().substring(0, 100);
    res.json({ announcements: await getAnnouncementsFor(page) });
});

publicRouter.get('/site-settings', async (_req, res) => {
    res.json({ settings: await getSettings() });
});

publicRouter.get('/bio-links', async (_req, res) => {
    res.json({ links: await getActiveBioLinks() });
});

publicRouter.post('/bio-links/:id/click', limits.bioLinkClick, async (req, res) => {
    try {
        const id = parseInt(String(req.params.id), 10);
        if (!id || id <= 0) {
            res.status(400).json({ ok: false });
            return;
        }
        await execute('UPDATE bio_links SET click_count = click_count + 1 WHERE id = ? AND is_active = 1', [id]);
        res.json({ ok: true });
    } catch (error) {
        console.error('Error tracking bio link click:', error);
        res.status(500).json({ ok: false });
    }
});

// ---------- Publiczne API formularza (dla zewnętrznych stron) ----------

function allowAnyOrigin(res: Response, methods: string): void {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', methods);
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

publicRouter.options(['/v1/contact', '/v1/contact/config'], (req, res) => {
    allowAnyOrigin(res, req.path.endsWith('config') ? 'GET, OPTIONS' : 'POST, OPTIONS');
    res.header('Access-Control-Max-Age', '86400');
    res.status(204).send();
});

publicRouter.get('/v1/contact/config', async (req, res) => {
    allowAnyOrigin(res, 'GET');
    try {
        const apiKeyValue = req.get('x-api-key') || str(req.query.apiKey);
        if (!apiKeyValue) {
            res.status(401).json({ message: 'Brak klucza API. Dodaj nagłówek X-API-Key.' });
            return;
        }
        const apiKey = await ApiKey.findByKey(apiKeyValue);
        if (!apiKey) {
            res.status(401).json({ message: 'Nieprawidłowy lub nieaktywny klucz API.' });
            return;
        }
        const fields = {
            name: !!apiKey.collect_name,
            email: !!apiKey.collect_email,
            phone: !!apiKey.collect_phone,
            subject: !!apiKey.collect_subject,
            message: !!apiKey.collect_message
        };
        res.json({ keyName: apiKey.name, requiredFields: fields, allowedFields: fields });
    } catch (error) {
        console.error('Error fetching API contact config:', error);
        res.status(500).json({ message: 'Wystąpił błąd podczas pobierania konfiguracji.' });
    }
});

const COLLECT = {
    name: 'collect_name',
    email: 'collect_email',
    phone: 'collect_phone',
    subject: 'collect_subject',
    message: 'collect_message'
} as const;

const API_FIELDS: { key: keyof typeof COLLECT; required: string; max: number }[] = [
    { key: 'name', required: 'Pole "name" (imię lub nick) jest wymagane.', max: 255 },
    { key: 'email', required: 'Pole "email" jest wymagane.', max: 255 },
    { key: 'phone', required: 'Pole "phone" (telefon) jest wymagane.', max: 50 },
    { key: 'subject', required: 'Pole "subject" (tytuł) jest wymagane.', max: 255 },
    { key: 'message', required: 'Pole "message" (treść) jest wymagane.', max: 5000 }
];

publicRouter.post('/v1/contact', limits.apiContact, limits.apiKeyContact, async (req, res) => {
    allowAnyOrigin(res, 'POST');
    try {
        const apiKeyValue = req.get('x-api-key') || str(req.body.apiKey);
        const ip = req.realIP;

        if (!apiKeyValue) {
            res.status(401).json({ message: 'Brak klucza API. Dodaj nagłówek X-API-Key.' });
            return;
        }
        const apiKey = await ApiKey.findByKey(apiKeyValue);
        if (!apiKey) {
            res.status(401).json({ message: 'Nieprawidłowy lub nieaktywny klucz API.' });
            return;
        }
        if ((await ApiMessage.isIPBannedForKey(ip, apiKey.id)) || (await Message.isIPBanned(ip))) {
            res.status(403).json({ message: 'Twoje IP zostało zablokowane.' });
            return;
        }

        const data: ApiMessageInput = { api_key_id: apiKey.id, ip_address: ip };
        for (const field of API_FIELDS) {
            if (!apiKey[COLLECT[field.key]]) continue;
            const value = str(req.body[field.key]).trim();
            if (!value) {
                res.status(400).json({ message: field.required });
                return;
            }
            if (field.key === 'email' && !EMAIL_REGEX.test(value)) {
                res.status(400).json({ message: 'Nieprawidłowy format email.' });
                return;
            }
            data[field.key] = value.substring(0, field.max);
        }

        const id = await ApiMessage.create(data);
        if (apiKey.notification_email) {
            await mailer.sendApiMessageNotification(data, apiKey.notification_email, apiKey.name);
        }
        res.json({ message: 'Wiadomość została wysłana pomyślnie!', id });
    } catch (error) {
        console.error('Error processing API contact:', error);
        res.status(500).json({ message: 'Wystąpił błąd podczas wysyłania wiadomości.' });
    }
});

// ---------- Skracacz linków (publiczny) ----------
// Formularz dostaje jednorazowy nonce podpisany sekretem serwera i związany
// z ciasteczkiem CSRF przeglądarki. Nonce musi mieć co najmniej 1,2 s
// (boty wysyłają formularz natychmiast) i najwyżej 2 godziny.

const NONCE_MIN_AGE_MS = 1200;
const NONCE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const usedNonces = new Map<string, number>();

function issueNonce(seed: string): string {
    const ts = Date.now().toString(36);
    const rand = crypto.randomBytes(8).toString('hex');
    return `${ts}.${rand}.${hmac(`url:${ts}.${rand}.${seed}`)}`;
}

function checkNonce(nonce: string, seed: string | null): 'ok' | 'invalid' | 'too_fast' {
    const [ts, rand, sig] = nonce.split('.');
    if (!seed || !ts || !rand || !sig || !safeEqual(hmac(`url:${ts}.${rand}.${seed}`), sig)) return 'invalid';
    const age = Date.now() - parseInt(ts, 36);
    if (!Number.isFinite(age) || age > NONCE_MAX_AGE_MS || usedNonces.has(nonce)) return 'invalid';
    if (age < NONCE_MIN_AGE_MS) return 'too_fast';

    const now = Date.now();
    for (const [key, expires] of usedNonces) if (expires < now) usedNonces.delete(key);
    usedNonces.set(nonce, now + NONCE_MAX_AGE_MS);
    return 'ok';
}

publicRouter.get('/url/nonce', limits.publicResource, (req, res) => {
    let seed = csrfSeed(req);
    if (!seed || !/^[a-f0-9]{64}$/.test(seed)) {
        seed = newCsrfSeed();
        res.cookie(CSRF_COOKIE, seed, { httpOnly: true, sameSite: 'lax', secure: secureCookies(req.protocol), path: '/' });
    }
    res.set('Cache-Control', 'no-store');
    res.json({ nonce: issueNonce(seed) });
});

publicRouter.post('/url/shorten', limits.shortenerCreate, validateOrigin, async (req, res) => {
    try {
        const website = str(req.body.website);
        const nonce = str(req.body.nonce);
        const seed = csrfSeed(req);

        // Pole-pułapka niewidoczne dla ludzi: wypełniają je tylko boty.
        if (website.trim()) {
            res.status(400).json({ message: 'Nieprawidłowe żądanie.' });
            return;
        }

        const nonceState = nonce ? checkNonce(nonce, seed) : 'invalid';
        if (nonceState === 'invalid') {
            res.status(403).json({ message: 'Formularz wygasł. Odśwież stronę i spróbuj ponownie.', newNonce: seed ? issueNonce(seed) : undefined });
            return;
        }
        if (nonceState === 'too_fast') {
            res.status(429).json({ message: 'Za szybko. Poczekaj sekundę i kliknij jeszcze raz.' });
            return;
        }
        const newNonce = issueNonce(seed as string);

        const validation = validateShortUrl(req.body.url, req.realIP);
        if (!validation.ok) {
            res.status(400).json({ message: validation.message, newNonce });
            return;
        }

        const expiry = expiryFromHours(req.body.expires_hours, true);
        if (!expiry.ok) {
            res.status(400).json({ message: 'Nieprawidłowy czas wygaśnięcia.', newNonce });
            return;
        }

        const rawHost = req.get('host') || '';
        if (!/^[a-zA-Z0-9.\-:[\]]+$/.test(rawHost)) {
            console.warn(`[SECURITY] Suspicious Host header rejected in shortener - IP: ${req.realIP}`);
            res.status(400).json({ message: 'Nieprawidłowe żądanie.' });
            return;
        }

        const normalizedUrl = validation.normalizedUrl.substring(0, 2048);
        const existing = await selectOne<{ code: string }>(
            `SELECT code FROM short_urls
             WHERE original_url = ? AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY created_at DESC LIMIT 1`,
            [normalizedUrl]
        );

        let code: string;
        if (existing) {
            code = existing.code;
        } else {
            code = await generateUniqueCode('short_urls');
            await execute('INSERT INTO short_urls (code, original_url, expires_at) VALUES (?, ?, ?)', [code, normalizedUrl, expiry.expiresAt]);
        }

        const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        res.status(existing ? 200 : 201).json({
            message: existing ? 'Ten adres był już skrócony, oto istniejący link.' : 'Gotowe, link jest skrócony.',
            code,
            shortUrl: `${protocol}://${rawHost}/url/${code}`,
            existing: !!existing,
            newNonce
        });
    } catch (error) {
        console.error('Public shortener create error:', error);
        res.status(500).json({ message: 'Nie udało się skrócić linku. Spróbuj ponownie za chwilę.' });
    }
});

// ---------- Głębina: ranking ----------
// W tabeli jest zawsze najwyżej 5 wierszy i jeden wpis na nick. Jedno IP
// trzyma najwyżej GLEBINA.MAX_ENTRIES_PER_IP wpisów i tylko kilka razy na
// tydzień może dodać zupełnie nowy. Ciasteczko wiąże przeglądarkę z nickiem.

function setOwnerCookie(res: Response, nick: string): void {
    res.cookie(GLEBINA.OWNER_COOKIE, signOwner(nick), {
        maxAge: GLEBINA.OWNER_COOKIE_MAX_AGE_MS,
        sameSite: 'lax',
        secure: secureCookies(res.req.protocol),
        path: '/'
    });
}

const TRIM_TO_TOP5 = `DELETE FROM glebina_scores WHERE id NOT IN (
    SELECT id FROM (SELECT id FROM glebina_scores ORDER BY score DESC, created_at ASC LIMIT 5) t
)`;

publicRouter.get('/glebina/token', limits.glebinaToken, (_req, res) => {
    res.json({ token: signToken() });
});

publicRouter.get('/glebina/leaderboard', limits.publicResource, async (_req, res) => {
    try {
        const leaderboard = await getTop5();
        const fifthPlaceScore = leaderboard.length >= 5 ? leaderboard[leaderboard.length - 1].score : null;
        res.json({ leaderboard, fifthPlaceScore });
    } catch (error) {
        console.error('Error fetching glebina leaderboard:', error);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

publicRouter.post('/glebina/score', limits.glebinaScore, validateOrigin, async (req, res) => {
    try {
        const tokenInfo = verifyToken(req.body?.token);
        if (!tokenInfo) {
            res.status(400).json({ ok: false, message: 'Nieprawidłowa lub wygasła sesja gry. Zanurz się ponownie.' });
            return;
        }

        const nick = validateNick(req.body?.nick);
        if (!nick) {
            res.status(400).json({ ok: false, message: 'Nieprawidłowy nick (2-16 znaków: litery, cyfry, spacja, _ lub -).' });
            return;
        }

        const ownerNick = verifyOwnerCookie(parseCookieHeader(req.headers.cookie, GLEBINA.OWNER_COOKIE));
        if (ownerNick && ownerNick !== nick) {
            res.status(403).json({
                ok: false,
                qualified: false,
                message: `Na tym urządzeniu masz już zapisany nick "${ownerNick}" i możesz aktualizować tylko jego wynik. Inny nick wymaga innej przeglądarki lub urządzenia.`
            });
            return;
        }

        const score = Math.floor(Number(req.body?.score));
        if (!Number.isFinite(score) || score <= 0 || score > GLEBINA.HARD_CAP) {
            res.status(400).json({ ok: false, message: 'Nieprawidłowy wynik.' });
            return;
        }

        const maxPlausible = Math.floor((tokenInfo.age / 1000) * GLEBINA.MAX_M_PER_S) + GLEBINA.SCORE_BUFFER;
        if (score > maxPlausible) {
            console.warn(`[SECURITY] Głębina: odrzucony wynik ${score} m w ${Math.floor(tokenInfo.age / 1000)} s - IP: ${req.realIP}`);
            res.status(400).json({ ok: false, message: 'Wynik odrzucony jako nieprawdopodobny dla czasu trwania zanurzenia.' });
            return;
        }

        const ip = req.realIP;
        const nickRow = await selectOne<{ id: number; score: number }>('SELECT id, score FROM glebina_scores WHERE nick = ?', [nick]);
        const ipRows = await select<{ id: number }>('SELECT id FROM glebina_scores WHERE ip_address = ?', [ip]);
        const otherIpRows = nickRow ? ipRows.filter(row => row.id !== nickRow.id) : ipRows;
        const ipHasFreeSlot = otherIpRows.length < GLEBINA.MAX_ENTRIES_PER_IP;

        if (nickRow) {
            if (score <= nickRow.score) {
                res.status(400).json({
                    ok: false,
                    qualified: false,
                    message: `Masz już wynik ${nickRow.score} m jako "${nick}" w rankingu, ten go nie poprawia.`
                });
                return;
            }
            if (!ipHasFreeSlot) {
                res.status(400).json({
                    ok: false,
                    qualified: false,
                    message: `Z tego adresu IP masz już ${GLEBINA.MAX_ENTRIES_PER_IP} inne wpisy w rankingu, to limit na jedno IP.`
                });
                return;
            }
            await execute('UPDATE glebina_scores SET score = ?, ip_address = ?, created_at = NOW() WHERE id = ?', [score, ip, nickRow.id]);
            await execute(TRIM_TO_TOP5);
            setOwnerCookie(res, nick);
            res.json({ ok: true, qualified: true, leaderboard: await getTop5() });
            return;
        }

        if (!ipHasFreeSlot) {
            res.status(400).json({
                ok: false,
                qualified: false,
                message: `Z tego adresu IP masz już ${GLEBINA.MAX_ENTRIES_PER_IP} wpisy w rankingu (limit na adres). Zaktualizuj jeden z nich, podając jego nick.`
            });
            return;
        }

        const throttle = await selectOne<{ attempts_in_window: number; window_started_at: Date }>(
            'SELECT attempts_in_window, window_started_at FROM glebina_ip_throttle WHERE ip_address = ?',
            [ip]
        );
        const windowExpired = !throttle || Date.now() - new Date(throttle.window_started_at).getTime() >= GLEBINA.NEW_ENTRY_WINDOW_MS;
        if (!windowExpired && throttle.attempts_in_window >= GLEBINA.NEW_ENTRIES_PER_WINDOW) {
            // Celowo bez szczegółów limitu: to zabezpieczenie, nie funkcja dla gracza.
            res.status(429).json({ ok: false, qualified: false, message: 'Nie udało się zapisać wyniku.' });
            return;
        }

        const stats = await selectOne<{ c: number; low: number | null }>('SELECT COUNT(*) AS c, MIN(score) AS low FROM glebina_scores');
        const count = Number(stats?.c ?? 0);
        const low = Number(stats?.low ?? 0);
        if (count >= 5 && score <= low) {
            res.json({ ok: false, qualified: false, message: `To za mało na TOP 5 (potrzeba więcej niż ${low} m).`, fifthPlaceScore: low });
            return;
        }

        await execute('INSERT INTO glebina_scores (nick, score, ip_address, created_at) VALUES (?, ?, ?, NOW())', [nick, score, ip]);
        await execute(TRIM_TO_TOP5);
        if (windowExpired) {
            await execute(
                'INSERT INTO glebina_ip_throttle (ip_address, attempts_in_window, window_started_at) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE attempts_in_window = 1, window_started_at = NOW()',
                [ip]
            );
        } else {
            await execute('UPDATE glebina_ip_throttle SET attempts_in_window = attempts_in_window + 1 WHERE ip_address = ?', [ip]);
        }

        setOwnerCookie(res, nick);
        res.json({ ok: true, qualified: true, leaderboard: await getTop5() });
    } catch (error) {
        console.error('Error saving glebina score:', error);
        res.status(500).json({ ok: false, message: 'Błąd serwera' });
    }
});
