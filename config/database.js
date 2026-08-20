const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Połączono z bazą danych MariaDB');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Błąd połączenia z bazą danych:', error.message);
        return false;
    }
}

async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL DEFAULT '',
                message TEXT NOT NULL,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_created_at (created_at),
                INDEX idx_ip_address (ip_address)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS banned_ips (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL UNIQUE,
                reason VARCHAR(255),
                banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ip_address (ip_address)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                last_login_ip VARCHAR(45),
                INDEX idx_username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // API Keys table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                api_key VARCHAR(64) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                collect_name TINYINT(1) DEFAULT 1,
                collect_email TINYINT(1) DEFAULT 1,
                collect_phone TINYINT(1) DEFAULT 0,
                collect_subject TINYINT(1) DEFAULT 1,
                collect_message TINYINT(1) DEFAULT 1,
                notification_email VARCHAR(255),
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_api_key (api_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Sub-accounts table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sub_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                api_key_id INT,
                is_active TINYINT(1) DEFAULT 1,
                is_locked TINYINT(1) DEFAULT 0,
                locked_until TIMESTAMP NULL,
                failed_login_attempts INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                last_login_ip VARCHAR(45),
                FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
                INDEX idx_email (email),
                INDEX idx_username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // API Messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS api_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                api_key_id INT NOT NULL,
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                subject VARCHAR(255),
                message TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
                INDEX idx_api_key_id (api_key_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // API-specific banned IPs
        await connection.query(`
            CREATE TABLE IF NOT EXISTS api_banned_ips (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                api_key_id INT NOT NULL,
                reason VARCHAR(255),
                banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
                UNIQUE KEY unique_ip_key (ip_address, api_key_id),
                INDEX idx_ip_key (ip_address, api_key_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Login attempts tracking
        await connection.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_type VARCHAR(20) NOT NULL,
                account_identifier VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                was_successful TINYINT(1) DEFAULT 0,
                INDEX idx_account (account_type, account_identifier),
                INDEX idx_ip (ip_address),
                INDEX idx_attempted_at (attempted_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Announcements
        await connection.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('info', 'warning', 'important') DEFAULT 'info',
                display_type ENUM('banner', 'popup') DEFAULT 'banner',
                pages VARCHAR(500) NOT NULL DEFAULT '[]',
                is_active TINYINT(1) DEFAULT 1,
                priority INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_is_active (is_active),
                INDEX idx_priority (priority)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Password reset codes
        await connection.query(`
            CREATE TABLE IF NOT EXISTS password_reset_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_type VARCHAR(20) NOT NULL,
                account_id INT NOT NULL,
                code VARCHAR(6) NOT NULL,
                email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used TINYINT(1) DEFAULT 0,
                INDEX idx_code (code),
                INDEX idx_account (account_type, account_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Short URLs (URL shortener)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS short_urls (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(10) NOT NULL UNIQUE,
                original_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                click_count INT DEFAULT 0,
                INDEX idx_code (code),
                INDEX idx_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Bio links (homepage links managed via admin panel)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bio_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                url VARCHAR(2048) NOT NULL,
                icon VARCHAR(50) NOT NULL DEFAULT '🔗',
                sort_order INT DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                opens_new_tab TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sort_order (sort_order),
                INDEX idx_is_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Migrate: add starts_at / ends_at to announcements if missing
        for (const col of ['starts_at', 'ends_at']) {
            const [annCol] = await connection.query(`
                SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = ?
            `, [col]);
            if (annCol[0].count === 0) {
                await connection.query(`ALTER TABLE announcements ADD COLUMN \`${col}\` DATETIME NULL`);
            }
        }

        // Page views tracking
        await connection.query(`
            CREATE TABLE IF NOT EXISTS page_views (
                id INT AUTO_INCREMENT PRIMARY KEY,
                path VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                count INT NOT NULL DEFAULT 0,
                UNIQUE KEY unique_path_date (path, date),
                INDEX idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Migrate: add scope to banned_ips if missing (form = only contact form; site = entire site)
        const [banScopeCol] = await connection.query(`
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banned_ips' AND COLUMN_NAME = 'scope'
        `);
        if (banScopeCol[0].count === 0) {
            await connection.query("ALTER TABLE banned_ips ADD COLUMN scope VARCHAR(10) NOT NULL DEFAULT 'form' AFTER reason");
        }

        // Migrate: add expires_at to banned_ips if missing (NULL = permanent ban)
        const [banExpiresCol] = await connection.query(`
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banned_ips' AND COLUMN_NAME = 'expires_at'
        `);
        if (banExpiresCol[0].count === 0) {
            await connection.query('ALTER TABLE banned_ips ADD COLUMN expires_at DATETIME NULL AFTER scope');
        }

        // Migrate: add last_seen (exact timestamp of most recent visit) to page_views if missing
        const [lastSeenCol] = await connection.query(`
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page_views' AND COLUMN_NAME = 'last_seen'
        `);
        if (lastSeenCol[0].count === 0) {
            await connection.query('ALTER TABLE page_views ADD COLUMN last_seen DATETIME NULL AFTER date');
            // Backfill historical rows with their date (midnight) so they still show a date
            await connection.query('UPDATE page_views SET last_seen = date WHERE last_seen IS NULL');
        }

        // Migrate: add click_count to bio_links if missing
        const [clickCol] = await connection.query(`
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bio_links' AND COLUMN_NAME = 'click_count'
        `);
        if (clickCol[0].count === 0) {
            await connection.query('ALTER TABLE bio_links ADD COLUMN click_count INT DEFAULT 0 AFTER opens_new_tab');
        }

        // Site settings (key-value store)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                \`key\` VARCHAR(100) NOT NULL PRIMARY KEY,
                \`value\` TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await connection.query(
            'INSERT IGNORE INTO site_settings (`key`, `value`) VALUES (?, ?)',
            ['tagline', 'developer html,css,js']
        );
        await connection.query(
            'INSERT IGNORE INTO site_settings (`key`, `value`) VALUES (?, ?)',
            ['maintenance_mode', 'off']
        );
        await connection.query(
            'INSERT IGNORE INTO site_settings (`key`, `value`) VALUES (?, ?)',
            ['maintenance_paths', '[]']
        );

        // Seed default bio links if table is empty
        const [bioCount] = await connection.query('SELECT COUNT(*) as count FROM bio_links');
        if (bioCount[0].count === 0) {
            await connection.query(`
                INSERT INTO bio_links (title, url, icon, sort_order, is_active, opens_new_tab) VALUES
                ('Moje gry', '/gry', '🕹️', 0, 1, 0),
                ('Kontakt', '/kontakt', '📩', 1, 1, 0),
                ('Google Play', 'https://play.google.com/store/apps/developer?id=Wojtoteka&hl=pl', '🎮', 2, 1, 1),
                ('Skróć URL', '/url', '🔗', 3, 1, 0),
                ('Royal Casino Bot', '/RoyalCasinoBot/', '🤖', 4, 1, 0)
            `);
        }

        // Shared files (file sharing)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS shared_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(10) NOT NULL UNIQUE,
                original_name VARCHAR(500) NOT NULL,
                stored_name VARCHAR(255) NOT NULL,
                mime_type VARCHAR(255) NOT NULL,
                file_size BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                preview_enabled TINYINT(1) NOT NULL DEFAULT 0,
                download_count INT DEFAULT 0,
                INDEX idx_code (code),
                INDEX idx_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Backward-compatible migration for existing installations
        const [previewColumn] = await connection.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'shared_files'
              AND COLUMN_NAME = 'preview_enabled'
        `);

        if (previewColumn[0].count === 0) {
            await connection.query(`
                ALTER TABLE shared_files
                ADD COLUMN preview_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER expires_at
            `);
        }

        // Głębina - leaderboard (TOP 5 wyników, jeden wpis na nick)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS glebina_scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nick VARCHAR(20) NOT NULL,
                score INT NOT NULL,
                ip_address VARCHAR(45) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_score (score)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Migracja: wpis w rankingu Głębiny jest teraz przypisany do NICKU,
        // a nie do adresu IP - dzięki temu zmiana IP (częsta przy sieciach
        // komórkowych) nie tworzy duplikatu, tylko aktualizuje własny rekord.
        // IP zostaje jako zwykły (nieunikalny) indeks - służy tylko do
        // throttlingu nowych wpisów i blokowania drugiego miejsca z tego
        // samego adresu (patrz server.js /api/glebina/score).
        const [ipUniqueIndex] = await connection.query(`
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'glebina_scores'
              AND INDEX_NAME = 'ip_address' AND NON_UNIQUE = 0
        `);
        if (ipUniqueIndex[0].count > 0) {
            await connection.query('ALTER TABLE glebina_scores DROP INDEX ip_address');
            await connection.query('ALTER TABLE glebina_scores ADD INDEX idx_ip_address (ip_address)');
        }

        const [nickUniqueIndex] = await connection.query(`
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'glebina_scores'
              AND INDEX_NAME = 'idx_nick_unique'
        `);
        if (nickUniqueIndex[0].count === 0) {
            // Sprzed migracji mogły powstać wpisy z tym samym nickiem na różnych
            // IP (unikalność była tylko po IP) - zostawiamy tylko najlepszy wynik,
            // inaczej ALTER ... UNIQUE poniżej zawiedzie na duplikatach.
            await connection.query(`
                DELETE t1 FROM glebina_scores t1
                INNER JOIN glebina_scores t2
                  ON t1.nick = t2.nick
                  AND (t1.score < t2.score OR (t1.score = t2.score AND t1.id > t2.id))
            `);
            await connection.query('ALTER TABLE glebina_scores ADD UNIQUE INDEX idx_nick_unique (nick)');
        }

        // Głębina - throttling nowych wpisów: maks. kilka prób dodania nowego
        // wpisu na adres IP na tydzień (adresy bywają dynamiczne, więc to nie
        // jest stuprocentowa ochrona, ale ogranicza masowe zakładanie kont/proxy).
        await connection.query(`
            CREATE TABLE IF NOT EXISTS glebina_ip_throttle (
                ip_address VARCHAR(45) NOT NULL PRIMARY KEY,
                attempts_in_window INT NOT NULL DEFAULT 1,
                window_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Migracja: kolumna last_attempt_at -> window_started_at + nowa
        // attempts_in_window (throttle policzalny, nie tylko jednorazowy).
        const [oldThrottleColumn] = await connection.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'glebina_ip_throttle'
              AND COLUMN_NAME = 'last_attempt_at'
        `);
        if (oldThrottleColumn[0].count > 0) {
            await connection.query('ALTER TABLE glebina_ip_throttle CHANGE COLUMN last_attempt_at window_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }
        const [attemptsColumn] = await connection.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'glebina_ip_throttle'
              AND COLUMN_NAME = 'attempts_in_window'
        `);
        if (attemptsColumn[0].count === 0) {
            await connection.query('ALTER TABLE glebina_ip_throttle ADD COLUMN attempts_in_window INT NOT NULL DEFAULT 1 AFTER ip_address');
        }

        const [admins] = await connection.query('SELECT COUNT(*) as count FROM admins');
        if (admins[0].count === 0) {
            const randomPassword = crypto.randomBytes(12).toString('base64url');
            const passwordHash = await bcrypt.hash(randomPassword, 12);
            await connection.query(
                'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
                ['Wojtoteka', passwordHash]
            );
            console.log('✅ Utworzono domyślnego admina: Wojtoteka');
            console.log('🔑 Tymczasowe hasło admina:', randomPassword);
            console.log('⚠️  Zmień hasło natychmiast po pierwszym zalogowaniu!');
        }

        console.log('✅ Tabele w bazie danych zostały zainicjowane');
        connection.release();
    } catch (error) {
        console.error('❌ Błąd podczas inicjalizacji bazy danych:', error.message);
        throw error;
    }
}

module.exports = {
    pool,
    testConnection,
    initDatabase
};
