import type { SVGProps } from 'react';

// Ikony rysowane jedną linią 2 px z zaokrąglonymi końcami, w siatce 24x24.
// Kolor bierze się z currentColor, rozmiar z właściwości size.

const PATHS = {
    link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2',
    gamepad: 'M7 8h10a4 4 0 0 1 4 4v3.5a2.5 2.5 0 0 1-4.4 1.6L15 15.3H9l-1.6 1.8A2.5 2.5 0 0 1 3 15.5V12a4 4 0 0 1 4-4ZM8 10.5v3M6.5 12h3M15.5 11.2h.01M17.5 12.8h.01',
    mail: 'M3.5 6.5h17v11h-17zM4 7l8 6.5L20 7',
    play: 'M6 3.8v16.4a.8.8 0 0 0 1.2.7l13.4-8.2a.8.8 0 0 0 0-1.4L7.2 3.1a.8.8 0 0 0-1.2.7ZM6.3 4l9.4 9.3M6.3 20l9.4-9.3',
    bot: 'M12 4v3M6.5 7h11A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-7A2.5 2.5 0 0 1 6.5 7ZM9 12h.01M15 12h.01M9.5 16h5M2 12v3M22 12v3',
    chat: 'M4 5.5h16v10H10l-4.5 3.5v-3.5H4z',
    code: 'M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 5l-3 14',
    doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z',
    phone: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5ZM11 18h2',
    music: 'M9 18V5.5l11-2V16M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
    video: 'M3.5 6.5h12v11h-12zM15.5 10.5l5-3v9l-5-3',
    camera: 'M4 7.5h3.5L9 5h6l1.5 2.5H20v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    cart: 'M3 4h2.5l2.2 11h10.6L20.5 8H6.6M10 19.5h.01M17 19.5h.01',
    star: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
    gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1-2.5-4.5-3.5-5-1.5S9.5 7 12 7Zm0 0c1-2.5 4.5-3.5 5-1.5S14.5 7 12 7Z',
    download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15',
    upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 19.5h15',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5',
    key: 'M14.5 13.5a5 5 0 1 0-4-4L3.5 16.5v4h4v-2h2v-2h2l1.5-1.5M16 7.5h.01',
    chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M9.5 17h5',
    heart: 'M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.3c0 5.6-7.5 10-7.5 10Z',
    dice: 'M5 5h14v14H5zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01',
    external: 'M13.5 4.5h6v6M19.5 4.5 11 13M17 14v5.5H4.5V7H10',
    copy: 'M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4',
    check: 'm5 12.5 4.5 4.5L19 7.5',
    close: 'M6 6l12 12M18 6 6 18',
    trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5',
    refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
    logout: 'M14 4.5H5.5v15H14M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5',
    search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.3 15.3 20 20',
    eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    lock: 'M6 10.5h12v9.5H6zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
    unlock: 'M6 10.5h12v9.5H6zM8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2',
    memory: 'M3 7h18v8.5H3zM7 10v2.5M10.5 10v2.5M14 10v2.5M17.5 10v2.5M6 15.5V18M10 15.5V18M14 15.5V18M18 15.5V18',
    ban: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM6 6l12 12',
    megaphone: 'M4 10v4h3l8 4.5v-13L7 10zM18 9.5a3.5 3.5 0 0 1 0 5M7 14l1.5 5.5h2.5L10 15',
    file: 'M6 3h8l4 4v14H6zM14 3v4h4',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3',
    send: 'M20.5 3.5 10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4z',
    pencil: 'M15.5 4.5l4 4L8 20H4v-4zM13 7l4 4',
    plus: 'M12 5v14M5 12h14',
    inbox: 'M3.5 13.5 6 5h12l2.5 8.5v6h-17zM3.5 13.5h5l1.5 2.5h4l1.5-2.5h5',
    home: 'M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z',
    pause: 'M8.5 5v14M15.5 5v14',
    pixel: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'
} as const;

export type IconName = keyof typeof PATHS;

export function isIconName(value: string): value is IconName {
    return Object.prototype.hasOwnProperty.call(PATHS, value);
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

// Ikony, które można wybrać dla linku na stronie głównej (panel admina).
export const BIO_ICON_CHOICES: { name: IconName; label: string }[] = [
    { name: 'link', label: 'Link' },
    { name: 'gamepad', label: 'Gry' },
    { name: 'play', label: 'Sklep z aplikacjami' },
    { name: 'mail', label: 'Poczta' },
    { name: 'chat', label: 'Czat' },
    { name: 'bot', label: 'Bot' },
    { name: 'code', label: 'Kod' },
    { name: 'doc', label: 'Dokument' },
    { name: 'globe', label: 'Strona' },
    { name: 'phone', label: 'Telefon' },
    { name: 'music', label: 'Muzyka' },
    { name: 'video', label: 'Wideo' },
    { name: 'camera', label: 'Zdjęcia' },
    { name: 'cart', label: 'Sklep' },
    { name: 'download', label: 'Pobieranie' },
    { name: 'star', label: 'Gwiazdka' },
    { name: 'heart', label: 'Serce' },
    { name: 'trophy', label: 'Ranking' },
    { name: 'dice', label: 'Kości' },
    { name: 'gift', label: 'Prezent' },
    { name: 'user', label: 'Profil' },
    { name: 'chart', label: 'Statystyki' },
    { name: 'key', label: 'Klucz' },
    { name: 'megaphone', label: 'Ogłoszenie' }
];

// Starsze wpisy w bazie mają emoji zamiast nazwy ikony.
const EMOJI_TO_ICON: Record<string, IconName> = {
    '🔗': 'link', '🕹': 'gamepad', '🎮': 'gamepad', '👾': 'gamepad', '🎲': 'dice', '🃏': 'dice', '♟': 'dice', '🎰': 'dice',
    '📩': 'mail', '📧': 'mail', '✉': 'mail', '💌': 'mail', '📨': 'mail', '🤖': 'bot', '💬': 'chat', '📱': 'phone', '📲': 'phone',
    '🌐': 'globe', '💻': 'code', '🖥': 'code', '⌨': 'code', '📝': 'doc', '📖': 'doc', '📚': 'doc', '📋': 'doc', '📄': 'doc',
    '🎵': 'music', '🎧': 'music', '🎤': 'music', '🎼': 'music', '🎬': 'video', '📺': 'video', '📷': 'camera', '🛒': 'cart',
    '🛍': 'cart', '💳': 'cart', '💰': 'cart', '⭐': 'star', '🎯': 'star', '🚀': 'star', '🏆': 'trophy', '🥇': 'trophy',
    '🎖': 'trophy', '🎁': 'gift', '📦': 'download', '❤': 'heart', '📊': 'chart', '📈': 'chart', '🔑': 'key', '🔔': 'megaphone',
    '📢': 'megaphone', '👤': 'user', '💼': 'user'
};

/** Zamienia wartość z bazy (nazwa ikony albo stare emoji) na ikonę. */
export function resolveIcon(value: string | null | undefined): IconName {
    const raw = String(value || '').trim();
    if (isIconName(raw)) return raw;
    const emoji = raw.replace(/️/g, '');
    return EMOJI_TO_ICON[emoji] || 'link';
}

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
    name: IconName;
    size?: number;
    title?: string;
};

export function Icon({ name, size = 24, title, ...rest }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={title ? undefined : true}
            role={title ? 'img' : undefined}
            focusable="false"
            {...rest}
        >
            {title ? <title>{title}</title> : null}
            <path d={PATHS[name]} />
        </svg>
    );
}
