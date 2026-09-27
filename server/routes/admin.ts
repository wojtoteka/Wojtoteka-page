import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { execute, select, selectOne } from '@/lib/db';
import { mailer } from '@/lib/mailer';
import { Admin } from '@/lib/models/admin';
import { ApiKey } from '@/lib/models/api-key';
import { ApiMessage } from '@/lib/models/api-message';
import { Message } from '@/lib/models/message';
import { SubAccount } from '@/lib/models/sub-account';
import { EMAIL_REGEX, randomPassword } from '@/lib/security';
import { expiryFromHours, generateUniqueCode, validateShortUrl } from '@/lib/shortener';
import { MAX_UPLOAD_BYTES, UPLOADS_DIR, ensureUploadsDir, isStoredName } from '@/lib/files';
import { TRACKED_PATHS } from '@/lib/site';
import { invalidateMaintenanceCache } from '@/server/maintenance';
import { requireAdmin } from '@/server/auth';
import { badId, idParam, limits, str, validateOrigin, verifyCsrf } from '@/server/middleware';

export const adminRouter = Router();

// Każda trasa panelu: limit, sesja administratora, własna domena, CSRF dla zmian.
adminRouter.use(limits.api, requireAdmin, validateOrigin, (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return verifyCsrf(req, res, next);
});

function fail(res: Response, error: unknown, context: string, message: string): void {
    console.error(`Error ${context}:`, error);
    res.status(500).json({ message });
}

// ---------- Kto jest zalogowany ----------

adminRouter.get('/me', (req, res) => {
    res.json({ username: req.auth?.username ?? '' });
});

// ---------- Liczniki do menu bocznego ----------

adminRouter.get('/summary', async (_req, res) => {
    try {
        const count = async (sql: string) => Number((await selectOne<{ c: number }>(sql))?.c ?? 0);
        res.json({
            messages: await count('SELECT COUNT(*) AS c FROM messages'),
            apiMessages: await count('SELECT COUNT(*) AS c FROM api_messages'),
            apiKeys: await count('SELECT COUNT(*) AS c FROM api_keys'),
            subAccounts: await count('SELECT COUNT(*) AS c FROM sub_accounts'),
            bannedIps: await count('SELECT COUNT(*) AS c FROM banned_ips WHERE expires_at IS NULL OR expires_at > NOW()'),
            announcements: await count('SELECT COUNT(*) AS c FROM announcements WHERE is_active = 1'),
            urls: await count('SELECT COUNT(*) AS c FROM short_urls'),
            files: await count('SELECT COUNT(*) AS c FROM shared_files'),
            bioLinks: await count('SELECT COUNT(*) AS c FROM bio_links')
        });
    } catch (error) {
        fail(res, error, 'fetching summary', 'Nie udało się pobrać liczników.');
    }
});

// ---------- Wiadomości z formularza ----------

adminRouter.get('/messages', async (_req, res) => {
    try {
        res.json({ messages: await Message.getAll(), stats: await Message.getStats() });
    } catch (error) {
        fail(res, error, 'fetching messages', 'Nie udało się pobrać wiadomości.');
    }
});

adminRouter.delete('/messages/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        if (await Message.delete(id)) res.json({ message: 'Wiadomość usunięta.' });
        else res.status(404).json({ message: 'Nie ma takiej wiadomości.' });
    } catch (error) {
        fail(res, error, 'deleting message', 'Nie udało się usunąć wiadomości.');
    }
});

// ---------- Blokady IP ----------

adminRouter.get('/banned-ips', async (_req, res) => {
    try {
        res.json({ bannedIPs: await Message.getAllBannedIPs() });
    } catch (error) {
        fail(res, error, 'fetching banned IPs', 'Nie udało się pobrać listy blokad.');
    }
});

adminRouter.post('/ban-ip', async (req, res) => {
    try {
        const ipAddress = str(req.body.ipAddress).trim();
        if (!ipAddress) {
            res.status(400).json({ message: 'Podaj adres IP.' });
            return;
        }
        if (net.isIP(ipAddress) === 0) {
            res.status(400).json({ message: 'To nie wygląda na adres IPv4 ani IPv6.' });
            return;
        }
        const scope = req.body.scope === 'site' ? 'site' : 'form';
        const days = Math.max(0, Math.min(3650, parseInt(String(req.body.days), 10) || 0));
        const reason = str(req.body.reason).trim().substring(0, 255) || 'Spam/Abuse';
        await Message.banIP(ipAddress, reason, scope, days);
        const scopeLabel = scope === 'site' ? 'cała strona' : 'formularz kontaktowy';
        const timeLabel = days > 0 ? `na ${days} ${days === 1 ? 'dzień' : 'dni'}` : 'na stałe';
        res.json({ message: `Zablokowano ${ipAddress} (${scopeLabel}, ${timeLabel}).` });
    } catch (error) {
        fail(res, error, 'banning IP', 'Nie udało się zablokować adresu.');
    }
});

adminRouter.post('/unban-ip', async (req, res) => {
    try {
        const ipAddress = str(req.body.ipAddress).trim();
        if (!ipAddress) {
            res.status(400).json({ message: 'Podaj adres IP.' });
            return;
        }
        await Message.unbanIP(ipAddress);
        res.json({ message: `Zdjęto blokadę z ${ipAddress}.` });
    } catch (error) {
        fail(res, error, 'unbanning IP', 'Nie udało się zdjąć blokady.');
    }
});

// ---------- Klucze API ----------

adminRouter.get('/api-keys', async (_req, res) => {
    try {
        res.json({ apiKeys: await ApiKey.getAll(), stats: await ApiKey.getStats() });
    } catch (error) {
        fail(res, error, 'fetching API keys', 'Nie udało się pobrać kluczy API.');
    }
});

adminRouter.post('/api-keys', async (req, res) => {
    try {
        const name = str(req.body.name).trim();
        if (!name) {
            res.status(400).json({ message: 'Nadaj kluczowi nazwę, np. nazwę strony klienta.' });
            return;
        }
        const notification = str(req.body.notification_email).trim();
        if (notification && !EMAIL_REGEX.test(notification)) {
            res.status(400).json({ message: 'Adres do powiadomień wygląda na niepełny.' });
            return;
        }
        const apiKey = crypto.randomBytes(32).toString('hex');
        const id = await ApiKey.create({
            api_key: apiKey,
            name: name.substring(0, 255),
            collect_name: req.body.collect_name !== false,
            collect_email: req.body.collect_email !== false,
            collect_phone: !!req.body.collect_phone,
            collect_subject: req.body.collect_subject !== false,
            collect_message: req.body.collect_message !== false,
            notification_email: notification || null
        });
        res.status(201).json({ message: 'Klucz API utworzony.', apiKey: { id, api_key: apiKey, name } });
    } catch (error) {
        fail(res, error, 'creating API key', 'Nie udało się utworzyć klucza API.');
    }
});

adminRouter.delete('/api-keys/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        if (await ApiKey.delete(id)) res.json({ message: 'Klucz API usunięty razem z jego wiadomościami.' });
        else res.status(404).json({ message: 'Nie ma takiego klucza API.' });
    } catch (error) {
        fail(res, error, 'deleting API key', 'Nie udało się usunąć klucza API.');
    }
});

adminRouter.patch('/api-keys/:id/toggle', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        if (await ApiKey.toggleActive(id)) res.json({ message: 'Zmieniono status klucza API.' });
        else res.status(404).json({ message: 'Nie ma takiego klucza API.' });
    } catch (error) {
        fail(res, error, 'toggling API key', 'Nie udało się zmienić statusu klucza.');
    }
});

// ---------- Konta panelu (operatorzy skrzynek) ----------

adminRouter.get('/sub-accounts', async (_req, res) => {
    try {
        res.json({ subAccounts: await SubAccount.getAll() });
    } catch (error) {
        fail(res, error, 'fetching sub-accounts', 'Nie udało się pobrać kont.');
    }
});

async function parseApiKeyId(raw: unknown): Promise<{ ok: true; id: number | null } | { ok: false; status: number; message: string }> {
    if (raw === undefined || raw === null || String(raw).trim() === '') return { ok: true, id: null };
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return { ok: false, status: 400, message: 'Nieprawidłowy klucz API.' };
    if (!(await ApiKey.getById(id))) return { ok: false, status: 404, message: 'Nie ma takiego klucza API.' };
    return { ok: true, id };
}

adminRouter.post('/sub-accounts', async (req, res) => {
    try {
        const email = str(req.body.email).trim().toLowerCase();
        const username = str(req.body.username).trim();

        if (!email || !username) {
            res.status(400).json({ message: 'Podaj email i nazwę użytkownika.' });
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            res.status(400).json({ message: 'Adres email wygląda na niepełny.' });
            return;
        }
        if (username.length < 3 || username.length > 50) {
            res.status(400).json({ message: 'Nazwa użytkownika musi mieć od 3 do 50 znaków.' });
            return;
        }
        if (await SubAccount.findByEmail(email)) {
            res.status(400).json({ message: 'Konto z tym adresem email już istnieje.' });
            return;
        }
        if (await SubAccount.findByUsername(username)) {
            res.status(400).json({ message: 'Ta nazwa użytkownika jest zajęta.' });
            return;
        }
        const apiKeyId = await parseApiKeyId(req.body.api_key_id);
        if (!apiKeyId.ok) {
            res.status(apiKeyId.status).json({ message: apiKeyId.message });
            return;
        }

        const plainPassword = randomPassword();
        const id = await SubAccount.create({
            email,
            username,
            password_hash: await bcrypt.hash(plainPassword, 12),
            api_key_id: apiKeyId.id
        });

        const apiKey = apiKeyId.id ? await ApiKey.getById(apiKeyId.id) : null;
        const sent = await mailer.sendNewAccountCredentials(email, username, plainPassword, apiKey?.name || 'Brak');

        res.status(201).json({
            message: sent
                ? 'Konto utworzone. Dane logowania poszły na podany email.'
                : 'Konto utworzone, ale mail z hasłem nie wyszedł. Zresetuj hasło, gdy SMTP zacznie działać.',
            subAccount: { id, email, username }
        });
    } catch (error) {
        fail(res, error, 'creating sub-account', 'Nie udało się utworzyć konta.');
    }
});

adminRouter.patch('/sub-accounts/:id/api-key', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        if (!(await SubAccount.getById(id))) {
            res.status(404).json({ message: 'Nie ma takiego konta.' });
            return;
        }
        const apiKeyId = await parseApiKeyId(req.body.api_key_id);
        if (!apiKeyId.ok) {
            res.status(apiKeyId.status).json({ message: apiKeyId.message });
            return;
        }
        await SubAccount.updateApiKeyAssignment(id, apiKeyId.id);
        res.json({ message: apiKeyId.id ? 'Przypisano klucz API.' : 'Odłączono klucz API od konta.' });
    } catch (error) {
        fail(res, error, 'updating sub-account API key', 'Nie udało się zapisać przypisania.');
    }
});

adminRouter.delete('/sub-accounts/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        if (await SubAccount.delete(id)) res.json({ message: 'Konto usunięte.' });
        else res.status(404).json({ message: 'Nie ma takiego konta.' });
    } catch (error) {
        fail(res, error, 'deleting sub-account', 'Nie udało się usunąć konta.');
    }
});

adminRouter.post('/sub-accounts/:id/reset-password', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const account = await SubAccount.getById(id);
        if (!account) {
            res.status(404).json({ message: 'Nie ma takiego konta.' });
            return;
        }
        const plainPassword = randomPassword();
        await SubAccount.changePassword(account.id, await bcrypt.hash(plainPassword, 12));
        await SubAccount.unlockAccount(account.id);
        const sent = await mailer.sendPasswordResetByAdmin(account.email, account.username, plainPassword);
        res.json({
            message: sent
                ? `Nowe hasło poszło na ${account.email}.`
                : 'Hasło zmienione, ale mail nie wyszedł. Sprawdź ustawienia SMTP i zresetuj ponownie.'
        });
    } catch (error) {
        fail(res, error, 'resetting sub-account password', 'Nie udało się zresetować hasła.');
    }
});

adminRouter.post('/sub-accounts/:id/unlock', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        await SubAccount.unlockAccount(id);
        res.json({ message: 'Konto odblokowane.' });
    } catch (error) {
        fail(res, error, 'unlocking sub-account', 'Nie udało się odblokować konta.');
    }
});

// ---------- Wiadomości z API (wszystkie klucze) ----------

adminRouter.get('/api-messages', async (_req, res) => {
    try {
        res.json({ messages: await ApiMessage.getAll(), stats: await ApiMessage.getStatsAll() });
    } catch (error) {
        fail(res, error, 'fetching API messages', 'Nie udało się pobrać wiadomości z API.');
    }
});

adminRouter.delete('/api-messages/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        if (await ApiMessage.delete(id)) res.json({ message: 'Wiadomość usunięta.' });
        else res.status(404).json({ message: 'Nie ma takiej wiadomości.' });
    } catch (error) {
        fail(res, error, 'deleting API message', 'Nie udało się usunąć wiadomości.');
    }
});

// ---------- Ogłoszenia ----------

adminRouter.get('/announcements', async (_req, res) => {
    try {
        res.json({ announcements: await select('SELECT * FROM announcements ORDER BY priority DESC, created_at DESC') });
    } catch (error) {
        fail(res, error, 'fetching announcements', 'Nie udało się pobrać ogłoszeń.');
    }
});

/**
 * Data z pola datetime-local ("2026-10-01T12:00") zapisana jako lokalny czas
 * serwera, tak samo jak NOW() w MariaDB. Wcześniej zapisywaliśmy UTC, przez
 * co ogłoszenia startowały i kończyły się o 1-2 godziny za wcześnie.
 */
function parseDateTime(value: unknown): string | null {
    if (!value) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function announcementInput(body: Record<string, unknown>): { ok: false; message: string } | { ok: true; params: (string | number | null)[] } {
    const title = str(body.title).trim();
    const message = str(body.message).trim();
    if (!title) return { ok: false, message: 'Dodaj tytuł ogłoszenia.' };
    if (!message) return { ok: false, message: 'Dodaj treść ogłoszenia.' };
    if (!['info', 'warning', 'important'].includes(String(body.type))) return { ok: false, message: 'Nieprawidłowy typ ogłoszenia.' };
    if (!['banner', 'popup'].includes(String(body.display_type))) return { ok: false, message: 'Nieprawidłowy sposób wyświetlania.' };
    const pages = Array.isArray(body.pages) ? body.pages.filter((p): p is string => typeof p === 'string' && p.length < 100) : [];
    if (pages.length === 0) return { ok: false, message: 'Zaznacz co najmniej jedną stronę.' };
    return {
        ok: true,
        params: [
            title.substring(0, 255),
            message.substring(0, 2000),
            String(body.type),
            String(body.display_type),
            JSON.stringify(pages),
            body.is_active ? 1 : 0,
            parseInt(String(body.priority), 10) || 0,
            parseDateTime(body.starts_at),
            parseDateTime(body.ends_at)
        ]
    };
}

adminRouter.post('/announcements', async (req, res) => {
    try {
        const input = announcementInput(req.body);
        if (!input.ok) {
            res.status(400).json({ message: input.message });
            return;
        }
        const result = await execute(
            'INSERT INTO announcements (title, message, type, display_type, pages, is_active, priority, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            input.params
        );
        res.status(201).json({ message: 'Ogłoszenie dodane.', id: result.insertId });
    } catch (error) {
        fail(res, error, 'creating announcement', 'Nie udało się dodać ogłoszenia.');
    }
});

adminRouter.patch('/announcements/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const input = announcementInput(req.body);
        if (!input.ok) {
            res.status(400).json({ message: input.message });
            return;
        }
        const result = await execute(
            'UPDATE announcements SET title=?, message=?, type=?, display_type=?, pages=?, is_active=?, priority=?, starts_at=?, ends_at=? WHERE id=?',
            [...input.params, id]
        );
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego ogłoszenia.' });
        else res.json({ message: 'Zapisano zmiany w ogłoszeniu.' });
    } catch (error) {
        fail(res, error, 'updating announcement', 'Nie udało się zapisać ogłoszenia.');
    }
});

adminRouter.patch('/announcements/:id/toggle', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const result = await execute('UPDATE announcements SET is_active = NOT is_active WHERE id = ?', [id]);
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego ogłoszenia.' });
        else res.json({ message: 'Zmieniono widoczność ogłoszenia.' });
    } catch (error) {
        fail(res, error, 'toggling announcement', 'Nie udało się zmienić widoczności.');
    }
});

adminRouter.delete('/announcements/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const result = await execute('DELETE FROM announcements WHERE id = ?', [id]);
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego ogłoszenia.' });
        else res.json({ message: 'Ogłoszenie usunięte.' });
    } catch (error) {
        fail(res, error, 'deleting announcement', 'Nie udało się usunąć ogłoszenia.');
    }
});

// ---------- Wysyłka maili (każdy odbiorca dostaje osobną wiadomość) ----------

adminRouter.post('/send-email', limits.sendEmail, async (req, res) => {
    try {
        const fromName = str(req.body.fromName).trim();
        const subject = str(req.body.subject).trim();
        const body = str(req.body.body);
        const recipients: unknown[] = Array.isArray(req.body.recipients) ? req.body.recipients : [];

        if (!fromName) {
            res.status(400).json({ message: 'Uzupełnij pole "Od".' });
            return;
        }
        if (!subject) {
            res.status(400).json({ message: 'Dodaj temat.' });
            return;
        }
        if (!body.trim()) {
            res.status(400).json({ message: 'Dodaj treść wiadomości.' });
            return;
        }

        const clean = [...new Set(recipients.map(r => String(r).trim().toLowerCase()))].filter(r => EMAIL_REGEX.test(r));
        if (clean.length === 0) {
            res.status(400).json({ message: 'Dodaj co najmniej jeden poprawny adres odbiorcy.' });
            return;
        }
        if (clean.length > 100) {
            res.status(400).json({ message: 'Jedna wysyłka to najwyżej 100 odbiorców.' });
            return;
        }

        const isHtml = !!req.body.isHtml;
        const results = await mailer.sendCustomBroadcast({
            fromName: fromName.substring(0, 100),
            recipients: clean,
            subject: subject.substring(0, 255),
            bodyHtml: isHtml ? body : mailer.formatMultilineText(body),
            bodyText: isHtml ? undefined : body
        });

        console.log(`[ADMIN EMAIL] ${req.auth?.username || 'admin'} wysłał "${subject}" do ${results.sent}/${results.total} odbiorców`);
        res.json({ message: `Wysłano do ${results.sent} z ${results.total} odbiorców.`, ...results });
    } catch (error) {
        fail(res, error, 'sending custom email', 'Nie udało się wysłać wiadomości.');
    }
});

// ---------- Skrócone linki ----------

adminRouter.get('/urls', async (_req, res) => {
    try {
        const urls = await select('SELECT id, code, original_url, created_at, expires_at, click_count FROM short_urls ORDER BY created_at DESC');
        res.json({ urls });
    } catch (error) {
        fail(res, error, 'fetching URLs', 'Nie udało się pobrać linków.');
    }
});

adminRouter.post('/urls', async (req, res) => {
    try {
        const validation = validateShortUrl(req.body.original_url, req.realIP);
        if (!validation.ok) {
            res.status(400).json({ message: validation.message });
            return;
        }
        const expiry = expiryFromHours(req.body.expires_hours, false);
        const code = await generateUniqueCode('short_urls');
        await execute('INSERT INTO short_urls (code, original_url, expires_at) VALUES (?, ?, ?)', [
            code,
            validation.normalizedUrl.substring(0, 2048),
            expiry.ok ? expiry.expiresAt : null
        ]);
        res.status(201).json({ message: 'Link skrócony.', code });
    } catch (error) {
        fail(res, error, 'creating short URL', 'Nie udało się skrócić linku.');
    }
});

adminRouter.delete('/urls/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const result = await execute('DELETE FROM short_urls WHERE id = ?', [id]);
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego linku.' });
        else res.json({ message: 'Link usunięty.' });
    } catch (error) {
        fail(res, error, 'deleting URL', 'Nie udało się usunąć linku.');
    }
});

// ---------- Pliki ----------

ensureUploadsDir();
const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
        filename: (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString('hex'))
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES },
    // Przeglądarki wysyłają nazwy plików w UTF-8 (polskie znaki).
    defParamCharset: 'utf8'
});

adminRouter.get('/files', async (_req, res) => {
    try {
        const files = await select(
            'SELECT id, code, original_name, mime_type, file_size, created_at, expires_at, preview_enabled, download_count FROM shared_files ORDER BY created_at DESC'
        );
        res.json({ files });
    } catch (error) {
        fail(res, error, 'fetching files', 'Nie udało się pobrać plików.');
    }
});

adminRouter.post(
    '/files',
    (req, res, next) => {
        upload.single('file')(req, res, (err: unknown) => {
            if (err instanceof multer.MulterError) {
                res.status(400).json({
                    message: err.code === 'LIMIT_FILE_SIZE' ? 'Plik jest za duży (najwyżej 100 MB).' : `Błąd przesyłania: ${err.message}`
                });
                return;
            }
            if (err) {
                res.status(400).json({ message: (err as Error).message });
                return;
            }
            next();
        });
    },
    async (req, res) => {
        const file = req.file;
        try {
            if (!file) {
                res.status(400).json({ message: 'Wybierz plik do przesłania.' });
                return;
            }
            const previewEnabled = ['1', 'true', 'yes', 'on'].includes(String(req.body.preview_enabled || '').toLowerCase());
            const expiry = expiryFromHours(req.body.expires_hours, false);
            const code = await generateUniqueCode('shared_files');
            const originalName = file.originalname;

            await execute(
                'INSERT INTO shared_files (code, original_name, stored_name, mime_type, file_size, expires_at, preview_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [code, originalName.substring(0, 500), file.filename, file.mimetype || 'application/octet-stream', file.size, expiry.ok ? expiry.expiresAt : null, previewEnabled ? 1 : 0]
            );
            res.status(201).json({ message: 'Plik przesłany.', code, preview_enabled: previewEnabled });
        } catch (error) {
            if (file) fs.unlink(path.join(UPLOADS_DIR, file.filename), () => {});
            fail(res, error, 'uploading file', 'Nie udało się zapisać pliku.');
        }
    }
);

adminRouter.delete('/files/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const row = await selectOne<{ stored_name: string }>('SELECT stored_name FROM shared_files WHERE id = ? LIMIT 1', [id]);
        if (!row) {
            res.status(404).json({ message: 'Nie ma takiego pliku.' });
            return;
        }
        await execute('DELETE FROM shared_files WHERE id = ?', [id]);
        if (isStoredName(row.stored_name)) {
            fs.unlink(path.join(UPLOADS_DIR, row.stored_name), err => {
                if (err && err.code !== 'ENOENT') console.error('Error deleting file from disk:', err);
            });
        }
        res.json({ message: 'Plik usunięty z serwera.' });
    } catch (error) {
        fail(res, error, 'deleting file', 'Nie udało się usunąć pliku.');
    }
});

// ---------- Ustawienia strony ----------

adminRouter.get('/site-settings', async (_req, res) => {
    try {
        const rows = await select<{ key: string; value: string }>('SELECT `key`, `value` FROM site_settings');
        res.json({ settings: Object.fromEntries(rows.map(r => [r.key, r.value])) });
    } catch (error) {
        fail(res, error, 'fetching site settings', 'Nie udało się pobrać ustawień.');
    }
});

async function saveSetting(key: string, value: string): Promise<void> {
    await execute('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, value, value]);
}

adminRouter.put('/site-settings', async (req, res) => {
    try {
        const { tagline, maintenance_mode, maintenance_paths } = req.body as Record<string, unknown>;

        if (tagline !== undefined) {
            if (typeof tagline !== 'string' || tagline.length > 200) {
                res.status(400).json({ message: 'Podtytuł może mieć najwyżej 200 znaków.' });
                return;
            }
            await saveSetting('tagline', tagline.trim());
        }
        if (maintenance_mode !== undefined) {
            if (!['off', 'full', 'paths'].includes(String(maintenance_mode))) {
                res.status(400).json({ message: 'Nieprawidłowy tryb konserwacji.' });
                return;
            }
            await saveSetting('maintenance_mode', String(maintenance_mode));
            invalidateMaintenanceCache();
        }
        if (maintenance_paths !== undefined) {
            if (!Array.isArray(maintenance_paths)) {
                res.status(400).json({ message: 'Lista ścieżek ma zły format.' });
                return;
            }
            const cleaned = maintenance_paths.map(p => String(p).trim().substring(0, 255)).filter(p => p.startsWith('/'));
            await saveSetting('maintenance_paths', JSON.stringify(cleaned));
            invalidateMaintenanceCache();
        }
        res.json({ message: 'Ustawienia zapisane.' });
    } catch (error) {
        fail(res, error, 'updating site settings', 'Nie udało się zapisać ustawień.');
    }
});

// ---------- Linki bio (strona główna) ----------

adminRouter.get('/bio-links', async (_req, res) => {
    try {
        res.json({ links: await select('SELECT * FROM bio_links ORDER BY sort_order ASC, id ASC') });
    } catch (error) {
        fail(res, error, 'fetching bio links', 'Nie udało się pobrać linków.');
    }
});

function bioLinkInput(body: Record<string, unknown>): { ok: false; message: string } | { ok: true; params: (string | number)[] } {
    const title = str(body.title).trim();
    if (!title) return { ok: false, message: 'Dodaj tekst linku.' };

    const rawUrl = str(body.url).trim();
    if (!rawUrl) return { ok: false, message: 'Dodaj adres linku.' };
    if (rawUrl.length > 2048) return { ok: false, message: 'Adres jest za długi.' };

    let url = rawUrl;
    if (!rawUrl.startsWith('/') || rawUrl.startsWith('//')) {
        try {
            const parsed = new URL(rawUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { ok: false, message: 'Dozwolone są adresy http, https albo ścieżki zaczynające się od /.' };
            }
            url = parsed.toString();
        } catch {
            return { ok: false, message: 'To nie wygląda na poprawny adres.' };
        }
    }

    const icon = str(body.icon).trim().substring(0, 50) || 'link';
    return {
        ok: true,
        params: [title.substring(0, 255), url, icon, parseInt(String(body.sort_order), 10) || 0, body.is_active ? 1 : 0, body.opens_new_tab ? 1 : 0]
    };
}

adminRouter.post('/bio-links', async (req, res) => {
    try {
        const input = bioLinkInput(req.body);
        if (!input.ok) {
            res.status(400).json({ message: input.message });
            return;
        }
        const result = await execute(
            'INSERT INTO bio_links (title, url, icon, sort_order, is_active, opens_new_tab) VALUES (?, ?, ?, ?, ?, ?)',
            input.params
        );
        res.status(201).json({ message: 'Link dodany.', id: result.insertId });
    } catch (error) {
        fail(res, error, 'creating bio link', 'Nie udało się dodać linku.');
    }
});

adminRouter.patch('/bio-links/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const input = bioLinkInput(req.body);
        if (!input.ok) {
            res.status(400).json({ message: input.message });
            return;
        }
        const result = await execute(
            'UPDATE bio_links SET title=?, url=?, icon=?, sort_order=?, is_active=?, opens_new_tab=? WHERE id=?',
            [...input.params, id]
        );
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego linku.' });
        else res.json({ message: 'Zapisano link.' });
    } catch (error) {
        fail(res, error, 'updating bio link', 'Nie udało się zapisać linku.');
    }
});

adminRouter.patch('/bio-links/:id/toggle', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const result = await execute('UPDATE bio_links SET is_active = NOT is_active WHERE id = ?', [id]);
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego linku.' });
        else res.json({ message: 'Zmieniono widoczność linku.' });
    } catch (error) {
        fail(res, error, 'toggling bio link', 'Nie udało się zmienić widoczności.');
    }
});

adminRouter.post('/bio-links/:id/reset-clicks', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const result = await execute('UPDATE bio_links SET click_count = 0 WHERE id = ?', [id]);
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego linku.' });
        else res.json({ message: 'Licznik kliknięć wyzerowany.' });
    } catch (error) {
        fail(res, error, 'resetting bio link clicks', 'Nie udało się wyzerować licznika.');
    }
});

adminRouter.delete('/bio-links/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return badId(res);
    try {
        const result = await execute('DELETE FROM bio_links WHERE id = ?', [id]);
        if (result.affectedRows === 0) res.status(404).json({ message: 'Nie ma takiego linku.' });
        else res.json({ message: 'Link usunięty.' });
    } catch (error) {
        fail(res, error, 'deleting bio link', 'Nie udało się usunąć linku.');
    }
});

// ---------- Hasło administratora ----------

adminRouter.post('/change-password', async (req, res) => {
    try {
        const currentPassword = str(req.body.currentPassword);
        const newPassword = str(req.body.newPassword);
        const confirmPassword = str(req.body.confirmPassword);

        if (!currentPassword || !newPassword || !confirmPassword) {
            res.status(400).json({ message: 'Uzupełnij wszystkie trzy pola.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            res.status(400).json({ message: 'Nowe hasło i powtórzenie się różnią.' });
            return;
        }
        if (newPassword.length < 8 || newPassword.length > 100) {
            res.status(400).json({ message: 'Nowe hasło musi mieć od 8 do 100 znaków.' });
            return;
        }

        const admin = req.auth?.accountId ? await Admin.findById(req.auth.accountId) : null;
        if (!admin) {
            res.status(404).json({ message: 'Nie znaleziono konta administratora.' });
            return;
        }
        if (!(await bcrypt.compare(currentPassword, admin.password_hash))) {
            res.status(401).json({ message: 'Obecne hasło jest nieprawidłowe.' });
            return;
        }

        await Admin.changePassword(admin.id, await bcrypt.hash(newPassword, 12));
        console.log(`[SECURITY] Admin password changed - Username: ${admin.username} - IP: ${req.realIP}`);
        res.json({ message: 'Hasło zmienione.' });
    } catch (error) {
        fail(res, error, 'changing admin password', 'Nie udało się zmienić hasła.');
    }
});

// ---------- Statystyki odwiedzin ----------

adminRouter.get('/stats/page-views', async (_req, res) => {
    try {
        const byPage = await select(
            'SELECT path, SUM(count) AS total, MAX(last_seen) AS last_seen FROM page_views GROUP BY path ORDER BY total DESC LIMIT 500'
        );
        const last30 = await select(
            'SELECT date, SUM(count) AS total FROM page_views WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY date ORDER BY date ASC'
        );
        const totalRow = await selectOne<{ total: number | null }>('SELECT SUM(count) AS total FROM page_views');
        res.json({ byPage, last30, total: Number(totalRow?.total ?? 0) });
    } catch (error) {
        fail(res, error, 'fetching page view stats', 'Nie udało się pobrać statystyk.');
    }
});

adminRouter.delete('/stats/page-views/bot-cleanup', async (_req, res) => {
    try {
        const paths = [...TRACKED_PATHS];
        const result = await execute(`DELETE FROM page_views WHERE path NOT IN (${paths.map(() => '?').join(',')})`, paths);
        res.json({ deleted: result.affectedRows });
    } catch (error) {
        fail(res, error, 'cleaning bot page views', 'Nie udało się wyczyścić statystyk.');
    }
});

// ---------- Eksport CSV ----------

function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
    const escape = (value: unknown) => {
        let text = value instanceof Date ? value.toISOString() : String(value ?? '');
        // Komórki zaczynające się od =, +, - albo @ Excel wykonałby jako formułę.
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    };
    return [headers.join(','), ...rows.map(row => headers.map(h => escape(row[h])).join(','))].join('\r\n');
}

function sendCsv(res: Response, fileName: string, csv: string): void {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send('﻿' + csv);
}

adminRouter.get('/export/messages', async (_req, res) => {
    try {
        const headers = ['id', 'name', 'email', 'subject', 'message', 'ip_address', 'created_at'];
        const rows = await select<Record<string, unknown>>(`SELECT ${headers.join(', ')} FROM messages ORDER BY created_at DESC`);
        sendCsv(res, 'wiadomosci.csv', toCsv(rows, headers));
    } catch (error) {
        fail(res, error, 'exporting messages', 'Nie udało się przygotować eksportu.');
    }
});

adminRouter.get('/export/api-messages', async (_req, res) => {
    try {
        const rows = await select<Record<string, unknown>>(
            `SELECT am.id, ak.name AS api_key_name, am.name, am.email, am.phone, am.subject, am.message, am.ip_address, am.created_at
             FROM api_messages am JOIN api_keys ak ON am.api_key_id = ak.id ORDER BY am.created_at DESC`
        );
        const headers = ['id', 'api_key_name', 'name', 'email', 'phone', 'subject', 'message', 'ip_address', 'created_at'];
        sendCsv(res, 'wiadomosci-api.csv', toCsv(rows, headers));
    } catch (error) {
        fail(res, error, 'exporting API messages', 'Nie udało się przygotować eksportu.');
    }
});
