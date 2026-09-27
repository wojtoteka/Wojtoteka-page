import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { execute, selectOne } from '@/lib/db';
import { DEMO_CODE, DEMO_TARGET, validateShortUrl } from '@/lib/shortener';
import { UPLOADS_DIR, inlinePreviewMime, isStoredName, sanitizeDownloadFileName } from '@/lib/files';
import { LITHO_DIR, filterLithoFiles, findLithoFile, scanLitho } from '@/lib/litho';
import { limits } from '@/server/middleware';

type Renderer = (req: Request, res: Response) => Promise<void>;

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Trasy poza /api, które obsługuje Express, a nie Next.js:
 * krótkie linki, pobieranie plików, instalatory Litho i statyczne podstrony
 * w public/ (RoyalCasinoBot, eksperymenty w /inne).
 */
export function createResourceRouter(render: { notFound: Renderer; serverError: Renderer }): Router {
    const router = Router();

    // ---------- Krótkie linki ----------
    router.get('/url/:code', limits.publicResource, async (req, res) => {
        const code = String(req.params.code);
        // Przykładowy link z opisu skracacza nie jest w bazie, działa zawsze.
        if (code === DEMO_CODE) return res.redirect(302, DEMO_TARGET);
        if (!/^[A-Za-z0-9]{1,10}$/.test(code)) return render.notFound(req, res);
        try {
            const entry = await selectOne<{ id: number; original_url: string; expires_at: Date | null }>(
                'SELECT id, original_url, expires_at FROM short_urls WHERE code = ? LIMIT 1',
                [code]
            );
            if (!entry) return render.notFound(req, res);

            // Adres sprawdzamy ponownie przy każdym wejściu: lista blokad mogła się zmienić.
            const validation = validateShortUrl(entry.original_url, req.realIP);
            if (!validation.ok) {
                res.status(410).type('text/plain; charset=utf-8').send('Ten link jest niedostępny ze względów bezpieczeństwa.');
                return;
            }
            if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
                res.status(410).type('text/plain; charset=utf-8').send('Ten link wygasł.');
                return;
            }
            await execute('UPDATE short_urls SET click_count = click_count + 1 WHERE id = ?', [entry.id]);
            res.redirect(302, validation.normalizedUrl);
        } catch (error) {
            console.error('Short URL redirect error:', error);
            return render.serverError(req, res);
        }
    });

    // ---------- Udostępnione pliki ----------
    router.get('/file', (_req, res) => res.redirect(302, '/'));

    router.get('/file/:code', limits.publicResource, async (req, res) => {
        const code = String(req.params.code);
        if (!/^[A-Za-z0-9]{1,10}$/.test(code)) return render.notFound(req, res);
        try {
            const entry = await selectOne<{
                id: number;
                original_name: string;
                stored_name: string;
                mime_type: string;
                preview_enabled: number;
                expires_at: Date | null;
            }>(
                'SELECT id, original_name, stored_name, mime_type, preview_enabled, expires_at FROM shared_files WHERE code = ? LIMIT 1',
                [code]
            );
            if (!entry) return render.notFound(req, res);
            if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
                res.status(410).type('text/plain; charset=utf-8').send('Ten plik wygasł.');
                return;
            }
            if (!isStoredName(entry.stored_name)) {
                console.error('[SECURITY] Invalid stored_name in shared_files');
                return render.serverError(req, res);
            }
            const filePath = path.join(UPLOADS_DIR, entry.stored_name);
            if (!fs.existsSync(filePath)) return render.notFound(req, res);

            await execute('UPDATE shared_files SET download_count = download_count + 1 WHERE id = ?', [entry.id]);

            const inlineMime = inlinePreviewMime(entry.original_name, entry.mime_type);
            const preview = Number(entry.preview_enabled) === 1 && !!inlineMime && req.query.download !== '1';
            if (preview && inlineMime) {
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
                res.setHeader('Content-Disposition', `inline; filename="${sanitizeDownloadFileName(entry.original_name)}"`);
                res.type(inlineMime);
                res.sendFile(filePath);
                return;
            }
            res.download(filePath, entry.original_name);
        } catch (error) {
            console.error('File download error:', error);
            return render.serverError(req, res);
        }
    });

    // ---------- Litho Studio ----------
    router.get('/litho/download/latest/:platform', limits.publicResource, (req, res) => {
        const platform = String(req.params.platform).toLowerCase();
        if (platform !== 'windows' && platform !== 'linux') return render.notFound(req, res);
        const files = filterLithoFiles(scanLitho()[platform].files, req.query as Record<string, unknown>);
        if (files.length === 0) return render.notFound(req, res);
        res.redirect(302, files[0].url);
    });

    // Nazwa musi zgadzać się z wynikiem skanu katalogu, więc nie da się
    // tędy wyjść poza public/inne/litho/file/.
    router.get('/litho/download/:file', limits.publicResource, (req, res) => {
        const entry = findLithoFile(String(req.params.file));
        if (!entry) return render.notFound(req, res);
        res.download(path.join(LITHO_DIR, entry.file), entry.file);
    });

    router.get('/litho', (_req, res) => res.redirect(301, '/inne/litho'));

    // ---------- Stare adresy .html ----------
    const moved: Record<string, string> = {
        '/index.html': '/',
        '/gry.html': '/gry',
        '/kontakt.html': '/kontakt',
        '/api.html': '/api',
        '/status.html': '/status',
        '/admin.html': '/admin',
        '/panel.html': '/panel',
        '/polityka-nightdrive.html': '/polityka-nightdrive',
        '/polityka-fishingparty.html': '/polityka-fishingparty',
        '/polityka-prywatnosci.html': '/polityka-prywatnosci',
        '/budowa.html': '/budowa',
        '/soon.html': '/soon',
        '/404.html': '/',
        '/503.html': '/',
        // Podstrony przeniesione z public/ do Next.js
        '/RoyalCasinoBot/index.html': '/RoyalCasinoBot',
        '/RoyalCasinoBot/polityka.html': '/RoyalCasinoBot/polityka',
        '/RoyalCasinoBot/regulamin.html': '/RoyalCasinoBot/regulamin',
        '/inne/litho/index.html': '/inne/litho'
    };
    router.get(Object.keys(moved), (req, res) => res.redirect(301, moved[req.path]));

    // ---------- Statyczne podstrony z public/ bez końcówki .html ----------
    // /sciezka/plik.html -> 301 na /sciezka/plik
    // /sciezka/plik      -> public/sciezka/plik.html, jeśli istnieje
    // /sciezka/          -> public/sciezka/index.html obsługuje express.static
    const resolveHtml = (relPath: string): string | null => {
        const filePath = path.join(PUBLIC_DIR, relPath + '.html');
        return filePath.startsWith(PUBLIC_DIR + path.sep) ? filePath : null;
    };

    router.get(/^\/(.+)\.html$/, (req, res, next) => {
        const rel = (req.params as Record<string, string>)[0];
        const filePath = resolveHtml(rel);
        if (!filePath || !fs.existsSync(filePath)) return next();
        res.redirect(301, '/' + rel.replace(/\/index$/, '/'));
    });

    router.get(/^\/([^.]+?)\/?$/, (req, res, next) => {
        const rel = (req.params as Record<string, string>)[0];
        const filePath = resolveHtml(rel);
        if (!filePath || !fs.existsSync(filePath)) return next();
        res.sendFile(filePath);
    });

    return router;
}
