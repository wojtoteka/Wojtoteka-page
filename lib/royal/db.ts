import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { SqlParam } from '@/lib/db';

// Baza bota RoyalCasino: ten sam serwer MariaDB co strona, ale osobna baza
// (i zwykle osobny użytkownik). Bot sam tworzy i migruje swoje tabele, strona
// tylko z nich czyta i robi te same zmiany co panel admina bota.
//
// Pusty DB_ROYAL_NAME wyłącza ranking na /RoyalCasinoBot i zakładki w /admin/royal.

const env = (key: string, fallback: string) => process.env[`DB_ROYAL_${key}`] || process.env[`DB_${key}`] || fallback;

export function royalConfigured(): boolean {
    return Boolean(process.env.DB_ROYAL_NAME) && process.env.WOJTOTEKA_PREVIEW !== '1';
}

const globalForRoyal = globalThis as typeof globalThis & { __royalPool?: Pool };

function pool(): Pool {
    if (!royalConfigured()) throw new RoyalDisabledError();
    return (globalForRoyal.__royalPool ??= mysql.createPool({
        host: env('HOST', 'localhost'),
        port: Number(env('PORT', '3306')) || 3306,
        user: env('USER', 'root'),
        password: process.env.DB_ROYAL_PASSWORD ?? process.env.DB_PASSWORD ?? '',
        database: process.env.DB_ROYAL_NAME,
        waitForConnections: true,
        connectionLimit: 6,
        queueLimit: 0,
        charset: 'utf8mb4',
        // SUM() z kolumn BIGINT wraca jako DECIMAL; bez tego mysql2 oddaje string.
        decimalNumbers: true
    }));
}

export class RoyalDisabledError extends Error {
    constructor() {
        super('Baza RoyalCasino nie jest skonfigurowana (DB_ROYAL_NAME w .env).');
        this.name = 'RoyalDisabledError';
    }
}

export async function rSelect<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const [rows] = await pool().query<RowDataPacket[]>(sql, params);
    return rows as unknown as T[];
}

export async function rSelectOne<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    return (await rSelect<T>(sql, params))[0] ?? null;
}

export async function rExecute(sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
    const [result] = await pool().query<ResultSetHeader>(sql, params);
    return result;
}

/**
 * Ta sama blokada MariaDB co w bocie (Database.withNamedUserLock), więc zmiana
 * salda z panelu nie wejdzie w środek gry. Bot dodatkowo zapisuje saldo
 * względnie (money = money + ?), dlatego nawet bez blokady nic by nie zginęło.
 */
export async function withPlayerLock<T>(userId: string, fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await pool().getConnection();
    const lockName = `rcu_${userId}`.slice(0, 64);
    let locked = false;
    try {
        const [rows] = await conn.query<RowDataPacket[]>('SELECT GET_LOCK(?, 8) AS acquired', [lockName]);
        if (rows[0]?.acquired === 0) throw new Error('Gracz właśnie gra. Spróbuj ponownie za chwilę.');
        locked = rows[0]?.acquired === 1;
        return await fn(conn);
    } finally {
        if (locked) await conn.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
        conn.release();
    }
}

// ---------- Kolumny dodane w nowszych wersjach bota ----------
// Strona działa też ze starszym botem: bez kolumn z nickiem pokazuje same ID.

let columnCache: { at: number; columns: Set<string> } | null = null;

export async function royalColumns(): Promise<Set<string>> {
    if (columnCache && Date.now() - columnCache.at < 5 * 60_000) return columnCache.columns;
    const rows = await rSelect<{ t: string; c: string }>(
        `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`
    );
    const columns = new Set(rows.map(r => `${r.t}.${r.c}`));
    columnCache = { at: Date.now(), columns };
    return columns;
}

export async function hasProfiles(): Promise<boolean> {
    return (await royalColumns()).has('users.avatar');
}

export async function hasGuildInfo(): Promise<boolean> {
    return (await royalColumns()).has('guild_settings.name');
}

/** Kolumny profilu do SELECT-a; przy starym schemacie same NULL-e. */
export async function profileSelect(alias = 'u'): Promise<string> {
    return (await hasProfiles())
        ? `${alias}.username, ${alias}.display_name, ${alias}.avatar, ${alias}.web_hidden`
        : 'NULL AS username, NULL AS display_name, NULL AS avatar, 0 AS web_hidden';
}
