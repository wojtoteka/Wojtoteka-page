// Stałe bota RoyalCasino potrzebne stronie: nazwy gier, progi VIP, osiągnięcia,
// motywy profilu. Źródło prawdy to kod bota (src/config/constants.ts,
// src/utils/vip.ts, src/utils/achievements.ts, src/render/theme.ts) - przy
// zmianie w bocie trzeba poprawić też tutaj. Plik nie importuje nic z serwera,
// więc korzystają z niego też komponenty w przeglądarce.

export const GAME_NAMES: Record<string, string> = {
    blackjack: 'Blackjack',
    poker: 'Poker',
    roulette: 'Ruletka',
    ruletka: 'Ruletka',
    slots: 'Sloty',
    crash: 'Crash',
    crash_live: 'Crash Live',
    coinflip: 'Coinflip',
    dice: 'Kości',
    war: 'Wojna',
    hilo: 'Hi-Lo',
    mines: 'Miny',
    zdrapka: 'Zdrapka',
    kolo: 'Koło fortuny',
    keno: 'Keno',
    plinko: 'Plinko',
    limbo: 'Limbo',
    pojedynek: 'Pojedynek',
    duel: 'Pojedynek'
};

export function gameName(type: string | null | undefined): string {
    return (type && GAME_NAMES[type]) || type || '?';
}

export interface VipTier {
    id: string;
    name: string;
    minWagered: number;
    rakeback: number;
    dailyBoost: number;
    color: string;
}

export const VIP_TIERS: VipTier[] = [
    { id: 'bronze', name: 'Brąz', minWagered: 0, rakeback: 0.001, dailyBoost: 0, color: '#B98A5E' },
    { id: 'silver', name: 'Srebro', minWagered: 250_000, rakeback: 0.002, dailyBoost: 10, color: '#C9D3E3' },
    { id: 'gold', name: 'Złoto', minWagered: 2_500_000, rakeback: 0.003, dailyBoost: 20, color: '#CFA14A' },
    { id: 'platinum', name: 'Platyna', minWagered: 25_000_000, rakeback: 0.004, dailyBoost: 35, color: '#9FD3D6' },
    { id: 'diamond', name: 'Diament', minWagered: 250_000_000, rakeback: 0.005, dailyBoost: 50, color: '#B9C8FF' },
    { id: 'royal', name: 'Royal', minWagered: 2_500_000_000, rakeback: 0.006, dailyBoost: 75, color: '#E2B857' }
];

export function vipTier(totalWagered: number): VipTier {
    let tier = VIP_TIERS[0];
    for (const candidate of VIP_TIERS) if ((Number(totalWagered) || 0) >= candidate.minWagered) tier = candidate;
    return tier;
}

export const ACHIEVEMENTS: Record<string, string> = {
    first_game: 'Pierwsza gra',
    games_10: 'Regularny gracz',
    games_50: 'Weteran',
    games_100: 'Legenda',
    first_win: 'Pierwsza wygrana',
    wins_10: 'Zwycięzca',
    wins_50: 'Mistrz',
    level_5: 'Poziom 5',
    level_10: 'Poziom 10',
    level_25: 'Poziom 25',
    millionaire: 'Milioner',
    big_win: 'Wielka wygrana',
    streak_7: 'Oddany gracz',
    high_roller: 'High roller'
};

export const THEMES: Record<string, string> = {
    emerald: 'Szmaragd',
    monaco: 'Monaco',
    bordeaux: 'Bordeaux',
    onyx: 'Onyks',
    ivory: 'Kość słoniowa',
    royal: 'Royal'
};

/** Typy wpisów w logu admina bota (admin_audit.action). */
export const AUDIT_ACTIONS: Record<string, string> = {
    money: 'Saldo',
    block: 'Blokada',
    delete: 'Usunięcie konta',
    reset: 'Reset daily',
    mines: 'Miny',
    freeze: 'Zamrożenie',
    note: 'Notatka',
    watch: 'Obserwacja',
    limit: 'Limit zakładu',
    xp: 'XP',
    level: 'Poziom',
    achievement: 'Osiągnięcie',
    payout: 'Wypłata',
    event: 'Event / serwer',
    maintenance: 'Konserwacja',
    cache: 'Cache',
    dm: 'Wiadomość DM',
    db: 'Zmiana danych'
};

// ---------- Format ----------

const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** $1,234,567 jak w bocie. */
export function money(value: number | string | null | undefined): string {
    const n = Number(value) || 0;
    return `${n < 0 ? '-' : ''}$${usd.format(Math.abs(n))}`;
}

/** $1.2M do wąskich kafelków. */
export function moneyShort(value: number | string | null | undefined): string {
    const n = Number(value) || 0;
    return `${n < 0 ? '-' : ''}$${compact.format(Math.abs(n))}`;
}

export function signedMoney(value: number | string | null | undefined): string {
    const n = Number(value) || 0;
    return `${n > 0 ? '+' : ''}${money(n)}`;
}

// ---------- Nick i awatar ----------

export interface PlayerLike {
    user_id: string;
    username?: string | null;
    display_name?: string | null;
    avatar?: string | null;
}

export function playerName(p: PlayerLike): string {
    return p.display_name || p.username || `Gracz ${p.user_id.slice(-4)}`;
}

const SNOWFLAKE = /^\d{15,21}$/;
const HASH = /^(a_)?[0-9a-f]{32}$/;

/** Awatar przez proxy strony (/discord/royal/...), bo CSP wpuszcza tylko własną domenę. */
export function avatarUrl(p: PlayerLike): string {
    if (p.avatar && HASH.test(p.avatar) && SNOWFLAKE.test(p.user_id)) return `/discord/royal/u/${p.user_id}/${p.avatar}.webp`;
    let index = 0;
    try {
        index = Number((BigInt(p.user_id) >> BigInt(22)) % BigInt(6));
    } catch {
        index = 0;
    }
    return `/discord/royal/default/${index}.png`;
}

export function guildIconUrl(g: { guild_id: string; icon?: string | null }): string | null {
    return g.icon && HASH.test(g.icon) && SNOWFLAKE.test(g.guild_id) ? `/discord/royal/g/${g.guild_id}/${g.icon}.webp` : null;
}

export function isSnowflake(value: unknown): value is string {
    return typeof value === 'string' && SNOWFLAKE.test(value);
}

export function isAvatarHash(value: unknown): value is string {
    return typeof value === 'string' && HASH.test(value);
}
