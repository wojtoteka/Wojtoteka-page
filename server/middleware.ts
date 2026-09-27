import type { NextFunction, Request, Response } from 'express';
import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';
import { CSRF_COOKIE, csrfTokenFor, isValidCsrf, newCsrfSeed, parseCookieHeader } from '@/lib/security';
import { secureCookies } from '@/lib/auth/constants';

// ---------- Limity żądań ----------

// Limiter liczy po adresie ustalonym w req.realIP (patrz server/index.ts),
// a nie po req.ip, bo ruch przychodzi przez proxy.
const byRealIp: Options['keyGenerator'] = req => ipKeyGenerator(req.realIP || req.ip || 'unknown');

function limiter(windowMinutes: number, max: number, message: string, extra: Partial<Options> = {}) {
    return rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        limit: max,
        message: { message },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: byRealIp,
        ...extra
    });
}

export const limits = {
    api: limiter(15, 100, 'Zbyt wiele żądań z tego adresu IP. Spróbuj ponownie za 15 minut.'),
    authCallback: limiter(15, 30, 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.'),
    contact: limiter(60, 5, 'Wysłano już 5 wiadomości w ciągu godziny. Spróbuj ponownie później.'),
    apiContact: limiter(60, 30, 'Zbyt wiele wiadomości API. Spróbuj ponownie za godzinę.'),
    // Drugi limit liczony po samym kluczu API: ogranicza nadużycie jednego
    // wyciekłego klucza rozłożone na wiele adresów IP.
    apiKeyContact: limiter(60, 100, 'Zbyt wiele wiadomości dla tego klucza API. Spróbuj ponownie za godzinę.', {
        keyGenerator: req => String(req.headers['x-api-key'] || (req.body as Record<string, unknown>)?.apiKey || 'no-key')
    }),
    passwordReset: limiter(15, 8, 'Zbyt wiele prób resetowania hasła. Spróbuj ponownie za 15 minut.'),
    publicResource: limiter(15, 120, 'Zbyt wiele żądań. Spróbuj ponownie za 15 minut.'),
    shortenerCreate: limiter(60, 20, 'Za dużo prób skracania linków. Spróbuj ponownie za godzinę.'),
    sendEmail: limiter(60, 10, 'Zbyt wiele wysyłek. Spróbuj ponownie za godzinę.'),
    bioLinkClick: limiter(10, 30, 'Za dużo kliknięć.', {
        keyGenerator: req => `${ipKeyGenerator(req.realIP || 'unknown')}-${req.params.id}`,
        standardHeaders: false
    }),
    glebinaToken: limiter(15, 40, 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.'),
    glebinaScore: limiter(15, 10, 'Zbyt wiele prób zapisu wyniku. Spróbuj ponownie za 15 minut.')
};

// ---------- Pochodzenie żądania ----------

/** Odrzuca żądania, których Origin albo Referer wskazuje na obcą domenę. */
export function validateOrigin(req: Request, res: Response, next: NextFunction): void {
    const host = req.get('host');
    const allowed = [`https://${host}`, `http://${host}`];
    const origin = req.get('origin');
    const referer = req.get('referer');

    if (origin && !allowed.includes(origin)) {
        console.warn(`[SECURITY] Invalid origin: ${origin} - Expected: ${host} - IP: ${req.realIP}`);
        res.status(403).json({ message: 'Żądanie z obcej domeny zostało odrzucone.' });
        return;
    }

    if (referer) {
        let refererOrigin = '';
        try {
            refererOrigin = new URL(referer).origin;
        } catch {
            refererOrigin = '';
        }
        if (!allowed.includes(refererOrigin)) {
            console.warn(`[SECURITY] Invalid referer: ${referer} - Expected: ${host} - IP: ${req.realIP}`);
            res.status(403).json({ message: 'Żądanie z obcej domeny zostało odrzucone.' });
            return;
        }
    }

    next();
}

// ---------- CSRF ----------

export function csrfSeed(req: Request): string | null {
    return parseCookieHeader(req.headers.cookie, CSRF_COOKIE);
}

/** GET /api/csrf-token: ustawia ciasteczko-ziarno (jeśli go nie ma) i zwraca podpis. */
export function issueCsrfToken(req: Request, res: Response): void {
    let seed = csrfSeed(req);
    if (!seed || !/^[a-f0-9]{64}$/.test(seed)) {
        seed = newCsrfSeed();
        res.cookie(CSRF_COOKIE, seed, { httpOnly: true, sameSite: 'lax', secure: secureCookies(), path: '/' });
    }
    res.set('Cache-Control', 'no-store');
    res.json({ csrfToken: csrfTokenFor(seed) });
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
    const body = req.body as Record<string, unknown> | undefined;
    const token = req.get('x-csrf-token') || body?.csrfToken;
    if (!isValidCsrf(csrfSeed(req), token)) {
        console.warn(`[SECURITY] CSRF token mismatch - ${req.method} ${req.path} - IP: ${req.realIP}`);
        res.status(403).json({ message: 'Nieprawidłowy token CSRF. Odśwież stronę i spróbuj ponownie.' });
        return;
    }
    next();
}

// ---------- Pomocnicze ----------

/** Parsuje dodatni identyfikator z parametru trasy albo zwraca null. */
export function idParam(req: Request, name = 'id'): number | null {
    const id = Number(req.params[name]);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export function badId(res: Response): void {
    res.status(400).json({ message: 'Nieprawidłowy identyfikator.' });
}

export function str(value: unknown): string {
    return typeof value === 'string' ? value : '';
}
