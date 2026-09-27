import type { JWT } from 'next-auth/jwt';

declare global {
    namespace Express {
        interface Request {
            /** Adres klienta ustalony raz na żądanie i oczyszczony (lib/security.ts). */
            realIP: string;
            /** Sesja Auth.js zweryfikowana przez requireRole (server/auth.ts). */
            auth?: JWT;
        }
    }
}

export {};
