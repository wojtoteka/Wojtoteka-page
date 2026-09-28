import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

// Express (ładowany przez tsx) i Next.js (własny bundler) importują ten moduł
// osobno, ale działają w jednym procesie. Pula w globalThis sprawia, że oba
// korzystają z tych samych połączeń zamiast otwierać dwie pule.
const globalForDb = globalThis as typeof globalThis & { __wojtotekaPool?: Pool };

export const pool: Pool =
    globalForDb.__wojtotekaPool ??
    (globalForDb.__wojtotekaPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'wojtoteka_kontakt',
        port: Number(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    }));

export type Row = RowDataPacket;
export type SqlParam = string | number | boolean | Date | null | undefined;

/** SELECT: zwraca wiersze z typem wskazanym przez wywołującego. */
export async function select<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows as unknown as T[];
}

/** SELECT jednego wiersza albo null. */
export async function selectOne<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
    const rows = await select<T>(sql, params);
    return rows[0] ?? null;
}

/** INSERT / UPDATE / DELETE: zwraca nagłówek wyniku (insertId, affectedRows). */
export async function execute(sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
    const [result] = await pool.query<ResultSetHeader>(sql, params);
    return result;
}

export async function testConnection(): Promise<boolean> {
    try {
        const connection = await pool.getConnection();
        console.log('[DB] Połączono z bazą danych MariaDB');
        connection.release();
        return true;
    } catch (error) {
        console.error('[DB] Błąd połączenia z bazą danych:', (error as Error).message);
        return false;
    }
}

async function columnExists(table: string, column: string): Promise<boolean> {
    const row = await selectOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    return Number(row?.count) > 0;
}

async function indexExists(table: string, index: string, uniqueOnly = false): Promise<boolean> {
    const row = await selectOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
         ${uniqueOnly ? 'AND NON_UNIQUE = 0' : ''}`,
        [table, index]
    );
    return Number(row?.count) > 0;
}

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

/**
 * Tworzy brakujące tabele i dokłada kolumny dodane w kolejnych wersjach.
 * Wszystko jest idempotentne: przy istniejącej bazie nic się nie zmienia.
 */
export async function initDatabase(): Promise<void> {
    await execute(`
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
        ) ${TABLE_OPTIONS}`);

    await execute(`
        CREATE TABLE IF NOT EXISTS banned_ips (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip_address VARCHAR(45) NOT NULL UNIQUE,
            reason VARCHAR(255),
            banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip_address (ip_address)
        ) ${TABLE_OPTIONS}`);

    await execute(`
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL,
            last_login_ip VARCHAR(45),
            INDEX idx_username (username)
        ) ${TABLE_OPTIONS}`);

    await execute(`
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
        ) ${TABLE_OPTIONS}`);

    await execute(`
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
        ) ${TABLE_OPTIONS}`);

    await execute(`
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
        ) ${TABLE_OPTIONS}`);

    await execute(`
        CREATE TABLE IF NOT EXISTS api_banned_ips (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip_address VARCHAR(45) NOT NULL,
            api_key_id INT NOT NULL,
            reason VARCHAR(255),
            banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
            UNIQUE KEY unique_ip_key (ip_address, api_key_id),
            INDEX idx_ip_key (ip_address, api_key_id)
        ) ${TABLE_OPTIONS}`);

    await execute(`
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
        ) ${TABLE_OPTIONS}`);

    await execute(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info', 'warning', 'important') DEFAULT 'info',
            display_type ENUM('banner', 'popup', 'status') DEFAULT 'banner',
            pages VARCHAR(500) NOT NULL DEFAULT '[]',
            is_active TINYINT(1) DEFAULT 1,
            priority INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_is_active (is_active),
            INDEX idx_priority (priority)
        ) ${TABLE_OPTIONS}`);

    await execute(`
        CREATE TABLE IF NOT EXISTS password_reset_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_type VARCHAR(20) NOT NULL,
            account_id INT NOT NULL,
            code VARCHAR(6) NOT NULL,
            email VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            used TINYINT(1) DEFAULT 0,
            INDEX idx_code (code),
            INDEX idx_account (account_type, account_id)
        ) ${TABLE_OPTIONS}`);

    await execute(`
        CREATE TABLE IF NOT EXISTS short_urls (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(10) NOT NULL UNIQUE,
            original_url TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NULL,
            click_count INT DEFAULT 0,
            INDEX idx_code (code),
            INDEX idx_expires_at (expires_at)
        ) ${TABLE_OPTIONS}`);

    await execute(`
        CREATE TABLE IF NOT EXISTS bio_links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            url VARCHAR(2048) NOT NULL,
            icon VARCHAR(50) NOT NULL DEFAULT 'link',
            sort_order INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            opens_new_tab TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_sort_order (sort_order),
            INDEX idx_is_active (is_active)
        ) ${TABLE_OPTIONS}`);

    for (const col of ['starts_at', 'ends_at']) {
        if (!(await columnExists('announcements', col))) {
            await execute(`ALTER TABLE announcements ADD COLUMN \`${col}\` DATETIME NULL`);
        }
    }

    const announcementDisplay = await selectOne<{ column_type: string }>(
        `SELECT COLUMN_TYPE AS column_type FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'display_type'`
    );
    if (!announcementDisplay?.column_type.includes("'status'")) {
        await execute("ALTER TABLE announcements MODIFY COLUMN display_type ENUM('banner', 'popup', 'status') DEFAULT 'banner'");
    }

    await execute(`
        CREATE TABLE IF NOT EXISTS page_views (
            id INT AUTO_INCREMENT PRIMARY KEY,
            path VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            count INT NOT NULL DEFAULT 0,
            UNIQUE KEY unique_path_date (path, date),
            INDEX idx_date (date)
        ) ${TABLE_OPTIONS}`);

    // form = tylko formularz kontaktowy, site = cała strona
    if (!(await columnExists('banned_ips', 'scope'))) {
        await execute("ALTER TABLE banned_ips ADD COLUMN scope VARCHAR(10) NOT NULL DEFAULT 'form' AFTER reason");
    }
    // NULL = blokada na stałe
    if (!(await columnExists('banned_ips', 'expires_at'))) {
        await execute('ALTER TABLE banned_ips ADD COLUMN expires_at DATETIME NULL AFTER scope');
    }
    if (!(await columnExists('page_views', 'last_seen'))) {
        await execute('ALTER TABLE page_views ADD COLUMN last_seen DATETIME NULL AFTER date');
        await execute('UPDATE page_views SET last_seen = date WHERE last_seen IS NULL');
    }
    if (!(await columnExists('bio_links', 'click_count'))) {
        await execute('ALTER TABLE bio_links ADD COLUMN click_count INT DEFAULT 0 AFTER opens_new_tab');
    }

    await execute(`
        CREATE TABLE IF NOT EXISTS site_settings (
            \`key\` VARCHAR(100) NOT NULL PRIMARY KEY,
            \`value\` TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ${TABLE_OPTIONS}`);
    for (const [key, value] of [
        ['tagline', 'developer html,css,js'],
        ['maintenance_mode', 'off'],
        ['maintenance_paths', '[]']
    ]) {
        await execute('INSERT IGNORE INTO site_settings (`key`, `value`) VALUES (?, ?)', [key, value]);
    }

    const bioCount = await selectOne<{ count: number }>('SELECT COUNT(*) AS count FROM bio_links');
    if (Number(bioCount?.count) === 0) {
        await execute(`
            INSERT INTO bio_links (title, url, icon, sort_order, is_active, opens_new_tab) VALUES
            ('Moje gry', '/gry', 'gamepad', 0, 1, 0),
            ('Kontakt', '/kontakt', 'mail', 1, 1, 0),
            ('Google Play', 'https://play.google.com/store/apps/developer?id=Wojtoteka&hl=pl', 'play', 2, 1, 1),
            ('Skróć URL', '/url', 'link', 3, 1, 0),
            ('Royal Casino Bot', '/RoyalCasinoBot', 'bot', 4, 1, 0)
        `);
    }

    await execute(`
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
        ) ${TABLE_OPTIONS}`);
    if (!(await columnExists('shared_files', 'preview_enabled'))) {
        await execute('ALTER TABLE shared_files ADD COLUMN preview_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER expires_at');
    }

    // Głębina: TOP 5, jeden wpis na nick
    await execute(`
        CREATE TABLE IF NOT EXISTS glebina_scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nick VARCHAR(20) NOT NULL,
            score INT NOT NULL,
            ip_address VARCHAR(45) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_score (score)
        ) ${TABLE_OPTIONS}`);

    // Wpis jest przypisany do nicku, a nie do IP: zmiana sieci nie tworzy
    // duplikatu. IP zostaje jako zwykły indeks do throttlingu nowych wpisów.
    if (await indexExists('glebina_scores', 'ip_address', true)) {
        await execute('ALTER TABLE glebina_scores DROP INDEX ip_address');
        await execute('ALTER TABLE glebina_scores ADD INDEX idx_ip_address (ip_address)');
    }
    if (!(await indexExists('glebina_scores', 'idx_nick_unique'))) {
        // Przed migracją mogły powstać duplikaty nicku: zostaje najlepszy wynik.
        await execute(`
            DELETE t1 FROM glebina_scores t1
            INNER JOIN glebina_scores t2
              ON t1.nick = t2.nick
              AND (t1.score < t2.score OR (t1.score = t2.score AND t1.id > t2.id))
        `);
        await execute('ALTER TABLE glebina_scores ADD UNIQUE INDEX idx_nick_unique (nick)');
    }

    await execute(`
        CREATE TABLE IF NOT EXISTS glebina_ip_throttle (
            ip_address VARCHAR(45) NOT NULL PRIMARY KEY,
            attempts_in_window INT NOT NULL DEFAULT 1,
            window_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ${TABLE_OPTIONS}`);
    if (await columnExists('glebina_ip_throttle', 'last_attempt_at')) {
        await execute('ALTER TABLE glebina_ip_throttle CHANGE COLUMN last_attempt_at window_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    }
    if (!(await columnExists('glebina_ip_throttle', 'attempts_in_window'))) {
        await execute('ALTER TABLE glebina_ip_throttle ADD COLUMN attempts_in_window INT NOT NULL DEFAULT 1 AFTER ip_address');
    }

    const admins = await selectOne<{ count: number }>('SELECT COUNT(*) AS count FROM admins');
    if (Number(admins?.count) === 0) {
        const randomPassword = crypto.randomBytes(12).toString('base64url');
        const passwordHash = await bcrypt.hash(randomPassword, 12);
        await execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['Wojtoteka', passwordHash]);
        console.log('[DB] Utworzono domyślnego admina: Wojtoteka');
        console.log('[DB] Tymczasowe hasło admina:', randomPassword);
        console.log('[DB] Zmień hasło zaraz po pierwszym zalogowaniu.');
    }

    console.log('[DB] Tabele w bazie danych zostały zainicjowane');
}
