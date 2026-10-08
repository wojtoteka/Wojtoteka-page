import { rSelectOne, royalConfigured, hasGuildInfo, hasProfiles } from './db';
import { isAvatarHash, isSnowflake } from './meta';

const YEAR = 365 * 86400;
const DAY = 86400;

/**
 * Adres obrazka Discorda dla /discord/royal/...:
 *   u/<id>/<hash>.webp   awatar gracza
 *   g/<id>/<hash>.webp   ikona serwera
 *   default/<0-5>.png    domyślny awatar
 * Awatary i ikony wydajemy tylko wtedy, gdy hash zgadza się z bazą bota,
 * żeby strona nie była otwartym proxy do CDN Discorda.
 */
export async function royalImageSource(path: string[]): Promise<{ url: string; maxAge: number } | null> {
    const [kind, a, b] = path;

    if (kind === 'default' && path.length === 2) {
        const match = /^([0-5])\.png$/.exec(a);
        return match ? { url: `https://cdn.discordapp.com/embed/avatars/${match[1]}.png`, maxAge: DAY } : null;
    }

    if ((kind !== 'u' && kind !== 'g') || path.length !== 3 || !isSnowflake(a)) return null;
    const file = /^(.+)\.webp$/.exec(b ?? '');
    if (!file || !isAvatarHash(file[1]) || !royalConfigured()) return null;
    const hash = file[1];

    try {
        if (kind === 'u') {
            if (!(await hasProfiles())) return null;
            const row = await rSelectOne('SELECT 1 AS ok FROM users WHERE user_id = ? AND avatar = ?', [a, hash]);
            return row ? { url: `https://cdn.discordapp.com/avatars/${a}/${hash}.webp?size=128`, maxAge: YEAR } : null;
        }
        if (!(await hasGuildInfo())) return null;
        const row = await rSelectOne('SELECT 1 AS ok FROM guild_settings WHERE guild_id = ? AND icon = ?', [a, hash]);
        return row ? { url: `https://cdn.discordapp.com/icons/${a}/${hash}.webp?size=128`, maxAge: YEAR } : null;
    } catch {
        return null;
    }
}
