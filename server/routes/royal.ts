import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAdmin } from '@/server/auth';
import { limits, validateOrigin, verifyCsrf } from '@/server/middleware';
import {
    hasGuildInfo,
    hasProfiles,
    profileSelect,
    rExecute,
    rSelect,
    rSelectOne,
    royalColumns,
    royalConfigured,
    withPlayerLock
} from '@/lib/royal/db';
import { royalExtraRouter } from './royal-extra';
import { UserError, adminDiscordId, amount, audit, h, optionalSnowflake, page, plainRow, q, snowflake, text } from './royal-shared';

// Panel bota RoyalCasino pod /admin/royal. Robi to samo co panel admina bota
// na Discordzie (karta gracza, eventy, konserwacja, serwery, zgłoszenia,
// wypłaty, log), plus wgląd w całą bazę. Bot trzyma krótkie cache
// (gracz 5 s, ustawienia i eventy 8 s, serwer 45 s), więc zmiany z panelu
// widać w bocie najpóźniej po tym czasie.

export const royalRouter = Router();

royalRouter.use(limits.royalAdmin, requireAdmin, validateOrigin, (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return verifyCsrf(req, res, next);
});

const DAY = 86_400_000;

function warsawDateKey(ms = Date.now()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

async function requirePlayer(userId: string): Promise<Record<string, unknown>> {
    const user = await rSelectOne<Record<string, unknown>>('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) throw new UserError('Nie ma takiego gracza w bazie bota.');
    return user;
}

// ---------- Stan połączenia ----------

royalRouter.get(
    '/status',
    h(async (_req, res) => {
        if (!royalConfigured()) {
            res.json({ configured: false });
            return;
        }
        const columns = await royalColumns();
        res.json({
            configured: true,
            profiles: columns.has('users.avatar'),
            guildInfo: columns.has('guild_settings.name'),
            tables: [...new Set([...columns].map(c => c.split('.')[0]))].length
        });
    })
);

// ---------- Pulpit ----------

royalRouter.get(
    '/dashboard',
    h(async (req, res) => {
        const days = Math.min(90, Math.max(7, Math.trunc(Number(req.query.days)) || 30));
        const now = Date.now();
        const since24h = now - DAY;

        const [users] = await rSelect<Record<string, number>>(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN is_blocked THEN 1 ELSE 0 END) AS blocked,
                    SUM(CASE WHEN is_frozen = 1 THEN 1 ELSE 0 END) AS frozen,
                    COALESCE(SUM(money), 0) AS money,
                    COALESCE(SUM(credits), 0) AS credits,
                    COALESCE(SUM(rakeback_balance), 0) AS rakeback,
                    COALESCE(SUM(total_games), 0) AS games,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) AS new24h,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS new7d
             FROM users`
        );
        const [h24] = await rSelect<Record<string, number>>(
            `SELECT COUNT(*) AS games, COUNT(DISTINCT user_id) AS players,
                    COALESCE(SUM(bet_amount), 0) AS wagered, COALESCE(SUM(bet_amount - win_amount), 0) AS houseNet
             FROM game_history WHERE played_at >= ?`,
            [since24h]
        );
        const [votes] = await rSelect<Record<string, number>>(
            'SELECT COUNT(*) AS total, SUM(CASE WHEN voted_at >= ? THEN 1 ELSE 0 END) AS last24h FROM votes',
            [since24h]
        );
        const daily = await rSelect<{ day: string; games: number; wagered: number; houseNet: number; players: number }>(
            `SELECT DATE_FORMAT(FROM_UNIXTIME(played_at / 1000), '%Y-%m-%d') AS day, COUNT(*) AS games,
                    COALESCE(SUM(bet_amount), 0) AS wagered, COALESCE(SUM(bet_amount - win_amount), 0) AS houseNet,
                    COUNT(DISTINCT user_id) AS players
             FROM game_history WHERE played_at >= ? GROUP BY day ORDER BY day`,
            [now - days * DAY]
        );
        const perGame = await rSelect<{ game_type: string; games: number; wagered: number; houseNet: number }>(
            `SELECT game_type, COUNT(*) AS games, COALESCE(SUM(bet_amount), 0) AS wagered, COALESCE(SUM(bet_amount - win_amount), 0) AS houseNet
             FROM game_history WHERE played_at >= ? GROUP BY game_type ORDER BY wagered DESC`,
            [now - 7 * DAY]
        );
        const events = await rSelect<{ event_type: string; value: number; expires_at: number }>(
            'SELECT event_type, value, expires_at FROM bot_events WHERE expires_at > ?',
            [now]
        );
        const maintenance = await rSelectOne<{ v: string }>("SELECT setting_value AS v FROM bot_settings WHERE setting_key = 'bot_maintenance'");
        const jackpot = await rSelectOne<Record<string, number>>(
            `SELECT r.id, r.pot, r.total_tickets, r.draw_at,
                    (SELECT COUNT(*) FROM jackpot_tickets t WHERE t.round_id = r.id AND t.tickets > 0) AS players
             FROM jackpot_rounds r WHERE r.status = 'open' ORDER BY r.id DESC LIMIT 1`
        );
        const count = async (sql: string, params: (string | number)[] = []) => Number((await rSelectOne<{ c: number }>(sql, params))?.c) || 0;
        const guildInfo = await hasGuildInfo();

        res.json({
            users,
            last24h: h24,
            votes,
            daily,
            perGame,
            events,
            maintenance: maintenance?.v === '1' || maintenance?.v === 'true',
            jackpot,
            counts: {
                reports: await count("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'"),
                payouts: await count("SELECT COUNT(*) AS c FROM payouts WHERE status = 'oczekuje'"),
                watched: await count('SELECT COUNT(*) AS c FROM user_watch'),
                mines: await count('SELECT COUNT(*) AS c FROM mines_sessions WHERE cashed_out = FALSE AND hit_mine = FALSE'),
                staleMines: await count('SELECT COUNT(*) AS c FROM mines_sessions WHERE cashed_out = FALSE AND hit_mine = FALSE AND created_at < ?', [now - 2 * 3_600_000]),
                liveBets: await count("SELECT COUNT(*) AS c FROM live_bets WHERE status = 'open'"),
                guilds: guildInfo
                    ? await count('SELECT COUNT(*) AS c FROM guild_settings WHERE left_at = 0 AND name IS NOT NULL')
                    : await count('SELECT COUNT(DISTINCT guild_id) AS c FROM game_history WHERE played_at >= ?', [now - 30 * DAY]),
                drops24h: await count("SELECT COUNT(*) AS c FROM drops WHERE status = 'claimed' AND claimed_at >= ?", [since24h])
            }
        });
    })
);

// ---------- Eventy, konserwacja, jackpot ----------

royalRouter.post(
    '/events',
    h(async (req, res) => {
        const action = String(req.body.action || '');
        const now = Date.now();
        const set = async (type: 'xp_multiplier' | 'daily_bonus_percent', value: number, ms: number) =>
            rExecute(
                `INSERT INTO bot_events (event_type, value, expires_at, created_at) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE value = VALUES(value), expires_at = VALUES(expires_at), created_at = VALUES(created_at)`,
                [type, value, now + ms, now]
            );
        let message: string;
        if (action === 'xp2') {
            await set('xp_multiplier', 2, DAY);
            message = 'XP ×2 przez 24 godziny.';
        } else if (action === 'daily50') {
            await set('daily_bonus_percent', 50, DAY);
            message = 'Daily +50% przez 24 godziny.';
        } else if (action === 'weekend') {
            await set('xp_multiplier', 2, 2 * DAY);
            await set('daily_bonus_percent', 50, 2 * DAY);
            message = 'Weekend: XP ×2 i daily +50% przez 48 godzin.';
        } else if (action === 'custom') {
            const hours = amount(req.body.hours, { min: 1, max: 24 * 30, label: 'Czas (godziny)' });
            const xp = Number(req.body.xp);
            const daily = Number(req.body.daily);
            if (!(xp >= 1 && xp <= 10) && !(daily >= 1 && daily <= 500)) throw new UserError('Podaj mnożnik XP (1-10) albo bonus daily (1-500%).');
            if (xp >= 1 && xp <= 10) await set('xp_multiplier', xp, hours * 3_600_000);
            if (daily >= 1 && daily <= 500) await set('daily_bonus_percent', Math.trunc(daily), hours * 3_600_000);
            message = `Event ustawiony na ${hours} godz.`;
        } else if (action === 'off') {
            await rExecute("DELETE FROM bot_events WHERE event_type IN ('xp_multiplier', 'daily_bonus_percent')");
            message = 'Eventy wyłączone.';
        } else {
            throw new UserError('Nieznana akcja.');
        }
        await audit(req, 'event', null, { action, ...req.body }, message);
        res.json({ message: `${message} Bot zobaczy zmianę w ciągu kilku sekund.` });
    })
);

royalRouter.post(
    '/maintenance',
    h(async (req, res) => {
        const on = req.body.on === true;
        await rExecute(
            `INSERT INTO bot_settings (setting_key, setting_value, updated_at) VALUES ('bot_maintenance', ?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)`,
            [on ? '1' : '0', Date.now()]
        );
        await audit(req, 'maintenance', null, { on }, on ? 'włączenie konserwacji' : 'wyłączenie konserwacji');
        res.json({ message: on ? 'Konserwacja włączona. Gracze zobaczą komunikat w ciągu kilku sekund.' : 'Konserwacja wyłączona.' });
    })
);

royalRouter.get(
    '/jackpot',
    h(async (_req, res) => {
        const prof = await profileSelect();
        const rounds = await rSelect(
            `SELECT r.*, ${prof} FROM jackpot_rounds r LEFT JOIN users u ON u.user_id = r.winner_id ORDER BY r.id DESC LIMIT 40`
        );
        const open = await rSelectOne<{ id: number }>("SELECT id FROM jackpot_rounds WHERE status = 'open' ORDER BY id DESC LIMIT 1");
        const tickets = open
            ? await rSelect(
                  `SELECT t.user_id, t.tickets, u.is_blocked, ${prof} FROM jackpot_tickets t LEFT JOIN users u ON u.user_id = t.user_id
                   WHERE t.round_id = ? AND t.tickets > 0 ORDER BY t.tickets DESC LIMIT 100`,
                  [open.id]
              )
            : [];
        res.json({ rounds, tickets });
    })
);

royalRouter.post(
    '/jackpot/draw',
    h(async (req, res) => {
        const result = await rExecute("UPDATE jackpot_rounds SET draw_at = ? WHERE status = 'open'", [Date.now() - 1]);
        if (result.affectedRows === 0) throw new UserError('Nie ma otwartej rundy jackpota.');
        await audit(req, 'event', null, { action: 'draw' }, 'losowanie jackpota z panelu WWW');
        res.json({ message: 'Runda oznaczona do losowania. Bot rozlosuje ją przy najbliższym sprawdzeniu (do minuty) i wyśle ogłoszenia.' });
    })
);

// ---------- Gracze: lista ----------

const PLAYER_SORT: Record<string, string> = {
    money: 'u.money',
    credits: 'u.credits',
    level: 'u.level',
    wagered: 'u.total_wagered',
    games: 'u.total_games',
    biggest: 'u.biggest_win',
    created: 'u.created_at',
    rakeback: 'u.rakeback_total'
};

royalRouter.get(
    '/players',
    h(async (req, res) => {
        const { per, offset } = page(req);
        const search = q(req, 'q');
        const filter = q(req, 'filter');
        const sortKey = PLAYER_SORT[q(req, 'sort')] ?? 'u.money';
        const dir = q(req, 'dir') === 'asc' ? 'ASC' : 'DESC';
        const profiles = await hasProfiles();

        const where: string[] = [];
        const params: (string | number)[] = [];
        if (search) {
            if (/^\d{3,21}$/.test(search)) {
                where.push('u.user_id LIKE ?');
                params.push(`${search}%`);
            } else if (profiles) {
                where.push('(u.username LIKE ? OR u.display_name LIKE ? OR u.referral_code = ?)');
                params.push(`%${search}%`, `%${search}%`, search.toUpperCase());
            } else {
                where.push('u.referral_code = ?');
                params.push(search.toUpperCase());
            }
        }
        if (filter === 'blocked') where.push('u.is_blocked = TRUE');
        if (filter === 'frozen') where.push('u.is_frozen = 1');
        if (filter === 'limited') where.push('u.max_bet > 0');
        if (filter === 'watched') where.push('w.user_id IS NOT NULL');
        if (filter === 'hidden' && profiles) where.push('u.web_hidden = 1');
        if (filter === 'new') where.push('u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
        if (filter === 'vip') where.push('u.total_wagered >= 250000');
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const join = 'LEFT JOIN user_watch w ON w.user_id = u.user_id';

        const total = await rSelectOne<{ c: number }>(`SELECT COUNT(*) AS c FROM users u ${join} ${whereSql}`, params);
        const rows = await rSelect(
            `SELECT u.user_id, ${await profileSelect()}, u.money, u.credits, u.level, u.xp, u.total_games, u.total_wins, u.total_losses,
                    u.total_wagered, u.biggest_win, u.is_blocked, u.blocked_until, u.is_frozen, u.max_bet, u.created_at,
                    w.user_id IS NOT NULL AS watched
             FROM users u ${join} ${whereSql}
             ORDER BY ${sortKey} ${dir}, u.user_id LIMIT ? OFFSET ?`,
            [...params, per, offset]
        );
        res.json({ rows: rows.map(r => plainRow(r as Record<string, unknown>)), total: Number(total?.c) || 0, per });
    })
);

// ---------- Gracz: karta ----------

royalRouter.get(
    '/players/:id',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        const user = await requirePlayer(userId);
        const prof = await profileSelect();

        const rank = await rSelectOne<{ c: number }>('SELECT COUNT(*) AS c FROM users WHERE is_blocked = FALSE AND money > ?', [Number(user.money) || 0]);
        const stats = await rSelectOne(
            `SELECT COUNT(*) AS games, COALESCE(SUM(bet_amount), 0) AS wagered, COALESCE(SUM(win_amount - bet_amount), 0) AS net,
                    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins, SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) AS losses,
                    MIN(played_at) AS first_at, MAX(played_at) AS last_at
             FROM game_history WHERE user_id = ?`,
            [userId]
        );
        const perGame = await rSelect(
            `SELECT game_type, COUNT(*) AS games, COALESCE(SUM(bet_amount), 0) AS wagered, COALESCE(SUM(win_amount - bet_amount), 0) AS net,
                    MAX(win_amount - bet_amount) AS best
             FROM game_history WHERE user_id = ? GROUP BY game_type ORDER BY games DESC`,
            [userId]
        );
        const last7 = await rSelectOne(
            `SELECT COUNT(*) AS games, COALESCE(SUM(bet_amount), 0) AS wagered, COALESCE(SUM(win_amount - bet_amount), 0) AS net
             FROM game_history WHERE user_id = ? AND played_at >= ?`,
            [userId, Date.now() - 7 * DAY]
        );
        const guilds = await rSelect(
            `SELECT h.guild_id, COUNT(*) AS games ${(await hasGuildInfo()) ? ', MAX(g.name) AS name' : ', NULL AS name'}
             FROM game_history h ${(await hasGuildInfo()) ? 'LEFT JOIN guild_settings g ON g.guild_id = h.guild_id' : ''}
             WHERE h.user_id = ? AND h.guild_id IS NOT NULL GROUP BY h.guild_id ORDER BY games DESC LIMIT 10`,
            [userId]
        );
        const achievements = await rSelect('SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ? ORDER BY unlocked_at', [userId]);
        const quests = await rSelect('SELECT * FROM daily_quests WHERE user_id = ? AND quest_date = ? ORDER BY id', [userId, warsawDateKey()]);
        const notes = await rSelect('SELECT * FROM user_notes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        const watch = await rSelectOne('SELECT * FROM user_watch WHERE user_id = ?', [userId]);
        const referrer = user.referred_by
            ? await rSelectOne(`SELECT u.user_id, ${prof} FROM users u WHERE u.user_id = ?`, [String(user.referred_by)])
            : null;
        const referred = await rSelect(
            `SELECT u.user_id, ${prof}, u.total_games, u.money, u.created_at FROM users u WHERE u.referred_by = ? ORDER BY u.created_at DESC LIMIT 50`,
            [userId]
        );
        const votes = await rSelectOne('SELECT COUNT(*) AS total, MAX(voted_at) AS last FROM votes WHERE user_id = ?', [userId]);
        const drops = await rSelectOne(
            "SELECT COUNT(*) AS claimed, COALESCE(SUM(amount), 0) AS total, MAX(claimed_at) AS last FROM drops WHERE claimer_id = ? AND status = 'claimed'",
            [userId]
        );
        const mines = await rSelectOne('SELECT id, bet, mines_count, revealed_positions, created_at FROM mines_sessions WHERE user_id = ? AND cashed_out = FALSE AND hit_mine = FALSE', [userId]);
        const liveBets = await rSelect("SELECT * FROM live_bets WHERE user_id = ? AND status = 'open'", [userId]);
        const jackpot = await rSelect(
            'SELECT t.round_id, t.tickets, r.status, r.winner_id FROM jackpot_tickets t JOIN jackpot_rounds r ON r.id = t.round_id WHERE t.user_id = ? ORDER BY t.round_id DESC LIMIT 10',
            [userId]
        );
        const payouts = await rSelect('SELECT * FROM payouts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
        const reports = await rSelect('SELECT * FROM reports WHERE reporter_id = ? OR reported_id = ? ORDER BY created_at DESC LIMIT 20', [userId, userId]);
        const log = await rSelect('SELECT * FROM admin_audit WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 30', [userId]);

        res.json({
            user: plainRow(user),
            rank: user.is_blocked ? null : (Number(rank?.c) || 0) + 1,
            stats,
            last7,
            perGame,
            guilds,
            achievements,
            quests,
            notes,
            watch,
            referrer,
            referred: referred.map(r => plainRow(r as Record<string, unknown>)),
            votes,
            drops,
            mines,
            liveBets,
            jackpot,
            payouts,
            reports,
            log
        });
    })
);

// ---------- Gracz: akcje ----------

const BALANCE_COLUMNS = { money: 'money', credits: 'credits', rakeback: 'rakeback_balance' } as const;

royalRouter.post(
    '/players/:id/balance',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const column = BALANCE_COLUMNS[req.body.currency as keyof typeof BALANCE_COLUMNS];
        if (!column) throw new UserError('Nieznana waluta.');
        const op = String(req.body.op);
        const value = amount(req.body.amount, { min: op === 'set' ? 0 : 1 });
        const reason = text(req.body.reason, 500) || null;

        const after = await withPlayerLock(userId, async conn => {
            if (op === 'add') {
                await conn.query(`UPDATE users SET ${column} = ${column} + ? WHERE user_id = ?`, [value, userId]);
            } else if (op === 'remove') {
                const [result] = await conn.query(`UPDATE users SET ${column} = ${column} - ? WHERE user_id = ? AND ${column} >= ?`, [value, userId, value]);
                if ((result as { affectedRows: number }).affectedRows !== 1) throw new UserError('Gracz ma mniej, niż chcesz odjąć. Użyj „Ustaw”, żeby wyzerować.');
            } else if (op === 'set') {
                await conn.query(`UPDATE users SET ${column} = ? WHERE user_id = ?`, [value, userId]);
            } else {
                throw new UserError('Nieznana operacja.');
            }
            const [rows] = await conn.query(`SELECT ${column} AS v FROM users WHERE user_id = ?`, [userId]);
            return Number((rows as { v: number }[])[0]?.v) || 0;
        });

        await audit(req, 'money', userId, { currency: req.body.currency, op, amount: value, after }, reason);
        res.json({ message: `Zapisano. Nowa wartość: ${after.toLocaleString('pl-PL')}.`, after });
    })
);

royalRouter.post(
    '/players/:id/block',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        if (req.body.on === false) {
            await rExecute('UPDATE users SET is_blocked = FALSE, blocked_reason = NULL, blocked_at = 0, blocked_until = 0 WHERE user_id = ?', [userId]);
            await audit(req, 'block', userId, { unblock: true }, 'odblokowanie (WWW)');
            res.json({ message: 'Gracz odblokowany.' });
            return;
        }
        const hours = Math.max(0, Math.trunc(Number(req.body.hours)) || 0);
        const until = hours > 0 ? Date.now() + hours * 3_600_000 : 0;
        const reason = text(req.body.reason, 500) || 'Naruszenie regulaminu';
        await rExecute('UPDATE users SET is_blocked = TRUE, blocked_reason = ?, blocked_at = ?, blocked_until = ? WHERE user_id = ?', [reason, Date.now(), until, userId]);
        await audit(req, 'block', userId, { hours }, reason);
        res.json({ message: hours ? `Gracz zablokowany na ${hours} godz.` : 'Gracz zablokowany na stałe.' });
    })
);

royalRouter.post(
    '/players/:id/freeze',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const on = req.body.on === true;
        await rExecute('UPDATE users SET is_frozen = ? WHERE user_id = ?', [on ? 1 : 0, userId]);
        await audit(req, 'freeze', userId, { on }, text(req.body.reason, 500) || null);
        res.json({ message: on ? 'Konto zamrożone: gracz nie zagra i nie wymieni kredytów.' : 'Konto odmrożone.' });
    })
);

royalRouter.post(
    '/players/:id/limit',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const cap = Math.max(0, Math.trunc(Number(req.body.amount)) || 0);
        if (cap === 0) {
            await rExecute('UPDATE users SET max_bet = 0, max_bet_until = 0 WHERE user_id = ?', [userId]);
            await audit(req, 'limit', userId, { clear: true }, null);
            res.json({ message: 'Limit zakładu zdjęty.' });
            return;
        }
        const hours = amount(req.body.hours, { min: 1, max: 24 * 365, label: 'Czas (godziny)' });
        await rExecute('UPDATE users SET max_bet = ?, max_bet_until = ? WHERE user_id = ?', [amount(cap), Date.now() + hours * 3_600_000, userId]);
        await audit(req, 'limit', userId, { max_bet: cap, hours }, text(req.body.reason, 500) || null);
        res.json({ message: `Limit zakładu $${cap.toLocaleString('pl-PL')} na ${hours} godz.` });
    })
);

royalRouter.post(
    '/players/:id/progress',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const level = amount(req.body.level, { min: 1, max: 999, label: 'Poziom' });
        const xp = amount(req.body.xp, { min: 0, max: 1e9, label: 'XP' });
        await rExecute('UPDATE users SET level = ?, xp = ? WHERE user_id = ?', [level, xp, userId]);
        await audit(req, 'level', userId, { level, xp }, null);
        res.json({ message: `Poziom ${level}, XP ${xp}.` });
    })
);

royalRouter.post(
    '/players/:id/watch',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        if (req.body.on === false) {
            await rExecute('DELETE FROM user_watch WHERE user_id = ?', [userId]);
            await audit(req, 'watch', userId, { on: false }, null);
            res.json({ message: 'Gracz zdjęty z obserwacji.' });
            return;
        }
        const note = text(req.body.note, 1000) || null;
        await rExecute(
            'INSERT INTO user_watch (user_id, admin_id, note, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE note = VALUES(note)',
            [userId, adminDiscordId(), note, Date.now()]
        );
        await audit(req, 'watch', userId, { on: true }, note);
        res.json({ message: 'Gracz obserwowany: bot wyśle alert przy wygranych od $10k.' });
    })
);

royalRouter.post(
    '/players/:id/notes',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const note = text(req.body.note, 2000);
        if (!note) throw new UserError('Notatka jest pusta.');
        await rExecute('INSERT INTO user_notes (user_id, note, admin_id, created_at) VALUES (?, ?, ?, ?)', [
            userId,
            note,
            adminDiscordId(),
            Date.now()
        ]);
        await audit(req, 'note', userId, {}, note.slice(0, 200));
        res.json({ message: 'Notatka dodana.' });
    })
);

royalRouter.delete(
    '/players/:id/notes/:noteId',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        const noteId = amount(req.params.noteId, { label: 'ID notatki', max: 1e12 });
        const result = await rExecute('DELETE FROM user_notes WHERE id = ? AND user_id = ?', [noteId, userId]);
        if (!result.affectedRows) throw new UserError('Nie ma takiej notatki.');
        await audit(req, 'note', userId, { deleted: noteId }, null);
        res.json({ message: 'Notatka usunięta.' });
    })
);

royalRouter.post(
    '/players/:id/reset-daily',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const streak = req.body.streak === true;
        await rExecute(`UPDATE users SET last_daily = 0, last_bonus = 0${streak ? ', daily_streak = 0' : ''} WHERE user_id = ?`, [userId]);
        await audit(req, 'reset', userId, { streak }, null);
        res.json({ message: streak ? 'Daily odblokowane, seria wyzerowana.' : 'Daily odblokowane (seria bez zmian).' });
    })
);

royalRouter.post(
    '/players/:id/close-mines',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        const refunded = await withPlayerLock(userId, async conn => {
            const [rows] = await conn.query('SELECT id, bet FROM mines_sessions WHERE user_id = ? AND cashed_out = FALSE AND hit_mine = FALSE LIMIT 1', [userId]);
            const session = (rows as { id: string; bet: number }[])[0];
            if (!session) throw new UserError('Gracz nie ma otwartej gry w Miny.');
            const [claim] = await conn.query('UPDATE mines_sessions SET cashed_out = TRUE WHERE id = ? AND cashed_out = FALSE AND hit_mine = FALSE', [session.id]);
            if ((claim as { affectedRows: number }).affectedRows !== 1) throw new UserError('Gra właśnie się skończyła.');
            await conn.query('UPDATE users SET money = money + ? WHERE user_id = ?', [Number(session.bet) || 0, userId]);
            return Number(session.bet) || 0;
        });
        await audit(req, 'mines', userId, { refunded }, 'zamknięcie Min z panelu WWW');
        res.json({ message: `Miny zamknięte, zwrócono $${refunded.toLocaleString('pl-PL')}.` });
    })
);

royalRouter.post(
    '/players/:id/achievement',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const id = text(req.body.id, 50);
        if (!/^[a-z0-9_]+$/.test(id)) throw new UserError('Nieznane osiągnięcie.');
        if (req.body.on === false) {
            await rExecute('DELETE FROM achievements WHERE user_id = ? AND achievement_id = ?', [userId, id]);
        } else {
            await rExecute('INSERT IGNORE INTO achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)', [userId, id, Date.now()]);
        }
        await audit(req, 'achievement', userId, { id, on: req.body.on !== false }, null);
        res.json({ message: req.body.on === false ? 'Osiągnięcie odebrane.' : 'Osiągnięcie przyznane (bez nagrody pieniężnej).' });
    })
);

royalRouter.post(
    '/players/:id/hidden',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        if (!(await hasProfiles())) throw new UserError('Ta funkcja wymaga nowej wersji bota (kolumna web_hidden).');
        const on = req.body.on === true;
        await rExecute('UPDATE users SET web_hidden = ? WHERE user_id = ?', [on ? 1 : 0, userId]);
        await audit(req, 'db', userId, { web_hidden: on }, on ? 'ukrycie w rankingu na stronie' : 'pokazanie w rankingu na stronie');
        res.json({ message: on ? 'Gracz ukryty w publicznym rankingu (zmiana widoczna w ciągu minuty).' : 'Gracz znów widoczny w rankingu.' });
    })
);

royalRouter.post(
    '/players/:id/settings',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const lang = req.body.language === 'en' ? 'en' : 'pl';
        const duels = req.body.duel_enabled === false ? 0 : 1;
        const reminder = req.body.vote_reminder === true ? 1 : 0;
        await rExecute('UPDATE users SET language = ?, duel_enabled = ?, vote_reminder = ? WHERE user_id = ?', [lang, duels, reminder, userId]);
        await audit(req, 'db', userId, { language: lang, duel_enabled: duels, vote_reminder: reminder }, 'ustawienia gracza');
        res.json({ message: 'Ustawienia gracza zapisane.' });
    })
);

/** To samo co Database.deleteUser w bocie: wszystkie tabele, potem konto. */
royalRouter.delete(
    '/players/:id',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        const user = await requirePlayer(userId);
        await withPlayerLock(userId, async conn => {
            const run = (sql: string, params: string[]) => conn.query(sql, params).catch(() => undefined);
            await run('DELETE FROM votes WHERE user_id = ?', [userId]);
            await run('DELETE FROM daily_quests WHERE user_id = ?', [userId]);
            await run('DELETE FROM mines_sessions WHERE user_id = ?', [userId]);
            await run('DELETE FROM achievements WHERE user_id = ?', [userId]);
            await run('DELETE FROM game_history WHERE user_id = ?', [userId]);
            await run('DELETE FROM reports WHERE reporter_id = ? OR reported_id = ?', [userId, userId]);
            await run('DELETE FROM user_notes WHERE user_id = ?', [userId]);
            await run('DELETE FROM user_watch WHERE user_id = ?', [userId]);
            await run('DELETE FROM payouts WHERE user_id = ?', [userId]);
            await run('DELETE FROM live_bets WHERE user_id = ?', [userId]);
            await run('DELETE FROM jackpot_tickets WHERE user_id = ?', [userId]);
            await run('UPDATE drops SET claimer_id = NULL WHERE claimer_id = ?', [userId]);
            await conn.query('DELETE FROM users WHERE user_id = ?', [userId]);
        });
        await audit(req, 'delete', userId, { money: user.money, credits: user.credits }, text(req.body?.reason, 500) || 'usunięcie konta z panelu WWW');
        res.json({ message: 'Konto gracza i wszystkie jego dane usunięte.' });
    })
);

// ---------- Logi gier ----------

royalRouter.get(
    '/games',
    h(async (req, res) => {
        const { per, offset } = page(req, 50);
        const where: string[] = [];
        const params: (string | number)[] = [];
        const user = q(req, 'user');
        if (user) {
            if (/^\d{15,21}$/.test(user)) {
                where.push('h.user_id = ?');
                params.push(user);
            } else if (await hasProfiles()) {
                where.push('(u.username LIKE ? OR u.display_name LIKE ?)');
                params.push(`%${user}%`, `%${user}%`);
            }
        }
        const game = q(req, 'game');
        if (game) {
            where.push('h.game_type = ?');
            params.push(game);
        }
        const guild = q(req, 'guild');
        if (guild) {
            where.push('h.guild_id = ?');
            params.push(snowflake(guild, 'ID serwera'));
        }
        const result = q(req, 'result');
        if (['win', 'loss', 'tie'].includes(result)) {
            where.push('h.result = ?');
            params.push(result);
        }
        const minBet = Number(q(req, 'minBet'));
        if (minBet > 0) {
            where.push('h.bet_amount >= ?');
            params.push(minBet);
        }
        const minNet = Number(q(req, 'minNet'));
        if (minNet > 0) {
            where.push('(h.win_amount - h.bet_amount) >= ?');
            params.push(minNet);
        }
        const from = Date.parse(q(req, 'from'));
        if (!Number.isNaN(from)) {
            where.push('h.played_at >= ?');
            params.push(from);
        }
        const to = Date.parse(q(req, 'to'));
        if (!Number.isNaN(to)) {
            where.push('h.played_at < ?');
            params.push(to + DAY);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const join = 'LEFT JOIN users u ON u.user_id = h.user_id';
        const guildInfo = await hasGuildInfo();
        const sort = q(req, 'sort') === 'net' ? '(h.win_amount - h.bet_amount) DESC' : q(req, 'sort') === 'bet' ? 'h.bet_amount DESC' : 'h.played_at DESC';

        const summary = await rSelectOne(
            `SELECT COUNT(*) AS games, COUNT(DISTINCT h.user_id) AS players, COALESCE(SUM(h.bet_amount), 0) AS wagered,
                    COALESCE(SUM(h.win_amount), 0) AS paid, COALESCE(SUM(h.bet_amount - h.win_amount), 0) AS houseNet
             FROM game_history h ${join} ${whereSql}`,
            params
        );
        const rows = await rSelect(
            `SELECT h.*, ${await profileSelect()}${guildInfo ? ', g.name AS guild_name' : ', NULL AS guild_name'}
             FROM game_history h ${join} ${guildInfo ? 'LEFT JOIN guild_settings g ON g.guild_id = h.guild_id' : ''}
             ${whereSql} ORDER BY ${sort} LIMIT ? OFFSET ?`,
            [...params, per, offset]
        );
        const types = await rSelect<{ game_type: string }>('SELECT DISTINCT game_type FROM game_history ORDER BY game_type');
        res.json({ rows, summary, total: Number((summary as { games?: number })?.games) || 0, per, types: types.map(t => t.game_type) });
    })
);

// ---------- Podejrzani ----------

royalRouter.get(
    '/suspicious',
    h(async (_req, res) => {
        const prof = await profileSelect();
        const now = Date.now();

        // Ten sam próg co alert ROI w bocie i /top --podejrzani: zysk > 15% obrotu przy 30+ grach.
        const roi = await rSelect(
            `SELECT u.user_id, ${prof}, u.money, u.is_blocked, u.total_wagered, h.games, h.wagered, h.net,
                    h.net / NULLIF(h.wagered, 0) AS roi
             FROM (SELECT user_id, COUNT(*) AS games, SUM(bet_amount) AS wagered, SUM(win_amount - bet_amount) AS net
                   FROM game_history GROUP BY user_id HAVING games >= 30 AND wagered > 0 AND net / wagered > 0.15) h
             JOIN users u ON u.user_id = h.user_id
             ORDER BY roi DESC LIMIT 50`
        );
        const hugeWins = await rSelect(
            `SELECT h.*, ${prof}, u.is_blocked FROM game_history h JOIN users u ON u.user_id = h.user_id
             WHERE h.played_at >= ? AND (h.win_amount >= 50000 OR (h.bet_amount >= 1000 AND h.win_amount >= 20 * h.bet_amount))
             ORDER BY h.played_at DESC LIMIT 50`,
            [now - 7 * DAY]
        );
        const winners24h = await rSelect(
            `SELECT h.user_id, ${prof}, u.is_blocked, COUNT(*) AS games, SUM(h.bet_amount) AS wagered, SUM(h.win_amount - h.bet_amount) AS net
             FROM game_history h JOIN users u ON u.user_id = h.user_id
             WHERE h.played_at >= ? GROUP BY h.user_id HAVING net > 0 ORDER BY net DESC LIMIT 20`,
            [now - DAY]
        );
        const newRich = await rSelect(
            `SELECT u.user_id, ${prof}, u.money, u.credits, u.total_games, u.total_wagered, u.created_at, u.referred_by, u.is_blocked
             FROM users u WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND (u.money >= 100000 OR u.credits >= 1000)
             ORDER BY u.money DESC LIMIT 30`
        );
        // Polecający, których „polecone” konta prawie nie grają: typowy obraz multikont.
        const referrers = await rSelect(
            `SELECT r.referred_by AS user_id, ${prof}, u.is_blocked, COUNT(*) AS referred,
                    SUM(CASE WHEN r.total_games < 5 THEN 1 ELSE 0 END) AS idle,
                    MAX(r.created_at) AS last_at
             FROM users r JOIN users u ON u.user_id = r.referred_by
             WHERE r.referred_by IS NOT NULL GROUP BY r.referred_by HAVING referred >= 3
             ORDER BY idle DESC, referred DESC LIMIT 30`
        );
        const drops = await rSelect(
            `SELECT d.claimer_id AS user_id, ${prof}, u.is_blocked, COUNT(*) AS claimed, SUM(d.amount) AS total, COUNT(DISTINCT d.guild_id) AS guilds
             FROM drops d JOIN users u ON u.user_id = d.claimer_id
             WHERE d.status = 'claimed' AND d.claimed_at >= ? GROUP BY d.claimer_id ORDER BY claimed DESC LIMIT 20`,
            [now - 7 * DAY]
        );
        const watched = await rSelect(
            `SELECT w.*, ${prof}, u.money, u.is_blocked, u.total_wagered FROM user_watch w LEFT JOIN users u ON u.user_id = w.user_id ORDER BY w.created_at DESC`
        );
        const restricted = await rSelect(
            `SELECT u.user_id, ${prof}, u.money, u.is_blocked, u.blocked_reason, u.blocked_until, u.blocked_at, u.is_frozen, u.max_bet, u.max_bet_until
             FROM users u WHERE u.is_blocked = TRUE OR u.is_frozen = 1 OR u.max_bet > 0 ORDER BY u.blocked_at DESC LIMIT 100`
        );
        res.json({ roi, hugeWins, winners24h, newRich, referrers, drops, watched, restricted });
    })
);

// ---------- Rankingi ----------

const RANKINGS: Record<string, { label: string; expr: string; order: string }> = {
    money: { label: 'Saldo', expr: 'u.money', order: 'u.money DESC' },
    credits: { label: 'Kredyty', expr: 'u.credits', order: 'u.credits DESC' },
    level: { label: 'Poziom', expr: 'u.level', order: 'u.level DESC, u.xp DESC' },
    wagered: { label: 'Obstawione', expr: 'u.total_wagered', order: 'u.total_wagered DESC' },
    biggest: { label: 'Największa wygrana', expr: 'u.biggest_win', order: 'u.biggest_win DESC' },
    games: { label: 'Gry', expr: 'u.total_games', order: 'u.total_games DESC' },
    wins: { label: 'Wygrane', expr: 'u.total_wins', order: 'u.total_wins DESC' },
    streak: { label: 'Seria daily', expr: 'u.daily_streak', order: 'u.daily_streak DESC' },
    rakeback: { label: 'Cashback łącznie', expr: 'u.rakeback_total', order: 'u.rakeback_total DESC' }
};

royalRouter.get(
    '/rankings',
    h(async (req, res) => {
        const limit = Math.min(100, Math.max(5, Math.trunc(Number(req.query.limit)) || 15));
        const includeBlocked = q(req, 'blocked') === '1';
        const prof = await profileSelect();
        const where = includeBlocked ? '' : 'WHERE u.is_blocked = FALSE';
        const boards: Record<string, unknown> = {};
        for (const [key, def] of Object.entries(RANKINGS)) {
            boards[key] = await rSelect(
                `SELECT u.user_id, ${prof}, u.is_blocked, ${def.expr} AS value FROM users u ${where} ORDER BY ${def.order} LIMIT ?`,
                [limit]
            );
        }
        const net = await rSelect(
            `SELECT h.user_id, ${prof}, u.is_blocked, h.net AS value FROM
               (SELECT user_id, SUM(win_amount - bet_amount) AS net FROM game_history GROUP BY user_id) h
             JOIN users u ON u.user_id = h.user_id ${where} ORDER BY h.net DESC LIMIT ?`,
            [limit]
        );
        const losers = await rSelect(
            `SELECT h.user_id, ${prof}, u.is_blocked, h.net AS value FROM
               (SELECT user_id, SUM(win_amount - bet_amount) AS net FROM game_history GROUP BY user_id) h
             JOIN users u ON u.user_id = h.user_id ${where} ORDER BY h.net ASC LIMIT ?`,
            [limit]
        );
        const referrers = await rSelect(
            `SELECT r.referred_by AS user_id, ${prof}, u.is_blocked, COUNT(*) AS value FROM users r JOIN users u ON u.user_id = r.referred_by
             ${where ? `${where} AND` : 'WHERE'} r.referred_by IS NOT NULL GROUP BY r.referred_by ORDER BY value DESC LIMIT ?`,
            [limit]
        );
        const voters = await rSelect(
            `SELECT v.user_id, ${prof}, u.is_blocked, COUNT(*) AS value FROM votes v JOIN users u ON u.user_id = v.user_id
             ${where} GROUP BY v.user_id ORDER BY value DESC LIMIT ?`,
            [limit]
        );
        const guildInfo = await hasGuildInfo();
        const servers = await rSelect(
            `SELECT h.guild_id, ${guildInfo ? 'MAX(g.name) AS name, MAX(g.icon) AS icon' : 'NULL AS name, NULL AS icon'},
                    COUNT(*) AS games, COALESCE(SUM(h.bet_amount), 0) AS wagered, COUNT(DISTINCT h.user_id) AS players,
                    COALESCE(SUM(h.bet_amount - h.win_amount), 0) AS houseNet
             FROM game_history h ${guildInfo ? 'LEFT JOIN guild_settings g ON g.guild_id = h.guild_id' : ''}
             WHERE h.guild_id IS NOT NULL AND h.played_at >= ? GROUP BY h.guild_id ORDER BY wagered DESC LIMIT ?`,
            [Date.now() - 30 * DAY, limit]
        );
        res.json({
            labels: { ...Object.fromEntries(Object.entries(RANKINGS).map(([k, v]) => [k, v.label])), net: 'Zysk netto (historia)', losers: 'Największe straty', referrers: 'Polecenia', voters: 'Głosy top.gg' },
            boards: { ...boards, net, losers, referrers, voters },
            servers
        });
    })
);

// ---------- Serwery ----------

royalRouter.get(
    '/guilds',
    h(async (req, res) => {
        const { per, offset } = page(req);
        const search = q(req, 'q');
        const guildInfo = await hasGuildInfo();
        const where: string[] = [];
        const params: (string | number)[] = [];
        if (search) {
            if (/^\d+$/.test(search)) {
                where.push('g.guild_id LIKE ?');
                params.push(`${search}%`);
            } else if (guildInfo) {
                where.push('g.name LIKE ?');
                params.push(`%${search}%`);
            }
        }
        const filter = q(req, 'filter');
        if (filter === 'drops') where.push('g.drops_enabled = 1');
        if (filter === 'banned') where.push('g.drops_banned = 1');
        if (filter === 'active' && guildInfo) where.push('g.left_at = 0');
        if (filter === 'left' && guildInfo) where.push('g.left_at > 0');
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const since = Date.now() - 30 * DAY;
        const total = await rSelectOne<{ c: number }>(`SELECT COUNT(*) AS c FROM guild_settings g ${whereSql}`, params);
        const rows = await rSelect(
            `SELECT g.*, s.games, s.wagered, s.players, s.last_at
             FROM guild_settings g
             LEFT JOIN (SELECT guild_id, COUNT(*) AS games, SUM(bet_amount) AS wagered, COUNT(DISTINCT user_id) AS players, MAX(played_at) AS last_at
                        FROM game_history WHERE played_at >= ? AND guild_id IS NOT NULL GROUP BY guild_id) s ON s.guild_id = g.guild_id
             ${whereSql} ORDER BY COALESCE(s.wagered, 0) DESC, g.joined_at DESC LIMIT ? OFFSET ?`,
            [since, ...params, per, offset]
        );
        res.json({ rows, total: Number(total?.c) || 0, per, guildInfo });
    })
);

royalRouter.post(
    '/guilds/:id',
    h(async (req, res) => {
        const guildId = snowflake(req.params.id, 'ID serwera');
        const patch: Record<string, string | number | null> = {};
        const b = req.body as Record<string, unknown>;
        if ('drops_banned' in b) patch.drops_banned = b.drops_banned ? 1 : 0;
        if ('drops_enabled' in b) patch.drops_enabled = b.drops_enabled ? 1 : 0;
        if (patch.drops_banned === 1) patch.drops_enabled = 0;
        if ('duels_enabled' in b) patch.duels_enabled = b.duels_enabled ? 1 : 0;
        if ('language' in b) patch.language = b.language === 'en' || b.language === 'pl' ? b.language : null;
        for (const key of ['casino_channel_id', 'drops_channel_id', 'announce_channel_id']) {
            if (key in b) patch[key] = optionalSnowflake(b[key]);
        }
        const keys = Object.keys(patch);
        if (keys.length === 0) throw new UserError('Nic do zmiany.');
        const result = await rExecute(
            `UPDATE guild_settings SET ${keys.map(k => `\`${k}\` = ?`).join(', ')}, updated_at = ? WHERE guild_id = ?`,
            [...keys.map(k => patch[k]), Date.now(), guildId]
        );
        if (!result.affectedRows) throw new UserError('Nie ma takiego serwera w bazie bota.');
        await audit(req, 'event', null, { guild: guildId, ...patch }, 'ustawienia serwera z panelu WWW');
        res.json({ message: 'Ustawienia serwera zapisane. Bot zobaczy je w ciągu minuty.' });
    })
);

// ---------- Zgłoszenia ----------

royalRouter.get(
    '/reports',
    h(async (req, res) => {
        const { per, offset } = page(req);
        const status = q(req, 'status');
        const where = status === 'open' || status === 'closed' ? 'WHERE r.status = ?' : '';
        const params = where ? [status] : [];
        // Dwóch graczy w jednym wierszu: zgłaszający (a) i zgłoszony (b).
        const profiles = await hasProfiles();
        const person = (alias: string, prefix: string) =>
            ['username', 'display_name', 'avatar']
                .map(col => (profiles ? `${alias}.${col} AS ${prefix}_${col}` : `NULL AS ${prefix}_${col}`))
                .join(', ');
        const total = await rSelectOne<{ c: number }>(`SELECT COUNT(*) AS c FROM reports r ${where}`, params);
        const rows = await rSelect(
            `SELECT r.*, ${person('a', 'reporter')}, ${person('b', 'reported')}
             FROM reports r LEFT JOIN users a ON a.user_id = r.reporter_id LEFT JOIN users b ON b.user_id = r.reported_id
             ${where} ORDER BY r.status = 'open' DESC, r.created_at DESC LIMIT ? OFFSET ?`,
            [...params, per, offset]
        );
        res.json({ rows, total: Number(total?.c) || 0, per });
    })
);

royalRouter.post(
    '/reports/:id',
    h(async (req, res) => {
        const id = amount(req.params.id, { label: 'ID zgłoszenia', max: 1e12 });
        const status = req.body.status === 'open' ? 'open' : 'closed';
        const result = await rExecute('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
        if (!result.affectedRows) throw new UserError('Nie ma takiego zgłoszenia.');
        res.json({ message: status === 'closed' ? 'Zgłoszenie zamknięte.' : 'Zgłoszenie otwarte ponownie.' });
    })
);

// ---------- Wypłaty (księga kredytów) ----------

const PAYOUT_STATUSES = ['oczekuje', 'zrobione', 'odrzucone'];

royalRouter.get(
    '/payouts',
    h(async (req, res) => {
        const { per, offset } = page(req);
        const status = q(req, 'status');
        const where = PAYOUT_STATUSES.includes(status) ? 'WHERE p.status = ?' : '';
        const params = where ? [status] : [];
        const total = await rSelectOne<{ c: number; sum: number }>(`SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS sum FROM payouts p ${where}`, params);
        const rows = await rSelect(
            `SELECT p.*, ${await profileSelect()} FROM payouts p LEFT JOIN users u ON u.user_id = p.user_id ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...params, per, offset]
        );
        res.json({ rows, total: Number(total?.c) || 0, sum: Number(total?.sum) || 0, per });
    })
);

royalRouter.post(
    '/payouts',
    h(async (req, res) => {
        const userId = snowflake(req.body.userId, 'ID gracza');
        const value = amount(req.body.amount, { label: 'Kwota (kredyty)' });
        const status = PAYOUT_STATUSES.includes(req.body.status) ? req.body.status : 'oczekuje';
        const note = text(req.body.note, 1000) || null;
        await rExecute('INSERT INTO payouts (user_id, amount, status, note, admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
            userId,
            value,
            status,
            note,
            adminDiscordId(),
            Date.now()
        ]);
        await audit(req, 'payout', userId, { amount: value, status }, note);
        res.json({ message: 'Wpis dodany do księgi wypłat.' });
    })
);

royalRouter.post(
    '/payouts/:id',
    h(async (req, res) => {
        const id = amount(req.params.id, { label: 'ID wpisu', max: 1e12 });
        const status = String(req.body.status);
        if (!PAYOUT_STATUSES.includes(status)) throw new UserError('Nieznany status.');
        const result = await rExecute('UPDATE payouts SET status = ? WHERE id = ?', [status, id]);
        if (!result.affectedRows) throw new UserError('Nie ma takiego wpisu.');
        await audit(req, 'payout', null, { id, status }, null);
        res.json({ message: `Status zmieniony na „${status}”.` });
    })
);

// ---------- Log admina ----------

royalRouter.get(
    '/audit',
    h(async (req, res) => {
        const { per, offset } = page(req, 50);
        const where: string[] = [];
        const params: string[] = [];
        const action = q(req, 'action');
        if (action) {
            where.push('a.action = ?');
            params.push(action);
        }
        const user = q(req, 'user');
        if (user) {
            where.push('a.target_user_id = ?');
            params.push(snowflake(user, 'ID gracza'));
        }
        if (q(req, 'source') === 'www') where.push(`a.details LIKE '%"source":"www"%'`);
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const total = await rSelectOne<{ c: number }>(`SELECT COUNT(*) AS c FROM admin_audit a ${whereSql}`, params);
        const rows = await rSelect(
            `SELECT a.*, ${await profileSelect()} FROM admin_audit a LEFT JOIN users u ON u.user_id = a.target_user_id ${whereSql}
             ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
            [...params, per, offset]
        );
        const actions = await rSelect<{ action: string }>('SELECT DISTINCT action FROM admin_audit ORDER BY action');
        res.json({ rows, total: Number(total?.c) || 0, per, actions: actions.map(a => a.action) });
    })
);

// ---------- Zlecenia dla bota, akcje masowe ----------

royalRouter.use(royalExtraRouter);
