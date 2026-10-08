import crypto from 'node:crypto';
import { Router, type Request } from 'express';
import type { SqlParam } from '@/lib/db';
import { rExecute, rSelect, rSelectOne, withPlayerLock, profileSelect } from '@/lib/royal/db';
import { THEMES } from '@/lib/royal/meta';
import { UserError, adminDiscordId, amount, audit, h, page, q, snowflake, text } from './royal-shared';

// Druga część panelu RoyalCasino: zlecenia dla bota (DM, odpowiedzi na
// zgłoszenia, odświeżanie profili), zakładanie kont, XP z awansami, polecenia,
// motywy, reset konta, akcje masowe i otwarte sesje gier.
// Montowane wewnątrz royalRouter, więc za logowaniem admina i CSRF.

export const royalExtraRouter = Router();

const DAY = 86_400_000;
const STARTING_MONEY = 5000; // ECONOMY.startingMoney w bocie
const REFERRAL_BONUS = 2000; // ECONOMY.referralBonus w bocie

/** Ten sam wzór co getRequiredXP w bocie (src/utils/helpers.ts). */
function requiredXp(level: number): number {
    return Math.floor(100 * Math.pow(Math.max(1, Math.trunc(level) || 1), 1.5));
}

function warsawDateKey(ms = Date.now()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

/** Kod polecający jak w bocie: 7 znaków bez mylących liter i cyfr. */
function referralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(crypto.randomBytes(7), b => chars[b % chars.length]).join('');
}

async function requirePlayer(userId: string): Promise<Record<string, unknown>> {
    const user = await rSelectOne<Record<string, unknown>>('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) throw new UserError('Nie ma takiego gracza w bazie bota.');
    return user;
}

function isMissingTable(error: unknown): boolean {
    return (error as { code?: string }).code === 'ER_NO_SUCH_TABLE';
}

// ---------- Zlecenia dla bota (web_actions) ----------

const BRIDGE_ACTIONS: Record<string, { label: string; needsTarget: boolean }> = {
    dm: { label: 'Wiadomość DM', needsTarget: true },
    report_reply: { label: 'Odpowiedź na zgłoszenie', needsTarget: false },
    refresh_profile: { label: 'Odświeżenie profilu', needsTarget: true },
    refresh_profiles: { label: 'Odświeżenie nicków', needsTarget: false },
    refresh_guilds: { label: 'Odświeżenie serwerów', needsTarget: false },
    cleanup_mines: { label: 'Czyszczenie porzuconych Min', needsTarget: false },
    jackpot_tick: { label: 'Sprawdzenie jackpota', needsTarget: false }
};

export async function enqueue(req: Request, action: string, target: string | null, payload: Record<string, unknown> = {}): Promise<number> {
    try {
        const result = await rExecute('INSERT INTO web_actions (action, target_id, payload, created_at) VALUES (?, ?, ?, ?)', [
            action,
            target,
            JSON.stringify({ ...payload, adminId: adminDiscordId(), by: req.auth?.username ?? '' }),
            Date.now()
        ]);
        return result.insertId;
    } catch (error) {
        if (isMissingTable(error)) throw new UserError('Ta funkcja wymaga nowej wersji bota (tabela web_actions). Wdróż aktualizację bota.');
        throw error;
    }
}

royalExtraRouter.post(
    '/bridge',
    h(async (req, res) => {
        const action = String(req.body.action || '');
        const def = BRIDGE_ACTIONS[action];
        if (!def) throw new UserError('Nieznane zlecenie.');
        const target = def.needsTarget ? snowflake(req.body.target, 'ID gracza') : req.body.target ? snowflake(req.body.target, 'ID gracza') : null;
        const payload: Record<string, unknown> = {};

        if (action === 'dm' || action === 'report_reply') {
            const message = text(req.body.message, 3500);
            if (!message) throw new UserError('Wpisz treść wiadomości.');
            payload.message = message;
            payload.title = text(req.body.title, 200) || undefined;
        }
        if (action === 'report_reply') {
            payload.reportId = amount(req.body.reportId, { label: 'ID zgłoszenia', max: 1e12 });
            payload.close = req.body.close === true;
        }

        const id = await enqueue(req, action, target, payload);
        res.json({ id, message: `${def.label}: zlecone botowi.` });
    })
);

royalExtraRouter.get(
    '/bridge/:id',
    h(async (req, res) => {
        const id = amount(req.params.id, { label: 'ID zlecenia', max: 1e12 });
        const row = await rSelectOne('SELECT id, action, status, result, created_at, done_at FROM web_actions WHERE id = ?', [id]);
        if (!row) throw new UserError('Nie ma takiego zlecenia.');
        res.json(row);
    })
);

royalExtraRouter.get(
    '/bridge',
    h(async (_req, res) => {
        try {
            const rows = await rSelect(
                `SELECT a.id, a.action, a.target_id, a.status, a.result, a.created_at, a.done_at, ${await profileSelect()}
                 FROM web_actions a LEFT JOIN users u ON u.user_id = a.target_id ORDER BY a.id DESC LIMIT 50`
            );
            const pending = await rSelectOne<{ c: number; oldest: number | null }>(
                "SELECT COUNT(*) AS c, MIN(created_at) AS oldest FROM web_actions WHERE status IN ('pending', 'running')"
            );
            res.json({ available: true, rows, labels: Object.fromEntries(Object.entries(BRIDGE_ACTIONS).map(([k, v]) => [k, v.label])), pending });
        } catch (error) {
            if (isMissingTable(error)) {
                res.json({ available: false, rows: [], labels: {}, pending: null });
                return;
            }
            throw error;
        }
    })
);

// ---------- Nowe konto ----------

royalExtraRouter.post(
    '/players',
    h(async (req, res) => {
        const userId = snowflake(req.body.userId, 'ID gracza');
        const exists = await rSelectOne('SELECT 1 AS ok FROM users WHERE user_id = ?', [userId]);
        if (exists) throw new UserError('Ten gracz ma już konto.');
        const money = req.body.money === undefined || req.body.money === '' ? STARTING_MONEY : amount(req.body.money, { min: 0 });
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                await rExecute(
                    "INSERT INTO users (user_id, money, credits, last_bonus, referral_code, language, language_set, duel_enabled) VALUES (?, ?, 0, 0, ?, 'pl', 0, 1)",
                    [userId, money, referralCode()]
                );
                break;
            } catch (error) {
                // Kolizja kodu polecającego: losujemy nowy. Inny błąd przerywa.
                if ((error as { code?: string }).code !== 'ER_DUP_ENTRY' || attempt === 4) throw error;
            }
        }
        await audit(req, 'money', userId, { op: 'create', money }, 'założenie konta z panelu WWW');
        // Nick i awatar: bot pobierze je od razu, nie czekając na pierwszą komendę gracza.
        await enqueue(req, 'refresh_profile', userId).catch(() => undefined);
        res.json({ message: `Konto założone z saldem $${money.toLocaleString('pl-PL')}.`, userId });
    })
);

// ---------- XP z awansami ----------

royalExtraRouter.post(
    '/players/:id/xp',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const add = amount(req.body.amount, { min: 1, max: 1e8, label: 'XP' });
        const after = await withPlayerLock(userId, async conn => {
            const [rows] = await conn.query('SELECT level, xp FROM users WHERE user_id = ?', [userId]);
            let { level, xp } = (rows as { level: number; xp: number }[])[0];
            level = Number(level) || 1;
            xp = (Number(xp) || 0) + add;
            // Tak samo jak Database.addXP: nadmiar XP przechodzi na kolejne poziomy.
            let guard = 0;
            while (xp >= requiredXp(level) && level < 999 && guard++ < 1000) {
                xp -= requiredXp(level);
                level++;
            }
            await conn.query('UPDATE users SET level = ?, xp = ? WHERE user_id = ?', [level, xp, userId]);
            return { level, xp };
        });
        await audit(req, 'xp', userId, { add, ...after }, text(req.body.reason, 500) || null);
        res.json({ message: `Dodano ${add.toLocaleString('pl-PL')} XP. Poziom ${after.level}, XP ${after.xp}.` });
    })
);

// ---------- Polecenia ----------

royalExtraRouter.post(
    '/players/:id/referrer',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const raw = text(req.body.referrer, 40);
        if (!raw) {
            await rExecute('UPDATE users SET referred_by = NULL WHERE user_id = ?', [userId]);
            await audit(req, 'db', userId, { referred_by: null }, 'usunięcie polecającego');
            res.json({ message: 'Polecający usunięty (bonusy zostają na kontach).' });
            return;
        }
        const referrer = /^\d{15,21}$/.test(raw)
            ? await rSelectOne<{ user_id: string }>('SELECT user_id FROM users WHERE user_id = ?', [raw])
            : await rSelectOne<{ user_id: string }>('SELECT user_id FROM users WHERE referral_code = ?', [raw.toUpperCase()]);
        if (!referrer) throw new UserError('Nie ma gracza z takim ID ani kodem polecającym.');
        if (referrer.user_id === userId) throw new UserError('Gracz nie może polecić sam siebie.');
        const bonus = req.body.bonus === true;

        await rExecute('UPDATE users SET referred_by = ? WHERE user_id = ?', [referrer.user_id, userId]);
        if (bonus) {
            // Jak /polecenie w bocie: obie strony dostają bonus.
            for (const id of [userId, referrer.user_id]) {
                await withPlayerLock(id, conn => conn.query('UPDATE users SET money = money + ? WHERE user_id = ?', [REFERRAL_BONUS, id]));
            }
        }
        await audit(req, 'db', userId, { referred_by: referrer.user_id, bonus }, 'ustawienie polecającego');
        res.json({ message: bonus ? `Polecający ustawiony, obie strony dostały $${REFERRAL_BONUS.toLocaleString('pl-PL')}.` : 'Polecający ustawiony (bez bonusu).' });
    })
);

royalExtraRouter.post(
    '/players/:id/referral-code',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const wanted = text(req.body.code, 8).toUpperCase();
        if (wanted && !/^[A-Z0-9]{4,8}$/.test(wanted)) throw new UserError('Kod: 4-8 znaków, same litery i cyfry.');
        const code = wanted || referralCode();
        try {
            await rExecute('UPDATE users SET referral_code = ? WHERE user_id = ?', [code, userId]);
        } catch (error) {
            if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new UserError('Ten kod ma już inny gracz.');
            throw error;
        }
        await audit(req, 'db', userId, { referral_code: code }, 'zmiana kodu polecającego');
        res.json({ message: `Nowy kod polecający: ${code}.` });
    })
);

// ---------- Motywy profilu ----------

royalExtraRouter.post(
    '/players/:id/themes',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const owned = (Array.isArray(req.body.owned) ? req.body.owned : []).map(String).filter((t: string) => t in THEMES && t !== 'emerald');
        const active = String(req.body.active || 'emerald');
        if (!(active in THEMES)) throw new UserError('Nieznany motyw.');
        if (active !== 'emerald' && !owned.includes(active)) owned.push(active);
        await rExecute('UPDATE users SET owned_themes = ?, profile_theme = ? WHERE user_id = ?', [JSON.stringify([...new Set(owned)]), active, userId]);
        await audit(req, 'db', userId, { owned_themes: owned, profile_theme: active }, 'motywy profilu');
        res.json({ message: 'Motywy zapisane.' });
    })
);

// ---------- Questy i reset konta ----------

royalExtraRouter.post(
    '/players/:id/reset-quests',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        await requirePlayer(userId);
        const result = await rExecute('DELETE FROM daily_quests WHERE user_id = ? AND quest_date = ?', [userId, warsawDateKey()]);
        await audit(req, 'reset', userId, { quests: result.affectedRows }, 'nowe questy na dziś');
        res.json({ message: 'Dzisiejsze questy usunięte: bot wylosuje nowe przy następnym /questy.' });
    })
);

royalExtraRouter.post(
    '/players/:id/reset',
    h(async (req, res) => {
        const userId = snowflake(req.params.id);
        const before = await requirePlayer(userId);
        const stats = req.body.stats === true;
        const history = req.body.history === true;
        await withPlayerLock(userId, async conn => {
            await conn.query(
                `UPDATE users SET money = ?, credits = 0, rakeback_balance = 0, level = 1, xp = 0,
                        daily_streak = 0, last_daily = 0, last_bonus = 0
                        ${stats ? ', total_games = 0, total_wins = 0, total_losses = 0, biggest_win = 0, total_wagered = 0, rakeback_total = 0' : ''}
                 WHERE user_id = ?`,
                [STARTING_MONEY, userId]
            );
            if (history) {
                await conn.query('DELETE FROM game_history WHERE user_id = ?', [userId]);
                await conn.query('DELETE FROM achievements WHERE user_id = ?', [userId]);
                await conn.query('DELETE FROM daily_quests WHERE user_id = ?', [userId]);
            }
        });
        await audit(req, 'reset', userId, { op: 'account', stats, history, money: before.money, credits: before.credits, level: before.level }, text(req.body.reason, 500) || 'reset konta z panelu WWW');
        res.json({ message: `Konto wróciło do stanu startowego ($${STARTING_MONEY.toLocaleString('pl-PL')}).` });
    })
);

// ---------- Akcje masowe ----------

interface Audience {
    where: string;
    params: SqlParam[];
    label: string;
}

function audience(req: Request): Audience {
    const source = (req.method === 'GET' ? req.query : req.body) as Record<string, unknown>;
    const kind = String(source.audience || '');
    const days = Math.min(365, Math.max(1, Math.trunc(Number(source.days)) || 7));
    const base = 'is_blocked = FALSE';
    if (kind === 'all') return { where: base, params: [], label: 'wszyscy niezablokowani' };
    if (kind === 'active') {
        return {
            where: `${base} AND user_id IN (SELECT DISTINCT user_id FROM game_history WHERE played_at >= ?)`,
            params: [Date.now() - days * DAY],
            label: `grający w ostatnich ${days} dniach`
        };
    }
    if (kind === 'guild') {
        const guild = snowflake(source.guild, 'ID serwera');
        return {
            where: `${base} AND user_id IN (SELECT DISTINCT user_id FROM game_history WHERE guild_id = ? AND played_at >= ?)`,
            params: [guild, Date.now() - days * DAY],
            label: `grający na serwerze ${guild} (${days} dni)`
        };
    }
    if (kind === 'vip') {
        const min = Math.max(0, Math.trunc(Number(source.minWagered)) || 0);
        return { where: `${base} AND total_wagered >= ?`, params: [min], label: `obstawili co najmniej $${min.toLocaleString('pl-PL')}` };
    }
    if (kind === 'list') {
        const ids = [...new Set(String(source.ids || '').match(/\d{15,21}/g) ?? [])].slice(0, 1000);
        if (ids.length === 0) throw new UserError('Wklej przynajmniej jedno ID Discorda.');
        return { where: `${base} AND user_id IN (${ids.map(() => '?').join(', ')})`, params: ids, label: `lista ${ids.length} ID` };
    }
    throw new UserError('Wybierz, kogo dotyczy akcja.');
}

royalExtraRouter.get(
    '/bulk/preview',
    h(async (req, res) => {
        const target = audience(req);
        const row = await rSelectOne<{ c: number }>(`SELECT COUNT(*) AS c FROM users WHERE ${target.where}`, target.params);
        res.json({ count: Number(row?.c) || 0, label: target.label });
    })
);

royalExtraRouter.post(
    '/bulk',
    h(async (req, res) => {
        const target = audience(req);
        const action = String(req.body.action || '');
        const reason = text(req.body.reason, 500) || null;
        let sql: string;
        let params: SqlParam[];
        let what: string;
        if (action === 'money' || action === 'credits') {
            const value = amount(req.body.amount, { min: 1, max: 1e9 });
            sql = `UPDATE users SET ${action} = ${action} + ? WHERE ${target.where}`;
            params = [value, ...target.params];
            what = action === 'money' ? `+$${value.toLocaleString('pl-PL')}` : `+${value.toLocaleString('pl-PL')} kredytów`;
        } else if (action === 'reset_daily') {
            sql = `UPDATE users SET last_daily = 0, last_bonus = 0 WHERE ${target.where}`;
            params = target.params;
            what = 'odblokowane daily';
        } else {
            throw new UserError('Nieznana akcja.');
        }
        // Zmiana względna (x = x + ?) jak w bocie, więc nie gryzie się z trwającymi grami.
        const result = await rExecute(sql, params);
        await audit(req, action === 'reset_daily' ? 'reset' : 'money', null, { bulk: true, action, audience: target.label, players: result.affectedRows, amount: req.body.amount }, reason);
        res.json({ message: `${what}: ${result.affectedRows.toLocaleString('pl-PL')} graczy (${target.label}).` });
    })
);

// ---------- Otwarte sesje ----------

royalExtraRouter.get(
    '/sessions',
    h(async (_req, res) => {
        const prof = await profileSelect();
        const mines = await rSelect(
            `SELECT m.id, m.user_id, m.bet, m.mines_count, m.revealed_positions, m.created_at, ${prof}
             FROM mines_sessions m LEFT JOIN users u ON u.user_id = m.user_id
             WHERE m.cashed_out = FALSE AND m.hit_mine = FALSE ORDER BY m.created_at`
        );
        const live = await rSelect(
            `SELECT l.round_id, l.user_id, l.bet, l.guild_id, l.created_at, ${prof}
             FROM live_bets l LEFT JOIN users u ON u.user_id = l.user_id WHERE l.status = 'open' ORDER BY l.created_at`
        );
        res.json({ mines, live });
    })
);

royalExtraRouter.post(
    '/sessions/live-refund',
    h(async (req, res) => {
        const userId = snowflake(req.body.userId, 'ID gracza');
        const roundId = text(req.body.roundId, 36);
        const bet = await rSelectOne<{ bet: number; created_at: number }>(
            "SELECT bet, created_at FROM live_bets WHERE round_id = ? AND user_id = ? AND status = 'open'",
            [roundId, userId]
        );
        if (!bet) throw new UserError('Ten zakład jest już rozliczony.');
        // Runda Crash Live trwa najwyżej kilka minut. Młodszy zakład może jeszcze rozliczyć sam bot.
        if (Date.now() - Number(bet.created_at) < 10 * 60_000) throw new UserError('Zakład ma mniej niż 10 minut: runda może jeszcze trwać.');
        const refunded = await withPlayerLock(userId, async conn => {
            const [claim] = await conn.query("UPDATE live_bets SET status = 'refunded' WHERE round_id = ? AND user_id = ? AND status = 'open'", [roundId, userId]);
            if ((claim as { affectedRows: number }).affectedRows !== 1) return 0;
            await conn.query('UPDATE users SET money = money + ? WHERE user_id = ?', [Number(bet.bet) || 0, userId]);
            return Number(bet.bet) || 0;
        });
        if (!refunded) throw new UserError('Ten zakład jest już rozliczony.');
        await audit(req, 'money', userId, { op: 'live_refund', roundId, refunded }, 'zwrot zawieszonego zakładu Crash Live');
        res.json({ message: `Zwrócono $${refunded.toLocaleString('pl-PL')}.` });
    })
);

// ---------- Polecenia (zaproszenia) ----------

royalExtraRouter.get(
    '/referrals',
    h(async (req, res) => {
        const { per, offset } = page(req, 50);
        const search = q(req, 'q');
        const prof = await profileSelect();
        const profiles = prof.startsWith('u.');
        // Polecony (n) i polecający (r) w jednym wierszu.
        const person = (alias: string, prefix: string) =>
            ['username', 'display_name', 'avatar'].map(c => (profiles ? `${alias}.${c} AS ${prefix}_${c}` : `NULL AS ${prefix}_${c}`)).join(', ');

        const where: string[] = ['n.referred_by IS NOT NULL'];
        const params: SqlParam[] = [];
        if (search) {
            if (/^\d{15,21}$/.test(search)) {
                where.push('(n.user_id = ? OR n.referred_by = ?)');
                params.push(search, search);
            } else {
                where.push(`(r.referral_code = ?${profiles ? ' OR n.username LIKE ? OR n.display_name LIKE ? OR r.username LIKE ? OR r.display_name LIKE ?' : ''})`);
                params.push(search.toUpperCase(), ...(profiles ? Array(4).fill(`%${search}%`) : []));
            }
        }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const join = 'FROM users n LEFT JOIN users r ON r.user_id = n.referred_by';
        const total = await rSelectOne<{ c: number }>(`SELECT COUNT(*) AS c ${join} ${whereSql}`, params);
        const rows = await rSelect(
            `SELECT n.user_id, ${person('n', 'n')}, n.total_games, n.money, n.created_at, n.is_blocked,
                    n.referred_by, ${person('r', 'r')}, r.referral_code, r.is_blocked AS r_blocked
             ${join} ${whereSql} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
            [...params, per, offset]
        );
        const top = await rSelect(
            `SELECT r.user_id, ${prof.replace(/\bu\./g, 'r.')}, r.referral_code, r.is_blocked, COUNT(*) AS referred,
                    SUM(CASE WHEN n.total_games < 5 THEN 1 ELSE 0 END) AS idle, MAX(n.created_at) AS last_at
             FROM users n JOIN users r ON r.user_id = n.referred_by
             GROUP BY r.user_id ORDER BY referred DESC LIMIT 15`
        );
        const sum = await rSelectOne<{ c: number }>('SELECT COUNT(*) AS c FROM users WHERE referred_by IS NOT NULL');
        res.json({ rows, top, total: Number(total?.c) || 0, per, all: Number(sum?.c) || 0, bonus: REFERRAL_BONUS });
    })
);
