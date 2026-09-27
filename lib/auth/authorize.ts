import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { CredentialsSignin, type User } from 'next-auth';
import { Admin } from '@/lib/models/admin';
import { SubAccount } from '@/lib/models/sub-account';
import { mailer } from '@/lib/mailer';
import {
    CLIENT_IP_HEADER,
    failedAttemptsForAccount,
    failedAttemptsFromIp,
    getIPInfo,
    loginDelay,
    sanitizeIp,
    trackLoginAttempt
} from '@/lib/security';

class LockedError extends CredentialsSignin {
    code = 'locked';
}
class InactiveError extends CredentialsSignin {
    code = 'inactive';
}
class RateLimitedError extends CredentialsSignin {
    code = 'rate_limited';
}
class InvalidInputError extends CredentialsSignin {
    code = 'invalid';
}

// Limity nieudanych prób z jednego IP w oknie 15 minut (jak dawne limitery Expressa).
const ADMIN_IP_LIMIT = 5;
const PANEL_IP_LIMIT = 10;
const ADMIN_ACCOUNT_LIMIT = 5;

function requestContext(request: Request): { ip: string; ua: string } {
    // Express nadpisuje ten nagłówek przed przekazaniem żądania do Next.js
    // (server/index.ts), więc klient nie może go podrobić.
    const ip = sanitizeIp(request.headers.get(CLIENT_IP_HEADER));
    const ua = (request.headers.get('user-agent') || '').slice(0, 500);
    return { ip, ua };
}

function field(credentials: Partial<Record<string, unknown>>, key: string): string {
    const value = credentials[key];
    return typeof value === 'string' ? value : '';
}

export async function authorizeAdmin(credentials: Partial<Record<string, unknown>>, request: Request): Promise<User> {
    const username = field(credentials, 'username').trim();
    const password = field(credentials, 'password');
    const { ip, ua } = requestContext(request);

    if (!username || !password || username.length > 100 || password.length > 100) {
        throw new InvalidInputError();
    }

    if ((await failedAttemptsFromIp('admin', ip)) >= ADMIN_IP_LIMIT) {
        console.warn(`[SECURITY] Admin login rate limited - IP: ${ip}`);
        throw new RateLimitedError();
    }

    if ((await failedAttemptsForAccount('admin', username)) >= ADMIN_ACCOUNT_LIMIT) {
        console.warn(`[SECURITY] Admin account locked - Username: ${username} - IP: ${ip}`);
        throw new LockedError();
    }

    const admin = await Admin.findByUsername(username);
    // Porównanie hasła także dla nieistniejącego loginu byłoby lepsze, ale stała
    // zwłoka 1 s i tak wyrównuje czas odpowiedzi w obu przypadkach.
    const valid = admin ? await bcrypt.compare(password, admin.password_hash) : false;

    if (!admin || !valid) {
        await trackLoginAttempt('admin', username, ip, ua, false);
        console.warn(`[SECURITY] Failed admin login - Username: ${username} - IP: ${ip}`);

        if (admin && (await failedAttemptsForAccount('admin', username)) >= ADMIN_ACCOUNT_LIMIT) {
            void getIPInfo(ip).then(info =>
                mailer.sendFailedLoginAlert({
                    accountIdentifier: username,
                    accountType: 'Administrator',
                    ip,
                    location: info.location,
                    isp: info.isp,
                    targetEmail: null
                })
            );
        }
        await loginDelay();
        throw new CredentialsSignin();
    }

    await trackLoginAttempt('admin', username, ip, ua, true);
    await Admin.updateLastLogin(admin.id, ip);
    console.log(`[SECURITY] Successful admin login - IP: ${ip}`);

    return {
        id: `admin:${admin.id}`,
        name: admin.username,
        role: 'admin',
        accountId: admin.id,
        username: admin.username,
        apiKeyId: null,
        ip,
        ua,
        sid: crypto.randomBytes(16).toString('hex')
    };
}

export async function authorizePanel(credentials: Partial<Record<string, unknown>>, request: Request): Promise<User> {
    const email = field(credentials, 'email').trim().toLowerCase();
    const password = field(credentials, 'password');
    const { ip, ua } = requestContext(request);

    if (!email || !password || email.length > 255 || password.length > 100) {
        throw new InvalidInputError();
    }

    if ((await failedAttemptsFromIp('sub_account', ip)) >= PANEL_IP_LIMIT) {
        console.warn(`[SECURITY] Panel login rate limited - IP: ${ip}`);
        throw new RateLimitedError();
    }

    const account = await SubAccount.findByEmail(email);
    if (!account) {
        await trackLoginAttempt('sub_account', email, ip, ua, false);
        await loginDelay();
        throw new CredentialsSignin();
    }

    if (await SubAccount.isLocked(account.id)) throw new LockedError();
    if (!account.is_active) throw new InactiveError();

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
        await trackLoginAttempt('sub_account', email, ip, ua, false);
        const attempts = await SubAccount.incrementFailedAttempts(account.id);

        if (attempts >= 5) {
            // Alert idzie do właściciela konta i do administratora.
            void getIPInfo(ip).then(info => {
                const alert = {
                    accountIdentifier: `${account.username} (${account.email})`,
                    accountType: 'Konto panelu',
                    ip,
                    location: info.location,
                    isp: info.isp
                };
                void mailer.sendFailedLoginAlert({ ...alert, targetEmail: account.email });
                if (mailer.recipientEmail) {
                    void mailer.sendFailedLoginAlert({ ...alert, targetEmail: mailer.recipientEmail });
                }
            });
        }
        await loginDelay();
        throw new CredentialsSignin();
    }

    await trackLoginAttempt('sub_account', email, ip, ua, true);
    await SubAccount.updateLastLogin(account.id, ip);

    return {
        id: `panel:${account.id}`,
        name: account.username,
        email: account.email,
        role: 'panel',
        accountId: account.id,
        username: account.username,
        apiKeyId: account.api_key_id,
        ip,
        ua,
        sid: crypto.randomBytes(16).toString('hex')
    };
}
