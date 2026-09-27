import crypto from 'node:crypto';
import net from 'node:net';
import bcrypt from 'bcryptjs';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { mailer } from '@/lib/mailer';
import { ApiMessage } from '@/lib/models/api-message';
import { SubAccount, type SubAccountRow } from '@/lib/models/sub-account';
import { EMAIL_REGEX, loginDelay } from '@/lib/security';
import { requireSubAccount } from '@/server/auth';
import { badId, idParam, limits, str, validateOrigin, verifyCsrf } from '@/server/middleware';

export const panelRouter = Router();

// ---------- Reset hasła (bez logowania) ----------

panelRouter.post('/forgot-password', limits.passwordReset, validateOrigin, verifyCsrf, async (req, res) => {
    const generic = { message: 'Jeśli konto z tym adresem istnieje, wysłaliśmy na niego 6-cyfrowy kod.' };
    try {
        const email = str(req.body.email).trim().toLowerCase();
        if (!email || !EMAIL_REGEX.test(email)) {
            res.status(400).json({ message: 'Podaj adres email, na który założono konto.' });
            return;
        }
        const account = await SubAccount.findByEmail(email);
        // Ta sama odpowiedź dla istniejącego i nieistniejącego konta.
        if (!account) {
            await loginDelay();
            res.json(generic);
            return;
        }
        const code = String(crypto.randomInt(100000, 1000000));
        await SubAccount.saveResetCode(account.id, code, account.email);
        await mailer.sendPasswordResetCode(account.email, code, account.username);
        res.json(generic);
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Nie udało się wysłać kodu. Spróbuj ponownie za chwilę.' });
    }
});

panelRouter.post('/reset-password', limits.passwordReset, validateOrigin, verifyCsrf, async (req, res) => {
    try {
        const email = str(req.body.email).trim().toLowerCase();
        const code = str(req.body.code).trim();
        const newPassword = str(req.body.newPassword);

        if (!email || !code || !newPassword) {
            res.status(400).json({ message: 'Podaj email, kod z maila i nowe hasło.' });
            return;
        }
        if (newPassword.length < 8 || newPassword.length > 100) {
            res.status(400).json({ message: 'Nowe hasło musi mieć od 8 do 100 znaków.' });
            return;
        }
        const record = /^\d{6}$/.test(code) ? await SubAccount.verifyResetCode(email, code) : null;
        if (!record) {
            await loginDelay();
            res.status(400).json({ message: 'Kod jest nieprawidłowy albo wygasł (ważny 10 minut).' });
            return;
        }
        await SubAccount.changePassword(record.sub_account_id, await bcrypt.hash(newPassword, 12));
        await SubAccount.markCodeUsed(record.id);
        await SubAccount.unlockAccount(record.sub_account_id);
        res.json({ message: 'Hasło zmienione. Możesz się zalogować.' });
    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ message: 'Nie udało się zmienić hasła. Spróbuj ponownie za chwilę.' });
    }
});

// ---------- Trasy dla zalogowanego konta ----------

type PanelRequest = Request & { account?: SubAccountRow };

// Przypisanie klucza API czytamy z bazy przy każdym żądaniu, więc zmiana
// zrobiona przez administratora działa od razu, bez ponownego logowania.
async function loadAccount(req: PanelRequest, res: Response, next: NextFunction): Promise<void> {
    const account = req.auth?.accountId ? await SubAccount.getById(req.auth.accountId) : null;
    if (!account || !account.is_active) {
        res.status(401).json({ message: 'To konto jest niedostępne. Zaloguj się ponownie.' });
        return;
    }
    req.account = account;
    next();
}

const authed = Router();
authed.use(limits.api, requireSubAccount, validateOrigin, loadAccount, (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return verifyCsrf(req, res, next);
});

authed.get('/me', (req: PanelRequest, res) => {
    const account = req.account!;
    res.json({ username: account.username, email: account.email, apiKeyName: account.api_key_name ?? null });
});

authed.get('/messages', async (req: PanelRequest, res) => {
    try {
        const apiKeyId = req.account!.api_key_id;
        if (!apiKeyId) {
            res.json({ messages: [], stats: { total: 0, today: 0, week: 0 } });
            return;
        }
        res.json({ messages: await ApiMessage.getByApiKeyId(apiKeyId), stats: await ApiMessage.getStatsByApiKeyId(apiKeyId) });
    } catch (error) {
        console.error('Error fetching panel messages:', error);
        res.status(500).json({ message: 'Nie udało się pobrać wiadomości.' });
    }
});

authed.delete('/messages/:id', async (req: PanelRequest, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const apiKeyId = req.account!.api_key_id;
        if (!apiKeyId) {
            res.status(403).json({ message: 'To konto nie ma przypisanej skrzynki.' });
            return;
        }
        if (await ApiMessage.deleteByApiKeyId(id, apiKeyId)) res.json({ message: 'Wiadomość usunięta.' });
        else res.status(404).json({ message: 'Nie ma takiej wiadomości.' });
    } catch (error) {
        console.error('Error deleting panel message:', error);
        res.status(500).json({ message: 'Nie udało się usunąć wiadomości.' });
    }
});

authed.get('/banned-ips', async (req: PanelRequest, res) => {
    try {
        const apiKeyId = req.account!.api_key_id;
        res.json({ bannedIPs: apiKeyId ? await ApiMessage.getBannedIPsForKey(apiKeyId) : [] });
    } catch (error) {
        console.error('Error fetching panel banned IPs:', error);
        res.status(500).json({ message: 'Nie udało się pobrać listy blokad.' });
    }
});

authed.post('/ban-ip', async (req: PanelRequest, res) => {
    try {
        const apiKeyId = req.account!.api_key_id;
        const ipAddress = str(req.body.ipAddress).trim();
        if (!apiKeyId) {
            res.status(403).json({ message: 'To konto nie ma przypisanej skrzynki.' });
            return;
        }
        if (net.isIP(ipAddress) === 0) {
            res.status(400).json({ message: 'To nie wygląda na adres IPv4 ani IPv6.' });
            return;
        }
        await ApiMessage.banIPForKey(ipAddress, apiKeyId, str(req.body.reason).trim().substring(0, 255) || 'Spam/Abuse');
        res.json({ message: `Zablokowano ${ipAddress} w Twojej skrzynce.` });
    } catch (error) {
        console.error('Error banning panel IP:', error);
        res.status(500).json({ message: 'Nie udało się zablokować adresu.' });
    }
});

authed.post('/unban-ip', async (req: PanelRequest, res) => {
    try {
        const apiKeyId = req.account!.api_key_id;
        const ipAddress = str(req.body.ipAddress).trim();
        if (!apiKeyId) {
            res.status(403).json({ message: 'To konto nie ma przypisanej skrzynki.' });
            return;
        }
        if (!ipAddress) {
            res.status(400).json({ message: 'Podaj adres IP.' });
            return;
        }
        await ApiMessage.unbanIPForKey(ipAddress, apiKeyId);
        res.json({ message: `Zdjęto blokadę z ${ipAddress}.` });
    } catch (error) {
        console.error('Error unbanning panel IP:', error);
        res.status(500).json({ message: 'Nie udało się zdjąć blokady.' });
    }
});

authed.post('/change-password', async (req: PanelRequest, res) => {
    try {
        const currentPassword = str(req.body.currentPassword);
        const newPassword = str(req.body.newPassword);
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Podaj obecne i nowe hasło.' });
            return;
        }
        if (newPassword.length < 8 || newPassword.length > 100) {
            res.status(400).json({ message: 'Nowe hasło musi mieć od 8 do 100 znaków.' });
            return;
        }
        const account = req.account!;
        if (!(await bcrypt.compare(currentPassword, account.password_hash))) {
            res.status(401).json({ message: 'Obecne hasło jest nieprawidłowe.' });
            return;
        }
        await SubAccount.changePassword(account.id, await bcrypt.hash(newPassword, 12));
        res.json({ message: 'Hasło zmienione.' });
    } catch (error) {
        console.error('Error changing panel password:', error);
        res.status(500).json({ message: 'Nie udało się zmienić hasła.' });
    }
});

panelRouter.use(authed);
