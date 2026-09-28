import fs from 'node:fs';
import path from 'node:path';

// Ścieżki liczone w statystykach odwiedzin, wykrywane z kodu zamiast ręcznej listy:
// - każdy page.tsx w app/ (bez paneli i stron z parametrami typu [id]),
// - każdy folder w public/ z własnym index.html (gry, stare podstrony).
// Wszystko inne to skanery botów i nie trafia do bazy.

const APP_ROOT = path.join(process.cwd(), 'app');
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;
const EXCLUDED_PREFIXES = ['/admin', '/panel'];
const PUBLIC_SKIP = new Set(['img', 'js', 'uploads']);
const PUBLIC_MAX_DEPTH = 3;
// Gry wrzucone do public/ nie wymagają restartu, więc lista co jakiś czas się odświeża.
const CACHE_MS = 60_000;

function readDirs(dir: string): fs.Dirent[] {
    try {
        return fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }
}

function scanApp(dir: string, segments: string[], found: Set<string>): void {
    const entries = readDirs(dir);
    if (entries.some(entry => entry.isFile() && PAGE_FILE.test(entry.name))) {
        found.add('/' + segments.join('/'));
    }
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        // [id], [...slug], _prywatne, @slot: nie da się z nich zrobić stałej ścieżki
        if (name.startsWith('[') || name.startsWith('_') || name.startsWith('@')) continue;
        // (grupa) nie zmienia adresu
        const isGroup = name.startsWith('(') && name.endsWith(')');
        scanApp(path.join(dir, name), isGroup ? segments : [...segments, name], found);
    }
}

function scanPublic(dir: string, segments: string[], found: Set<string>): void {
    if (segments.length > PUBLIC_MAX_DEPTH) return;
    const entries = readDirs(dir);
    if (segments.length > 0 && entries.some(entry => entry.isFile() && entry.name === 'index.html')) {
        found.add('/' + segments.join('/'));
    }
    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        if (segments.length === 0 && PUBLIC_SKIP.has(entry.name)) continue;
        scanPublic(path.join(dir, entry.name), [...segments, entry.name], found);
    }
}

function scan(): Set<string> {
    const found = new Set<string>();
    scanApp(APP_ROOT, [], found);
    scanPublic(PUBLIC_ROOT, [], found);
    for (const p of found) {
        if (EXCLUDED_PREFIXES.some(prefix => p === prefix || p.startsWith(prefix + '/'))) found.delete(p);
    }
    return found;
}

let cache: { paths: Set<string>; at: number } | null = null;

export function getTrackedPaths(): Set<string> {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
        cache = { paths: scan(), at: Date.now() };
    }
    return cache.paths;
}
