const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const net = require('net');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const multer = require('multer');
require('dotenv').config();

const { testConnection, initDatabase } = require('./config/database');
const { pool } = require('./config/database');
const emailNotifier = require('./config/emailNotifier');
const Message = require('./models/Message');
const Admin = require('./models/Admin');
const ApiKey = require('./models/ApiKey');
const SubAccount = require('./models/SubAccount');
const ApiMessage = require('./models/ApiMessage');

const defaultShortenerSecurityConfig = {
    requireHttps: false,
    checkBlockedDomains: true,
    checkBlockedKeywords: true,
    useExceptions: true,
    logBlockedAttempts: true,
    logIpAddress: true,
    strictMode: true,
    errorMessages: {
        httpRequired: 'Dozwolone są tylko URL-e HTTPS.',
        domainBlocked: 'Ta domena jest zablokowana.',
        keywordBlocked: 'Ta domena została zablokowana przez filtr bezpieczeństwa.',
        invalidUrl: 'Nieprawidłowy URL.'
    }
};

let shortenerSecurityConfig = { ...defaultShortenerSecurityConfig };
let shortenerBlockedDomains = [];
let shortenerBlockedKeywords = [];
let shortenerAllowedExceptions = [];

try {
    const loadedSecurityConfig = require('./s_url/security-config');
    const loadedDomainRules = require('./s_url/blocked-domains');

    shortenerSecurityConfig = {
        ...defaultShortenerSecurityConfig,
        ...(loadedSecurityConfig || {}),
        errorMessages: {
            ...defaultShortenerSecurityConfig.errorMessages,
            ...(loadedSecurityConfig?.errorMessages || {})
        }
    };

    shortenerBlockedDomains = Array.isArray(loadedDomainRules?.blockedDomains)
        ? loadedDomainRules.blockedDomains.map(domain => String(domain).toLowerCase().trim()).filter(Boolean)
        : [];

    shortenerBlockedKeywords = Array.isArray(loadedDomainRules?.blockedKeywords)
        ? loadedDomainRules.blockedKeywords.map(keyword => String(keyword).toLowerCase().trim()).filter(Boolean)
        : [];

    shortenerAllowedExceptions = Array.isArray(loadedDomainRules?.allowedExceptions)
        ? loadedDomainRules.allowedExceptions.map(domain => String(domain).toLowerCase().trim()).filter(Boolean)
        : [];
} catch (error) {
    console.warn('[SHORTENER] Nie udało się załadować konfiguracji z ./s_url, używam domyślnej konfiguracji bezpieczeństwa.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Uploads directory for file sharing
const uploadsDir = path.join(__dirname, 'uploads', 'files');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex'))
});

const fileUpload = multer({
    storage: fileStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB (Cloudflare proxy caps uploads at 100 MB)
});

// Generate unique 6-char alphanumeric code for a given table
async function generateUniqueCode(tableName, length = 6) {
    const allowed = ['short_urls', 'shared_files'];
    if (!allowed.includes(tableName)) throw new Error('Invalid table name');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let attempt = 0; attempt < 10; attempt++) {
        const bytes = crypto.randomBytes(length);
        let code = '';
        for (let i = 0; i < length; i++) code += chars[bytes[i] % chars.length];
        const [rows] = await pool.query(`SELECT id FROM \`${tableName}\` WHERE code = ? LIMIT 1`, [code]);
        if (rows.length === 0) return code;
    }
    throw new Error('Failed to generate unique code');
}

// Cleanup expired short URLs and shared files
async function cleanupExpiredEntries() {
    try {
        await pool.query('DELETE FROM short_urls WHERE expires_at IS NOT NULL AND expires_at < NOW()');
        const [expiredFiles] = await pool.query(
            'SELECT stored_name FROM shared_files WHERE expires_at IS NOT NULL AND expires_at < NOW()'
        );
        if (expiredFiles.length > 0) {
            await pool.query('DELETE FROM shared_files WHERE expires_at IS NOT NULL AND expires_at < NOW()');
            for (const file of expiredFiles) {
                if (/^[a-f0-9]{32}$/.test(file.stored_name)) {
                    fs.unlink(path.join(uploadsDir, file.stored_name), () => {});
                }
            }
        }
    } catch (error) {
        console.error('Error during expired entries cleanup:', error);
    }
}

function hostMatchesDomain(host, domain) {
    return host === domain || host.endsWith(`.${domain}`);
}

function isExceptionHost(host) {
    if (!shortenerSecurityConfig.useExceptions) return false;
    return shortenerAllowedExceptions.some(allowedDomain => hostMatchesDomain(host, allowedDomain));
}

function logBlockedShortenerAttempt(reason, rawUrl, host, requestIP) {
    if (!shortenerSecurityConfig.logBlockedAttempts) return;

    const ipSection = shortenerSecurityConfig.logIpAddress && requestIP
        ? ` - IP: ${requestIP}`
        : '';

    console.warn(`[SHORTENER][BLOCKED] ${reason}${ipSection} - HOST: ${host || 'n/a'} - URL: ${rawUrl || 'n/a'}`);
}

function getShortenerUrlValidation(rawUrl, options = {}) {
    const requestIP = options.requestIP || null;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
        return { ok: false, message: 'URL jest wymagany' };
    }

    const trimmed = rawUrl.trim();
    if (trimmed.length > 2048) {
        return { ok: false, message: 'URL jest zbyt długi (max 2048 znaków)' };
    }

    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { ok: false, message: shortenerSecurityConfig.errorMessages.invalidUrl };
    }

    if (shortenerSecurityConfig.requireHttps) {
        if (parsed.protocol !== 'https:') {
            logBlockedShortenerAttempt('HTTP protocol blocked', rawUrl, parsed.hostname, requestIP);
            return { ok: false, message: shortenerSecurityConfig.errorMessages.httpRequired };
        }
    } else if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, message: 'Dozwolone są tylko URL-e HTTP i HTTPS' };
    }

    if (parsed.username || parsed.password) {
        return { ok: false, message: 'URL z loginem/hasłem nie jest dozwolony' };
    }

    const host = (parsed.hostname || '').toLowerCase();
    if (!host) {
        return { ok: false, message: 'Nieprawidłowy host URL' };
    }

    if (shortenerSecurityConfig.strictMode) {
        if (host === 'localhost' || host.endsWith('.local')) {
            logBlockedShortenerAttempt('Local host blocked by strict mode', rawUrl, host, requestIP);
            return { ok: false, message: 'Adresy lokalne nie są dozwolone' };
        }

        if (net.isIP(host)) {
            logBlockedShortenerAttempt('IP host blocked by strict mode', rawUrl, host, requestIP);
            return { ok: false, message: 'Adresy IP nie są dozwolone' };
        }
    }

    if (shortenerSecurityConfig.checkBlockedDomains && !isExceptionHost(host)) {
        for (const blocked of shortenerBlockedDomains) {
            if (hostMatchesDomain(host, blocked)) {
                logBlockedShortenerAttempt('Blocked domain', rawUrl, host, requestIP);
                return { ok: false, message: shortenerSecurityConfig.errorMessages.domainBlocked };
            }
        }
    }

    if (shortenerSecurityConfig.checkBlockedKeywords && !isExceptionHost(host)) {
        const fullUrlLower = parsed.toString().toLowerCase();
        for (const keyword of shortenerBlockedKeywords) {
            if (fullUrlLower.includes(keyword)) {
                logBlockedShortenerAttempt('Blocked keyword in URL', rawUrl, host, requestIP);
                return { ok: false, message: shortenerSecurityConfig.errorMessages.keywordBlocked };
            }
        }
    }

    return {
        ok: true,
        normalizedUrl: parsed.toString()
    };
}

const codePreviewExtensions = new Set([
    '.txt', '.md', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
    '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.php',
    '.rb', '.swift', '.kt', '.sql', '.xml', '.yaml', '.yml', '.ini', '.toml',
    '.csv', '.log', '.sh', '.bat', '.ps1', '.css', '.html', '.htm'
]);

const binaryInlineMimePrefixes = ['image/', 'audio/', 'video/'];

function getInlinePreviewMime(originalName, mimeType) {
    const ext = path.extname(String(originalName || '')).toLowerCase();
    const normalizedMime = String(mimeType || '').toLowerCase();

    if (ext === '.pdf' || normalizedMime === 'application/pdf') {
        return 'application/pdf';
    }

    if (codePreviewExtensions.has(ext)) {
        if (ext === '.json') return 'application/json; charset=utf-8';
        if (ext === '.md') return 'text/markdown; charset=utf-8';
        if (ext === '.csv') return 'text/csv; charset=utf-8';
        return 'text/plain; charset=utf-8';
    }

    if (normalizedMime.startsWith('text/')) {
        return `${normalizedMime}; charset=utf-8`;
    }

    for (const prefix of binaryInlineMimePrefixes) {
        if (normalizedMime.startsWith(prefix)) {
            return normalizedMime;
        }
    }

    return null;
}

function sanitizeDownloadFileName(fileName) {
    return (
        String(fileName || 'plik')
            .replace(/[\x00-\x1f\x7f]/g, '')
            .replace(/[/\\]/g, '_')
            .replace(/\.{2,}/g, '.')
            .replace(/"/g, '_')
            .substring(0, 255) || 'plik'
    );
}

// Adres IP pochodzi z nagłówków (X-Forwarded-For / X-Real-IP), które klient może
// dowolnie ustawić. Zostawiamy wyłącznie znaki występujące w adresach IPv4/IPv6,
// dzięki czemu żaden ładunek (cudzysłowy, <, >, spacje) nie może zostać zapisany,
// zalogowany, wysłany mailem ani wyrenderowany w panelu (ochrona przed stored XSS).
function sanitizeIp(value) {
    if (!value) return 'unknown';
    const cleaned = String(value).replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45);
    return cleaned || 'unknown';
}

// ====== GŁĘBINA: token sesji zanurzenia (anty-cheat dla leaderboardu) ======
// Token = <znacznikCzasu>.<HMAC>, podpisany sekretem serwera. Nie wymaga stanu
// po stronie serwera (przeżywa restarty), a jego wiek pozwala ograniczyć,
// jak duży wynik jest fizycznie możliwy do osiągnięcia w danym czasie gry.
const GLEBINA_TOKEN_SECRET = process.env.GLEBINA_TOKEN_SECRET || process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const GLEBINA_MIN_SESSION_MS = 3 * 1000;        // poniżej tego wieku token jest odrzucany (zbyt szybko na realny wynik)
const GLEBINA_MAX_SESSION_MS = 2 * 60 * 60 * 1000; // maksymalna ważność tokenu (2 h — długie zanurzenia nie tracą wyniku; GLEBINA_HARD_CAP i tak ogranicza nadużycia)
const GLEBINA_MAX_M_PER_S = 60;                 // hojny górny limit tempa opadania (fizyka gry pozwala na maks. ok. 47 m/s)
const GLEBINA_SCORE_BUFFER = 60;                // margines na start zanurzenia i chwilowe przyspieszenia
const GLEBINA_HARD_CAP = 20000;                 // absolutny sufit bezpieczeństwa, niezależny od czasu
const GLEBINA_MAX_ENTRIES_PER_IP = 3;           // ile wpisów naraz może trzymać jedno IP (rodzina/sieć publiczna dzieli adres)
const GLEBINA_NEW_ENTRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // okno throttlingu nowych wpisów na IP
const GLEBINA_NEW_ENTRIES_PER_WINDOW = 3;       // maks. prób dodania NOWEGO wpisu na IP / okno (adresy bywają dynamiczne, to tylko utrudnienie, nie pewność)

const GLEBINA_OWNER_COOKIE = 'glebina_owner';
const GLEBINA_OWNER_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 dni, odświeżane przy każdym udanym zapisie

// Ciasteczko wiąże tę przeglądarkę z JEDNYM nickiem, żeby przy współdzielonym
// IP (rodzina, sieć publiczna) jedna osoba nie mogła sama zająć wszystkich
// GLEBINA_MAX_ENTRIES_PER_IP slotów - do 3 różnych nicków z tego samego IP
// wymaga 3 różnych przeglądarek/urządzeń. Podpis HMAC chroni tylko przed
// podszyciem się pod cudzy nick - nie przed usunięciem/zablokowaniem ciasteczka.
function signGlebinaOwner(nick) {
    const encoded = Buffer.from(nick, 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', GLEBINA_TOKEN_SECRET).update(encoded).digest('hex').slice(0, 32);
    return `${encoded}.${sig}`;
}

function verifyGlebinaOwnerCookie(raw) {
    if (typeof raw !== 'string' || raw.length > 200) return null;
    const idx = raw.lastIndexOf('.');
    if (idx <= 0) return null;
    const encoded = raw.slice(0, idx);
    const sig = raw.slice(idx + 1);
    if (!sig || !/^[a-f0-9]+$/.test(sig)) return null;

    const expected = crypto.createHmac('sha256', GLEBINA_TOKEN_SECRET).update(encoded).digest('hex').slice(0, 32);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

    try {
        return Buffer.from(encoded, 'base64url').toString('utf8');
    } catch {
        return null;
    }
}

function getCookieValue(req, name) {
    const header = req.headers.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
    }
    return null;
}

function signGlebinaToken() {
    const ts = Date.now().toString(36);
    const hmac = crypto.createHmac('sha256', GLEBINA_TOKEN_SECRET).update(ts).digest('hex');
    return `${ts}.${hmac}`;
}

function verifyGlebinaToken(token) {
    if (typeof token !== 'string' || token.length > 100) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [ts, hmac] = parts;
    if (!ts || !hmac || !/^[a-f0-9]+$/.test(hmac)) return null;

    const expected = crypto.createHmac('sha256', GLEBINA_TOKEN_SECRET).update(ts).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const givenBuf = Buffer.from(hmac, 'hex');
    if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) return null;

    const issuedAt = parseInt(ts, 36);
    if (!Number.isFinite(issuedAt)) return null;
    const age = Date.now() - issuedAt;
    if (age < GLEBINA_MIN_SESSION_MS || age > GLEBINA_MAX_SESSION_MS) return null;
    return { age };
}

function validateGlebinaNick(raw) {
    if (typeof raw !== 'string') return null;
    const nick = raw.trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}0-9 _-]{2,16}$/u.test(nick)) return null;
    return nick;
}

async function getGlebinaTop5() {
    const [rows] = await pool.query('SELECT nick, score FROM glebina_scores ORDER BY score DESC, created_at ASC LIMIT 5');
    return rows;
}

app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.hcaptcha.com", "https://hcaptcha.com", "https://static.hetrix.io"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            frameSrc: ["https://hcaptcha.com", "https://*.hcaptcha.com", "https://wl.hetrixtools.com", "https://*.hetrixtools.com"],
            connectSrc: ["'self'", "https://hcaptcha.com", "https://wl.hetrixtools.com", "https://*.hetrixtools.com"],
            imgSrc: ["'self'", "data:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameAncestors: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true
}));

// Gry microStudio potrzebują luźniejszej CSP niż reszta strony: silnik
// (microengine.js) historycznie inicjalizował audio przez eval(), a stare
// kopie pliku mogą jeszcze długo żyć w cache Cloudflare/przeglądarek.
// 'unsafe-eval' jest tu dopuszczone TYLKO na ścieżkach gier - globalna
// polityka wyżej pozostaje nienaruszona, więc nic innego się nie zmienia.
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

const GAME_PATH_REGEX = /^\/(fishing|gloomcraft|nightdrive|ropeclimber|4inarow)(\/|$)/i;

app.use((req, res, next) => {
    if (GAME_PATH_REGEX.test(req.path)) {
        res.setHeader('Content-Security-Policy', GAME_CSP);
    }
    next();
});

app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Zbyt wiele żądań z tego adresu IP, spróbuj ponownie za 15 minut',
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    skipSuccessfulRequests: true,
    message: 'Zbyt wiele nieudanych prób logowania, spróbuj ponownie za 15 minut',
    standardHeaders: true,
    legacyHeaders: false,
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 5, 
    message: 'Zbyt wiele wiadomości, spróbuj ponownie za godzinę',
    standardHeaders: true,
    legacyHeaders: false,
});

const panelLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    message: 'Zbyt wiele nieudanych prób logowania, spróbuj ponownie za 15 minut',
    standardHeaders: true,
    legacyHeaders: false,
});

const apiContactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Zbyt wiele wiadomości API, spróbuj ponownie za godzinę',
    standardHeaders: true,
    legacyHeaders: false,
});

// Dodatkowy limit liczony po samym kluczu API (nie po IP) - ogranicza nadużycie
// jednego wyciekłego/odgadniętego klucza rozłożone na wiele różnych adresów IP.
const apiKeyContactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => String(req.headers['x-api-key'] || req.body?.apiKey || 'no-key'),
    message: { message: 'Zbyt wiele wiadomości dla tego klucza API, spróbuj ponownie za godzinę' },
    standardHeaders: true,
    legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { message: 'Zbyt wiele prób resetowania hasła, spróbuj ponownie za 15 minut' },
    standardHeaders: true,
    legacyHeaders: false,
});

const publicResourceLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message: 'Zbyt wiele żądań, spróbuj ponownie za 15 minut',
    standardHeaders: true,
    legacyHeaders: false,
});

const publicShortenerCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { message: 'Za dużo prób skracania linków. Spróbuj ponownie za godzinę.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const sendEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { message: 'Zbyt wiele wysyłek email, spróbuj ponownie za godzinę' },
    standardHeaders: true,
    legacyHeaders: false,
});

const bioLinkClickLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    keyGenerator: (req) => `${ipKeyGenerator(req.realIP ? { ...req, ip: req.realIP } : req)}-${req.params.id}`,
    message: { ok: false },
    standardHeaders: false,
    legacyHeaders: false,
    skip: () => false,
});

const glebinaTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    message: { message: 'Zbyt wiele żądań, spróbuj ponownie za chwilę' },
    standardHeaders: true,
    legacyHeaders: false,
});

const glebinaScoreLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { ok: false, message: 'Zbyt wiele prób zapisu wyniku, spróbuj ponownie za 15 minut' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(bodyParser.json({ limit: '1mb' })); 
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        console.warn(`[SECURITY] Malformed JSON body - ${req.method} ${req.path} - IP: ${req.realIP || req.ip}`);

        if (req.path.startsWith('/api/')) {
            return res.status(400).json({
                message: 'Nieprawidłowy JSON w body żądania',
                details: 'Sprawdź składnię JSON (przecinki, cudzysłowy, nawiasy).'
            });
        }

        return res.status(400).send('Bad Request');
    }

    return next(err);
});

// Obsługa robots.txt i sitemap.xml z prawidłowymi nagłówkami
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// Wymuś jedną kanoniczną trasę — przekierowania .html → czyste URL
app.get('/status.html', (req, res) => res.redirect(301, '/status'));
app.get('/gry.html', (req, res) => res.redirect(301, '/gry'));
app.get('/kontakt.html', (req, res) => res.redirect(301, '/kontakt'));
app.get('/api.html', (req, res) => res.redirect(301, '/api'));
app.get('/polityka-nightdrive.html', (req, res) => res.redirect(301, '/polityka-nightdrive'));
app.get('/polityka-fishingparty.html', (req, res) => res.redirect(301, '/polityka-fishingparty'));
app.get('/polityka-prywatnosci.html', (req, res) => res.redirect(301, '/polityka-prywatnosci'));
app.get('/budowa.html', (req, res) => res.redirect(301, '/budowa'));
app.get('/soon.html', (req, res) => res.redirect(301, '/soon'));
app.get('/RoyalCasinoBot/index.html', (req, res) => res.redirect(301, '/RoyalCasinoBot'));
app.get('/RoyalCasinoBot/polityka.html', (req, res) => res.redirect(301, '/RoyalCasinoBot/polityka'));
app.get('/RoyalCasinoBot/regulamin.html', (req, res) => res.redirect(301, '/RoyalCasinoBot/regulamin'));

// === Maintenance mode cache (15s TTL) ===
let maintenanceCache = { mode: 'off', paths: [], ts: 0 };

async function getMaintenanceConfig() {
    if (Date.now() - maintenanceCache.ts < 15000) return maintenanceCache;
    try {
        const [rows] = await pool.query(
            'SELECT `key`, `value` FROM site_settings WHERE `key` IN (?, ?)',
            ['maintenance_mode', 'maintenance_paths']
        );
        const s = {};
        rows.forEach(r => { s[r.key] = r.value; });
        maintenanceCache = {
            mode: s.maintenance_mode || 'off',
            paths: (() => { try { return JSON.parse(s.maintenance_paths || '[]'); } catch { return []; } })(),
            ts: Date.now()
        };
    } catch {}
    return maintenanceCache;
}

function invalidateMaintenanceCache() { maintenanceCache.ts = 0; }

// Maintenance middleware (before static)
app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    // ?dev bypasses the "under construction" page so it can still be checked
    // while maintenance mode is on - not a real access control, just a quick
    // toggle for the developer
    if ('dev' in req.query) return next();
    const p = req.path;
    if (
        p.startsWith('/api/') ||
        p.startsWith('/img/') ||
        p.startsWith('/js/') ||
        p.startsWith('/css/') ||
        p.startsWith('/uploads/') ||
        p.startsWith('/cdn-cgi/') ||
        p === '/admin' || p.startsWith('/admin?') ||
        p === '/panel' || p.startsWith('/panel?') ||
        p.includes('.')
    ) return next();
    try {
        const cfg = await getMaintenanceConfig();
        if (cfg.mode === 'off') return next();
        if (cfg.mode === 'full') return res.sendFile(path.join(__dirname, 'public', 'budowa.html'));
        if (cfg.mode === 'paths') {
            const cleanPath = p.replace(/\/$/, '') || '/';
            const hit = cfg.paths.some(mp => {
                const cm = (mp || '').replace(/\/$/, '') || '/';
                return cleanPath === cm || cleanPath.startsWith(cm + '/');
            });
            if (hit) return res.sendFile(path.join(__dirname, 'public', 'budowa.html'));
        }
    } catch {}
    next();
});

// Self-contained blocked page (no external assets — banned IPs can't load any site resources)
const BLOCKED_PAGE = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Dostęp zablokowany | Wojtoteka</title><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#ef5350"><link rel="icon" href="/img/logo.png" type="image/png"><style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body,html{height:100%;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;color:#fff;text-align:center;overflow:hidden;background:#0a0a0a}
#background-video{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;object-fit:cover;filter:brightness(22%) saturate(1.2)}
.glow{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse at 30% 25%,rgba(239,83,80,0.16) 0%,transparent 55%),radial-gradient(ellipse at 72% 80%,rgba(255,109,0,0.10) 0%,transparent 55%)}
.container{position:relative;z-index:10;background:rgba(12,12,12,0.58);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);padding:46px 40px;border-radius:26px;border:1px solid rgba(239,83,80,0.18);box-shadow:0 24px 70px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.03) inset;max-width:540px;width:88%;animation:in 0.85s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}
@keyframes in{from{opacity:0;transform:translateY(28px) scale(0.96);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
.lock-wrap{position:relative;width:108px;height:108px;margin:0 auto 22px;display:flex;align-items:center;justify-content:center}
.lock-wrap::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(239,83,80,0.28) 0%,transparent 70%);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(0.85);opacity:0.7}50%{transform:scale(1.15);opacity:1}}
.lock{font-size:3.6em;line-height:1;filter:drop-shadow(0 4px 14px rgba(239,83,80,0.5));animation:lockIn 0.6s 0.3s ease-out both}
@keyframes lockIn{from{opacity:0;transform:scale(0.4) rotate(-12deg)}to{opacity:1;transform:none}}
h1{font-size:2.1em;font-weight:800;background:linear-gradient(135deg,#ff8a80 0%,#ef5350 50%,#ff6d00 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px;animation:up 0.5s 0.45s ease-out both}
.sub{font-size:1em;color:rgba(255,255,255,0.62);line-height:1.55;margin-bottom:8px;animation:up 0.5s 0.6s ease-out both}
.hint{font-size:0.88em;color:rgba(255,255,255,0.42);line-height:1.6;margin-top:18px;animation:up 0.5s 0.75s ease-out both}
.hint a{color:#ffb74d;text-decoration:none;font-weight:600;border-bottom:1px solid rgba(255,183,77,0.35);transition:color 0.25s,border-color 0.25s}
.hint a:hover{color:#ffcc80;border-color:rgba(255,204,128,0.7)}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.footer{position:fixed;bottom:16px;width:100%;text-align:center;z-index:10;font-size:0.72em;color:rgba(255,255,255,0.2);opacity:0;animation:fade 1s 1.1s ease-out forwards}
@keyframes fade{to{opacity:1}}
@media(max-width:480px){.container{padding:34px 24px}h1{font-size:1.7em}.lock{font-size:3em}}
</style></head><body>
<video autoplay muted loop playsinline id="background-video"><source src="/img/tlow.mp4" type="video/mp4"></video>
<div class="glow"></div>
<div class="container">
<div class="lock-wrap"><div class="lock">🔒</div></div>
<h1>Dostęp zablokowany</h1>
<p class="sub">Twój adres IP został zablokowany przez administratora i nie masz dostępu do tej strony.</p>
<p class="hint">Jeśli uważasz, że to pomyłka, napisz do nas na adres <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>.<br>W wiadomości podaj swój adres IP oraz przybliżoną datę i godzinę — sprawdzimy sprawę i w razie potrzeby zdejmiemy blokadę.</p>
</div>
<div class="footer">&copy; Wojtoteka.ovh 2024–${new Date().getFullYear()}</div>
</body></html>`;

// Site-wide IP ban middleware — blocks IPs with scope='site' from the entire site
app.use(async (req, res, next) => {
    // Always allow admin/api/panel + static assets (so the blocked page can show the site background)
    const p = req.path;
    if (p.startsWith('/api/') || p === '/admin' || p.startsWith('/admin?') ||
        p === '/panel' || p.startsWith('/panel?') || p.startsWith('/img/')) return next();
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip;
        if (ip) {
            const banned = await Message.isIPBannedSiteWide(ip);
            if (banned) {
                return res.status(403).type('html').send(BLOCKED_PAGE);
            }
        }
    } catch {}
    next();
});

// Page view tracking (before static, fire-and-forget)
// Only track known pages — bots scanning unknown paths are ignored automatically
const TRACKED_PATHS = new Set([
    '/',
    '/gry',
    '/kontakt',
    '/api',
    '/polityka-nightdrive',
    '/polityka-fishingparty',
    '/polityka-prywatnosci',
    '/budowa',
    '/soon',
    '/status',
    '/url',
    '/file',
    '/4InaRow',
    '/dance',
    '/fishing',
    '/GloomCraft',
    '/Nightdrive',
    '/nightdrive',
    '/ropeclimber',
    '/trybka',
    '/glebina',
    '/hack',
    '/HiddenText',
    '/RoyalCasinoBot',
    '/RoyalCasinoBot/polityka',
    '/RoyalCasinoBot/regulamin',
]);

app.use((req, res, next) => {
    if (req.method === 'GET') {
        const cleanPath = (req.path.replace(/\/$/, '') || '/');
        if (TRACKED_PATHS.has(cleanPath)) {
            pool.query(
                'INSERT INTO page_views (path, date, count, last_seen) VALUES (?, CURDATE(), 1, NOW()) ON DUPLICATE KEY UPDATE count = count + 1, last_seen = NOW()',
                [cleanPath]
            ).catch(() => {});
        }
    }
    next();
});

app.use(express.static('public'));

app.use((req, res, next) => {
    const candidateIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                 req.headers['x-real-ip'] ||
                 req.connection.remoteAddress ||
                 req.socket.remoteAddress ||
                 req.ip;
    req.realIP = sanitizeIp(candidateIP);
    next();
});

app.use((req, res, next) => {
    if (req.path.includes('admin') || req.path.includes('api')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.realIP}`);
    }
    next();
});

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-this-secret-key') {
    console.error('⚠️  OSTRZEŻENIE: Ustaw silny SESSION_SECRET w pliku .env!');
    console.error('   Wygeneruj używając: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    proxy: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        sameSite: 'lax', 
        maxAge: 30 * 60 * 1000 
    },
    rolling: true 
}));


app.use((req, res, next) => {
    if (req.session && !req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    next();
});

function verifyCsrfToken(req, res, next) {
    const token = req.headers['x-csrf-token'] || req.body.csrfToken;
    
    if (!req.session.csrfToken || token !== req.session.csrfToken) {
        console.warn(`[SECURITY] CSRF token mismatch - IP: ${req.realIP}`);
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    next();
}

function isAuthenticated(req, res, next) {
    if (!req.session || !req.session.isAdmin) {
        console.warn(`[SECURITY] Unauthorized access attempt to ${req.path} - IP: ${req.realIP}`);
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const now = Date.now();
    if (req.session.lastActivity && (now - req.session.lastActivity > 30 * 60 * 1000)) {
        console.warn(`[SECURITY] Session timeout - IP: ${req.realIP}`);
        req.session.destroy();
        return res.status(401).json({ message: 'Session expired' });
    }
    req.session.lastActivity = now;
    
    if (req.session.loginIP && req.session.loginIP !== req.realIP) {
        console.warn(`[SECURITY] IP mismatch detected! Session IP: ${req.session.loginIP}, Request IP: ${req.realIP}`);
        req.session.destroy();
        return res.status(401).json({ message: 'Session invalid - IP changed' });
    }
    
    if (req.session.userAgent && req.session.userAgent !== req.get('user-agent')) {
        console.warn(`[SECURITY] User-Agent changed - IP: ${req.realIP}`);
        req.session.destroy();
        return res.status(401).json({ message: 'Session invalid - fingerprint changed' });
    }
    
    return next();
}

function validateOrigin(req, res, next) {
    const origin = req.get('origin');
    const referer = req.get('referer');
    const host = req.get('host');

    if (origin) {
        const allowedOrigins = [`https://${host}`, `http://${host}`];
        if (!allowedOrigins.includes(origin)) {
            console.warn(`[SECURITY] Invalid origin: ${origin} - Expected: ${host} - IP: ${req.realIP}`);
            return res.status(403).json({ message: 'Forbidden - Invalid origin' });
        }
    }

    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            const allowedOrigins = [`https://${host}`, `http://${host}`];
            if (!allowedOrigins.includes(refererOrigin)) {
                console.warn(`[SECURITY] Invalid referer: ${referer} - Expected: ${host} - IP: ${req.realIP}`);
                return res.status(403).json({ message: 'Forbidden - Invalid referer' });
            }
        } catch {
            console.warn(`[SECURITY] Malformed referer header: ${referer} - IP: ${req.realIP}`);
            return res.status(403).json({ message: 'Forbidden - Invalid referer' });
        }
    }

    next();
}

async function verifyHCaptcha(token) {
    try {
        const params = new URLSearchParams();
        params.append('secret', process.env.HCAPTCHA_SECRET);
        params.append('response', token);
        
        const response = await axios.post('https://hcaptcha.com/siteverify', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.data.success) {
            console.warn('[SECURITY] hCaptcha verification failed:', response.data['error-codes'] || response.data);
        }
        return response.data.success;
    } catch (error) {
        console.error('hCaptcha verification error:', error);
        return false;
    }
}

function isSubAccountAuthenticated(req, res, next) {
    if (!req.session || !req.session.isSubAccount) {
        console.warn(`[SECURITY] Unauthorized sub-account access attempt to ${req.path} - IP: ${req.realIP}`);
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const now = Date.now();
    if (req.session.lastActivity && (now - req.session.lastActivity > 30 * 60 * 1000)) {
        console.warn(`[SECURITY] Sub-account session timeout - IP: ${req.realIP}`);
        req.session.destroy();
        return res.status(401).json({ message: 'Session expired' });
    }
    req.session.lastActivity = now;

    if (req.session.loginIP && req.session.loginIP !== req.realIP) {
        console.warn(`[SECURITY] Sub-account IP mismatch! Session IP: ${req.session.loginIP}, Request IP: ${req.realIP}`);
        req.session.destroy();
        return res.status(401).json({ message: 'Session invalid - IP changed' });
    }

    if (req.session.userAgent && req.session.userAgent !== req.get('user-agent')) {
        console.warn(`[SECURITY] Sub-account User-Agent changed - IP: ${req.realIP}`);
        req.session.destroy();
        return res.status(401).json({ message: 'Session invalid - fingerprint changed' });
    }

    return next();
}

async function getIPInfo(ip) {
    try {
        const cleanIP = ip.replace('::ffff:', '');
        if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost') {
            return { location: 'Localhost', isp: 'Local' };
        }
        const response = await axios.get(`http://ip-api.com/json/${cleanIP}?fields=status,country,regionName,city,isp,org`, { timeout: 5000 });
        if (response.data.status === 'success') {
            return {
                location: `${response.data.city || ''}, ${response.data.regionName || ''}, ${response.data.country || ''}`.replace(/^, |, $/g, ''),
                isp: response.data.isp || response.data.org || 'Nieznany'
            };
        }
        return { location: 'Nieznana', isp: 'Nieznany' };
    } catch (error) {
        return { location: 'Nieznana', isp: 'Nieznany' };
    }
}

async function trackLoginAttempt(accountType, accountIdentifier, ip, userAgent, success) {
    try {
        await pool.query(
            'INSERT INTO login_attempts (account_type, account_identifier, ip_address, user_agent, was_successful) VALUES (?, ?, ?, ?, ?)',
            [accountType, accountIdentifier, ip, userAgent, success ? 1 : 0]
        );
    } catch (error) {
        console.error('Error tracking login attempt:', error);
    }
}

async function checkAdminLockout(identifier, ip) {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) as attempts FROM login_attempts 
             WHERE account_type = 'admin' AND account_identifier = ? AND was_successful = 0 
             AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
            [identifier]
        );
        return rows[0].attempts >= 5;
    } catch (error) {
        return false;
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// /status — serwowany dynamicznie (URL/ID raportu z .env)
app.get('/status', (req, res) => {
        const rawHetrix = (process.env.HETRIX_REPORT_URL || process.env.HETRIX_KEY || '').trim();
        if (!rawHetrix) {
                return res.status(500).send('Brak HETRIX_REPORT_URL lub HETRIX_KEY w .env');
        }

        const reportUrl = /^https?:\/\//i.test(rawHetrix)
                ? rawHetrix
                : `https://wl.hetrixtools.com/r/${encodeURIComponent(rawHetrix)}/`;

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

                res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO Meta Tags -->
  <title>Status - Wojtoteka | Monitor dostępności</title>
  <meta name="description" content="Sprawdź aktualny status serwerów i dostępności usług Wojtoteka. Monitorowanie w czasie rzeczywistym.">
  <meta name="keywords" content="Wojtoteka status, monitor serwera, dostępność, uptime, status strony">
  <meta name="author" content="Wojtoteka">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://wojtoteka.ovh/status">

  <!-- Open Graph / Facebook / Discord -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://wojtoteka.ovh/status">
  <meta property="og:title" content="Status - Wojtoteka">
  <meta property="og:description" content="Sprawdź aktualny status serwerów i dostępności usług Wojtoteka.">
  <meta property="og:image" content="https://wojtoteka.ovh/img/logo.png">
  <meta property="og:locale" content="pl_PL">
  <meta property="og:site_name" content="Wojtoteka">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://wojtoteka.ovh/status">
  <meta name="twitter:title" content="Status - Wojtoteka">
  <meta name="twitter:description" content="Sprawdź aktualny status serwerów i dostępności usług Wojtoteka.">
  <meta name="twitter:image" content="https://wojtoteka.ovh/img/logo.png">

  <!-- Theme Color & Favicon -->
  <meta name="theme-color" content="#ff9800">
  <link rel="icon" href="/img/logo.png" type="image/png">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Status - Wojtoteka",
    "url": "https://wojtoteka.ovh/status",
    "description": "Monitor dostępności serwerów i usług Wojtoteka.",
    "inLanguage": "pl-PL"
  }
  <\/script>

  <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; background: #000000; overflow: hidden; }
        .htframe { display: block; width: 100%; height: 100vh; border: none; background: #000000; }
  </style>
</head>
<body>
    <iframe class="htframe" src="${reportUrl}" loading="eager" title="Status Wojtoteka"></iframe>
  <script src="/js/announcements.js" defer><\/script>
</body>
</html>`);
});

// Obsługa adresów bez .html — serwuje odpowiedni plik HTML
const HTML_PAGES = ['gry', 'kontakt', 'api', 'polityka-nightdrive', 'polityka-fishingparty', 'polityka-prywatnosci', 'budowa', 'soon'];
HTML_PAGES.forEach(page => {
    app.get('/' + page, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page + '.html'));
    });
});

// RoyalCasinoBot — obsługa bez .html
app.get('/RoyalCasinoBot', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'RoyalCasinoBot', 'index.html'));
});
app.get('/RoyalCasinoBot/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'RoyalCasinoBot', 'index.html'));
});
app.get('/RoyalCasinoBot/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'RoyalCasinoBot', 'index.html'));
});
app.get('/RoyalCasinoBot/polityka', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'RoyalCasinoBot', 'polityka.html'));
});
app.get('/RoyalCasinoBot/regulamin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'RoyalCasinoBot', 'regulamin.html'));
});

app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.session.csrfToken || '' });
});

app.post('/api/contact', contactLimiter, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { name, email, subject, message, hcaptchaToken } = req.body;
        const userIP = req.realIP;

        const isBanned = await Message.isIPBanned(userIP);
        if (isBanned) {
            return res.status(403).json({ message: 'Twoje IP zostało zablokowane za spam/nadużycia' });
        }

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
        }

        if (!hcaptchaToken) {
            return res.status(400).json({ message: 'Weryfikacja hCaptcha jest wymagana' });
        }

        const isHCaptchaValid = await verifyHCaptcha(hcaptchaToken);
        if (!isHCaptchaValid) {
            return res.status(400).json({ message: 'Weryfikacja hCaptcha nie powiodła się' });
        }

        const messageId = await Message.create({ name, email, subject, message, ip_address: userIP });

        await emailNotifier.sendNewMessageNotification({ name, email, subject, message, ip: userIP });

        res.status(200).json({ 
            message: 'Wiadomość została wysłana pomyślnie! Skontaktuję się z Tobą wkrótce.',
            id: messageId
        });
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({ message: 'Wystąpił błąd podczas wysyłania wiadomości' });
    }
});

app.post('/api/admin/login', loginLimiter, validateOrigin, verifyCsrfToken, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        console.warn(`[SECURITY] Login attempt with missing credentials - IP: ${req.realIP}`);
        return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane' });
    }

    if (username.length > 100 || password.length > 100) {
        console.warn(`[SECURITY] Login attempt with too long credentials - IP: ${req.realIP}`);
        return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
    }

    try {
        // Check admin lockout
        const isLockedOut = await checkAdminLockout(username, req.realIP);
        if (isLockedOut) {
            console.warn(`[SECURITY] Admin account locked - Username: ${username} - IP: ${req.realIP}`);
            return res.status(423).json({ message: 'Konto zostało tymczasowo zablokowane po zbyt wielu nieudanych próbach logowania. Spróbuj za 15 minut.' });
        }

        const admin = await Admin.findByUsername(username);
        
        if (!admin) {
            await trackLoginAttempt('admin', username, req.realIP, req.get('user-agent'), false);
            console.warn(`[SECURITY] Login attempt with non-existent username: ${username} - IP: ${req.realIP}`);
            // Ta sama sztuczna zwłoka co przy błędnym haśle (patrz niżej) - inaczej
            // brak bcrypt.compare() dla nieistniejącego loginu byłby wykrywalny
            // po czasie odpowiedzi (username enumeration przez timing attack).
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

        if (isPasswordValid) {
            await trackLoginAttempt('admin', username, req.realIP, req.get('user-agent'), true);
            await Admin.updateLastLogin(username, req.realIP);
            
            req.session.regenerate((err) => {
                if (err) {
                    console.error('[SECURITY] Session regeneration error:', err);
                    return res.status(500).json({ message: 'Błąd serwera' });
                }
                
                req.session.isAdmin = true;
                req.session.adminUsername = username;
                req.session.loginIP = req.realIP;
                req.session.userAgent = req.get('user-agent');
                req.session.loginTime = new Date().toISOString();
                req.session.lastActivity = Date.now();
                req.session.csrfToken = crypto.randomBytes(32).toString('hex');
                
                console.log(`[SECURITY] Successful admin login - IP: ${req.realIP}`);
                return res.status(200).json({ message: 'Zalogowano pomyślnie', csrfToken: req.session.csrfToken });
            });
        } else {
            await trackLoginAttempt('admin', username, req.realIP, req.get('user-agent'), false);
            console.warn(`[SECURITY] Failed login attempt - Username: ${username} - IP: ${req.realIP}`);
            
            // Check if this was the 5th failed attempt
            const isNowLocked = await checkAdminLockout(username, req.realIP);
            if (isNowLocked) {
                const ipInfo = await getIPInfo(req.realIP);
                emailNotifier.sendFailedLoginAlert({
                    accountIdentifier: username,
                    accountType: 'Administrator',
                    ip: req.realIP,
                    location: ipInfo.location,
                    isp: ipInfo.isp,
                    targetEmail: null // sends to NOTIFICATION_EMAIL
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło' });
        }
    } catch (error) {
        console.error('[SECURITY] Login error:', error);
        return res.status(500).json({ message: 'Błąd serwera' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.status(200).json({ message: 'Wylogowano pomyślnie' });
});

app.get('/api/admin/check-auth', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.status(200).json({ authenticated: true });
    }
    res.status(200).json({ authenticated: false });
});

app.use('/api/admin', apiLimiter);

app.get('/api/admin/messages', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const messages = await Message.getAll();
        const stats = await Message.getStats();

        res.status(200).json({
            messages,
            stats
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania wiadomości' });
    }
});

app.delete('/api/admin/messages/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Message.delete(id);

        if (deleted) {
            res.status(200).json({ message: 'Wiadomość została usunięta' });
        } else {
            res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania wiadomości' });
    }
});

app.get('/api/admin/banned-ips', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const bannedIPs = await Message.getAllBannedIPs();
        res.json({ bannedIPs });
    } catch (error) {
        console.error('Error fetching banned IPs:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania zbanowanych IP' });
    }
});

app.post('/api/admin/ban-ip', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { ipAddress, reason, scope, days } = req.body;
        if (!ipAddress) return res.status(400).json({ message: 'IP address jest wymagany' });
        if (net.isIP(ipAddress) === 0) return res.status(400).json({ message: 'Nieprawidłowy format adresu IP' });
        const safeScope = scope === 'site' ? 'site' : 'form';
        const d = Math.max(0, Math.min(3650, parseInt(days, 10) || 0)); // 0 = na stałe, max ~10 lat
        await Message.banIP(ipAddress, reason || 'Spam/Abuse', safeScope, d);
        const scopeLabel = safeScope === 'site' ? 'całą stronę' : 'formularz kontaktowy';
        const timeLabel = d > 0 ? `na ${d} ${d === 1 ? 'dzień' : 'dni'}` : 'na stałe';
        res.json({ message: `IP zablokowane (zakres: ${scopeLabel}, ${timeLabel})` });
    } catch (error) {
        console.error('Error banning IP:', error);
        res.status(500).json({ message: 'Błąd podczas banowania IP' });
    }
});

app.post('/api/admin/unban-ip', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { ipAddress } = req.body;
        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address jest wymagany' });
        }
        await Message.unbanIP(ipAddress);
        res.json({ message: 'IP zostało odbanowane' });
    } catch (error) {
        console.error('Error unbanning IP:', error);
        res.status(500).json({ message: 'Błąd podczas odbanowania IP' });
    }
});

// ============================================
// API Key Management Routes (Admin only)
// ============================================

app.get('/api/admin/api-keys', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const apiKeys = await ApiKey.getAll();
        const stats = await ApiKey.getStats();
        res.json({ apiKeys, stats });
    } catch (error) {
        console.error('Error fetching API keys:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania kluczy API' });
    }
});

app.post('/api/admin/api-keys', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { name, collect_name, collect_email, collect_phone, collect_subject, collect_message, notification_email } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: 'Nazwa klucza API jest wymagana' });
        }

        const apiKey = crypto.randomBytes(32).toString('hex');
        
        const id = await ApiKey.create({
            api_key: apiKey,
            name: name.trim(),
            collect_name: collect_name !== false,
            collect_email: collect_email !== false,
            collect_phone: !!collect_phone,
            collect_subject: collect_subject !== false,
            collect_message: collect_message !== false,
            notification_email: notification_email || null
        });

        res.status(201).json({ 
            message: 'Klucz API został utworzony',
            apiKey: { id, api_key: apiKey, name: name.trim() }
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ message: 'Błąd podczas tworzenia klucza API' });
    }
});

app.delete('/api/admin/api-keys/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const deleted = await ApiKey.delete(req.params.id);
        if (deleted) {
            res.json({ message: 'Klucz API został usunięty' });
        } else {
            res.status(404).json({ message: 'Klucz API nie został znaleziony' });
        }
    } catch (error) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania klucza API' });
    }
});

app.patch('/api/admin/api-keys/:id/toggle', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const toggled = await ApiKey.toggleActive(req.params.id);
        if (toggled) {
            res.json({ message: 'Status klucza API został zmieniony' });
        } else {
            res.status(404).json({ message: 'Klucz API nie został znaleziony' });
        }
    } catch (error) {
        console.error('Error toggling API key:', error);
        res.status(500).json({ message: 'Błąd podczas zmiany statusu klucza API' });
    }
});

// ============================================
// Sub-Account Management Routes (Admin only)
// ============================================

app.get('/api/admin/sub-accounts', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const subAccounts = await SubAccount.getAll();
        res.json({ subAccounts });
    } catch (error) {
        console.error('Error fetching sub-accounts:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania kont' });
    }
});

app.post('/api/admin/sub-accounts', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { email, username, api_key_id } = req.body;
        
        if (!email || !username) {
            return res.status(400).json({ message: 'Email i nazwa użytkownika są wymagane' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Nieprawidłowy format email' });
        }

        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ message: 'Nazwa użytkownika musi mieć od 3 do 50 znaków' });
        }

        // Check if email or username already exists
        const existingEmail = await SubAccount.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ message: 'Konto z tym emailem już istnieje' });
        }

        const existingUsername = await SubAccount.findByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ message: 'Konto z tą nazwą użytkownika już istnieje' });
        }

        // Generate random password
        const plainPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        const passwordHash = await bcrypt.hash(plainPassword, 12);

        const id = await SubAccount.create({
            email,
            username,
            password_hash: passwordHash,
            api_key_id: api_key_id || null
        });

        // Get API key name for email
        let apiKeyName = 'Brak';
        if (api_key_id) {
            const apiKey = await ApiKey.getById(api_key_id);
            if (apiKey) apiKeyName = apiKey.name;
        }

        // Send credentials via email
        await emailNotifier.sendNewAccountCredentials(email, username, plainPassword, apiKeyName);

        res.status(201).json({
            message: 'Konto zostało utworzone. Dane logowania wysłano na email.',
            subAccount: { id, email, username }
        });
    } catch (error) {
        console.error('Error creating sub-account:', error);
        res.status(500).json({ message: 'Błąd podczas tworzenia konta' });
    }
});

app.patch('/api/admin/sub-accounts/:id/api-key', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { api_key_id } = req.body;

        const account = await SubAccount.getById(req.params.id);
        if (!account) {
            return res.status(404).json({ message: 'Konto nie zostało znalezione' });
        }

        let normalizedApiKeyId = null;
        if (api_key_id !== undefined && api_key_id !== null && String(api_key_id).trim() !== '') {
            const parsedId = Number(api_key_id);
            if (!Number.isInteger(parsedId) || parsedId <= 0) {
                return res.status(400).json({ message: 'Nieprawidłowe ID klucza API' });
            }

            const apiKey = await ApiKey.getById(parsedId);
            if (!apiKey) {
                return res.status(404).json({ message: 'Klucz API nie został znaleziony' });
            }

            normalizedApiKeyId = parsedId;
        }

        const updated = await SubAccount.updateApiKeyAssignment(req.params.id, normalizedApiKeyId);
        if (!updated) {
            return res.status(404).json({ message: 'Konto nie zostało znalezione' });
        }

        res.json({ message: 'Przypisanie klucza API zostało zaktualizowane' });
    } catch (error) {
        console.error('Error updating sub-account API key assignment:', error);
        res.status(500).json({ message: 'Błąd podczas aktualizacji przypisania klucza API' });
    }
});

app.delete('/api/admin/sub-accounts/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const deleted = await SubAccount.delete(req.params.id);
        if (deleted) {
            res.json({ message: 'Konto zostało usunięte' });
        } else {
            res.status(404).json({ message: 'Konto nie zostało znalezione' });
        }
    } catch (error) {
        console.error('Error deleting sub-account:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania konta' });
    }
});

app.post('/api/admin/sub-accounts/:id/reset-password', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const account = await SubAccount.getById(req.params.id);
        if (!account) {
            return res.status(404).json({ message: 'Konto nie zostało znalezione' });
        }

        const plainPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        const passwordHash = await bcrypt.hash(plainPassword, 12);

        await SubAccount.changePassword(account.id, passwordHash);
        await SubAccount.unlockAccount(account.id);

        // Send new password via email
        await emailNotifier.sendPasswordResetByAdmin(account.email, account.username, plainPassword);

        res.json({ message: 'Hasło zostało zresetowane i wysłane na email konta' });
    } catch (error) {
        console.error('Error resetting sub-account password:', error);
        res.status(500).json({ message: 'Błąd podczas resetowania hasła' });
    }
});

app.post('/api/admin/sub-accounts/:id/unlock', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        await SubAccount.unlockAccount(req.params.id);
        res.json({ message: 'Konto zostało odblokowane' });
    } catch (error) {
        console.error('Error unlocking sub-account:', error);
        res.status(500).json({ message: 'Błąd podczas odblokowywania konta' });
    }
});

// ============================================
// API Messages Routes (Admin sees all)
// ============================================

app.get('/api/admin/api-messages', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const messages = await ApiMessage.getAll();
        const stats = await ApiMessage.getStatsAll();
        res.json({ messages, stats });
    } catch (error) {
        console.error('Error fetching API messages:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania wiadomości API' });
    }
});

app.delete('/api/admin/api-messages/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const deleted = await ApiMessage.delete(req.params.id);
        if (deleted) {
            res.json({ message: 'Wiadomość API została usunięta' });
        } else {
            res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
        }
    } catch (error) {
        console.error('Error deleting API message:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania wiadomości API' });
    }
});

// ============================================
// Public API Endpoint (for external websites)
// ============================================

// CORS for API endpoint
app.options('/api/v1/contact', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    res.header('Access-Control-Max-Age', '86400');
    res.status(204).send();
});

app.options('/api/v1/contact/config', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    res.header('Access-Control-Max-Age', '86400');
    res.status(204).send();
});

app.get('/api/v1/contact/config', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    try {
        const apiKeyValue = req.headers['x-api-key'] || req.query.apiKey;

        if (!apiKeyValue) {
            return res.status(401).json({ message: 'Brak klucza API. Dodaj nagłówek X-API-Key.' });
        }

        const apiKey = await ApiKey.findByKey(apiKeyValue);
        if (!apiKey) {
            return res.status(401).json({ message: 'Nieprawidłowy lub nieaktywny klucz API.' });
        }

        const fields = {
            name: !!apiKey.collect_name,
            email: !!apiKey.collect_email,
            phone: !!apiKey.collect_phone,
            subject: !!apiKey.collect_subject,
            message: !!apiKey.collect_message
        };

        res.status(200).json({
            keyName: apiKey.name,
            requiredFields: fields,
            allowedFields: fields
        });
    } catch (error) {
        console.error('Error fetching API contact config:', error);
        res.status(500).json({ message: 'Wystąpił błąd podczas pobierania konfiguracji.' });
    }
});

app.post('/api/v1/contact', apiContactLimiter, apiKeyContactLimiter, async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    try {
        const apiKeyValue = req.headers['x-api-key'] || req.body.apiKey;
        const userIP = req.realIP;

        if (!apiKeyValue) {
            return res.status(401).json({ message: 'Brak klucza API. Dodaj nagłówek X-API-Key.' });
        }

        const apiKey = await ApiKey.findByKey(apiKeyValue);
        if (!apiKey) {
            return res.status(401).json({ message: 'Nieprawidłowy lub nieaktywny klucz API.' });
        }

        // Check IP ban for this API key
        const isBanned = await ApiMessage.isIPBannedForKey(userIP, apiKey.id);
        if (isBanned) {
            return res.status(403).json({ message: 'Twoje IP zostało zablokowane.' });
        }

        // Also check global ban
        const isGloballyBanned = await Message.isIPBanned(userIP);
        if (isGloballyBanned) {
            return res.status(403).json({ message: 'Twoje IP zostało zablokowane.' });
        }

        // Validate required fields based on API key config
        const messageData = {};
        
        if (apiKey.collect_name) {
            if (!req.body.name || req.body.name.trim().length === 0) {
                return res.status(400).json({ message: 'Pole "name" (Imię/Nick) jest wymagane.' });
            }
            messageData.name = req.body.name.trim().substring(0, 255);
        }

        if (apiKey.collect_email) {
            if (!req.body.email || req.body.email.trim().length === 0) {
                return res.status(400).json({ message: 'Pole "email" jest wymagane.' });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!emailRegex.test(req.body.email.trim())) {
                return res.status(400).json({ message: 'Nieprawidłowy format email.' });
            }
            messageData.email = req.body.email.trim().substring(0, 255);
        }

        if (apiKey.collect_phone) {
            if (!req.body.phone || req.body.phone.trim().length === 0) {
                return res.status(400).json({ message: 'Pole "phone" (Telefon) jest wymagane.' });
            }
            messageData.phone = req.body.phone.trim().substring(0, 50);
        }

        if (apiKey.collect_subject) {
            if (!req.body.subject || req.body.subject.trim().length === 0) {
                return res.status(400).json({ message: 'Pole "subject" (Tytuł) jest wymagane.' });
            }
            messageData.subject = req.body.subject.trim().substring(0, 255);
        }

        if (apiKey.collect_message) {
            if (!req.body.message || req.body.message.trim().length === 0) {
                return res.status(400).json({ message: 'Pole "message" (Treść) jest wymagane.' });
            }
            messageData.message = req.body.message.trim().substring(0, 5000);
        }

        messageData.api_key_id = apiKey.id;
        messageData.ip_address = userIP;

        const messageId = await ApiMessage.create(messageData);

        // Send email notification if configured
        if (apiKey.notification_email) {
            await emailNotifier.sendApiMessageNotification(messageData, apiKey.notification_email, apiKey.name);
        }

        res.status(200).json({
            message: 'Wiadomość została wysłana pomyślnie!',
            id: messageId
        });
    } catch (error) {
        console.error('Error processing API contact:', error);
        res.status(500).json({ message: 'Wystąpił błąd podczas wysyłania wiadomości.' });
    }
});

// ============================================
// Panel Routes (Sub-account)
// ============================================

app.post('/api/panel/login', panelLoginLimiter, validateOrigin, verifyCsrfToken, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email i hasło są wymagane' });
    }

    if (email.length > 255 || password.length > 100) {
        return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
    }

    try {
        const account = await SubAccount.findByEmail(email);
        
        if (!account) {
            await trackLoginAttempt('sub_account', email, req.realIP, req.get('user-agent'), false);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
        }

        // Check if locked
        const locked = await SubAccount.isLocked(account.id);
        if (locked) {
            return res.status(423).json({ message: 'Konto zostało tymczasowo zablokowane. Spróbuj za 15 minut.' });
        }

        if (!account.is_active) {
            return res.status(403).json({ message: 'Konto jest dezaktywowane' });
        }

        const isPasswordValid = await bcrypt.compare(password, account.password_hash);

        if (isPasswordValid) {
            await trackLoginAttempt('sub_account', email, req.realIP, req.get('user-agent'), true);
            await SubAccount.updateLastLogin(account.id, req.realIP);

            req.session.regenerate((err) => {
                if (err) {
                    return res.status(500).json({ message: 'Błąd serwera' });
                }

                req.session.isSubAccount = true;
                req.session.subAccountId = account.id;
                req.session.subAccountEmail = account.email;
                req.session.subAccountUsername = account.username;
                req.session.subAccountApiKeyId = account.api_key_id;
                req.session.loginIP = req.realIP;
                req.session.userAgent = req.get('user-agent');
                req.session.lastActivity = Date.now();
                req.session.csrfToken = crypto.randomBytes(32).toString('hex');

                return res.status(200).json({
                    message: 'Zalogowano pomyślnie',
                    csrfToken: req.session.csrfToken,
                    username: account.username
                });
            });
        } else {
            await trackLoginAttempt('sub_account', email, req.realIP, req.get('user-agent'), false);
            const attempts = await SubAccount.incrementFailedAttempts(account.id);
            
            if (attempts >= 5) {
                const ipInfo = await getIPInfo(req.realIP);
                // Send alert to both the sub-account email and admin
                emailNotifier.sendFailedLoginAlert({
                    accountIdentifier: `${account.username} (${account.email})`,
                    accountType: 'Konto panelu',
                    ip: req.realIP,
                    location: ipInfo.location,
                    isp: ipInfo.isp,
                    targetEmail: account.email
                });
                if (emailNotifier.recipientEmail) {
                    emailNotifier.sendFailedLoginAlert({
                        accountIdentifier: `${account.username} (${account.email})`,
                        accountType: 'Konto panelu',
                        ip: req.realIP,
                        location: ipInfo.location,
                        isp: ipInfo.isp,
                        targetEmail: emailNotifier.recipientEmail
                    });
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
        }
    } catch (error) {
        console.error('Panel login error:', error);
        return res.status(500).json({ message: 'Błąd serwera' });
    }
});

app.post('/api/panel/logout', (req, res) => {
    req.session.destroy();
    res.status(200).json({ message: 'Wylogowano pomyślnie' });
});

app.get('/api/panel/check-auth', (req, res) => {
    if (req.session && req.session.isSubAccount) {
        return res.status(200).json({
            authenticated: true,
            username: req.session.subAccountUsername,
            email: req.session.subAccountEmail
        });
    }
    res.status(200).json({ authenticated: false });
});

app.use('/api/panel', apiLimiter);

app.get('/api/panel/messages', isSubAccountAuthenticated, validateOrigin, async (req, res) => {
    try {
        const apiKeyId = req.session.subAccountApiKeyId;
        if (!apiKeyId) {
            return res.json({ messages: [], stats: { total: 0, today: 0, week: 0 } });
        }
        const messages = await ApiMessage.getByApiKeyId(apiKeyId);
        const stats = await ApiMessage.getStatsByApiKeyId(apiKeyId);
        res.json({ messages, stats });
    } catch (error) {
        console.error('Error fetching panel messages:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania wiadomości' });
    }
});

app.delete('/api/panel/messages/:id', isSubAccountAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const apiKeyId = req.session.subAccountApiKeyId;
        if (!apiKeyId) {
            return res.status(403).json({ message: 'Brak przypisanego klucza API' });
        }
        const deleted = await ApiMessage.deleteByApiKeyId(req.params.id, apiKeyId);
        if (deleted) {
            res.json({ message: 'Wiadomość została usunięta' });
        } else {
            res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
        }
    } catch (error) {
        console.error('Error deleting panel message:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania wiadomości' });
    }
});

app.get('/api/panel/banned-ips', isSubAccountAuthenticated, validateOrigin, async (req, res) => {
    try {
        const apiKeyId = req.session.subAccountApiKeyId;
        if (!apiKeyId) {
            return res.json({ bannedIPs: [] });
        }
        const bannedIPs = await ApiMessage.getBannedIPsForKey(apiKeyId);
        res.json({ bannedIPs });
    } catch (error) {
        console.error('Error fetching panel banned IPs:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania zbanowanych IP' });
    }
});

app.post('/api/panel/ban-ip', isSubAccountAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { ipAddress, reason } = req.body;
        const apiKeyId = req.session.subAccountApiKeyId;
        if (!apiKeyId) {
            return res.status(403).json({ message: 'Brak przypisanego klucza API' });
        }
        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address jest wymagany' });
        }
        if (net.isIP(ipAddress) === 0) {
            return res.status(400).json({ message: 'Nieprawidłowy format adresu IP' });
        }
        await ApiMessage.banIPForKey(ipAddress, apiKeyId, reason || 'Spam/Abuse');
        res.json({ message: 'IP zostało zbanowane' });
    } catch (error) {
        console.error('Error banning panel IP:', error);
        res.status(500).json({ message: 'Błąd podczas banowania IP' });
    }
});

app.post('/api/panel/unban-ip', isSubAccountAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { ipAddress } = req.body;
        const apiKeyId = req.session.subAccountApiKeyId;
        if (!apiKeyId) {
            return res.status(403).json({ message: 'Brak przypisanego klucza API' });
        }
        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address jest wymagany' });
        }
        await ApiMessage.unbanIPForKey(ipAddress, apiKeyId);
        res.json({ message: 'IP zostało odbanowane' });
    } catch (error) {
        console.error('Error unbanning panel IP:', error);
        res.status(500).json({ message: 'Błąd podczas odbanowania IP' });
    }
});

app.post('/api/panel/change-password', isSubAccountAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Obecne hasło i nowe hasło są wymagane' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Nowe hasło musi mieć minimum 8 znaków' });
        }

        const account = await SubAccount.getById(req.session.subAccountId);
        if (!account) {
            return res.status(404).json({ message: 'Konto nie zostało znalezione' });
        }

        const isValid = await bcrypt.compare(currentPassword, account.password_hash);
        if (!isValid) {
            return res.status(401).json({ message: 'Obecne hasło jest nieprawidłowe' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await SubAccount.changePassword(account.id, newHash);

        res.json({ message: 'Hasło zostało zmienione pomyślnie' });
    } catch (error) {
        console.error('Error changing panel password:', error);
        res.status(500).json({ message: 'Błąd podczas zmiany hasła' });
    }
});

// Password Reset Routes (no auth required)
app.post('/api/panel/forgot-password', passwordResetLimiter, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email jest wymagany' });
        }

        const account = await SubAccount.findByEmail(email);
        
        // Always return success to prevent email enumeration
        if (!account) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.json({ message: 'Jeśli konto z tym emailem istnieje, kod resetowania został wysłany.' });
        }

        // Generate 6-digit code
        const code = String(Math.floor(100000 + Math.random() * 900000));
        
        await SubAccount.saveResetCode(account.id, code, email);
        await emailNotifier.sendPasswordResetCode(email, code, account.username);

        res.json({ message: 'Jeśli konto z tym emailem istnieje, kod resetowania został wysłany.' });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

app.post('/api/panel/reset-password', passwordResetLimiter, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, kod i nowe hasło są wymagane' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Nowe hasło musi mieć minimum 8 znaków' });
        }

        const resetRecord = await SubAccount.verifyResetCode(email, code);
        
        if (!resetRecord) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(400).json({ message: 'Nieprawidłowy lub wygasły kod resetowania' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await SubAccount.changePassword(resetRecord.sub_account_id, newHash);
        await SubAccount.markCodeUsed(resetRecord.id);
        await SubAccount.unlockAccount(resetRecord.sub_account_id);

        res.json({ message: 'Hasło zostało zmienione pomyślnie. Możesz się teraz zalogować.' });
    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

// ============================================
// Announcements - Public endpoint
// ============================================

app.get('/api/announcements', async (req, res) => {
    try {
        const page = (req.query.page || '').trim().substring(0, 100);
        if (!page) return res.json({ announcements: [] });

        const [rows] = await pool.query(
            `SELECT id, title, message, type, display_type, pages, priority FROM announcements
             WHERE is_active = 1
               AND (starts_at IS NULL OR starts_at <= NOW())
               AND (ends_at IS NULL OR ends_at > NOW())
             ORDER BY priority DESC, created_at DESC`
        );

        const filtered = rows
            .filter(row => {
                try {
                    const pages = JSON.parse(row.pages || '[]');
                    return pages.includes(page) || pages.includes('all');
                } catch { return false; }
            })
            .map(({ pages, ...rest }) => rest);

        res.json({ announcements: filtered });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.json({ announcements: [] });
    }
});

// ============================================
// Announcements - Admin CRUD
// ============================================

app.get('/api/admin/announcements', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM announcements ORDER BY priority DESC, created_at DESC'
        );
        res.json({ announcements: rows });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania ogłoszeń' });
    }
});

function parseAnnDatetime(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
}

app.post('/api/admin/announcements', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { title, message, type, display_type, pages, is_active, priority, starts_at, ends_at } = req.body;

        if (!title || !title.trim()) return res.status(400).json({ message: 'Tytuł jest wymagany' });
        if (!message || !message.trim()) return res.status(400).json({ message: 'Treść jest wymagana' });
        if (!['info', 'warning', 'important'].includes(type)) return res.status(400).json({ message: 'Nieprawidłowy typ' });
        if (!['banner', 'popup'].includes(display_type)) return res.status(400).json({ message: 'Nieprawidłowy typ wyświetlania' });

        const pagesJson = JSON.stringify(Array.isArray(pages) ? pages.filter(p => typeof p === 'string' && p.length < 100) : []);
        const startsAt = parseAnnDatetime(starts_at);
        const endsAt = parseAnnDatetime(ends_at);

        const [result] = await pool.query(
            'INSERT INTO announcements (title, message, type, display_type, pages, is_active, priority, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title.trim().substring(0, 255), message.trim().substring(0, 2000), type, display_type, pagesJson, is_active ? 1 : 0, parseInt(priority) || 0, startsAt, endsAt]
        );

        res.status(201).json({ message: 'Ogłoszenie zostało utworzone', id: result.insertId });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ message: 'Błąd podczas tworzenia ogłoszenia' });
    }
});

app.patch('/api/admin/announcements/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { title, message, type, display_type, pages, is_active, priority, starts_at, ends_at } = req.body;

        if (!title || !title.trim()) return res.status(400).json({ message: 'Tytuł jest wymagany' });
        if (!message || !message.trim()) return res.status(400).json({ message: 'Treść jest wymagana' });
        if (!['info', 'warning', 'important'].includes(type)) return res.status(400).json({ message: 'Nieprawidłowy typ' });
        if (!['banner', 'popup'].includes(display_type)) return res.status(400).json({ message: 'Nieprawidłowy typ wyświetlania' });

        const pagesJson = JSON.stringify(Array.isArray(pages) ? pages.filter(p => typeof p === 'string' && p.length < 100) : []);
        const startsAt = parseAnnDatetime(starts_at);
        const endsAt = parseAnnDatetime(ends_at);

        const [result] = await pool.query(
            'UPDATE announcements SET title=?, message=?, type=?, display_type=?, pages=?, is_active=?, priority=?, starts_at=?, ends_at=? WHERE id=?',
            [title.trim().substring(0, 255), message.trim().substring(0, 2000), type, display_type, pagesJson, is_active ? 1 : 0, parseInt(priority) || 0, startsAt, endsAt, req.params.id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione' });
        res.json({ message: 'Ogłoszenie zaktualizowane' });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ message: 'Błąd podczas aktualizacji ogłoszenia' });
    }
});

app.patch('/api/admin/announcements/:id/toggle', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE announcements SET is_active = NOT is_active WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione' });
        res.json({ message: 'Status ogłoszenia zmieniony' });
    } catch (error) {
        console.error('Error toggling announcement:', error);
        res.status(500).json({ message: 'Błąd podczas zmiany statusu' });
    }
});

app.delete('/api/admin/announcements/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione' });
        res.json({ message: 'Ogłoszenie usunięte' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania ogłoszenia' });
    }
});

// ============================================
// Admin - custom email composer (sent individually per recipient)
// ============================================

app.post('/api/admin/send-email', sendEmailLimiter, isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { fromName, recipients, subject, body, isHtml } = req.body;

        if (!fromName || !String(fromName).trim()) return res.status(400).json({ message: 'Pole "Od" jest wymagane' });
        if (!subject || !String(subject).trim()) return res.status(400).json({ message: 'Temat jest wymagany' });
        if (!body || !String(body).trim()) return res.status(400).json({ message: 'Treść wiadomości jest wymagana' });
        if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ message: 'Podaj przynajmniej jednego odbiorcę' });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        const cleanRecipients = [...new Set(recipients.map(r => String(r).trim().toLowerCase()))].filter(r => emailRegex.test(r));

        if (cleanRecipients.length === 0) return res.status(400).json({ message: 'Brak poprawnych adresów email' });
        if (cleanRecipients.length > 100) return res.status(400).json({ message: 'Maksymalnie 100 odbiorców na jedną wysyłkę' });

        const subjectTrimmed = String(subject).trim().substring(0, 255);
        const fromNameTrimmed = String(fromName).trim().substring(0, 100);

        let bodyHtml, bodyText;
        if (isHtml) {
            bodyHtml = String(body);
            bodyText = undefined;
        } else {
            bodyText = String(body);
            bodyHtml = emailNotifier._formatMultilineText(bodyText);
        }

        const results = await emailNotifier.sendCustomBroadcast({
            fromName: fromNameTrimmed,
            recipients: cleanRecipients,
            subject: subjectTrimmed,
            bodyHtml,
            bodyText
        });

        console.log(`[ADMIN EMAIL] ${req.session.adminUsername || 'admin'} wysłał email "${subjectTrimmed}" do ${results.sent}/${results.total} odbiorców`);

        res.json({ message: `Wysłano do ${results.sent} z ${results.total} odbiorców`, ...results });
    } catch (error) {
        console.error('Error sending custom email:', error);
        res.status(500).json({ message: 'Błąd podczas wysyłania wiadomości' });
    }
});

// ============================================
// Public URL shortener page
// ============================================

app.get('/url', publicResourceLimiter, (req, res) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    req.session.publicShortenerNonce = nonce;
    req.session.publicShortenerIssuedAt = Date.now();

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skracacz URL - Wojtoteka</title>
    <meta name="description" content="Skracacz linków Wojtoteka. Wklej długi URL i wygeneruj krótki adres.">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#ff9800">
    <link rel="icon" href="/img/logo.png" type="image/png">
    <style>
        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body, html {
            min-height: 100vh;
            font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #fff;
            overflow-x: hidden;
            background: #050505;
        }

        #background-video {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 0;
            object-fit: cover;
            filter: brightness(30%) saturate(1.3) contrast(1.1);
        }

        .noise {
            position: fixed;
            top: -50%; left: -50%;
            width: 200%; height: 200%;
            z-index: 1;
            pointer-events: none;
            opacity: 0.035;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            background-size: 128px 128px;
        }

        .vignette {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 2;
            pointer-events: none;
            background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
        }

        .ambient {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 2;
            pointer-events: none;
            background: radial-gradient(600px circle at var(--mx, 50%) var(--my, 40%), rgba(255,152,0,0.06) 0%, transparent 60%);
            transition: background 0.3s ease;
        }

        .container {
            z-index: 10;
            width: 88%;
            max-width: 620px;
            padding: 40px 36px;
            border-radius: 24px;
            background: rgba(10, 10, 10, 0.55);
            backdrop-filter: blur(20px) saturate(1.4);
            -webkit-backdrop-filter: blur(20px) saturate(1.4);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.06);
            animation: containerIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
            margin: 20px;
        }

        @keyframes containerIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); filter: blur(10px); }
            to   { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0);   }
        }

        .back-link-wrapper {
            text-align: left;
            margin-bottom: 16px;
        }

        .back-link {
            display: inline-block;
            color: rgba(255, 183, 77, 0.85);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9em;
            padding: 8px 16px;
            border-radius: 10px;
            background: rgba(255, 152, 0, 0.08);
            border: 1px solid rgba(255, 152, 0, 0.15);
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .back-link:hover {
            background: rgba(255, 152, 0, 0.18);
            border-color: rgba(255, 152, 0, 0.35);
            color: #ff9800;
            transform: translateX(-4px);
        }

        h1 {
            font-size: 2.2em;
            font-weight: 800;
            margin: 0 0 6px;
            opacity: 0;
            animation: rise 0.6s 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .accent-line {
            width: 50px;
            height: 3px;
            margin: 10px 0 14px;
            border-radius: 2px;
            background: linear-gradient(90deg, #ff9800, #ff6d00);
            opacity: 0;
            animation: lineIn 0.6s 0.45s ease forwards;
        }

        @keyframes lineIn {
            from { opacity: 0; width: 0; }
            to   { opacity: 1; width: 50px; }
        }

        p.subtitle {
            font-size: 0.92em;
            margin: 0 0 20px;
            color: rgba(255, 255, 255, 0.45);
            letter-spacing: 0.3px;
            opacity: 0;
            animation: rise 0.5s 0.5s ease forwards;
        }

        .form-wrap {
            opacity: 0;
            animation: rise 0.5s 0.6s ease forwards;
        }

        .form-group {
            margin-bottom: 18px;
            text-align: left;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 600;
            font-size: 0.88em;
            letter-spacing: 0.3px;
        }

        .form-group input[type="url"],
        .form-group select {
            width: 100%;
            padding: 13px 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.06);
            color: #fff;
            font-size: 0.95em;
            font-family: inherit;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: blur(8px);
            outline: none;
        }

        .form-group input[type="url"]:focus,
        .form-group select:focus {
            border-color: rgba(255, 152, 0, 0.5);
            background: rgba(255, 255, 255, 0.09);
            box-shadow: 0 0 20px rgba(255, 152, 0, 0.08);
        }

        .form-group input::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }

        .form-group select option {
            background: #1a1a1a;
            color: #fff;
        }

        .row {
            display: grid;
            grid-template-columns: 1fr 200px;
            gap: 14px;
        }

        .submit-btn {
            width: 100%;
            padding: 13px 16px;
            background: linear-gradient(135deg, rgba(255, 152, 0, 0.7), rgba(255, 109, 0, 0.7));
            color: #fff;
            border: 1px solid rgba(255, 183, 77, 0.2);
            border-radius: 12px;
            font-size: 1em;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 4px 15px rgba(255, 152, 0, 0.15);
        }

        .submit-btn:hover {
            background: linear-gradient(135deg, rgba(255, 152, 0, 0.9), rgba(255, 109, 0, 0.9));
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 8px 25px rgba(255, 152, 0, 0.3);
        }

        .submit-btn:disabled {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.06);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .message {
            padding: 14px 18px;
            border-radius: 12px;
            margin-bottom: 16px;
            font-weight: 600;
            font-size: 0.92em;
            animation: rise 0.4s ease-out;
        }

        .message.success {
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid rgba(76, 175, 80, 0.25);
            color: #81C784;
        }

        .message.error {
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid rgba(244, 67, 54, 0.25);
            color: #E57373;
        }

        .result-box {
            padding: 16px 18px;
            border-radius: 12px;
            background: rgba(255, 152, 0, 0.06);
            border: 1px solid rgba(255, 152, 0, 0.2);
            border-left: 3px solid rgba(255, 152, 0, 0.5);
            margin-bottom: 16px;
            animation: rise 0.4s ease-out;
        }

        .result-box p {
            margin: 0 0 8px;
            font-size: 0.88em;
            color: rgba(255, 255, 255, 0.5);
        }

        .result-box a {
            color: rgba(255, 183, 77, 0.95);
            text-decoration: none;
            font-weight: 700;
            word-break: break-all;
            font-size: 1.05em;
            transition: color 0.3s;
        }

        .result-box a:hover { color: #ff9800; }

        .copy-btn {
            margin-top: 10px;
            padding: 8px 16px;
            background: rgba(255, 152, 0, 0.12);
            color: rgba(255, 183, 77, 0.9);
            border: 1px solid rgba(255, 152, 0, 0.2);
            border-radius: 8px;
            font-size: 0.88em;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .copy-btn:hover {
            background: rgba(255, 152, 0, 0.22);
            border-color: rgba(255, 152, 0, 0.4);
            color: #ff9800;
        }

        .hidden-field {
            position: absolute;
            left: -9999px;
            opacity: 0;
            pointer-events: none;
        }

        .footer {
            font-size: 0.72em;
            color: rgba(255, 255, 255, 0.2);
            position: relative;
            width: 100%;
            text-align: center;
            padding: 16px 0 20px;
            opacity: 0;
            animation: fadeIn 1s 1.2s ease-out forwards;
            z-index: 10;
            flex-shrink: 0;
        }

        .footer a {
            color: rgba(255, 152, 0, 0.4);
            text-decoration: none;
            transition: color 0.3s;
        }

        .footer a:hover { color: rgba(255, 152, 0, 0.7); }

        @keyframes rise {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        @media (max-width: 700px) {
            .container { padding: 28px 20px; width: 94%; margin: 20px 10px 10px; border-radius: 18px; }
            h1 { font-size: 1.6em; }
            .row { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
            .container { padding: 24px 16px; width: 96%; margin: 12px 8px 8px; border-radius: 16px; }
            h1 { font-size: 1.4em; }
        }

        ::-webkit-scrollbar { width: 8px; background: transparent; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(135deg, #ff9800, #ffcc80); border-radius: 8px; }
        html { scrollbar-width: thin; scrollbar-color: #ff9800 transparent; }
    </style>
</head>
<body>

    <video autoplay muted loop playsinline id="background-video">
        <source src="/img/tlow.mp4" type="video/mp4">
    </video>

    <div class="noise"></div>
    <div class="vignette"></div>
    <div class="ambient"></div>

    <div class="container">
        <div class="back-link-wrapper">
            <a href="/" class="back-link">← Strona główna</a>
        </div>

        <h1>🔗 Skracacz URL</h1>
        <div class="accent-line"></div>
        <p class="subtitle">Wklej długi link, ustaw czas wygaśnięcia i wygeneruj krótki adres.</p>

        <div id="statusMessage"></div>

        <div class="form-wrap">
            <form id="shortenerForm" novalidate>
                <div class="form-group">
                    <label for="urlInput">Link docelowy</label>
                    <input type="url" id="urlInput" name="url" maxlength="2048" placeholder="https://example.com/bardzo-dlugi-link" required>
                </div>

                <div class="row">
                    <div class="form-group" style="margin-bottom:0">
                        <label for="expiry">Wygaśnięcie</label>
                        <select id="expiry" name="expires_hours">
                            <option value="">Nigdy (permanentny)</option>
                            <option value="1">Za 1 godzinę</option>
                            <option value="24">Za 24 godziny</option>
                            <option value="168">Za 7 dni</option>
                            <option value="720">Za 30 dni</option>
                        </select>
                    </div>
                    <div style="display:flex;align-items:flex-end;">
                        <button type="submit" id="submitBtn" class="submit-btn">Skróć link 🚀</button>
                    </div>
                </div>

                <input class="hidden-field" type="text" id="website" name="website" autocomplete="off" tabindex="-1">
                <input type="hidden" id="nonce" name="nonce" value="${nonce}">
            </form>
        </div>

        <div id="resultBox" style="display:none;margin-top:18px;"></div>

    </div>

    <div class="footer">
        <p>&copy; <a href="https://wojtoteka.ovh">Wojtoteka.ovh</a> 2024–<span id="current-year"></span></p>
    </div>

    <script>
        document.getElementById('current-year').textContent = new Date().getFullYear();

        document.addEventListener('mousemove', (e) => {
            const x = ((e.clientX / window.innerWidth) * 100).toFixed(1);
            const y = ((e.clientY / window.innerHeight) * 100).toFixed(1);
            document.querySelector('.ambient').style.setProperty('--mx', x + '%');
            document.querySelector('.ambient').style.setProperty('--my', y + '%');
        });

        const form = document.getElementById('shortenerForm');
        const statusMessage = document.getElementById('statusMessage');
        const resultBox = document.getElementById('resultBox');
        const submitBtn = document.getElementById('submitBtn');

        function setStatus(type, text) {
            statusMessage.innerHTML = '<div class="message ' + type + '">' + text + '</div>';
        }

        function clearStatus() {
            statusMessage.innerHTML = '';
        }

        function showResult(shortUrl, isExisting) {
            resultBox.innerHTML = '';

            const noteP = document.createElement('p');
            noteP.textContent = isExisting ? 'Ten URL był już skrócony — zwracam istniejący link:' : 'Skrócony link:';

            const link = document.createElement('a');
            link.href = shortUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = shortUrl;

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = '📋 Kopiuj link';

            const box = document.createElement('div');
            box.className = 'result-box';
            box.appendChild(noteP);
            box.appendChild(link);
            box.appendChild(document.createElement('br'));
            box.appendChild(copyBtn);

            resultBox.appendChild(box);
            resultBox.style.display = 'block';

            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(shortUrl);
                    copyBtn.textContent = '✅ Skopiowano!';
                    setTimeout(() => { copyBtn.textContent = '📋 Kopiuj link'; }, 2000);
                } catch {
                    copyBtn.textContent = '❌ Błąd kopiowania';
                }
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearStatus();
            resultBox.style.display = 'none';

            const payload = {
                url: document.getElementById('urlInput').value.trim(),
                expires_hours: document.getElementById('expiry').value || null,
                website: document.getElementById('website').value,
                nonce: document.getElementById('nonce').value
            };

            submitBtn.disabled = true;
            submitBtn.textContent = 'Tworzenie...';

            try {
                const response = await fetch('/api/url/shorten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json().catch(() => ({}));

                if (data.newNonce) {
                    document.getElementById('nonce').value = data.newNonce;
                }

                if (!response.ok) {
                    setStatus('error', data.message || 'Nie udało się skrócić linku.');
                    return;
                }

                setStatus('success', data.message || 'Link skrócony pomyślnie!');
                showResult(data.shortUrl, !!data.existing);
            } catch (err) {
                setStatus('error', 'Błąd połączenia z serwerem.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Skróć link 🚀';
            }
        });
    </script>
    <script src="/js/announcements.js" defer></script>
</body>
</html>`);
});

app.post('/api/url/shorten', publicShortenerCreateLimiter, async (req, res) => {
    try {
        const { url, expires_hours, website, nonce } = req.body || {};

        if (typeof website === 'string' && website.trim().length > 0) {
            return res.status(400).json({ message: 'Nieprawidłowe żądanie.' });
        }

        if (!nonce || nonce !== req.session.publicShortenerNonce) {
            return res.status(403).json({ message: 'Sesja formularza wygasła, odśwież stronę.' });
        }

        const issuedAt = Number(req.session.publicShortenerIssuedAt || 0);
        if (!issuedAt || (Date.now() - issuedAt) < 1200) {
            return res.status(429).json({ message: 'Zbyt szybkie żądanie. Spróbuj ponownie za chwilę.' });
        }

        const validation = getShortenerUrlValidation(url, { requestIP: req.realIP || req.ip });
        if (!validation.ok) {
            return res.status(400).json({ message: validation.message });
        }

        let expiresAt = null;
        if (expires_hours !== undefined && expires_hours !== null && String(expires_hours).trim() !== '') {
            const parsedExpires = Number(expires_hours);
            const allowedExpiryHours = new Set([1, 24, 168, 720]);

            if (!Number.isInteger(parsedExpires) || !allowedExpiryHours.has(parsedExpires)) {
                return res.status(400).json({ message: 'Nieprawidłowa wartość wygaśnięcia linku.' });
            }

            expiresAt = new Date(Date.now() + parsedExpires * 60 * 60 * 1000);
        }

        const normalizedUrl = validation.normalizedUrl.substring(0, 2048);

        const [existing] = await pool.query(
            `SELECT code FROM short_urls
             WHERE original_url = ? AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY created_at DESC
             LIMIT 1`,
            [normalizedUrl]
        );

        let code;
        let existingEntry = false;

        if (existing.length > 0) {
            code = existing[0].code;
            existingEntry = true;
        } else {
            code = await generateUniqueCode('short_urls');
            await pool.query(
                'INSERT INTO short_urls (code, original_url, expires_at) VALUES (?, ?, ?)',
                [code, normalizedUrl, expiresAt]
            );
        }

        const newNonce = crypto.randomBytes(16).toString('hex');
        req.session.publicShortenerNonce = newNonce;
        req.session.publicShortenerIssuedAt = Date.now();

        const rawHost = req.get('host') || '';
        if (!/^[a-zA-Z0-9.\-:[\]]+$/.test(rawHost)) {
            console.warn(`[SECURITY] Suspicious Host header rejected in shortener - IP: ${req.realIP}`);
            return res.status(400).json({ message: 'Nieprawidłowe żądanie.' });
        }
        const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        const shortUrl = `${protocol}://${rawHost}/url/${code}`;

        return res.status(existingEntry ? 200 : 201).json({
            message: existingEntry ? 'Ten link był już skrócony. Zwracam istniejący skrót.' : 'Link skrócony pomyślnie.',
            code,
            shortUrl,
            existing: existingEntry,
            newNonce
        });
    } catch (error) {
        console.error('Public shortener create error:', error);
        return res.status(500).json({ message: 'Błąd serwera podczas tworzenia skrótu.' });
    }
});

// ============================================
// Entry point for private file manager (admin)
// ============================================

app.get('/file', (req, res) => {
    res.redirect(302, '/');
});

// ============================================
// URL Shortener - Public redirect
// ============================================

app.get('/url/:code', publicResourceLimiter, async (req, res) => {
    const { code } = req.params;
    if (!/^[A-Za-z0-9]{1,10}$/.test(code)) {
        return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    try {
        const [rows] = await pool.query(
            'SELECT id, original_url, expires_at FROM short_urls WHERE code = ? LIMIT 1',
            [code]
        );
        if (rows.length === 0) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        const entry = rows[0];

        const redirectValidation = getShortenerUrlValidation(entry.original_url, { requestIP: req.realIP || req.ip });
        if (!redirectValidation.ok) {
            return res.status(410).send('Ten link jest niedostępny z powodów bezpieczeństwa.');
        }

        if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
            return res.status(410).send('Ten link wygasł.');
        }
        await pool.query('UPDATE short_urls SET click_count = click_count + 1 WHERE id = ?', [entry.id]);
        return res.redirect(302, redirectValidation.normalizedUrl);
    } catch (error) {
        console.error('Short URL redirect error:', error);
        return res.status(500).sendFile(path.join(__dirname, 'public', '503.html'));
    }
});

// ============================================
// File Sharing - Public download
// ============================================

app.get('/file/:code', publicResourceLimiter, async (req, res) => {
    const { code } = req.params;
    const forceDownload = req.query.download === '1';

    if (!/^[A-Za-z0-9]{1,10}$/.test(code)) {
        return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    try {
        const [rows] = await pool.query(
            'SELECT id, original_name, stored_name, mime_type, preview_enabled, expires_at FROM shared_files WHERE code = ? LIMIT 1',
            [code]
        );
        if (rows.length === 0) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        const entry = rows[0];
        if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
            return res.status(410).send('Ten plik wygasł.');
        }
        if (!/^[a-f0-9]{32}$/.test(entry.stored_name)) {
            console.error('[SECURITY] Invalid stored_name in shared_files');
            return res.status(500).sendFile(path.join(__dirname, 'public', '503.html'));
        }
        const filePath = path.join(uploadsDir, entry.stored_name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        await pool.query('UPDATE shared_files SET download_count = download_count + 1 WHERE id = ?', [entry.id]);

        const inlineMime = getInlinePreviewMime(entry.original_name, entry.mime_type);
        const allowInlinePreview = Number(entry.preview_enabled) === 1 && !!inlineMime && !forceDownload;

        if (allowInlinePreview) {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Content-Disposition', `inline; filename="${sanitizeDownloadFileName(entry.original_name)}"`);
            res.type(inlineMime);
            return res.sendFile(filePath);
        }

        return res.download(filePath, entry.original_name);
    } catch (error) {
        console.error('File download error:', error);
        return res.status(500).sendFile(path.join(__dirname, 'public', '503.html'));
    }
});

// ============================================
// Litho Studio - pobieranie plików + API
// ============================================

// Pliki wrzuca się ręcznie do public/inne/litho/file/ i to nazwa pliku decyduje
// o wszystkim: "Litho Studio-1.0.0.exe" -> wersja 1.0.0, rozszerzenie -> kategoria.
// Nic nie trzeba nigdzie dopisywać - katalog jest skanowany na bieżąco.
const LITHO_DIR = path.join(__dirname, 'public', 'inne', 'litho', 'file');
const LITHO_PLATFORM_BY_EXT = {
    '.exe': 'windows',
    '.msi': 'windows',
    '.appimage': 'linux',
    '.deb': 'linux',
    '.rpm': 'linux'
};
const LITHO_CACHE_TTL = 15 * 1000;
let lithoCache = { at: 0, data: null };

// Wyciąga z nazwy wersję i ewentualny wariant buildu:
//   "Litho Studio-1.0.0"          -> { product: 'Litho Studio', version: '1.0.0', variant: null }
//   "Litho Studio-1.0.0-portable" -> { ..., version: '1.0.0', variant: 'portable' }
//   "litho-studio_1.0.0"          -> { ..., version: '1.0.0', variant: null }
// Człon po wersji typu beta/rc doklejamy do wersji, wszystko inne to wariant.
function lithoParseName(baseName) {
    const match = baseName.match(/[-_ ](\d+(?:\.\d+)+)(?=$|[-_. ])/);
    if (!match) return { product: baseName, version: null, variant: null };

    let version = match[1];
    let rest = baseName.slice(match.index + match[0].length).replace(/^[-_. ]+/, '');

    const prerelease = rest.match(/^((?:alpha|beta|rc|pre)[.\-]?\d*)(?:[-_. ]+(.*))?$/i);
    if (prerelease) {
        version += '-' + prerelease[1];
        rest = prerelease[2] || '';
    }

    return {
        product: baseName.slice(0, match.index).replace(/[-_. ]+$/, '') || baseName,
        version,
        variant: rest || null
    };
}

function lithoCompareVersions(a, b) {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    const pa = String(a).split(/[.\-]/);
    const pb = String(b).split(/[.\-]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = parseInt(pa[i], 10);
        const nb = parseInt(pb[i], 10);
        const aNum = !Number.isNaN(na);
        const bNum = !Number.isNaN(nb);

        // Oba człony numeryczne: brakujący traktujemy jak 0 ("1.0" == "1.0.0").
        if (aNum && bNum) {
            if (na !== nb) return na - nb;
            continue;
        }
        if (aNum && pb[i] === undefined) { if (na !== 0) return 1; continue; }
        if (bNum && pa[i] === undefined) { if (nb !== 0) return -1; continue; }

        // Człon tekstowy = prerelease, więc wydanie bez niego jest nowsze:
        // "1.0.0" > "1.0.0-beta.1", a "1.0.1" > "1.0.0-beta.1" złapaliśmy wyżej.
        if (pa[i] === undefined) return 1;
        if (pb[i] === undefined) return -1;
        if (aNum) return 1;
        if (bNum) return -1;
        const cmp = String(pa[i]).localeCompare(String(pb[i]));
        if (cmp !== 0) return cmp;
    }
    return 0;
}

function lithoFormatSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function lithoScan() {
    const now = Date.now();
    if (lithoCache.data && now - lithoCache.at < LITHO_CACHE_TTL) return lithoCache.data;

    const windows = [];
    const linux = [];

    let entries = [];
    try {
        entries = fs.readdirSync(LITHO_DIR, { withFileTypes: true });
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('[LITHO] Nie udało się odczytać katalogu:', error.message);
    }

    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        const platform = LITHO_PLATFORM_BY_EXT[ext];
        if (!platform) continue;

        let stat;
        try {
            stat = fs.statSync(path.join(LITHO_DIR, entry.name));
        } catch {
            continue;
        }

        // birthtime bywa zerowy na niektórych systemach plików - wtedy mtime.
        const created = stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime;
        const baseName = entry.name.slice(0, entry.name.length - ext.length);
        const parsed = lithoParseName(baseName);

        const item = {
            file: entry.name,
            name: baseName,
            product: parsed.product,
            variant: parsed.variant,
            ext: ext.slice(1),
            platform,
            version: parsed.version,
            size: stat.size,
            sizeText: lithoFormatSize(stat.size),
            created: created.toISOString(),
            modified: stat.mtime.toISOString(),
            url: `/litho/download/${encodeURIComponent(entry.name)}`
        };

        (platform === 'windows' ? windows : linux).push(item);
    }

    // Najnowsza wersja na górze; dalej build bez wariantu (zwykły instalator),
    // potem alfabetycznie po rozszerzeniu i wariancie.
    const sortFiles = (list) => list.sort((a, b) => {
        const byVersion = lithoCompareVersions(b.version, a.version);
        if (byVersion !== 0) return byVersion;
        if (!a.variant !== !b.variant) return a.variant ? 1 : -1;
        return a.ext.localeCompare(b.ext) || (a.variant || '').localeCompare(b.variant || '');
    });
    sortFiles(windows);
    sortFiles(linux);

    const latestVersion = (list) => list.reduce(
        (best, item) => (lithoCompareVersions(item.version, best) > 0 ? item.version : best),
        null
    );

    const data = {
        windows: { name: 'Windows', files: windows, verW: latestVersion(windows) },
        linux: { name: 'Linux', files: linux, verL: latestVersion(linux) },
        generated: new Date().toISOString()
    };

    lithoCache = { at: now, data };
    return data;
}

// ?ext=deb / ?variant=portable - pozwala aplikacji wskazać konkretny build.
function lithoFilterFiles(files, query) {
    let result = files;
    if (query.ext) {
        const ext = String(query.ext).toLowerCase().replace(/^\./, '');
        result = result.filter(item => item.ext === ext);
    }
    if (query.variant) {
        const variant = String(query.variant).toLowerCase();
        result = result.filter(item => (item.variant || '').toLowerCase() === variant);
    }
    return result;
}

function lithoFindFile(fileName) {
    const data = lithoScan();
    return [...data.windows.files, ...data.linux.files].find(item => item.file === fileName) || null;
}

// Publiczne API - można je pytać z aplikacji desktopowej (sprawdzanie aktualizacji).
app.use('/api/litho', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=30');
    next();
});

// Pełna lista: { windows: { files: [...], verW }, linux: { files: [...], verL } }
app.get('/api/litho/releases', publicResourceLimiter, (req, res) => {
    res.json(lithoScan());
});

// Skrót dla auto-updatera: /api/litho/latest/windows | /api/litho/latest/linux
// Opcjonalnie ?ext=deb aby wskazać konkretny format.
app.get('/api/litho/latest/:platform', publicResourceLimiter, (req, res) => {
    const platform = String(req.params.platform).toLowerCase();
    if (platform !== 'windows' && platform !== 'linux') {
        return res.status(404).json({ error: 'Nieznana platforma. Dostępne: windows, linux' });
    }

    const data = lithoScan();
    const section = data[platform];
    const files = lithoFilterFiles(section.files, req.query);

    if (files.length === 0) {
        return res.status(404).json({ error: 'Brak plików dla tej platformy' });
    }

    const latest = files[0];
    res.json({
        platform,
        version: latest.version,
        [platform === 'windows' ? 'verW' : 'verL']: section[platform === 'windows' ? 'verW' : 'verL'],
        file: latest.file,
        ext: latest.ext,
        variant: latest.variant,
        size: latest.size,
        sizeText: latest.sizeText,
        created: latest.created,
        url: latest.url,
        files
    });
});

// Pobranie najnowszego pliku dla platformy (przekierowanie na konkretny plik).
app.get('/litho/download/latest/:platform', publicResourceLimiter, (req, res) => {
    const platform = String(req.params.platform).toLowerCase();
    if (platform !== 'windows' && platform !== 'linux') {
        return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    const files = lithoFilterFiles(lithoScan()[platform].files, req.query);
    if (files.length === 0) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    res.redirect(302, files[0].url);
});

// Pobranie po nazwie. Nazwa musi się zgadzać z wynikiem skanu katalogu,
// więc nie da się tędy wyjść poza public/inne/litho/file/.
app.get('/litho/download/:file', publicResourceLimiter, (req, res) => {
    const entry = lithoFindFile(req.params.file);
    if (!entry) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    return res.download(path.join(LITHO_DIR, entry.file), entry.file);
});

app.get('/litho', (req, res) => res.redirect(301, '/inne/litho'));
app.get('/inne/litho', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inne', 'litho', 'index.html'));
});

// ============================================
// URL Shortener - Admin API
// ============================================

app.get('/api/admin/urls', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, code, original_url, created_at, expires_at, click_count FROM short_urls ORDER BY created_at DESC'
        );
        res.json({ urls: rows });
    } catch (error) {
        console.error('Error fetching URLs:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania linków' });
    }
});

app.post('/api/admin/urls', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { original_url, expires_hours } = req.body;
        const validation = getShortenerUrlValidation(original_url, { requestIP: req.realIP || req.ip });
        if (!validation.ok) {
            return res.status(400).json({ message: validation.message });
        }

        const code = await generateUniqueCode('short_urls');
        let expiresAt = null;
        if (expires_hours && Number(expires_hours) > 0) {
            expiresAt = new Date(Date.now() + Number(expires_hours) * 60 * 60 * 1000);
        }
        await pool.query(
            'INSERT INTO short_urls (code, original_url, expires_at) VALUES (?, ?, ?)',
            [code, validation.normalizedUrl.substring(0, 2048), expiresAt]
        );
        res.status(201).json({ message: 'Link skrócony pomyślnie', code });
    } catch (error) {
        console.error('Error creating short URL:', error);
        res.status(500).json({ message: 'Błąd podczas tworzenia skróconego linku' });
    }
});

app.delete('/api/admin/urls/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM short_urls WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Link nie został znaleziony' });
        res.json({ message: 'Link został usunięty' });
    } catch (error) {
        console.error('Error deleting URL:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania linku' });
    }
});

// ============================================
// File Sharing - Admin API
// ============================================

app.get('/api/admin/files', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, code, original_name, mime_type, file_size, created_at, expires_at, preview_enabled, download_count FROM shared_files ORDER BY created_at DESC'
        );
        res.json({ files: rows });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania plików' });
    }
});

app.post('/api/admin/files', isAuthenticated, validateOrigin, (req, res, next) => {
    fileUpload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'Plik jest za duży (max 100 MB)' });
            }
            return res.status(400).json({ message: 'Błąd przesyłania: ' + err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, verifyCsrfToken, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Plik jest wymagany' });
        }

        const { expires_hours, preview_enabled } = req.body;
        const code = await generateUniqueCode('shared_files');

        const previewEnabled = ['1', 'true', 'yes', 'on'].includes(String(preview_enabled || '').toLowerCase());
        let expiresAt = null;
        if (expires_hours && Number(expires_hours) > 0) {
            expiresAt = new Date(Date.now() + Number(expires_hours) * 60 * 60 * 1000);
        }

        await pool.query(
            'INSERT INTO shared_files (code, original_name, stored_name, mime_type, file_size, expires_at, preview_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                code,
                req.file.originalname.substring(0, 500),
                req.file.filename,
                req.file.mimetype || 'application/octet-stream',
                req.file.size,
                expiresAt,
                previewEnabled ? 1 : 0
            ]
        );
        res.status(201).json({ message: 'Plik przesłany pomyślnie', code, preview_enabled: previewEnabled });
    } catch (error) {
        if (req.file) fs.unlink(path.join(uploadsDir, req.file.filename), () => {});
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Błąd podczas przesyłania pliku' });
    }
});

app.delete('/api/admin/files/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT stored_name FROM shared_files WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Plik nie został znaleziony' });
        const storedName = rows[0].stored_name;
        await pool.query('DELETE FROM shared_files WHERE id = ?', [req.params.id]);
        if (/^[a-f0-9]{32}$/.test(storedName)) {
            fs.unlink(path.join(uploadsDir, storedName), (err) => {
                if (err && err.code !== 'ENOENT') console.error('Error deleting file from disk:', err);
            });
        }
        res.json({ message: 'Plik został usunięty' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania pliku' });
    }
});

// =================== SITE SETTINGS (public) ===================
app.get('/api/site-settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT `key`, `value` FROM site_settings');
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        res.json({ settings });
    } catch (error) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

// =================== BIO LINKS (public) ===================
app.get('/api/bio-links', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, title, url, icon, sort_order, opens_new_tab FROM bio_links WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
        res.json({ links: rows });
    } catch (error) {
        console.error('Error fetching bio links:', error);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

app.post('/api/bio-links/:id/click', bioLinkClickLimiter, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id || id <= 0) return res.status(400).json({ ok: false });
        await pool.query(
            'UPDATE bio_links SET click_count = click_count + 1 WHERE id = ? AND is_active = 1',
            [id]
        );
        res.json({ ok: true });
    } catch (error) {
        console.error('Error tracking bio link click:', error);
        res.status(500).json({ ok: false });
    }
});

// =================== GŁĘBINA - LEADERBOARD (public) ===================
// Token wydawany na start zanurzenia, wiązany z wynikiem przy zapisie:
// pozwala odrzucić wyniki, których nie da się osiągnąć w zmierzonym przez
// serwer czasie gry (patrz verifyGlebinaToken). W tabeli trzymane jest
// zawsze maksymalnie 5 wierszy (TOP 5) i jeden wpis na nick (patrz
// glebina_scores.idx_nick_unique w config/database.js) - dzięki temu zmiana
// adresu IP nie tworzy duplikatu, tylko aktualizuje własny wynik. Jedno IP
// może trzymać naraz maks. GLEBINA_MAX_ENTRIES_PER_IP wpisów i tylko tyle
// razy na tydzień próbować dodać zupełnie nowy (patrz GLEBINA_NEW_ENTRIES_PER_WINDOW).
// Dodatkowo ciasteczko GLEBINA_OWNER_COOKIE wiąże przeglądarkę z jednym
// nickiem, żeby jedna osoba na współdzielonym IP nie zajęła wszystkich slotów.
function setGlebinaOwnerCookie(res, nick) {
    res.cookie(GLEBINA_OWNER_COOKIE, signGlebinaOwner(nick), {
        maxAge: GLEBINA_OWNER_COOKIE_MAX_AGE_MS,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    });
}

app.get('/api/glebina/token', glebinaTokenLimiter, (req, res) => {
    res.json({ token: signGlebinaToken() });
});

app.get('/api/glebina/leaderboard', publicResourceLimiter, async (req, res) => {
    try {
        const leaderboard = await getGlebinaTop5();
        const fifthPlaceScore = leaderboard.length >= 5 ? leaderboard[leaderboard.length - 1].score : null;
        res.json({ leaderboard, fifthPlaceScore });
    } catch (error) {
        console.error('Error fetching glebina leaderboard:', error);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

app.post('/api/glebina/score', glebinaScoreLimiter, validateOrigin, async (req, res) => {
    try {
        const { token, nick: rawNick, score: rawScore } = req.body || {};

        const tokenInfo = verifyGlebinaToken(token);
        if (!tokenInfo) {
            return res.status(400).json({ ok: false, message: 'Nieprawidłowa lub wygasła sesja gry. Zanurz się ponownie.' });
        }

        const nick = validateGlebinaNick(rawNick);
        if (!nick) {
            return res.status(400).json({ ok: false, message: 'Nieprawidłowy nick (2-16 znaków: litery, cyfry, spacja, _ lub -).' });
        }

        // Ta przeglądarka ma już zapisany nick (ciasteczko z poprzedniego zapisu) -
        // pozwól jej aktualizować tylko ten nick, żeby na współdzielonym IP
        // (rodzina, sieć publiczna) jedna osoba nie zajęła wszystkich slotów.
        const ownerNick = verifyGlebinaOwnerCookie(getCookieValue(req, GLEBINA_OWNER_COOKIE));
        if (ownerNick && ownerNick !== nick) {
            return res.status(403).json({
                ok: false, qualified: false,
                message: `Na tym urządzeniu masz już zapisany nick "${ownerNick}" - możesz aktualizować tylko jego wynik. Aby użyć innego nicku, zagraj z innej przeglądarki/urządzenia.`
            });
        }

        const score = Math.floor(Number(rawScore));
        if (!Number.isFinite(score) || score <= 0 || score > GLEBINA_HARD_CAP) {
            return res.status(400).json({ ok: false, message: 'Nieprawidłowy wynik.' });
        }

        const maxPlausible = Math.floor((tokenInfo.age / 1000) * GLEBINA_MAX_M_PER_S) + GLEBINA_SCORE_BUFFER;
        if (score > maxPlausible) {
            console.warn(`[SECURITY] Głębina - nieprawdopodobny wynik odrzucony: ${score} m w ${Math.floor(tokenInfo.age / 1000)} s - IP: ${req.realIP}`);
            return res.status(400).json({ ok: false, message: 'Wynik odrzucony jako nieprawdopodobny dla czasu trwania zanurzenia.' });
        }

        // Wpis w rankingu jest przypisany do NICKU (unikalny, bez rozróżniania
        // wielkości liter dzięki collation utf8mb4_unicode_ci) - to pozwala
        // zaktualizować własny rekord nawet z innego adresu IP (np. zmiana
        // sieci komórkowej na Wi-Fi). Adres IP służy tylko do throttlingu
        // nowych wpisów i do pilnowania limitu "maks. GLEBINA_MAX_ENTRIES_PER_IP
        // wpisów na jedno IP" poniżej.
        const [nickRows] = await pool.query('SELECT id, score, ip_address FROM glebina_scores WHERE nick = ?', [nick]);
        const nickRow = nickRows[0] || null;

        const [ipRows] = await pool.query('SELECT id, nick, score FROM glebina_scores WHERE ip_address = ?', [req.realIP]);
        const otherIpRows = nickRow ? ipRows.filter(r => r.id !== nickRow.id) : ipRows;
        const ipHasFreeSlot = otherIpRows.length < GLEBINA_MAX_ENTRIES_PER_IP;

        if (nickRow) {
            if (score <= nickRow.score) {
                // Wygrywa wyższy wynik - nie pozwalamy nadpisać istniejącego
                // (lepszego lub równego) wpisu gorszym z tego samego nicku.
                return res.status(400).json({
                    ok: false, qualified: false,
                    message: `Masz już wynik ${nickRow.score} m jako "${nick}" w rankingu - ten wynik go nie poprawia.`
                });
            }
            // Poprawiasz własny rekord - ale nie pozwól, by to samo IP przy okazji
            // "przejęło" więcej niż GLEBINA_MAX_ENTRIES_PER_IP wpisów.
            if (!ipHasFreeSlot) {
                return res.status(400).json({
                    ok: false, qualified: false,
                    message: `Z tego adresu IP masz już ${GLEBINA_MAX_ENTRIES_PER_IP} inne wpisy w rankingu - to limit na jedno IP.`
                });
            }
            await pool.query('UPDATE glebina_scores SET score = ?, ip_address = ?, created_at = NOW() WHERE id = ?', [score, req.realIP, nickRow.id]);
            await pool.query(
                `DELETE FROM glebina_scores WHERE id NOT IN (
                    SELECT id FROM (SELECT id FROM glebina_scores ORDER BY score DESC, created_at ASC LIMIT 5) t
                 )`
            );
            setGlebinaOwnerCookie(res, nick);
            return res.json({ ok: true, qualified: true, leaderboard: await getGlebinaTop5() });
        }

        // Nowy nick. Jeśli to IP już ma maks. dozwoloną liczbę wpisów, blokujemy
        // z jasnym komunikatem (zamiast cichego "unchanged", które wyglądało
        // jak błąd aplikacji: "niby zapisane, a nie zapisane").
        if (!ipHasFreeSlot) {
            return res.status(400).json({
                ok: false, qualified: false,
                message: `Z tego adresu IP masz już ${GLEBINA_MAX_ENTRIES_PER_IP} wpisy w rankingu (limit na adres IP) - zaktualizuj jeden z nich, używając jego nicku.`
            });
        }

        // Throttling nowych wpisów: maks. GLEBINA_NEW_ENTRIES_PER_WINDOW prób
        // dodania nowego wpisu / IP / GLEBINA_NEW_ENTRY_WINDOW_MS.
        const [throttleRows] = await pool.query('SELECT attempts_in_window, window_started_at FROM glebina_ip_throttle WHERE ip_address = ?', [req.realIP]);
        const throttleRow = throttleRows[0] || null;
        const windowExpired = !throttleRow || (Date.now() - new Date(throttleRow.window_started_at).getTime()) >= GLEBINA_NEW_ENTRY_WINDOW_MS;
        if (!windowExpired && throttleRow.attempts_in_window >= GLEBINA_NEW_ENTRIES_PER_WINDOW) {
            // Celowo nie ujawniamy dokładnego limitu/odliczania - to szczegół
            // anty-nadużyciowy, nie funkcja produktowa dla gracza.
            return res.status(429).json({ ok: false, qualified: false, message: 'Nie udało się zapisać wyniku.' });
        }

        const [countRows] = await pool.query('SELECT COUNT(*) AS c, MIN(score) AS low FROM glebina_scores');
        const { c, low } = countRows[0];
        if (c >= 5 && score <= low) {
            return res.json({
                ok: false,
                qualified: false,
                message: `To za mało na TOP 5 (potrzeba więcej niż ${low} m).`,
                fifthPlaceScore: low
            });
        }

        await pool.query(
            'INSERT INTO glebina_scores (nick, score, ip_address, created_at) VALUES (?, ?, ?, NOW())',
            [nick, score, req.realIP]
        );
        await pool.query(
            `DELETE FROM glebina_scores WHERE id NOT IN (
                SELECT id FROM (SELECT id FROM glebina_scores ORDER BY score DESC, created_at ASC LIMIT 5) t
             )`
        );
        if (windowExpired) {
            await pool.query(
                'INSERT INTO glebina_ip_throttle (ip_address, attempts_in_window, window_started_at) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE attempts_in_window = 1, window_started_at = NOW()',
                [req.realIP]
            );
        } else {
            await pool.query(
                'UPDATE glebina_ip_throttle SET attempts_in_window = attempts_in_window + 1 WHERE ip_address = ?',
                [req.realIP]
            );
        }

        setGlebinaOwnerCookie(res, nick);
        res.json({ ok: true, qualified: true, leaderboard: await getGlebinaTop5() });
    } catch (error) {
        console.error('Error saving glebina score:', error);
        res.status(500).json({ ok: false, message: 'Błąd serwera' });
    }
});

// =================== SITE SETTINGS (admin) ===================
app.get('/api/admin/site-settings', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT `key`, `value` FROM site_settings');
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        res.json({ settings });
    } catch (error) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania ustawień' });
    }
});

app.put('/api/admin/site-settings', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { tagline, maintenance_mode, maintenance_paths } = req.body;

        if (tagline !== undefined) {
            if (typeof tagline !== 'string' || tagline.length > 200)
                return res.status(400).json({ message: 'Tagline jest za długi (max 200 znaków)' });
            await pool.query('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
                ['tagline', tagline.trim(), tagline.trim()]);
        }

        if (maintenance_mode !== undefined) {
            if (!['off', 'full', 'paths'].includes(maintenance_mode))
                return res.status(400).json({ message: 'Nieprawidłowy tryb konserwacji' });
            await pool.query('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
                ['maintenance_mode', maintenance_mode, maintenance_mode]);
            invalidateMaintenanceCache();
        }

        if (maintenance_paths !== undefined) {
            if (!Array.isArray(maintenance_paths))
                return res.status(400).json({ message: 'maintenance_paths musi być tablicą' });
            const cleaned = maintenance_paths
                .map(p => String(p).trim().substring(0, 255))
                .filter(p => p.startsWith('/'));
            const json = JSON.stringify(cleaned);
            await pool.query('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
                ['maintenance_paths', json, json]);
            invalidateMaintenanceCache();
        }

        res.json({ message: 'Ustawienia zapisane' });
    } catch (error) {
        console.error('Error updating site settings:', error);
        res.status(500).json({ message: 'Błąd podczas zapisywania ustawień' });
    }
});

// =================== BIO LINKS (admin) ===================
app.get('/api/admin/bio-links', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM bio_links ORDER BY sort_order ASC, id ASC'
        );
        res.json({ links: rows });
    } catch (error) {
        console.error('Error fetching bio links:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania linków' });
    }
});

function validateBioLinkUrl(raw) {
    const u = (raw || '').trim();
    if (!u) return { ok: false, message: 'URL jest wymagany' };
    if (u.length > 2048) return { ok: false, message: 'URL jest zbyt długi' };
    if (u.startsWith('/')) return { ok: true, url: u };
    try {
        const parsed = new URL(u);
        if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, message: 'Dozwolone są tylko URL-e http/https lub ścieżki względne (/)' };
        return { ok: true, url: parsed.toString() };
    } catch {
        return { ok: false, message: 'Nieprawidłowy URL' };
    }
}

app.post('/api/admin/bio-links', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { title, url, icon, sort_order, is_active, opens_new_tab } = req.body;

        if (!title || !title.trim()) return res.status(400).json({ message: 'Tytuł jest wymagany' });
        const urlCheck = validateBioLinkUrl(url);
        if (!urlCheck.ok) return res.status(400).json({ message: urlCheck.message });
        const trimmedUrl = urlCheck.url;

        const [result] = await pool.query(
            'INSERT INTO bio_links (title, url, icon, sort_order, is_active, opens_new_tab) VALUES (?, ?, ?, ?, ?, ?)',
            [
                title.trim().substring(0, 255),
                trimmedUrl,
                (icon || '🔗').substring(0, 50),
                parseInt(sort_order) || 0,
                is_active ? 1 : 0,
                opens_new_tab ? 1 : 0
            ]
        );

        res.status(201).json({ message: 'Link został dodany', id: result.insertId });
    } catch (error) {
        console.error('Error creating bio link:', error);
        res.status(500).json({ message: 'Błąd podczas dodawania linku' });
    }
});

app.patch('/api/admin/bio-links/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { title, url, icon, sort_order, is_active, opens_new_tab } = req.body;

        if (!title || !title.trim()) return res.status(400).json({ message: 'Tytuł jest wymagany' });
        const urlCheck = validateBioLinkUrl(url);
        if (!urlCheck.ok) return res.status(400).json({ message: urlCheck.message });
        const trimmedUrl = urlCheck.url;

        const [result] = await pool.query(
            'UPDATE bio_links SET title=?, url=?, icon=?, sort_order=?, is_active=?, opens_new_tab=? WHERE id=?',
            [
                title.trim().substring(0, 255),
                trimmedUrl,
                (icon || '🔗').substring(0, 50),
                parseInt(sort_order) || 0,
                is_active ? 1 : 0,
                opens_new_tab ? 1 : 0,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Link nie został znaleziony' });
        res.json({ message: 'Link zaktualizowany' });
    } catch (error) {
        console.error('Error updating bio link:', error);
        res.status(500).json({ message: 'Błąd podczas aktualizacji linku' });
    }
});

app.patch('/api/admin/bio-links/:id/toggle', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE bio_links SET is_active = NOT is_active WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Link nie został znaleziony' });
        res.json({ message: 'Status linku zmieniony' });
    } catch (error) {
        console.error('Error toggling bio link:', error);
        res.status(500).json({ message: 'Błąd podczas zmiany statusu' });
    }
});

app.delete('/api/admin/bio-links/:id', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM bio_links WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Link nie został znaleziony' });
        res.json({ message: 'Link został usunięty' });
    } catch (error) {
        console.error('Error deleting bio link:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania linku' });
    }
});

// =================== ADMIN: CHANGE PASSWORD ===================
app.post('/api/admin/change-password', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword)
            return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
        if (newPassword !== confirmPassword)
            return res.status(400).json({ message: 'Nowe hasła nie są identyczne' });
        if (newPassword.length < 8)
            return res.status(400).json({ message: 'Nowe hasło musi mieć co najmniej 8 znaków' });
        if (newPassword.length > 100)
            return res.status(400).json({ message: 'Hasło jest za długie (max 100 znaków)' });

        const admin = await Admin.findByUsername(req.session.adminUsername);
        if (!admin) return res.status(404).json({ message: 'Nie znaleziono admina' });

        const valid = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!valid) return res.status(401).json({ message: 'Nieprawidłowe aktualne hasło' });

        const newHash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE admins SET password_hash = ? WHERE username = ?', [newHash, req.session.adminUsername]);

        console.log(`[SECURITY] Admin password changed - Username: ${req.session.adminUsername} - IP: ${req.realIP}`);
        res.json({ message: 'Hasło zostało zmienione pomyślnie' });
    } catch (error) {
        console.error('Error changing admin password:', error);
        res.status(500).json({ message: 'Błąd podczas zmiany hasła' });
    }
});

// =================== BIO LINKS: RESET CLICKS ===================
app.post('/api/admin/bio-links/:id/reset-clicks', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const [result] = await pool.query('UPDATE bio_links SET click_count = 0 WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Link nie został znaleziony' });
        res.json({ message: 'Licznik kliknięć zresetowany' });
    } catch (error) {
        console.error('Error resetting bio link clicks:', error);
        res.status(500).json({ message: 'Błąd podczas resetowania licznika' });
    }
});

// =================== PAGE VIEW STATS ===================
app.get('/api/admin/stats/page-views', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [byPage] = await pool.query(
            `SELECT path, SUM(count) as total, MAX(last_seen) as last_seen
             FROM page_views GROUP BY path ORDER BY total DESC LIMIT 500`
        );
        const [last30] = await pool.query(
            `SELECT date, SUM(count) as total
             FROM page_views WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             GROUP BY date ORDER BY date ASC`
        );
        const [totalRow] = await pool.query('SELECT SUM(count) as total FROM page_views');
        res.json({ byPage, last30, total: totalRow[0].total || 0 });
    } catch (error) {
        console.error('Error fetching page view stats:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania statystyk' });
    }
});

app.delete('/api/admin/stats/page-views/bot-cleanup', isAuthenticated, validateOrigin, verifyCsrfToken, async (req, res) => {
    try {
        const paths = [...TRACKED_PATHS];
        const placeholders = paths.map(() => '?').join(',');
        const [result] = await pool.query(
            `DELETE FROM page_views WHERE path NOT IN (${placeholders})`,
            paths
        );
        res.json({ deleted: result.affectedRows });
    } catch (error) {
        console.error('Error cleaning up bot page views:', error);
        res.status(500).json({ message: 'Błąd podczas czyszczenia statystyk' });
    }
});

// =================== EXPORT DATA ===================
app.get('/api/admin/export/messages', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, subject, message, ip_address, created_at FROM messages ORDER BY created_at DESC');
        const headers = ['id', 'name', 'email', 'subject', 'message', 'ip_address', 'created_at'];
        const csv = [
            headers.join(','),
            ...rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="wiadomosci.csv"');
        res.send('﻿' + csv);
    } catch (error) {
        console.error('Error exporting messages:', error);
        res.status(500).json({ message: 'Błąd podczas eksportu' });
    }
});

app.get('/api/admin/export/api-messages', isAuthenticated, validateOrigin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT am.id, ak.name as api_key_name, am.name, am.email, am.phone, am.subject, am.message, am.ip_address, am.created_at
             FROM api_messages am JOIN api_keys ak ON am.api_key_id = ak.id ORDER BY am.created_at DESC`
        );
        const headers = ['id', 'api_key_name', 'name', 'email', 'phone', 'subject', 'message', 'ip_address', 'created_at'];
        const csv = [
            headers.join(','),
            ...rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="wiadomosci-api.csv"');
        res.send('﻿' + csv);
    } catch (error) {
        console.error('Error exporting API messages:', error);
        res.status(500).json({ message: 'Błąd podczas eksportu' });
    }
});

// Automatyczna obsługa "czystych" URL-i dla WSZYSTKICH plików .html w /public
// (w tym w podfolderach) — bez potrzeby ręcznego dopisywania każdej podstrony.
// 1) /sciezka/plik.html -> 301 redirect na /sciezka/plik
// 2) /sciezka/plik -> serwuje /public/sciezka/plik.html jeśli istnieje
const publicDir = path.join(__dirname, 'public');

function resolveSafeHtmlPath(relPath) {
    const filePath = path.join(publicDir, relPath + '.html');
    if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) return null;
    return filePath;
}

app.get(/^\/(.+)\.html$/, (req, res, next) => {
    const filePath = resolveSafeHtmlPath(req.params[0]);
    if (!filePath) return next();
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) return next();
        res.redirect(301, '/' + req.params[0]);
    });
});

app.get(/^\/([^.]+)$/, (req, res, next) => {
    const filePath = resolveSafeHtmlPath(req.params[0]);
    if (!filePath) return next();
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) return next();
        res.sendFile(filePath);
    });
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

async function startServer() {
    try {
        await testConnection();
        
        await initDatabase();

        // Run cleanup immediately and then every 5 minutes
        cleanupExpiredEntries();
        setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
        
        app.listen(PORT, '127.0.0.1', () => {
            console.log(`\n🚀 Serwer działa na http://localhost:${PORT} (tylko lokalnie)`);
            console.log(`📝 Formularz kontaktowy: http://localhost:${PORT}`);
            console.log(`🔐 Panel admina: http://localhost:${PORT}/admin`);
            console.log(`👥 Panel konta: http://localhost:${PORT}/panel`);
            console.log(`🔗 API endpoint: http://localhost:${PORT}/api/v1/contact`);
            console.log(`\n🔒 Serwer nasłuchuje TYLKO na localhost (127.0.0.1)`);
            console.log(`   Nie jest dostępny z innych urządzeń w sieci lokalnej.`);
        });
    } catch (error) {
        console.error('❌ Błąd podczas uruchamiania serwera:', error);
        process.exit(1);
    }
}

startServer();
