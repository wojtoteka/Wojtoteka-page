const { pool } = require('../config/database');

class ApiMessage {
    static async create(data) {
        try {
            const [result] = await pool.query(
                `INSERT INTO api_messages (api_key_id, name, email, phone, subject, message, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [data.api_key_id, data.name || null, data.email || null, data.phone || null, data.subject || null, data.message || null, data.ip_address]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating API message:', error);
            throw error;
        }
    }

    static async getByApiKeyId(apiKeyId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM api_messages WHERE api_key_id = ? ORDER BY created_at DESC',
                [apiKeyId]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching API messages:', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const [rows] = await pool.query(
                `SELECT am.*, ak.name as api_key_name
                 FROM api_messages am
                 JOIN api_keys ak ON am.api_key_id = ak.id
                 ORDER BY am.created_at DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error fetching all API messages:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.query('DELETE FROM api_messages WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting API message:', error);
            throw error;
        }
    }

    static async deleteByApiKeyId(id, apiKeyId) {
        try {
            const [result] = await pool.query(
                'DELETE FROM api_messages WHERE id = ? AND api_key_id = ?',
                [id, apiKeyId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting API message:', error);
            throw error;
        }
    }

    static async getStatsByApiKeyId(apiKeyId) {
        try {
            const [totalResult] = await pool.query(
                'SELECT COUNT(*) as count FROM api_messages WHERE api_key_id = ?', [apiKeyId]
            );
            const [todayResult] = await pool.query(
                'SELECT COUNT(*) as count FROM api_messages WHERE api_key_id = ? AND DATE(created_at) = CURDATE()', [apiKeyId]
            );
            const [weekResult] = await pool.query(
                'SELECT COUNT(*) as count FROM api_messages WHERE api_key_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)', [apiKeyId]
            );
            return { total: totalResult[0].count, today: todayResult[0].count, week: weekResult[0].count };
        } catch (error) {
            console.error('Error fetching API message stats:', error);
            throw error;
        }
    }

    static async getStatsAll() {
        try {
            const [totalResult] = await pool.query('SELECT COUNT(*) as count FROM api_messages');
            const [todayResult] = await pool.query(
                'SELECT COUNT(*) as count FROM api_messages WHERE DATE(created_at) = CURDATE()'
            );
            return { total: totalResult[0].count, today: todayResult[0].count };
        } catch (error) {
            console.error('Error fetching all API message stats:', error);
            throw error;
        }
    }

    static async isIPBannedForKey(ipAddress, apiKeyId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM api_banned_ips WHERE ip_address = ? AND api_key_id = ?',
                [ipAddress, apiKeyId]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking API banned IP:', error);
            throw error;
        }
    }

    static async banIPForKey(ipAddress, apiKeyId, reason = 'Spam/Abuse') {
        try {
            const [result] = await pool.query(
                'INSERT INTO api_banned_ips (ip_address, api_key_id, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = ?, banned_at = CURRENT_TIMESTAMP',
                [ipAddress, apiKeyId, reason, reason]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error banning API IP:', error);
            throw error;
        }
    }

    static async unbanIPForKey(ipAddress, apiKeyId) {
        try {
            const [result] = await pool.query(
                'DELETE FROM api_banned_ips WHERE ip_address = ? AND api_key_id = ?',
                [ipAddress, apiKeyId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error unbanning API IP:', error);
            throw error;
        }
    }

    static async getBannedIPsForKey(apiKeyId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM api_banned_ips WHERE api_key_id = ? ORDER BY banned_at DESC',
                [apiKeyId]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching API banned IPs:', error);
            throw error;
        }
    }
}

module.exports = ApiMessage;
