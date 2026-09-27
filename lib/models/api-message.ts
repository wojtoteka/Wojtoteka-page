import { execute, select, selectOne } from '@/lib/db';
import type { MessageStats } from '@/lib/models/message';

export interface ApiMessageRow {
    id: number;
    api_key_id: number;
    api_key_name?: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    subject: string | null;
    message: string | null;
    ip_address: string | null;
    created_at: Date;
}

export interface ApiBannedIpRow {
    id: number;
    ip_address: string;
    api_key_id: number;
    reason: string | null;
    banned_at: Date;
}

export interface ApiMessageInput {
    api_key_id: number;
    name?: string;
    email?: string;
    phone?: string;
    subject?: string;
    message?: string;
    ip_address: string;
}

async function count(sql: string, params: (string | number)[] = []): Promise<number> {
    const row = await selectOne<{ count: number }>(sql, params);
    return Number(row?.count ?? 0);
}

export const ApiMessage = {
    async create(data: ApiMessageInput): Promise<number> {
        const result = await execute(
            `INSERT INTO api_messages (api_key_id, name, email, phone, subject, message, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [data.api_key_id, data.name || null, data.email || null, data.phone || null, data.subject || null, data.message || null, data.ip_address]
        );
        return result.insertId;
    },

    getByApiKeyId(apiKeyId: number) {
        return select<ApiMessageRow>('SELECT * FROM api_messages WHERE api_key_id = ? ORDER BY created_at DESC', [apiKeyId]);
    },

    getAll() {
        return select<ApiMessageRow>(
            `SELECT am.*, ak.name AS api_key_name
             FROM api_messages am
             JOIN api_keys ak ON am.api_key_id = ak.id
             ORDER BY am.created_at DESC`
        );
    },

    async delete(id: number | string): Promise<boolean> {
        const result = await execute('DELETE FROM api_messages WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    async deleteByApiKeyId(id: number | string, apiKeyId: number): Promise<boolean> {
        const result = await execute('DELETE FROM api_messages WHERE id = ? AND api_key_id = ?', [id, apiKeyId]);
        return result.affectedRows > 0;
    },

    async getStatsByApiKeyId(apiKeyId: number): Promise<MessageStats> {
        return {
            total: await count('SELECT COUNT(*) AS count FROM api_messages WHERE api_key_id = ?', [apiKeyId]),
            today: await count('SELECT COUNT(*) AS count FROM api_messages WHERE api_key_id = ? AND DATE(created_at) = CURDATE()', [apiKeyId]),
            week: await count('SELECT COUNT(*) AS count FROM api_messages WHERE api_key_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)', [apiKeyId])
        };
    },

    async getStatsAll(): Promise<{ total: number; today: number }> {
        return {
            total: await count('SELECT COUNT(*) AS count FROM api_messages'),
            today: await count('SELECT COUNT(*) AS count FROM api_messages WHERE DATE(created_at) = CURDATE()')
        };
    },

    async isIPBannedForKey(ipAddress: string, apiKeyId: number): Promise<boolean> {
        const rows = await select('SELECT 1 FROM api_banned_ips WHERE ip_address = ? AND api_key_id = ? LIMIT 1', [ipAddress, apiKeyId]);
        return rows.length > 0;
    },

    async banIPForKey(ipAddress: string, apiKeyId: number, reason = 'Spam/Abuse'): Promise<boolean> {
        const result = await execute(
            'INSERT INTO api_banned_ips (ip_address, api_key_id, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = ?, banned_at = CURRENT_TIMESTAMP',
            [ipAddress, apiKeyId, reason, reason]
        );
        return result.affectedRows > 0;
    },

    async unbanIPForKey(ipAddress: string, apiKeyId: number): Promise<boolean> {
        const result = await execute('DELETE FROM api_banned_ips WHERE ip_address = ? AND api_key_id = ?', [ipAddress, apiKeyId]);
        return result.affectedRows > 0;
    },

    getBannedIPsForKey(apiKeyId: number) {
        return select<ApiBannedIpRow>('SELECT * FROM api_banned_ips WHERE api_key_id = ? ORDER BY banned_at DESC', [apiKeyId]);
    }
};
