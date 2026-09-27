import { execute, select, selectOne } from '@/lib/db';

export interface MessageRow {
    id: number;
    name: string;
    email: string;
    subject: string;
    message: string;
    ip_address: string | null;
    created_at: Date;
}

export interface BannedIpRow {
    id: number;
    ip_address: string;
    reason: string | null;
    scope: 'form' | 'site';
    expires_at: Date | null;
    banned_at: Date;
}

export type BanScope = 'form' | 'site';

export interface MessageStats {
    total: number;
    today: number;
    week: number;
}

async function count(sql: string, params: (string | number)[] = []): Promise<number> {
    const row = await selectOne<{ count: number }>(sql, params);
    return Number(row?.count ?? 0);
}

export const Message = {
    async create(data: { name: string; email: string; subject: string; message: string; ip_address: string }): Promise<number> {
        const result = await execute(
            'INSERT INTO messages (name, email, subject, message, ip_address) VALUES (?, ?, ?, ?, ?)',
            [data.name, data.email, data.subject || '', data.message, data.ip_address]
        );
        return result.insertId;
    },

    getAll() {
        return select<MessageRow>('SELECT * FROM messages ORDER BY created_at DESC');
    },

    async delete(id: number | string): Promise<boolean> {
        const result = await execute('DELETE FROM messages WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    async getStats(): Promise<MessageStats> {
        return {
            total: await count('SELECT COUNT(*) AS count FROM messages'),
            today: await count('SELECT COUNT(*) AS count FROM messages WHERE DATE(created_at) = CURDATE()'),
            week: await count('SELECT COUNT(*) AS count FROM messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')
        };
    },

    async isIPBanned(ipAddress: string): Promise<boolean> {
        const rows = await select(
            'SELECT 1 FROM banned_ips WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1',
            [ipAddress]
        );
        return rows.length > 0;
    },

    async isIPBannedSiteWide(ipAddress: string): Promise<boolean> {
        try {
            const rows = await select(
                "SELECT 1 FROM banned_ips WHERE ip_address = ? AND scope = 'site' AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1",
                [ipAddress]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking site-wide ban:', error);
            return false;
        }
    },

    /** days: 0 = na stałe, w przeciwnym razie blokada wygasa po tylu dniach. */
    async banIP(ipAddress: string, reason = 'Spam/Abuse', scope: BanScope = 'form', days = 0): Promise<boolean> {
        const safeScope: BanScope = scope === 'site' ? 'site' : 'form';
        const hasExpiry = Number.isFinite(days) && days > 0;
        const expiresExpr = hasExpiry ? 'DATE_ADD(NOW(), INTERVAL ? DAY)' : 'NULL';
        const params = hasExpiry
            ? [ipAddress, reason, safeScope, days, reason, safeScope, days]
            : [ipAddress, reason, safeScope, reason, safeScope];
        const result = await execute(
            `INSERT INTO banned_ips (ip_address, reason, scope, expires_at) VALUES (?, ?, ?, ${expiresExpr})
             ON DUPLICATE KEY UPDATE reason = ?, scope = ?, expires_at = ${expiresExpr}, banned_at = CURRENT_TIMESTAMP`,
            params
        );
        return result.affectedRows > 0;
    },

    async unbanIP(ipAddress: string): Promise<boolean> {
        const result = await execute('DELETE FROM banned_ips WHERE ip_address = ?', [ipAddress]);
        return result.affectedRows > 0;
    },

    getAllBannedIPs() {
        return select<BannedIpRow>('SELECT * FROM banned_ips ORDER BY banned_at DESC');
    }
};
