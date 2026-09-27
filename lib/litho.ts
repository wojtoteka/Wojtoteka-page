import fs from 'node:fs';
import path from 'node:path';

// Instalatory Litho Studio wrzuca się ręcznie do public/inne/litho/file/.
// Wszystko wynika z nazwy pliku: "Litho Studio-1.0.0.exe" to wersja 1.0.0,
// rozszerzenie wyznacza platformę. Katalog jest skanowany na bieżąco.

export const LITHO_DIR = path.join(process.cwd(), 'public', 'inne', 'litho', 'file');

const PLATFORM_BY_EXT: Record<string, 'windows' | 'linux'> = {
    '.exe': 'windows',
    '.msi': 'windows',
    '.appimage': 'linux',
    '.deb': 'linux',
    '.rpm': 'linux'
};

const CACHE_TTL = 15 * 1000;

export interface LithoFile {
    file: string;
    name: string;
    product: string;
    variant: string | null;
    ext: string;
    platform: 'windows' | 'linux';
    version: string | null;
    size: number;
    sizeText: string;
    created: string;
    modified: string;
    url: string;
}

export interface LithoScan {
    windows: { name: 'Windows'; files: LithoFile[]; verW: string | null };
    linux: { name: 'Linux'; files: LithoFile[]; verL: string | null };
    generated: string;
}

let cache: { at: number; data: LithoScan | null } = { at: 0, data: null };

// "Litho Studio-1.0.0"          -> wersja 1.0.0, bez wariantu
// "Litho Studio-1.0.0-portable" -> wersja 1.0.0, wariant "portable"
// Człon beta/rc po wersji doklejamy do wersji, resztę traktujemy jako wariant.
function parseName(baseName: string): { product: string; version: string | null; variant: string | null } {
    const match = baseName.match(/[-_ ](\d+(?:\.\d+)+)(?=$|[-_. ])/);
    if (!match || match.index === undefined) return { product: baseName, version: null, variant: null };

    let version = match[1];
    let rest = baseName.slice(match.index + match[0].length).replace(/^[-_. ]+/, '');

    const prerelease = rest.match(/^((?:alpha|beta|rc|pre)[.-]?\d*)(?:[-_. ]+(.*))?$/i);
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

export function compareVersions(a: string | null, b: string | null): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    const pa = a.split(/[.-]/);
    const pb = b.split(/[.-]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = parseInt(pa[i], 10);
        const nb = parseInt(pb[i], 10);
        const aNum = !Number.isNaN(na);
        const bNum = !Number.isNaN(nb);

        // Brakujący człon liczbowy traktujemy jak 0 ("1.0" == "1.0.0").
        if (aNum && bNum) {
            if (na !== nb) return na - nb;
            continue;
        }
        if (aNum && pb[i] === undefined) { if (na !== 0) return 1; continue; }
        if (bNum && pa[i] === undefined) { if (nb !== 0) return -1; continue; }

        // Człon tekstowy oznacza prerelease: wydanie bez niego jest nowsze.
        if (pa[i] === undefined) return 1;
        if (pb[i] === undefined) return -1;
        if (aNum) return 1;
        if (bNum) return -1;
        const cmp = pa[i].localeCompare(pb[i]);
        if (cmp !== 0) return cmp;
    }
    return 0;
}

export function formatSize(bytes: number): string {
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

export function scanLitho(): LithoScan {
    const now = Date.now();
    if (cache.data && now - cache.at < CACHE_TTL) return cache.data;

    const windows: LithoFile[] = [];
    const linux: LithoFile[] = [];

    let entries: fs.Dirent[] = [];
    try {
        entries = fs.readdirSync(LITHO_DIR, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error('[LITHO] Nie udało się odczytać katalogu:', (error as Error).message);
        }
    }

    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        const platform = PLATFORM_BY_EXT[ext];
        if (!platform) continue;

        let stat: fs.Stats;
        try {
            stat = fs.statSync(path.join(LITHO_DIR, entry.name));
        } catch {
            continue;
        }

        // birthtime bywa zerowy na niektórych systemach plików, wtedy mtime.
        const created = stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime;
        const baseName = entry.name.slice(0, entry.name.length - ext.length);
        const parsed = parseName(baseName);

        const item: LithoFile = {
            file: entry.name,
            name: baseName,
            product: parsed.product,
            variant: parsed.variant,
            ext: ext.slice(1),
            platform,
            version: parsed.version,
            size: stat.size,
            sizeText: formatSize(stat.size),
            created: created.toISOString(),
            modified: stat.mtime.toISOString(),
            url: `/litho/download/${encodeURIComponent(entry.name)}`
        };
        (platform === 'windows' ? windows : linux).push(item);
    }

    // Najnowsza wersja na górze, potem zwykły instalator przed wariantami.
    const sortFiles = (list: LithoFile[]) =>
        list.sort((a, b) => {
            const byVersion = compareVersions(b.version, a.version);
            if (byVersion !== 0) return byVersion;
            if (!a.variant !== !b.variant) return a.variant ? 1 : -1;
            return a.ext.localeCompare(b.ext) || (a.variant || '').localeCompare(b.variant || '');
        });
    sortFiles(windows);
    sortFiles(linux);

    const latest = (list: LithoFile[]) =>
        list.reduce<string | null>((best, item) => (compareVersions(item.version, best) > 0 ? item.version : best), null);

    const data: LithoScan = {
        windows: { name: 'Windows', files: windows, verW: latest(windows) },
        linux: { name: 'Linux', files: linux, verL: latest(linux) },
        generated: new Date().toISOString()
    };
    cache = { at: now, data };
    return data;
}

/** ?ext=deb albo ?variant=portable pozwala aplikacji wskazać konkretny build. */
export function filterLithoFiles(files: LithoFile[], query: Record<string, unknown>): LithoFile[] {
    let result = files;
    if (typeof query.ext === 'string' && query.ext) {
        const ext = query.ext.toLowerCase().replace(/^\./, '');
        result = result.filter(item => item.ext === ext);
    }
    if (typeof query.variant === 'string' && query.variant) {
        const variant = query.variant.toLowerCase();
        result = result.filter(item => (item.variant || '').toLowerCase() === variant);
    }
    return result;
}

export function findLithoFile(fileName: string): LithoFile | null {
    const data = scanLitho();
    return [...data.windows.files, ...data.linux.files].find(item => item.file === fileName) || null;
}
