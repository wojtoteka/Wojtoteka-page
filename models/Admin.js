const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wojtoteka_kontakt',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

class Admin {
    static async findByUsername(username) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM admins WHERE username = ? LIMIT 1',
                [username]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding admin:', error);
            throw error;
        }
    }

    static async updateLastLogin(username, ip) {
        try {
            await pool.query(
                'UPDATE admins SET last_login = NOW(), last_login_ip = ? WHERE username = ?',
                [ip, username]
            );
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    static async changePassword(username, newPasswordHash) {
        try {
            const [result] = await pool.query(
                'UPDATE admins SET password_hash = ? WHERE username = ?',
                [newPasswordHash, username]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }
}

module.exports = Admin;
