import './env';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import next from 'next';
import { pool, initDatabase, testConnection } from '@/lib/db';
import { mailer } from '@/lib/mailer';
import { Message } from '@/lib/models/message';
import { CLIENT_IP_HEADER, sanitizeIp } from '@/lib/security';
import { TRACKED_PATHS } from '@/lib/site';
import { deleteExpiredShortUrls } from '@/lib/shortener';
import { deleteExpiredFiles, ensureUploadsDir } from '@/lib/files';
import { blockedPage } from '@/server/blocked-page';
import { getMaintenanceConfig, isUnderMaintenance } from '@/server/maintenance';
import { limits } from '@/server/middleware';
import { publicRouter } from '@/server/routes/public';
import { adminRouter } from '@/server/routes/admin';
import { panelRouter } from '@/server/routes/panel';
import { createResourceRouter } from '@/server/routes/resources';

const dev = process.env.NODE_ENV !== 'production';
// Produkcja wymusza HTTPS. HTTPS_REDIRECT=off pozwala uruchomić build lokalnie po http.
const preview = process.env.WOJTOTEKA_PREVIEW === '1';
const httpsOnly = !dev && !preview && process.env.HTTPS_REDIRECT !== 'off';
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Webpack zamiast Turbopacka: Turbopack tworzy dowiązania (junction) w .next/,
// a tych nie obsługują m.in. dyski exFAT. Build (`npm run build`) też używa webpacka.
const nextApp = next({ dev, dir: process.cwd(), hostname: HOST, port: PORT, webpack: true });
const handle = nextApp.getRequestHandler();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ---------- Adres klienta ----------
// Ustalony raz, oczyszczony i przekazany do Next.js własnym nagłówkiem.
// Nagłówek jest zawsze nadpisywany, więc klient nie może go podrobić.
app.use((req, _res, nextFn) => {
    const forwarded = req.headers['x-forwarded-for'];
    const candidate =
        (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ||
        (req.headers['x-real-ip'] as string | undefined) ||
        req.socket.remoteAddress ||
        req.ip;
    req.realIP = sanitizeIp(candidate);
    req.headers[CLIENT_IP_HEADER] = req.realIP;
    nextFn();
});

app.use((req, res, nextFn) => {
    if (httpsOnly && !req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect('https://' + req.get('host') + req.url);
    }
    nextFn();
});

// ---------- Nagłówki bezpieczeństwa ----------
const hcaptcha = ['https://hcaptcha.com', 'https://*.hcaptcha.com'];
const hetrix = ['https://wl.hetrixtools.com', 'https://*.hetrixtools.com'];

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // Next.js wstrzykuje skrypty inline z danymi strony, stąd 'unsafe-inline'.
                // 'unsafe-eval' i websocket tylko w trybie deweloperskim (HMR).
                scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.hcaptcha.com', ...hcaptcha, 'https://static.hetrix.io', ...(dev ? ["'unsafe-eval'"] : [])],
                scriptSrcAttr: ["'none'"],
                styleSrc: ["'self'", "'unsafe-inline'", ...hcaptcha],
                frameSrc: [...hcaptcha, ...hetrix],
                connectSrc: ["'self'", ...hcaptcha, ...hetrix, ...(dev ? ['ws:', 'wss:'] : [])],
                imgSrc: ["'self'", 'data:', 'blob:'],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: httpsOnly ? [] : null
            }
        },
        hsts: httpsOnly ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    })
);

// Gry microStudio potrzebują luźniejszej CSP: silnik inicjalizował audio przez
// eval(), a stare kopie plików długo żyją w cache Cloudflare i przeglądarek.
// 'unsafe-eval' dotyczy TYLKO ścieżek gier.
const GAME_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
    "script-src-attr 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self' https://cloudflareinsights.com",
    "object-src 'none'",
    "frame-ancestors 'none'"
].join('; ');
const GAME_PATH = /^\/(fishing|gloomcraft|nightdrive|ropeclimber|4inarow)(\/|$)/i;

// Stare strony statyczne w public/ mają atrybuty onclick, więc dostają
// dokładnie tę politykę, którą miała cała strona przed przejściem na Next.js.
const LEGACY_STATIC_PATH = /^\/(RoyalCasinoBot|inne|hack|dance|nonStopPop|glebina|trybka|blystka)(\/|$)/;
const LEGACY_CSP = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.hcaptcha.com https://hcaptcha.com https://static.hetrix.io`,
    "script-src-attr 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `frame-src ${[...hcaptcha, ...hetrix].join(' ')}`,
    `connect-src 'self' https://hcaptcha.com ${hetrix.join(' ')}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'"
].join('; ');

// Te adresy leżą w folderach starych stron, ale renderuje je Next.js
// z własną polityką z helmeta.
const NEXT_PAGE_PATH = /^\/(RoyalCasinoBot(\/(polityka|regulamin))?|inne\/(ai|litho)|hack|nonStopPop)\/?$/;

app.use((req, res, nextFn) => {
    if (GAME_PATH.test(req.path)) res.setHeader('Content-Security-Policy', GAME_CSP);
    else if (LEGACY_STATIC_PATH.test(req.path) && !NEXT_PAGE_PATH.test(req.path)) res.setHeader('Content-Security-Policy', LEGACY_CSP);
    nextFn();
});

// ---------- Renderowanie stron błędów przez Next.js ----------
async function renderNotFound(req: Request, res: Response): Promise<void> {
    res.status(404);
    await nextApp.render404(req, res);
}

async function renderUnavailable(req: Request, res: Response): Promise<void> {
    res.status(503).setHeader('Retry-After', '300');
    await nextApp.render(req, res, '/niedostepne');
}

// ---------- Blokada IP na całą stronę ----------
app.use(async (req, res, nextFn) => {
    const p = req.path;
    if (preview) return nextFn();
    if (p.startsWith('/api/') || p.startsWith('/admin') || p.startsWith('/panel') || p.startsWith('/img/')) return nextFn();
    try {
        if (req.realIP !== 'unknown' && (await Message.isIPBannedSiteWide(req.realIP))) {
            res.status(403).type('html').send(blockedPage());
            return;
        }
    } catch {
        // przy błędzie bazy nie blokujemy
    }
    nextFn();
});

// ---------- Tryb konserwacji ----------
app.use(async (req, res, nextFn) => {
    if (req.method !== 'GET' || preview) return nextFn();
    // ?dev omija stronę budowy, żeby dało się podejrzeć stronę w trakcie prac.
    // To nie jest zabezpieczenie, tylko wygodny przełącznik dla autora.
    if ('dev' in req.query) return nextFn();
    const p = req.path;
    if (
        p.startsWith('/api/') ||
        p.startsWith('/_next/') ||
        p.startsWith('/img/') ||
        p.startsWith('/js/') ||
        p.startsWith('/uploads/') ||
        p.startsWith('/cdn-cgi/') ||
        p.startsWith('/admin') ||
        p.startsWith('/panel') ||
        p === '/budowa' ||
        p.includes('.')
    ) {
        return nextFn();
    }
    try {
        const config = await getMaintenanceConfig();
        if (isUnderMaintenance(config, p)) {
            res.status(503).setHeader('Retry-After', '3600');
            await nextApp.render(req, res, '/budowa');
            return;
        }
    } catch {
        // błąd bazy: pokazujemy normalną stronę
    }
    nextFn();
});

// ---------- Statystyki odwiedzin (tylko znane ścieżki) ----------
app.use((req, _res, nextFn) => {
    if (req.method === 'GET' && !preview) {
        const cleanPath = req.path.replace(/\/$/, '') || '/';
        if (TRACKED_PATHS.has(cleanPath)) {
            pool.query(
                'INSERT INTO page_views (path, date, count, last_seen) VALUES (?, CURDATE(), 1, NOW()) ON DUPLICATE KEY UPDATE count = count + 1, last_seen = NOW()',
                [cleanPath]
            ).catch(() => {});
        }
    }
    nextFn();
});

// ---------- Pliki statyczne: gry, grafiki, stare podstrony ----------
// Folder z index.html (gra, eksperyment) bez końcowego ukośnika dostaje
// przekierowanie z ukośnikiem, bo gry ładują zasoby ścieżkami względnymi.
// Folder bez index.html (np. /RoyalCasinoBot z samymi grafikami) idzie dalej do Next.js,
// dlatego express.static ma wyłączone własne przekierowanie folderów.
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const folderIndex = new Map<string, boolean>();

function hasFolderIndex(urlPath: string): boolean {
    let cached = folderIndex.get(urlPath);
    if (cached === undefined) {
        let target: string;
        try {
            target = path.join(PUBLIC_ROOT, decodeURIComponent(urlPath), 'index.html');
        } catch {
            return false;
        }
        cached = target.startsWith(PUBLIC_ROOT + path.sep) && fs.existsSync(target);
        folderIndex.set(urlPath, cached);
    }
    return cached;
}

app.use((req, res, nextFn) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && req.path.length > 1 && !req.path.endsWith('/') && hasFolderIndex(req.path)) {
        const query = req.originalUrl.slice(req.path.length);
        res.redirect(301, req.path + '/' + query);
        return;
    }
    nextFn();
});

app.use(express.static('public', { index: 'index.html', redirect: false }));

// ---------- Auth.js (obsługuje Next.js, body nie może być wcześniej sparsowane) ----------
app.use(
    '/api/auth',
    (req, res, nextFn) => (req.method === 'POST' && req.path.startsWith('/callback') ? limits.authCallback(req, res, nextFn) : nextFn()),
    (req, res) => {
        req.url = req.originalUrl;
        return handle(req, res);
    }
);

// ---------- API ----------
app.use('/api', express.json({ limit: '1mb' }), express.urlencoded({ extended: true, limit: '1mb' }));

app.use((err: unknown, req: Request, res: Response, nextFn: NextFunction) => {
    if ((err as { type?: string })?.type === 'entity.parse.failed') {
        console.warn(`[SECURITY] Malformed JSON body - ${req.method} ${req.path} - IP: ${req.realIP}`);
        res.status(400).json({ message: 'Nieprawidłowy JSON w body żądania', details: 'Sprawdź składnię JSON (przecinki, cudzysłowy, nawiasy).' });
        return;
    }
    nextFn(err);
});

app.use('/api/admin', adminRouter);
app.use('/api/panel', panelRouter);
app.use('/api', publicRouter);
app.use('/api', (req, res, nextFn) => {
    // /api bez niczego dalej to strona z dokumentacją (Next.js).
    if (req.originalUrl.split('?')[0].replace(/\/$/, '') === '/api') return nextFn();
    res.status(404).json({ message: 'Nie ma takiego endpointu.' });
});

// ---------- Krótkie linki, pliki, Litho, statyczne podstrony ----------
app.use(createResourceRouter({ notFound: renderNotFound, serverError: renderUnavailable }));

// ---------- Wszystko inne renderuje Next.js ----------
app.use((req, res) => handle(req, res));

app.use((err: unknown, req: Request, res: Response, _nextFn: NextFunction) => {
    console.error(`Unhandled error - ${req.method} ${req.path}:`, err);
    if (res.headersSent) return;
    if (req.path.startsWith('/api/')) res.status(500).json({ message: 'Błąd serwera.' });
    else void renderUnavailable(req, res);
});

// Express 5 przekazuje błąd nasłuchu (np. zajęty port) do callbacka listen.
function listenFailed(error: Error | undefined): boolean {
    if (!error) return false;
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        console.error(`[SERWER] Port ${PORT} jest zajęty. Zamknij inny serwer albo zmień PORT w .env.`);
    } else {
        console.error('[SERWER] Błąd nasłuchu:', error);
    }
    process.exit(1);
}

async function startPreview(): Promise<void> {
    await nextApp.prepare();
    app.listen(PORT, HOST, error => {
        if (listenFailed(error)) return;
        console.log(`
[PODGLĄD] http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT} (bez bazy danych)`);
        console.log('[PODGLĄD] Strony publiczne działają. Logowanie, formularze i panele wymagają bazy.');
    });
}

async function start(): Promise<void> {
    if (preview) return startPreview();
    try {
        if (!(await testConnection())) throw new Error('Brak połączenia z bazą danych');
        await initDatabase();
        ensureUploadsDir();
        void mailer.verifyConnection();

        const cleanup = () => Promise.all([deleteExpiredShortUrls(), deleteExpiredFiles()]).catch(error =>
            console.error('Error during expired entries cleanup:', error)
        );
        void cleanup();
        setInterval(cleanup, 5 * 60 * 1000);

        await nextApp.prepare();

        app.listen(PORT, HOST, error => {
            if (listenFailed(error)) return;
            console.log(`\n[SERWER] http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT} (${dev ? 'dev' : 'produkcja'})`);
            console.log(`[SERWER] Panel admina: /admin, panel skrzynki: /panel, API: /api/v1/contact`);
            if (HOST === '127.0.0.1') console.log('[SERWER] Nasłuch tylko na localhost, niedostępny z innych urządzeń w sieci.');
        });
    } catch (error) {
        console.error('[SERWER] Błąd podczas uruchamiania:', error);
        process.exit(1);
    }
}

void start();
