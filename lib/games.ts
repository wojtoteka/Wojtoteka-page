// Katalog gier. Kolory planszy (bg) i obrysu grafiki (frame) wzięte
// z grafik samych gier, więc każda plansza na /gry ma paletę swojej gry.
// Zrzuty ekranu są z prawdziwej rozgrywki, loga to ikony gier w jednym rozmiarze.

export interface Game {
    slug: string;
    title: string;
    href: string;
    platform: 'web' | 'android';
    /** Zrzut z rozgrywki (public/img/gry/ekrany), pokazywany na stronie głównej. */
    shot: { src: string; width: number; height: number };
    /** Logo gry, kwadrat 512 px (public/img/gry/loga), pokazywane na /gry. */
    logo: { src: string; alt: string; pixel?: boolean };
    bg: string;
    frame: string;
    /** Przechylenie grafiki w stopniach: każda leży trochę inaczej. */
    tilt: number;
}

export const GAMES: Game[] = [
    {
        slug: 'night-drive',
        title: 'Night Drive',
        href: '/Nightdrive/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/night-drive.webp', width: 1280, height: 620 },
        logo: { src: '/img/gry/loga/night-drive.webp', alt: 'Logo Night Drive: sportowe auto na tle miasta i pasiastego słońca' },
        bg: '#150d24',
        frame: '#ff7ad9',
        tilt: -2
    },
    {
        slug: 'night-drive-2',
        title: 'Night Drive 2.0',
        href: 'https://play.google.com/store/apps/details?id=wojtoteka.nightdrive&hl=pl',
        platform: 'android',
        shot: { src: '/img/gry/ekrany/night-drive-2.webp', width: 980, height: 612 },
        logo: { src: '/img/gry/loga/night-drive-2.webp', alt: 'Logo Night Drive 2.0: pasiaste słońce nad pustą autostradą w stylu lat 80.' },
        bg: '#1d1030',
        frame: '#ffc79a',
        tilt: 2.5
    },
    {
        slug: 'przerebel',
        title: 'Przerębel',
        href: '/przerebel/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/przerebel.webp', width: 1280, height: 720 },
        logo: { src: '/img/gry/loga/przerebel.webp', alt: 'Logo Przerębla: odręczny napis na ciemnym lodzie' },
        bg: '#0c1622',
        frame: '#66c2d4',
        tilt: -1.5
    },
    {
        slug: '4-in-a-row',
        title: '4 in a Row',
        href: '/4InaRow/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/4-in-a-row.webp', width: 1280, height: 720 },
        logo: { src: '/img/gry/loga/4-in-a-row.webp', alt: 'Logo 4 in a Row: czerwone i żółte żetony na niebieskiej planszy' },
        bg: '#171d33',
        frame: '#f7c531',
        tilt: -1
    },
    {
        slug: 'gloomcraft',
        title: 'GloomCraft',
        href: '/GloomCraft/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/gloomcraft.webp', width: 1152, height: 720 },
        logo: { src: '/img/gry/loga/gloomcraft.webp', alt: 'Logo GloomCraft: napis, zakapturzony mag i zielony szlam, pixel art', pixel: true },
        bg: '#10121c',
        frame: '#7ed957',
        tilt: 1.5
    },
    {
        slug: 'fishing-party',
        title: 'Fishing Party',
        href: '/fishing/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/fishing-party.webp', width: 1280, height: 720 },
        logo: { src: '/img/gry/loga/fishing-party.webp', alt: 'Logo Fishing Party: rybak w łódce i ryby, pixel art', pixel: true },
        bg: '#0a3a63',
        frame: '#f5b43c',
        tilt: -2.5
    },
    {
        slug: 'rope-climber',
        title: 'Rope Climber',
        href: '/ropeclimber/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/rope-climber.webp', width: 540, height: 720 },
        logo: { src: '/img/gry/loga/rope-climber.webp', alt: 'Logo Rope Climber: postać z hakiem przy drzewie, pixel art', pixel: true },
        bg: '#27416e',
        frame: '#a8dc8c',
        tilt: 2
    },
    {
        slug: 'trybka',
        title: 'Trybka i Ogród Rdzy',
        href: '/trybka/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/trybka.webp', width: 768, height: 480 },
        logo: { src: '/img/gry/loga/trybka.webp', alt: 'Logo Trybki i Ogrodu Rdzy: mała postać z listkiem na głowie przed wielkim trybem' },
        bg: '#2a2018',
        frame: '#e8d7b5',
        tilt: -3
    },
    {
        slug: 'ostatni-oddech',
        title: 'Ostatni Oddech',
        href: '/glebina/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/ostatni-oddech.webp', width: 1280, height: 720 },
        logo: { src: '/img/gry/loga/ostatni-oddech.webp', alt: 'Logo Ostatniego Oddechu: pomarańczowa łódź podwodna z reflektorem w głębinie' },
        bg: '#062536',
        frame: '#f2a93b',
        tilt: 3
    },
    {
        slug: 'blystka',
        title: 'Błystka i Morze Atramentu',
        href: '/blystka/',
        platform: 'web',
        shot: { src: '/img/gry/ekrany/blystka.webp', width: 1280, height: 720 },
        logo: { src: '/img/gry/loga/blystka.webp', alt: 'Logo Błystki i Morza Atramentu: rybak w łódce z wędką' },
        bg: '#153a37',
        frame: '#e9dfc7',
        tilt: -1.5
    }
];

export const WEB_GAMES = GAMES.filter(g => g.platform === 'web').length;
export const ANDROID_GAMES = GAMES.filter(g => g.platform === 'android').length;
