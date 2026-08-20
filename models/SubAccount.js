const { pool } = require('../config/database');

class SubAccount {
    static async create(data) {
        try {
            const [result] = await pool.query(
                `INSERT INTO sub_accounts (email, username, password_hash, api_key_id) VALUES (?, ?, ?, ?)`,
                [data.email, data.username, data.password_hash, data.api_key_id]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating sub-account:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const [rows] = await pool.query(
                'SELECT sa.*, ak.name as api_key_name FROM sub_accounts sa LEFT JOIN api_keys ak ON sa.api_key_id = ak.id WHERE sa.email = ? LIMIT 1',
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding sub-account:', error);
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM sub_accounts WHERE username = ? LIMIT 1',
                [username]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding sub-account:', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const [rows] = await pool.query(
                `SELECT sa.id, sa.email, sa.username, sa.api_key_id, sa.is_active, sa.is_locked, sa.created_at, sa.last_login, sa.last_login_ip, sa.failed_login_attempts,
                        ak.name as api_key_name
                 FROM sub_accounts sa
                 LEFT JOIN api_keys ak ON sa.api_key_id = ak.id
                 ORDER BY sa.created_at DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error fetching sub-accounts:', error);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await pool.query(
                'SELECT sa.*, ak.name as api_key_name FROM sub_accounts sa LEFT JOIN api_keys ak ON sa.api_key_id = ak.id WHERE sa.id = ?',
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching sub-account:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.query('DELETE FROM sub_accounts WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting sub-account:', error);
            throw error;
        }
    }

    static async changePassword(id, newPasswordHash) {
        try {
            const [result] = await pool.query(
                'UPDATE sub_accounts SET password_hash = ? WHERE id = ?',
                [newPasswordHash, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error changing sub-account password:', error);
            throw error;
        }
    }

    static async updateLastLogin(id, ip) {
        try {
            await pool.query(
                'UPDATE sub_accounts SET last_login = NOW(), last_login_ip = ?, failed_login_attempts = 0, is_locked = FALSE, locked_until = NULL WHERE id = ?',
                [ip, id]
            );
        } catch (error) {
            console.error('Error updating sub-account last login:', error);
        }
    }

    static async incrementFailedAttempts(id) {
        try {
            await pool.query(
                'UPDATE sub_accounts SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?',
                [id]
            );
            const [rows] = await pool.query('SELECT failed_login_attempts FROM sub_accounts WHERE id = ?', [id]);
            const attempts = rows[0]?.failed_login_attempts || 0;
            if (attempts >= 5) {
                await pool.query(
                    'UPDATE sub_accounts SET is_locked = TRUE, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
                    [id]
                );
            }
            return attempts;
        } catch (error) {
            console.error('Error incrementing failed attempts:', error);
            throw error;
        }
    }

    static async isLocked(id) {
        try {
            const [rows] = await pool.query(
                'SELECT is_locked, locked_until FROM sub_accounts WHERE id = ?',
                [id]
            );
            if (!rows[0]) return false;
            if (!rows[0].is_locked) return false;
            if (rows[0].locked_until && new Date(rows[0].locked_until) < new Date()) {
                await pool.query(
                    'UPDATE sub_accounts SET is_locked = FALSE, locked_until = NULL, failed_login_attempts = 0 WHERE id = ?',
                    [id]
                );
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error checking lock status:', error);
            throw error;
        }
    }

    static async saveResetCode(accountId, code, email) {
        try {
            await pool.query(
                'UPDATE password_reset_codes SET used = TRUE WHERE account_id = ? AND account_type = "sub_account"',
                [accountId]
            );
            const [result] = await pool.query(
                `INSERT INTO password_reset_codes (account_type, account_id, code, email, expires_at)
                 VALUES ('sub_account', ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
                [accountId, code, email]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error saving reset code:', error);
            throw error;
        }
    }

    static async verifyResetCode(email, code) {
        try {
            const [rows] = await pool.query(
                `SELECT prc.*, sa.id as sub_account_id
                 FROM password_reset_codes prc
                 JOIN sub_accounts sa ON prc.account_id = sa.id
                 WHERE prc.email = ? AND prc.code = ? AND prc.used = FALSE AND prc.expires_at > NOW() AND prc.account_type = 'sub_account'
                 ORDER BY prc.created_at DESC LIMIT 1`,
                [email, code]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error verifying reset code:', error);
            throw error;
        }
    }

    static async markCodeUsed(codeId) {
        try {
            await pool.query('UPDATE password_reset_codes SET used = TRUE WHERE id = ?', [codeId]);
        } catch (error) {
            console.error('Error marking code as used:', error);
        }
    }

    static async unlockAccount(id) {
        try {
            await pool.query(
                'UPDATE sub_accounts SET is_locked = FALSE, locked_until = NULL, failed_login_attempts = 0 WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('Error unlocking account:', error);
            throw error;
        }
    }

    static async updateApiKeyAssignment(id, apiKeyId) {
        try {
            const [result] = await pool.query(
                'UPDATE sub_accounts SET api_key_id = ? WHERE id = ?',
                [apiKeyId || null, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating sub-account API key assignment:', error);
            throw error;
        }
    }
}

module.exports = SubAccount;
