import fs from 'node:fs';
import path from 'node:path';
import { execute, select } from '@/lib/db';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'files');
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // tyle przepuszcza proxy Cloudflare

export function ensureUploadsDir(): void {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/** Nazwy plików na dysku to 32 znaki hex (losowane przy uploadzie). */
export function isStoredName(name: string): boolean {
    return /^[a-f0-9]{32}$/.test(name);
}

const CODE_PREVIEW_EXTENSIONS = new Set([
    '.txt', '.md', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
    '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.php',
    '.rb', '.swift', '.kt', '.sql', '.xml', '.yaml', '.yml', '.ini', '.toml',
    '.csv', '.log', '.sh', '.bat', '.ps1', '.css', '.html', '.htm'
]);

const BINARY_INLINE_PREFIXES = ['image/', 'audio/', 'video/'];

/**
 * Typ MIME do podglądu w przeglądarce albo null, gdy plik trzeba pobrać.
 * Kod i HTML zawsze idą jako text/plain, żeby nic się nie wykonało.
 */
export function inlinePreviewMime(originalName: string, mimeType: string): string | null {
    const ext = path.extname(String(originalName || '')).toLowerCase();
    const mime = String(mimeType || '').toLowerCase();

    if (ext === '.pdf' || mime === 'application/pdf') return 'application/pdf';
    if (CODE_PREVIEW_EXTENSIONS.has(ext)) {
        if (ext === '.json') return 'application/json; charset=utf-8';
        if (ext === '.md') return 'text/markdown; charset=utf-8';
        if (ext === '.csv') return 'text/csv; charset=utf-8';
        return 'text/plain; charset=utf-8';
    }
    if (mime === 'text/html' || mime === 'image/svg+xml') return 'text/plain; charset=utf-8';
    if (mime.startsWith('text/')) return `${mime}; charset=utf-8`;
    return BINARY_INLINE_PREFIXES.some(prefix => mime.startsWith(prefix)) ? mime : null;
}

export function sanitizeDownloadFileName(fileName: string): string {
    return (
        String(fileName || 'plik')
            .replace(/[\x00-\x1f\x7f]/g, '')
            .replace(/[/\\]/g, '_')
            .replace(/\.{2,}/g, '.')
            .replace(/"/g, '_')
            .substring(0, 255) || 'plik'
    );
}

export async function deleteExpiredFiles(): Promise<void> {
    const expired = await select<{ stored_name: string }>(
        'SELECT stored_name FROM shared_files WHERE expires_at IS NOT NULL AND expires_at < NOW()'
    );
    if (expired.length === 0) return;
    await execute('DELETE FROM shared_files WHERE expires_at IS NOT NULL AND expires_at < NOW()');
    for (const file of expired) {
        if (isStoredName(file.stored_name)) fs.unlink(path.join(UPLOADS_DIR, file.stored_name), () => {});
    }
}
