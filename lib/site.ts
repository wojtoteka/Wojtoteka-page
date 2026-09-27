import { select } from '@/lib/db';

export interface BioLink {
    id: number;
    title: string;
    url: string;
    icon: string;
    sort_order: number;
    opens_new_tab: number;
}

export interface Announcement {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'important';
    display_type: 'banner' | 'popup';
    priority: number;
}

export const DEFAULT_TAGLINE = 'developer html,css,js';

/** Linki, które baza dostaje przy pierwszym uruchomieniu (i które pokazuje podgląd bez bazy). */
export const DEFAULT_BIO_LINKS: BioLink[] = [
    { id: 1, title: 'Moje gry', url: '/gry', icon: 'gamepad', sort_order: 0, opens_new_tab: 0 },
    { id: 2, title: 'Kontakt', url: '/kontakt', icon: 'mail', sort_order: 1, opens_new_tab: 0 },
    { id: 3, title: 'Google Play', url: 'https://play.google.com/store/apps/developer?id=Wojtoteka&hl=pl', icon: 'play', sort_order: 2, opens_new_tab: 1 },
    { id: 4, title: 'Skróć URL', url: '/url', icon: 'link', sort_order: 3, opens_new_tab: 0 },
    { id: 5, title: 'Royal Casino Bot', url: '/RoyalCasinoBot', icon: 'bot', sort_order: 4, opens_new_tab: 0 }
];

const preview = () => process.env.WOJTOTEKA_PREVIEW === '1';

export async function getSettings(): Promise<Record<string, string>> {
    if (preview()) return {};
    try {
        const rows = await select<{ key: string; value: string }>('SELECT `key`, `value` FROM site_settings');
        return Object.fromEntries(rows.map(row => [row.key, row.value]));
    } catch (error) {
        console.error('Error fetching site settings:', error);
        return {};
    }
}

export async function getActiveBioLinks(): Promise<BioLink[]> {
    if (preview()) return DEFAULT_BIO_LINKS;
    try {
        return await select<BioLink>(
            'SELECT id, title, url, icon, sort_order, opens_new_tab FROM bio_links WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
    } catch (error) {
        console.error('Error fetching bio links:', error);
        return [];
    }
}

/** Aktywne ogłoszenia dla danej strony (klucz jak w panelu, np. "index", "gry"). */
export async function getAnnouncementsFor(page: string): Promise<Announcement[]> {
    if (!page || preview()) return [];
    try {
        const rows = await select<Announcement & { pages: string }>(
            `SELECT id, title, message, type, display_type, pages, priority FROM announcements
             WHERE is_active = 1
               AND (starts_at IS NULL OR starts_at <= NOW())
               AND (ends_at IS NULL OR ends_at > NOW())
             ORDER BY priority DESC, created_at DESC`
        );
        return rows
            .filter(row => {
                try {
                    const pages = JSON.parse(row.pages || '[]') as unknown[];
                    return pages.includes(page) || pages.includes('all');
                } catch {
                    return false;
                }
            })
            .map(({ pages: _pages, ...rest }) => rest);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return [];
    }
}

export { ANNOUNCEMENT_PAGES } from '@/lib/announcement-pages';

/** Ścieżki liczone w statystykach odwiedzin. Nieznane ścieżki (skanery botów) są pomijane. */
export const TRACKED_PATHS = new Set([
    '/', '/gry', '/kontakt', '/api', '/polityka-nightdrive', '/polityka-fishingparty', '/polityka-prywatnosci',
    '/budowa', '/soon', '/status', '/url', '/file', '/4InaRow', '/dance', '/fishing', '/GloomCraft', '/Nightdrive',
    '/nightdrive', '/ropeclimber', '/trybka', '/glebina', '/blystka', '/hack', '/HiddenText', '/RoyalCasinoBot',
    '/RoyalCasinoBot/polityka', '/RoyalCasinoBot/regulamin', '/inne/ai', '/inne/litho', '/nonStopPop'
]);
