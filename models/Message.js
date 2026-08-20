const { pool } = require('../config/database');

class Message {
    static async create(data) {
        try {
            const [result] = await pool.query(
                'INSERT INTO messages (name, email, subject, message, ip_address) VALUES (?, ?, ?, ?, ?)',
                [data.name, data.email, data.subject || '', data.message, data.ip_address]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating message:', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM messages ORDER BY created_at DESC'
            );
            return rows;
        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM messages WHERE id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error fetching message:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.query(
                'DELETE FROM messages WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const [totalResult] = await pool.query(
                'SELECT COUNT(*) as count FROM messages'
            );
            const total = totalResult[0].count;

            const [todayResult] = await pool.query(
                'SELECT COUNT(*) as count FROM messages WHERE DATE(created_at) = CURDATE()'
            );
            const today = todayResult[0].count;

            const [weekResult] = await pool.query(
                'SELECT COUNT(*) as count FROM messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
            );
            const week = weekResult[0].count;

            return { total, today, week };
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    }

    static async isIPBanned(ipAddress) {
        try {
            const [rows] = await pool.query(
                'SELECT 1 FROM banned_ips WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1',
                [ipAddress]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking banned IP:', error);
            throw error;
        }
    }

    // days: 0 / null / undefined = permanent; otherwise ban expires after that many days
    static async banIP(ipAddress, reason = 'Spam/Abuse', scope = 'form', days = 0) {
        const safeScope = scope === 'site' ? 'site' : 'form';
        const d = parseInt(days, 10);
        const hasExpiry = Number.isFinite(d) && d > 0;
        const expiresExpr = hasExpiry ? 'DATE_ADD(NOW(), INTERVAL ? DAY)' : 'NULL';
        try {
            const params = hasExpiry
                ? [ipAddress, reason, safeScope, d, reason, safeScope, d]
                : [ipAddress, reason, safeScope, reason, safeScope];
            const [result] = await pool.query(
                `INSERT INTO banned_ips (ip_address, reason, scope, expires_at) VALUES (?, ?, ?, ${expiresExpr})
                 ON DUPLICATE KEY UPDATE reason = ?, scope = ?, expires_at = ${expiresExpr}, banned_at = CURRENT_TIMESTAMP`,
                params
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error banning IP:', error);
            throw error;
        }
    }

    static async isIPBannedSiteWide(ipAddress) {
        try {
            const [rows] = await pool.query(
                "SELECT 1 FROM banned_ips WHERE ip_address = ? AND scope = 'site' AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1",
                [ipAddress]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking site-wide ban:', error);
            return false;
        }
    }

    static async unbanIP(ipAddress) {
        try {
            const [result] = await pool.query(
                'DELETE FROM banned_ips WHERE ip_address = ?',
                [ipAddress]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error unbanning IP:', error);
            throw error;
        }
    }

    static async getAllBannedIPs() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM banned_ips ORDER BY banned_at DESC'
            );
            return rows;
        } catch (error) {
            console.error('Error fetching banned IPs:', error);
            throw error;
        }
    }
}

module.exports = Message;
