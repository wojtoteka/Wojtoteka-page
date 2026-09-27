import crypto from 'node:crypto';
import net from 'node:net';
import { execute, select } from '@/lib/db';
import loadedSecurityConfig from '@/s_url/security-config';
import loadedDomainRules from '@/s_url/blocked-domains';

// Polityka skracacza siedzi w s_url/: można ją przykręcić albo poluzować
// bez ruszania tego pliku.

const defaults = {
    requireHttps: false,
    checkBlockedDomains: true,
    checkBlockedKeywords: true,
    useExceptions: true,
    logBlockedAttempts: true,
    logIpAddress: true,
    strictMode: true,
    errorMessages: {
        httpRequired: 'Dozwolone są tylko adresy HTTPS.',
        domainBlocked: 'Ta domena jest zablokowana.',
        keywordBlocked: 'Ta domena została zablokowana przez filtr bezpieczeństwa.',
        invalidUrl: 'Nieprawidłowy adres URL.'
    }
};

const config = {
    ...defaults,
    ...loadedSecurityConfig,
    errorMessages: { ...defaults.errorMessages, ...(loadedSecurityConfig?.errorMessages || {}) }
};

const normalizeList = (list: unknown): string[] =>
    Array.isArray(list) ? list.map(item => String(item).toLowerCase().trim()).filter(Boolean) : [];

const blockedDomains = normalizeList(loadedDomainRules?.blockedDomains);
const blockedKeywords = normalizeList(loadedDomainRules?.blockedKeywords);
const allowedExceptions = normalizeList(loadedDomainRules?.allowedExceptions);

function hostMatchesDomain(host: string, domain: string): boolean {
    return host === domain || host.endsWith(`.${domain}`);
}

function isExceptionHost(host: string): boolean {
    return config.useExceptions && allowedExceptions.some(domain => hostMatchesDomain(host, domain));
}

function logBlocked(reason: string, rawUrl: string, host: string, requestIP: string | null): void {
    if (!config.logBlockedAttempts) return;
    const ipSection = config.logIpAddress && requestIP ? ` - IP: ${requestIP}` : '';
    console.warn(`[SHORTENER][BLOCKED] ${reason}${ipSection} - HOST: ${host || 'n/a'} - URL: ${rawUrl || 'n/a'}`);
}

export type UrlValidation = { ok: true; normalizedUrl: string } | { ok: false; message: string };

export function validateShortUrl(rawUrl: unknown, requestIP: string | null = null): UrlValidation {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
        return { ok: false, message: 'Wklej adres, który chcesz skrócić.' };
    }

    const trimmed = rawUrl.trim();
    if (trimmed.length > 2048) return { ok: false, message: 'Adres jest za długi (maksymalnie 2048 znaków).' };

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { ok: false, message: config.errorMessages.invalidUrl };
    }

    if (config.requireHttps) {
        if (parsed.protocol !== 'https:') {
            logBlocked('HTTP protocol blocked', trimmed, parsed.hostname, requestIP);
            return { ok: false, message: config.errorMessages.httpRequired };
        }
    } else if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, message: 'Dozwolone są tylko adresy HTTP i HTTPS.' };
    }

    if (parsed.username || parsed.password) {
        return { ok: false, message: 'Adres z loginem lub hasłem nie jest dozwolony.' };
    }

    const host = (parsed.hostname || '').toLowerCase();
    if (!host) return { ok: false, message: 'Adres nie ma poprawnej domeny.' };

    if (config.strictMode) {
        if (host === 'localhost' || host.endsWith('.local')) {
            logBlocked('Local host blocked by strict mode', trimmed, host, requestIP);
            return { ok: false, message: 'Adresy lokalne nie są dozwolone.' };
        }
        if (net.isIP(host.replace(/^\[|\]$/g, ''))) {
            logBlocked('IP host blocked by strict mode', trimmed, host, requestIP);
            return { ok: false, message: 'Adresy IP nie są dozwolone, podaj domenę.' };
        }
    }

    if (config.checkBlockedDomains && !isExceptionHost(host)) {
        if (blockedDomains.some(domain => hostMatchesDomain(host, domain))) {
            logBlocked('Blocked domain', trimmed, host, requestIP);
            return { ok: false, message: config.errorMessages.domainBlocked };
        }
    }

    if (config.checkBlockedKeywords && !isExceptionHost(host)) {
        const fullUrl = parsed.toString().toLowerCase();
        if (blockedKeywords.some(keyword => fullUrl.includes(keyword))) {
            logBlocked('Blocked keyword in URL', trimmed, host, requestIP);
            return { ok: false, message: config.errorMessages.keywordBlocked };
        }
    }

    return { ok: true, normalizedUrl: parsed.toString() };
}

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Przykładowy kod z opisu na /url. Kto go wpisze, trafia na niespodziankę. */
export const DEMO_CODE = 'Ab12Cd';
export const DEMO_TARGET = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

/** Unikalny 6-znakowy kod dla skróconego linku albo pliku. */
export async function generateUniqueCode(table: 'short_urls' | 'shared_files', length = 6): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
        let code = '';
        for (let i = 0; i < length; i++) code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
        if (code === DEMO_CODE) continue;
        const rows = await select(`SELECT id FROM \`${table}\` WHERE code = ? LIMIT 1`, [code]);
        if (rows.length === 0) return code;
    }
    throw new Error('Failed to generate unique code');
}

export const ALLOWED_EXPIRY_HOURS = new Set([1, 24, 168, 720]);

/** Zamienia wybór z formularza (godziny) na datę wygaśnięcia albo null. */
export function expiryFromHours(value: unknown, strict: boolean): { ok: true; expiresAt: Date | null } | { ok: false } {
    if (value === undefined || value === null || String(value).trim() === '') return { ok: true, expiresAt: null };
    const hours = Number(value);
    if (strict && (!Number.isInteger(hours) || !ALLOWED_EXPIRY_HOURS.has(hours))) return { ok: false };
    if (!Number.isFinite(hours) || hours <= 0) return strict ? { ok: false } : { ok: true, expiresAt: null };
    return { ok: true, expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000) };
}

export async function deleteExpiredShortUrls(): Promise<void> {
    await execute('DELETE FROM short_urls WHERE expires_at IS NOT NULL AND expires_at < NOW()');
}
