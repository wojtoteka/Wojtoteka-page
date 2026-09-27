import { execute, selectOne } from '@/lib/db';

export interface AdminRow {
    id: number;
    username: string;
    password_hash: string;
    created_at: Date;
    last_login: Date | null;
    last_login_ip: string | null;
}

export const Admin = {
    findByUsername(username: string) {
        return selectOne<AdminRow>('SELECT * FROM admins WHERE username = ? LIMIT 1', [username]);
    },

    findById(id: number) {
        return selectOne<AdminRow>('SELECT * FROM admins WHERE id = ? LIMIT 1', [id]);
    },

    async updateLastLogin(id: number, ip: string): Promise<void> {
        try {
            await execute('UPDATE admins SET last_login = NOW(), last_login_ip = ? WHERE id = ?', [ip, id]);
        } catch (error) {
            console.error('Error updating admin last login:', error);
        }
    },

    async changePassword(id: number, passwordHash: string): Promise<boolean> {
        const result = await execute('UPDATE admins SET password_hash = ? WHERE id = ?', [passwordHash, id]);
        return result.affectedRows > 0;
    }
};
