// Katalog gier. Kolory planszy (bg) i obrysu grafiki (frame) wzięte
// z grafik samych gier, więc każda plansza na /gry ma paletę swojej gry.

export interface Game {
    slug: string;
    title: string;
    href: string;
    platform: 'web' | 'android';
    /** focus: który fragment grafiki zostaje po przycięciu do 16:9 (object-position). */
    art: { src: string; width: number; height: number; alt: string; pixel?: boolean; focus?: string };
    /** Co przedstawia grafika (podpis pod obrazkiem na /gry). */
    caption: string;
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
        art: { src: '/Nightdrive/sprites/poster.png', width: 538, height: 303, alt: 'Night Drive: druciane samochody i złote monety na neonowej drodze nocą' },
        caption: 'Zrzut z rozgrywki',
        bg: '#150d24',
        frame: '#ff7ad9',
        tilt: -2
    },
    {
        slug: 'night-drive-2',
        title: 'Night Drive 2.0',
        href: 'https://play.google.com/store/apps/details?id=wojtoteka.nightdrive&hl=pl',
        platform: 'android',
        art: { src: '/img/nightdrive2.png', width: 1024, height: 1024, alt: 'Night Drive 2.0: pasiaste słońce nad pustą autostradą w stylu lat 80.' },
        caption: 'Ikona aplikacji',
        bg: '#1d1030',
        frame: '#ffc79a',
        tilt: 2.5
    },
    {
        slug: '4-in-a-row',
        title: '4 in a Row',
        href: '/4InaRow/',
        platform: 'web',
        art: { src: '/4InaRow/sprites/poster.png', width: 1280, height: 720, alt: '4 in a Row: niebieska plansza z czerwonymi i żółtymi żetonami, obok liczniki wygranych dwóch botów' },
        caption: 'Zrzut z rozgrywki',
        bg: '#171d33',
        frame: '#f7c531',
        tilt: -1
    },
    {
        slug: 'gloomcraft',
        title: 'GloomCraft',
        href: '/GloomCraft/',
        platform: 'web',
        art: { src: '/GloomCraft/sprites/poster.png', width: 1643, height: 1316, alt: 'GloomCraft: zakapturzony mag i zielony szlam w kamiennym lochu, pixel art', pixel: true, focus: '50% 100%' },
        caption: 'Plakat gry',
        bg: '#10121c',
        frame: '#7ed957',
        tilt: 1.5
    },
    {
        slug: 'fishing-party',
        title: 'Fishing Party',
        href: '/fishing/',
        platform: 'web',
        art: { src: '/fishing/sprites/poster.png', width: 640, height: 360, alt: 'Fishing Party: łódka wśród skał, ryb i piranii przy piaszczystym brzegu, pixel art', pixel: true },
        caption: 'Zrzut z rozgrywki',
        bg: '#0a3a63',
        frame: '#f5b43c',
        tilt: -2.5
    },
    {
        slug: 'rope-climber',
        title: 'Rope Climber',
        href: '/ropeclimber/',
        platform: 'web',
        art: { src: '/ropeclimber/sprites/poster.png', width: 640, height: 360, alt: 'Rope Climber: postać na linie między wysokimi drzewami na tle nieba, pixel art', pixel: true },
        caption: 'Zrzut z rozgrywki',
        bg: '#27416e',
        frame: '#a8dc8c',
        tilt: 2
    },
    {
        slug: 'trybka',
        title: 'Trybka i Ogród Rdzy',
        href: '/trybka/',
        platform: 'web',
        art: { src: '/trybka/okladka.png', width: 512, height: 512, alt: 'Trybka i Ogród Rdzy: mała postać z listkiem na głowie przed wielkim trybem' },
        caption: 'Okładka',
        bg: '#2a2018',
        frame: '#e8d7b5',
        tilt: -3
    },
    {
        slug: 'ostatni-oddech',
        title: 'Ostatni Oddech',
        href: '/glebina/',
        platform: 'web',
        art: { src: '/glebina/logo.png', width: 1024, height: 1024, alt: 'Ostatni Oddech: pomarańczowa łódź podwodna z reflektorem w głębinie' },
        caption: 'Okładka',
        bg: '#062536',
        frame: '#f2a93b',
        tilt: 3
    },
    {
        slug: 'blystka',
        title: 'Błystka i Morze Atramentu',
        href: '/blystka/',
        platform: 'web',
        art: { src: '/blystka/logo_512.png', width: 512, height: 512, alt: 'Błystka i Morze Atramentu: rybak w łódce z wędką, pod wodą świecąca przynęta' },
        caption: 'Okładka',
        bg: '#153a37',
        frame: '#e9dfc7',
        tilt: -1.5
    }
];

export const WEB_GAMES = GAMES.filter(g => g.platform === 'web').length;
export const ANDROID_GAMES = GAMES.filter(g => g.platform === 'android').length;
