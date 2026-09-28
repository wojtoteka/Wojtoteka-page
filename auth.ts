import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authorizeAdmin, authorizePanel } from '@/lib/auth/authorize';
import { SESSION_COOKIE, SESSION_MAX_AGE, secureCookies } from '@/lib/auth/constants';
import { appSecret } from '@/lib/security';

// Auth.js v5. Dwa rodzaje kont, dwóch dostawców "credentials":
// - admin: login + hasło z tabeli admins,
// - panel: email + hasło z tabeli sub_accounts (operatorzy skrzynek API).
// Sesja to zaszyfrowany JWT w ciasteczku. Express odczytuje ten sam JWT
// (server/auth.ts), sprawdza IP i przeglądarkę i przedłuża go przy aktywności.
// Konfiguracja liczona per żądanie: flaga Secure ciasteczka zależy od protokołu
// (x-forwarded-proto ustawia zawsze Express w server/index.ts).
export const { handlers, auth, signIn, signOut } = NextAuth(request => ({
    secret: appSecret(),
    trustHost: true,
    session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
    cookies: {
        sessionToken: {
            name: SESSION_COOKIE,
            options: { httpOnly: true, sameSite: 'lax', path: '/', secure: secureCookies(request?.headers.get('x-forwarded-proto')) }
        }
    },
    pages: { signIn: '/admin/logowanie', error: '/admin/logowanie' },
    providers: [
        Credentials({
            id: 'admin',
            name: 'Administrator',
            credentials: { username: { label: 'Login' }, password: { label: 'Hasło', type: 'password' } },
            authorize: (credentials, request) => authorizeAdmin(credentials, request)
        }),
        Credentials({
            id: 'panel',
            name: 'Panel skrzynki',
            credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Hasło', type: 'password' } },
            authorize: (credentials, request) => authorizePanel(credentials, request)
        })
    ],
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.accountId = user.accountId;
                token.username = user.username;
                token.email = user.email ?? null;
                token.apiKeyId = user.apiKeyId ?? null;
                token.ip = user.ip;
                token.ua = user.ua;
                token.sid = user.sid;
                token.lastActivity = Date.now();
            }
            return token;
        },
        session({ session, token }) {
            session.user = {
                ...session.user,
                role: token.role,
                username: token.username ?? '',
                email: token.email ?? ''
            };
            return session;
        }
    }
}));
