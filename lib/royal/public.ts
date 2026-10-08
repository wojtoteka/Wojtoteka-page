import { hasGuildInfo, hasProfiles, profileSelect, rSelect, rSelectOne, royalConfigured } from './db';
import type { PlayerLike } from './meta';

// Publiczne statystyki bota na /RoyalCasinoBot i /RoyalCasinoBot/ranking.
// W rankingach nie ma kont zablokowanych ani ukrytych w panelu (web_hidden).
// Wynik trzymamy minutę w pamięci, żeby ruch na stronie nie obciążał bazy bota.

export type BoardKey = 'saldo' | 'poziom' | 'obstawione' | 'wygrana' | 'gry';

export const BOARDS: { key: BoardKey; label: string; valueLabel: string }[] = [
    { key: 'saldo', label: 'Saldo', valueLabel: 'Saldo' },
    { key: 'poziom', label: 'Poziom', valueLabel: 'Poziom' },
    { key: 'obstawione', label: 'Obstawione', valueLabel: 'Łącznie postawione' },
    { key: 'wygrana', label: 'Największa wygrana', valueLabel: 'Wygrana netto' },
    { key: 'gry', label: 'Rozegrane gry', valueLabel: 'Gry' }
];

const ORDER: Record<BoardKey, { value: string; order: string }> = {
    saldo: { value: 'u.money', order: 'u.money DESC' },
    poziom: { value: 'u.level', order: 'u.level DESC, u.xp DESC' },
    obstawione: { value: 'u.total_wagered', order: 'u.total_wagered DESC' },
    wygrana: { value: 'u.biggest_win', order: 'u.biggest_win DESC' },
    gry: { value: 'u.total_games', order: 'u.total_games DESC' }
};

export interface BoardRow extends PlayerLike {
    value: number;
    level: number;
    total_wagered: number;
}

export interface ServerRow {
    guild_id: string;
    name: string | null;
    icon: string | null;
    members: number;
    games: number;
    wagered: number;
    players: number;
}

export interface BigWinRow extends PlayerLike {
    game_type: string;
    bet_amount: number;
    win_amount: number;
    played_at: number;
}

export interface RoyalPublicStats {
    totals: { players: number; games: number; wagered: number; servers: number; games24h: number };
    jackpot: { pot: number; tickets: number; players: number; drawAt: number } | null;
    lastJackpot: (PlayerLike & { pot: number; drawnAt: number; tickets: number }) | null;
    bigWins: BigWinRow[];
    servers: ServerRow[];
}

async function visibleClause(alias = 'u'): Promise<string> {
    return (await hasProfiles()) ? `${alias}.is_blocked = FALSE AND ${alias}.web_hidden = 0` : `${alias}.is_blocked = FALSE`;
}

const cache = new Map<string, { at: number; data: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T | null> {
    if (!royalConfigured()) return null;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 60_000) return hit.data as T;
    try {
        const data = await load();
        cache.set(key, { at: Date.now(), data });
        return data;
    } catch (error) {
        console.error(`[ROYAL] Statystyki (${key}):`, (error as Error).message);
        // Stare dane są lepsze niż pusta sekcja, gdy baza bota chwilowo nie odpowiada.
        return (hit?.data as T) ?? null;
    }
}

export function getBoard(key: BoardKey, limit = 10): Promise<BoardRow[] | null> {
    return cached(`board:${key}:${limit}`, async () => {
        const { value, order } = ORDER[key];
        return rSelect<BoardRow>(
            `SELECT u.user_id, ${await profileSelect()}, ${value} AS value, u.level, u.total_wagered
             FROM users u WHERE ${await visibleClause()} AND ${value} > 0
             ORDER BY ${order} LIMIT ?`,
            [limit]
        );
    });
}

export function getPublicStats(): Promise<RoyalPublicStats | null> {
    return cached('stats', async () => {
        const now = Date.now();
        const since24h = now - 86_400_000;
        const since30d = now - 30 * 86_400_000;
        const since7d = now - 7 * 86_400_000;
        // Sprawdzenie kolumn idzie raz (cache 5 min), potem wszystkie zapytania naraz.
        const [visible, guildInfo, prof] = await Promise.all([visibleClause(), hasGuildInfo(), profileSelect()]);

        // Serwery: lista z guild_settings (bot zapisuje tam każdy serwer, na którym jest),
        // a obrót z 30 dni tylko dołączony. Dzięki temu widać też serwery bez gier w tym okresie.
        const serversSql = guildInfo
            ? `SELECT g.guild_id, g.name, g.icon, g.member_count AS members,
                      COALESCE(s.games, 0) AS games, COALESCE(s.wagered, 0) AS wagered, COALESCE(s.players, 0) AS players
               FROM guild_settings g
               LEFT JOIN (SELECT guild_id, COUNT(*) AS games, SUM(bet_amount) AS wagered, COUNT(DISTINCT user_id) AS players
                          FROM game_history WHERE played_at >= ? AND guild_id IS NOT NULL GROUP BY guild_id) s ON s.guild_id = g.guild_id
               WHERE g.left_at = 0 AND g.name IS NOT NULL
               ORDER BY wagered DESC, games DESC, g.member_count DESC LIMIT 25`
            : `SELECT guild_id, NULL AS name, NULL AS icon, 0 AS members, COUNT(*) AS games,
                      COALESCE(SUM(bet_amount), 0) AS wagered, COUNT(DISTINCT user_id) AS players
               FROM game_history WHERE guild_id IS NOT NULL AND played_at >= ?
               GROUP BY guild_id ORDER BY wagered DESC LIMIT 25`;

        const [totals, games24h, servers, open, last, bigWins, serverRows] = await Promise.all([
            rSelectOne<{ players: number; games: number; wagered: number }>(
                'SELECT COUNT(*) AS players, COALESCE(SUM(total_games), 0) AS games, COALESCE(SUM(total_wagered), 0) AS wagered FROM users WHERE is_blocked = FALSE'
            ),
            rSelectOne<{ c: number }>('SELECT COUNT(*) AS c FROM game_history WHERE played_at >= ?', [since24h]),
            guildInfo
                ? rSelectOne<{ c: number }>('SELECT COUNT(*) AS c FROM guild_settings WHERE left_at = 0 AND name IS NOT NULL')
                : rSelectOne<{ c: number }>('SELECT COUNT(DISTINCT guild_id) AS c FROM game_history WHERE guild_id IS NOT NULL AND played_at >= ?', [since30d]),
            rSelectOne<{ id: number; pot: number; total_tickets: number; draw_at: number; players: number }>(
                `SELECT r.id, r.pot, r.total_tickets, r.draw_at,
                        (SELECT COUNT(*) FROM jackpot_tickets t WHERE t.round_id = r.id AND t.tickets > 0) AS players
                 FROM jackpot_rounds r WHERE r.status = 'open' ORDER BY r.id DESC LIMIT 1`
            ),
            rSelectOne<PlayerLike & { pot: number; drawnAt: number; tickets: number; hidden: number }>(
                `SELECT r.winner_id AS user_id, r.pot, r.drawn_at AS drawnAt, r.winner_tickets AS tickets, ${prof},
                        CASE WHEN ${visible} THEN 0 ELSE 1 END AS hidden
                 FROM jackpot_rounds r JOIN users u ON u.user_id = r.winner_id
                 WHERE r.status = 'drawn' AND r.winner_id IS NOT NULL ORDER BY r.drawn_at DESC LIMIT 1`
            ),
            rSelect<BigWinRow>(
                `SELECT h.user_id, ${prof}, h.game_type, h.bet_amount, h.win_amount, h.played_at
                 FROM game_history h JOIN users u ON u.user_id = h.user_id
                 WHERE h.played_at >= ? AND h.win_amount > h.bet_amount AND ${visible}
                 ORDER BY (h.win_amount - h.bet_amount) DESC LIMIT 5`,
                [since7d]
            ),
            rSelect<ServerRow>(serversSql, [since30d])
        ]);

        return {
            totals: {
                players: Number(totals?.players) || 0,
                games: Number(totals?.games) || 0,
                wagered: Number(totals?.wagered) || 0,
                servers: Number(servers?.c) || 0,
                games24h: Number(games24h?.c) || 0
            },
            jackpot: open ? { pot: Number(open.pot) || 0, tickets: Number(open.total_tickets) || 0, players: Number(open.players) || 0, drawAt: Number(open.draw_at) || 0 } : null,
            lastJackpot: last && !last.hidden ? { ...last, pot: Number(last.pot) || 0, drawnAt: Number(last.drawnAt) || 0 } : null,
            bigWins,
            servers: serverRows.map(row => ({
                ...row,
                members: Number(row.members) || 0,
                games: Number(row.games) || 0,
                wagered: Number(row.wagered) || 0,
                players: Number(row.players) || 0
            }))
        };
    });
}
