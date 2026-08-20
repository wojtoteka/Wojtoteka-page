const { pool } = require('../config/database');

class ApiKey {
    static async create(data) {
        try {
            const [result] = await pool.query(
                `INSERT INTO api_keys (api_key, name, collect_name, collect_email, collect_phone, collect_subject, collect_message, notification_email)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [data.api_key, data.name, data.collect_name ? 1 : 0, data.collect_email ? 1 : 0, data.collect_phone ? 1 : 0, data.collect_subject ? 1 : 0, data.collect_message ? 1 : 0, data.notification_email || null]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating API key:', error);
            throw error;
        }
    }

    static async findByKey(apiKey) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM api_keys WHERE api_key = ? AND is_active = TRUE LIMIT 1',
                [apiKey]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding API key:', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const [rows] = await pool.query('SELECT * FROM api_keys ORDER BY created_at DESC');
            return rows;
        } catch (error) {
            console.error('Error fetching API keys:', error);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching API key:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.query('DELETE FROM api_keys WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting API key:', error);
            throw error;
        }
    }

    static async toggleActive(id) {
        try {
            const [result] = await pool.query(
                'UPDATE api_keys SET is_active = NOT is_active WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error toggling API key:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const [total] = await pool.query('SELECT COUNT(*) as count FROM api_keys');
            const [active] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE is_active = TRUE');
            return { total: total[0].count, active: active[0].count };
        } catch (error) {
            console.error('Error fetching API key stats:', error);
            throw error;
        }
    }
}

module.exports = ApiKey;
