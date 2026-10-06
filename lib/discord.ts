// Profil Discord na żywo przez Lanyard (https://github.com/Phineas/lanyard).
// Lanyard widzi status tylko kont, które są na jego serwerze: discord.gg/lanyard.
//
// Status nie trafia do żadnego cache: strona główna pyta Lanyard przy każdym
// wejściu, a otwarta karta dopytuje co kilkanaście sekund przez /discord/status.
//
// Obrazki (awatar, baner, dekoracja, odznaki, okładki) idą przez
// app/discord/[...path]/route.ts: CSP strony wpuszcza tylko obrazki z tej domeny,
// a przeglądarka odwiedzającego nie łączy się z serwerami Discorda.

import { describeError } from '@/lib/errors';

export const DISCORD_ID = '1328758394588500024';

const TIMEOUT = 3000;

// Odznaki wpisane na sztywno: Discord nie udostępnia przez API Boostera,
// Questów, April Fools ani Orba, więc nie da się ich wykryć automatycznie.
// Hash to nazwa pliku z cdn.discordapp.com/badge-icons/<hash>.png.
export const BADGES = [
    { hash: '0334688279c8359120922938dcb1d6f8', title: 'Nitro Platinum' },
    { hash: '8a88d63823d8a71cd5e390baa45efa02', title: 'HypeSquad Bravery' },
    { hash: '7142225d31238f6387d9f09efaa02759', title: 'Server Booster' },
    { hash: '7d9ae358c8c5e118768335dbe68b4fb8', title: 'Quest Completed' },
    { hash: 'ca105ad9cfc8580c765101d17bbb2323', title: 'April Fools 2026' },
    { hash: '83d8a1eb09a8d64e59233eec5d4d5c2d', title: 'Orb Profile Badge' }
];

export type DiscordStatus = 'online' | 'idle' | 'dnd' | 'offline';

export const STATUS_LABELS: Record<DiscordStatus, string> = {
    online: 'Dostępny',
    idle: 'Zaraz wracam',
    dnd: 'Nie przeszkadzać',
    offline: 'Offline'
};

export interface DiscordActivity {
    kind: 'spotify' | 'app';
    label: string;
    title: string;
    lines: string[];
    /** Ścieżka okładki na tej stronie (/discord/art/...), nigdy obcy adres. */
    image: string | null;
    /** Czas w ms: początek i, przy Spotify, koniec utworu. */
    start: number | null;
    end: number | null;
}

export interface DiscordProfile {
    displayName: string;
    username: string;
    status: DiscordStatus;
    /** Na czym jestem zalogowany: telefon, komputer, przeglądarka. */
    devices: string[];
    /** Własny opis statusu ustawiony w Discordzie. */
    note: string | null;
    avatar: string;
    decoration: string | null;
    activities: DiscordActivity[];
    /** Kiedy serwer pobrał dane: od tego liczymy postęp utworu przed pierwszym tyknięciem zegara. */
    at: number;
}

interface LanyardActivity {
    type: number;
    id?: string;
    name: string;
    details?: string;
    state?: string;
    application_id?: string;
    emoji?: { name: string; id?: string };
    timestamps?: { start?: number; end?: number };
    assets?: { large_image?: string };
}

interface LanyardData {
    discord_user: {
        username: string;
        global_name: string | null;
        avatar: string | null;
        avatar_decoration_data?: { asset: string } | null;
    };
    discord_status: DiscordStatus;
    active_on_discord_desktop?: boolean;
    active_on_discord_mobile?: boolean;
    active_on_discord_web?: boolean;
    activities: LanyardActivity[];
    listening_to_spotify: boolean;
    spotify: { song: string; artist: string; album: string; album_art_url: string; timestamps?: { start: number; end: number } } | null;
}

// Typy aktywności z Discorda (4 to własny opis statusu, 1 to stream).
const ACTIVITY_LABELS: Record<number, string> = {
    0: 'W tej chwili',
    1: 'Na żywo',
    2: 'Słucham',
    3: 'Oglądam',
    5: 'Rywalizuję'
};

const base64url = (text: string) => Buffer.from(text).toString('base64url');

// Discord zwraca albo id assetu aplikacji, albo zewnętrzny link "mp:external/...".
function activityImage(activity: LanyardActivity): string | null {
    const img = activity.assets?.large_image;
    if (!img) return null;
    if (img.startsWith('mp:')) return `/discord/art/mp/${base64url(img.slice(3))}`;
    if (img.startsWith('spotify:')) return `/discord/art/spotify/${img.slice(8)}`;
    if (!activity.application_id || !/^\d+$/.test(img)) return null;
    return `/discord/art/app/${activity.application_id}/${img}`;
}

export async function getDiscordProfile(): Promise<DiscordProfile | null> {
    let data: LanyardData;
    try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(TIMEOUT)
        });
        const json = (await response.json()) as { success: boolean; data: LanyardData };
        if (!json.success) throw new Error('Lanyard: success = false');
        data = json.data;
    } catch (error) {
        console.error('[Discord] Lanyard:', describeError(error));
        return null;
    }

    const user = data.discord_user;
    const spotify = data.listening_to_spotify ? data.spotify : null;
    const albumArt = spotify && /\/image\/([0-9a-f]+)$/.exec(spotify.album_art_url)?.[1];
    const spotifyItem = (): DiscordActivity => ({
        kind: 'spotify',
        label: 'Słucham na Spotify',
        title: spotify!.song,
        lines: [spotify!.artist, spotify!.album].filter(Boolean),
        image: albumArt ? `/discord/art/spotify/${albumArt}` : null,
        start: spotify!.timestamps?.start ?? null,
        end: spotify!.timestamps?.end ?? null
    });

    // Spotify siedzi też w activities w uboższej formie, więc podmieniamy go na dane z data.spotify.
    let spotifyUsed = false;
    const activities: DiscordActivity[] = [];
    for (const a of data.activities) {
        if (a.type === 4) continue;
        if (spotify && (a.id === 'spotify:1' || a.name === 'Spotify')) {
            spotifyUsed = true;
            activities.push(spotifyItem());
            continue;
        }
        activities.push({
            kind: 'app',
            label: ACTIVITY_LABELS[a.type] ?? 'W tej chwili',
            title: a.name,
            lines: [a.details, a.state].filter((s): s is string => !!s),
            image: activityImage(a),
            start: a.timestamps?.start ?? null,
            end: null
        });
    }
    if (spotify && !spotifyUsed) activities.unshift(spotifyItem());

    // Własny opis: emoji z Discorda (z id) pomijamy, bo to obrazek, a nie znak.
    const custom = data.activities.find(a => a.type === 4);
    const note = custom ? [custom.emoji && !custom.emoji.id ? custom.emoji.name : '', custom.state ?? ''].join(' ').trim() || null : null;

    const devices = [
        data.active_on_discord_desktop && 'Komputer',
        data.active_on_discord_web && 'Przeglądarka',
        data.active_on_discord_mobile && 'Telefon'
    ].filter((d): d is string => !!d);

    const ext = user.avatar?.startsWith('a_') ? 'gif' : 'png';
    const decoration = user.avatar_decoration_data?.asset;

    return {
        displayName: user.global_name || user.username,
        username: user.username,
        status: data.discord_status || 'offline',
        devices: data.discord_status === 'offline' ? [] : devices,
        note,
        avatar: user.avatar ? `/discord/avatar/${user.avatar}.${ext}` : '/discord/avatar/default',
        decoration: decoration ? `/discord/decoration/${decoration}` : null,
        activities: activities.slice(0, 2),
        at: Date.now()
    };
}

/** Baner przez dcdn.dstn.to: API Discorda nie podaje banera bez tokena bota. */
const BANNER_URL = `https://dcdn.dstn.to/banners/${DISCORD_ID}?size=1024`;

const DAY = 86400;
const YEAR = 365 * DAY;
const HASH = /^(?:a_)?[0-9a-f]{32}$/;
const SNOWFLAKE = /^\d{5,25}$/;

/**
 * Ścieżka /discord/... na prawdziwy adres obrazka. Adres zawsze składamy tutaj
 * z kawałków sprawdzonych wyrażeniami regularnymi, więc z zewnątrz nie da się
 * kazać serwerowi pobrać czegokolwiek innego. Obrazki z hashem w nazwie nigdy
 * się nie zmieniają (nowy awatar to nowy hash), więc mogą leżeć w cache rok.
 */
export function imageSource(path: string[]): { url: string; maxAge: number } | null {
    const [kind, a, b, c] = path;

    if (kind === 'banner' && path.length === 1) return { url: BANNER_URL, maxAge: 3600 };

    if (kind === 'badge' && path.length === 2 && /^\d$/.test(a)) {
        const badge = BADGES[Number(a)];
        return badge ? { url: `https://cdn.discordapp.com/badge-icons/${badge.hash}.png`, maxAge: DAY } : null;
    }

    if (kind === 'avatar' && path.length === 2) {
        if (a === 'default') return { url: 'https://cdn.discordapp.com/embed/avatars/0.png', maxAge: DAY };
        const avatar = /^((?:a_)?[0-9a-f]{32})\.(gif|png)$/.exec(a);
        return avatar ? { url: `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${avatar[1]}.${avatar[2]}?size=256`, maxAge: YEAR } : null;
    }

    if (kind === 'decoration' && path.length === 2 && HASH.test(a)) {
        return { url: `https://cdn.discordapp.com/avatar-decoration-presets/${a}.png?size=256&passthrough=true`, maxAge: YEAR };
    }

    if (kind === 'art' && a === 'spotify' && path.length === 3 && /^[0-9a-f]{16,64}$/.test(b)) {
        return { url: `https://i.scdn.co/image/${b}`, maxAge: YEAR };
    }

    if (kind === 'art' && a === 'app' && path.length === 4 && SNOWFLAKE.test(b) && SNOWFLAKE.test(c)) {
        return { url: `https://cdn.discordapp.com/app-assets/${b}/${c}.png?size=160`, maxAge: YEAR };
    }

    // "mp:external/..." to obrazek przepuszczony przez proxy Discorda. Host jest stały.
    if (kind === 'art' && a === 'mp' && path.length === 3) {
        const target = Buffer.from(b, 'base64url').toString();
        return /^external\/[\w\-.~%/:?=&]+$/.test(target) && !target.includes('..')
            ? { url: `https://media.discordapp.net/${target}`, maxAge: DAY }
            : null;
    }

    return null;
}
