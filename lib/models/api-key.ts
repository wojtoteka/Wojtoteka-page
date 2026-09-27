import { execute, select, selectOne } from '@/lib/db';

export interface ApiKeyRow {
    id: number;
    api_key: string;
    name: string;
    collect_name: number;
    collect_email: number;
    collect_phone: number;
    collect_subject: number;
    collect_message: number;
    notification_email: string | null;
    is_active: number;
    created_at: Date;
}

export interface ApiKeyInput {
    api_key: string;
    name: string;
    collect_name: boolean;
    collect_email: boolean;
    collect_phone: boolean;
    collect_subject: boolean;
    collect_message: boolean;
    notification_email: string | null;
}

export const ApiKey = {
    async create(data: ApiKeyInput): Promise<number> {
        const result = await execute(
            `INSERT INTO api_keys (api_key, name, collect_name, collect_email, collect_phone, collect_subject, collect_message, notification_email)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.api_key,
                data.name,
                data.collect_name ? 1 : 0,
                data.collect_email ? 1 : 0,
                data.collect_phone ? 1 : 0,
                data.collect_subject ? 1 : 0,
                data.collect_message ? 1 : 0,
                data.notification_email || null
            ]
        );
        return result.insertId;
    },

    findByKey(apiKey: string) {
        return selectOne<ApiKeyRow>('SELECT * FROM api_keys WHERE api_key = ? AND is_active = TRUE LIMIT 1', [apiKey]);
    },

    getAll() {
        return select<ApiKeyRow>('SELECT * FROM api_keys ORDER BY created_at DESC');
    },

    getById(id: number | string) {
        return selectOne<ApiKeyRow>('SELECT * FROM api_keys WHERE id = ?', [id]);
    },

    async delete(id: number | string): Promise<boolean> {
        const result = await execute('DELETE FROM api_keys WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    async toggleActive(id: number | string): Promise<boolean> {
        const result = await execute('UPDATE api_keys SET is_active = NOT is_active WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    async getStats(): Promise<{ total: number; active: number }> {
        const total = await selectOne<{ count: number }>('SELECT COUNT(*) AS count FROM api_keys');
        const active = await selectOne<{ count: number }>('SELECT COUNT(*) AS count FROM api_keys WHERE is_active = TRUE');
        return { total: Number(total?.count ?? 0), active: Number(active?.count ?? 0) };
    }
};
