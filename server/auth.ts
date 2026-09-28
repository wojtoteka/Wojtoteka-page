import type { NextFunction, Request, Response } from 'express';
import { decode, encode, type JWT } from 'next-auth/jwt';
import { SESSION_COOKIE, SESSION_MAX_AGE, secureCookies, type Role } from '@/lib/auth/constants';
import { appSecret, parseCookieHeader } from '@/lib/security';

// Express odczytuje ten sam zaszyfrowany JWT, który wystawia Auth.js.
// Na każdym żądaniu do API panelu sprawdzamy to samo, co stara sesja:
// rolę, 30 minut bezczynności, IP z logowania i przeglądarkę.
// Aktywna sesja jest przedłużana (nowe ciasteczko z nowym terminem).

const IDLE_LIMIT_MS = SESSION_MAX_AGE * 1000;

const cookieOptions = (req: Request) => ({
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: secureCookies(req.protocol),
    path: '/'
});

export async function readSession(req: Request): Promise<JWT | null> {
    const raw = parseCookieHeader(req.headers.cookie, SESSION_COOKIE);
    if (!raw) return null;
    try {
        return await decode({ token: raw, secret: appSecret(), salt: SESSION_COOKIE });
    } catch {
        return null;
    }
}

function rejectSession(req: Request, res: Response, message: string): void {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req));
    res.status(401).json({ message });
}

export function requireRole(role: Role) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const token = await readSession(req);

        if (!token || token.role !== role) {
            console.warn(`[SECURITY] Unauthorized ${role} access attempt to ${req.path} - IP: ${req.realIP}`);
            res.status(401).json({ message: 'Zaloguj się ponownie.' });
            return;
        }

        const now = Date.now();
        if (token.lastActivity && now - token.lastActivity > IDLE_LIMIT_MS) {
            console.warn(`[SECURITY] Session timeout (${role}) - IP: ${req.realIP}`);
            rejectSession(req, res, 'Sesja wygasła po 30 minutach bezczynności.');
            return;
        }

        if (token.ip && token.ip !== req.realIP) {
            console.warn(`[SECURITY] Session IP mismatch (${role})! Session IP: ${token.ip}, Request IP: ${req.realIP}`);
            rejectSession(req, res, 'Sesja unieważniona: zmienił się adres IP.');
            return;
        }

        const ua = (req.get('user-agent') || '').slice(0, 500);
        if (token.ua !== undefined && token.ua !== ua) {
            console.warn(`[SECURITY] Session User-Agent changed (${role}) - IP: ${req.realIP}`);
            rejectSession(req, res, 'Sesja unieważniona: zmieniła się przeglądarka.');
            return;
        }

        const refreshed = await encode({
            token: { ...token, lastActivity: now },
            secret: appSecret(),
            salt: SESSION_COOKIE,
            maxAge: SESSION_MAX_AGE
        });
        res.cookie(SESSION_COOKIE, refreshed, { ...cookieOptions(req), maxAge: SESSION_MAX_AGE * 1000 });

        req.auth = { ...token, lastActivity: now };
        next();
    };
}

export const requireAdmin = requireRole('admin');
export const requireSubAccount = requireRole('panel');
