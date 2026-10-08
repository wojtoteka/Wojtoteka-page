import type { Request, Response } from 'express';
import { DISCORD_ID } from '@/lib/discord';
import { RoyalDisabledError, rExecute } from '@/lib/royal/db';

// Wspólne kawałki tras panelu RoyalCasino (/api/admin/royal).

/** Błąd do pokazania adminowi wprost (400), np. „za mało środków”. */
export class UserError extends Error {}

type Handler = (req: Request, res: Response) => Promise<unknown>;

/** Łapie błędy handlera: wyłączona baza → 503, UserError → 400, reszta → 500. */
export function h(fn: Handler) {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            await fn(req, res);
        } catch (error) {
            if (res.headersSent) return;
            if (error instanceof RoyalDisabledError) {
                res.status(503).json({ message: error.message, disabled: true });
            } else if (error instanceof UserError) {
                res.status(400).json({ message: error.message });
            } else {
                console.error(`[ROYAL] ${req.method} ${req.path}:`, error);
                const sqlMessage = (error as { sqlMessage?: string }).sqlMessage;
                res.status(500).json({ message: sqlMessage ? `Błąd bazy: ${sqlMessage}` : 'Błąd bazy RoyalCasino.' });
            }
        }
    };
}

const SNOWFLAKE = /^\d{15,21}$/;

export function snowflake(value: unknown, label = 'ID'): string {
    const raw = String(value ?? '').trim();
    if (!SNOWFLAKE.test(raw)) throw new UserError(`${label} musi być identyfikatorem Discorda (15-21 cyfr).`);
    return raw;
}

export function optionalSnowflake(value: unknown, label = 'ID kanału'): string | null {
    if (value === null || value === undefined || value === '') return null;
    return snowflake(value, label);
}

/** Dodatnia liczba całkowita w bezpiecznym zakresie (kwoty, poziomy). */
export function amount(value: unknown, { min = 1, max = 1e15, label = 'Kwota' } = {}): number {
    const n = Math.trunc(Number(value));
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new UserError(`${label}: podaj liczbę od ${min} do ${max.toLocaleString('pl-PL')}.`);
    return n;
}

export function text(value: unknown, max = 1000): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function page(req: Request, defaultPer = 25): { page: number; per: number; offset: number } {
    const p = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
    const per = Math.min(200, Math.max(5, Math.trunc(Number(req.query.per)) || defaultPer));
    return { page: p, per, offset: (p - 1) * per };
}

export function q(req: Request, key: string): string {
    const value = req.query[key];
    return typeof value === 'string' ? value.trim() : '';
}

/** Discord ID zapisywane jako autor wpisów z panelu WWW (notatki, obserwacja, wypłaty, log). */
export function adminDiscordId(): string {
    return process.env.ROYAL_ADMIN_DISCORD_ID || DISCORD_ID;
}

/**
 * Wpis do logu admina bota (admin_audit), żeby zmiany z WWW były widoczne
 * także w /admin-log i w panelu bota. Autor to Discord ID właściciela,
 * a w szczegółach zapisujemy źródło i login z panelu strony.
 */
export async function audit(
    req: Request,
    action: string,
    target: string | null,
    details: Record<string, unknown>,
    reason: string | null
): Promise<void> {
    try {
        await rExecute(
            'INSERT INTO admin_audit (admin_id, action, target_user_id, details, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [adminDiscordId(), action.slice(0, 50), target, JSON.stringify({ ...details, source: 'www', by: req.auth?.username ?? '' }), reason, Date.now()]
        );
    } catch (error) {
        console.error('[ROYAL] Zapis do admin_audit:', (error as Error).message);
    }
}

/** Wiersz z bazy do JSON-a: Buffer jako tekst albo hex, daty jako ISO. */
export function plainRow(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
        if (Buffer.isBuffer(value)) {
            const asText = value.toString('utf8');
            out[key] = /^[\x09\x0a\x0d\x20-\x7e -￿]*$/.test(asText) && !asText.includes('�') ? asText : `0x${value.toString('hex')}`;
        } else if (value instanceof Date) {
            out[key] = Number.isNaN(value.getTime()) ? null : value.toISOString();
        } else if (typeof value === 'bigint') {
            out[key] = value.toString();
        } else {
            out[key] = value;
        }
    }
    return out;
}
