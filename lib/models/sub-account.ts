import { execute, select, selectOne } from '@/lib/db';

export interface SubAccountRow {
    id: number;
    email: string;
    username: string;
    password_hash: string;
    api_key_id: number | null;
    api_key_name?: string | null;
    is_active: number;
    is_locked: number;
    locked_until: Date | null;
    failed_login_attempts: number;
    created_at: Date;
    last_login: Date | null;
    last_login_ip: string | null;
}

export type SubAccountListRow = Omit<SubAccountRow, 'password_hash' | 'locked_until'>;

export interface ResetCodeRow {
    id: number;
    sub_account_id: number;
}

const WITH_KEY_NAME = 'SELECT sa.*, ak.name AS api_key_name FROM sub_accounts sa LEFT JOIN api_keys ak ON sa.api_key_id = ak.id';

export const SubAccount = {
    async create(data: { email: string; username: string; password_hash: string; api_key_id: number | null }): Promise<number> {
        const result = await execute(
            'INSERT INTO sub_accounts (email, username, password_hash, api_key_id) VALUES (?, ?, ?, ?)',
            [data.email, data.username, data.password_hash, data.api_key_id]
        );
        return result.insertId;
    },

    findByEmail(email: string) {
        return selectOne<SubAccountRow>(`${WITH_KEY_NAME} WHERE sa.email = ? LIMIT 1`, [email]);
    },

    findByUsername(username: string) {
        return selectOne<SubAccountRow>('SELECT * FROM sub_accounts WHERE username = ? LIMIT 1', [username]);
    },

    getById(id: number | string) {
        return selectOne<SubAccountRow>(`${WITH_KEY_NAME} WHERE sa.id = ?`, [id]);
    },

    getAll() {
        return select<SubAccountListRow>(
            `SELECT sa.id, sa.email, sa.username, sa.api_key_id, sa.is_active, sa.is_locked, sa.created_at,
                    sa.last_login, sa.last_login_ip, sa.failed_login_attempts, ak.name AS api_key_name
             FROM sub_accounts sa
             LEFT JOIN api_keys ak ON sa.api_key_id = ak.id
             ORDER BY sa.created_at DESC`
        );
    },

    async delete(id: number | string): Promise<boolean> {
        const result = await execute('DELETE FROM sub_accounts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    async changePassword(id: number, passwordHash: string): Promise<boolean> {
        const result = await execute('UPDATE sub_accounts SET password_hash = ? WHERE id = ?', [passwordHash, id]);
        return result.affectedRows > 0;
    },

    async updateLastLogin(id: number, ip: string): Promise<void> {
        try {
            await execute(
                'UPDATE sub_accounts SET last_login = NOW(), last_login_ip = ?, failed_login_attempts = 0, is_locked = FALSE, locked_until = NULL WHERE id = ?',
                [ip, id]
            );
        } catch (error) {
            console.error('Error updating sub-account last login:', error);
        }
    },

    /** Zwiększa licznik nieudanych prób i blokuje konto na 15 minut po piątej. */
    async incrementFailedAttempts(id: number): Promise<number> {
        await execute('UPDATE sub_accounts SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?', [id]);
        const row = await selectOne<{ failed_login_attempts: number }>('SELECT failed_login_attempts FROM sub_accounts WHERE id = ?', [id]);
        const attempts = Number(row?.failed_login_attempts ?? 0);
        if (attempts >= 5) {
            await execute('UPDATE sub_accounts SET is_locked = TRUE, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?', [id]);
        }
        return attempts;
    },

    /** Sprawdza blokadę i zdejmuje ją, jeśli już minęła. */
    async isLocked(id: number): Promise<boolean> {
        const row = await selectOne<{ is_locked: number; locked_until: Date | null }>(
            'SELECT is_locked, locked_until FROM sub_accounts WHERE id = ?',
            [id]
        );
        if (!row || !row.is_locked) return false;
        if (row.locked_until && new Date(row.locked_until) < new Date()) {
            await execute('UPDATE sub_accounts SET is_locked = FALSE, locked_until = NULL, failed_login_attempts = 0 WHERE id = ?', [id]);
            return false;
        }
        return true;
    },

    async unlockAccount(id: number | string): Promise<void> {
        await execute('UPDATE sub_accounts SET is_locked = FALSE, locked_until = NULL, failed_login_attempts = 0 WHERE id = ?', [id]);
    },

    async updateApiKeyAssignment(id: number | string, apiKeyId: number | null): Promise<boolean> {
        const result = await execute('UPDATE sub_accounts SET api_key_id = ? WHERE id = ?', [apiKeyId || null, id]);
        return result.affectedRows > 0;
    },

    async saveResetCode(accountId: number, code: string, email: string): Promise<number> {
        await execute("UPDATE password_reset_codes SET used = TRUE WHERE account_id = ? AND account_type = 'sub_account'", [accountId]);
        const result = await execute(
            `INSERT INTO password_reset_codes (account_type, account_id, code, email, expires_at)
             VALUES ('sub_account', ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [accountId, code, email]
        );
        return result.insertId;
    },

    verifyResetCode(email: string, code: string) {
        return selectOne<ResetCodeRow>(
            `SELECT prc.id, sa.id AS sub_account_id
             FROM password_reset_codes prc
             JOIN sub_accounts sa ON prc.account_id = sa.id
             WHERE prc.email = ? AND prc.code = ? AND prc.used = FALSE AND prc.expires_at > NOW() AND prc.account_type = 'sub_account'
             ORDER BY prc.created_at DESC LIMIT 1`,
            [email, code]
        );
    },

    async markCodeUsed(codeId: number): Promise<void> {
        await execute('UPDATE password_reset_codes SET used = TRUE WHERE id = ?', [codeId]);
    }
};
