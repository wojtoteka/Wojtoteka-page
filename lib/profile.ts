// Dane o autorze strony, przepisane z profilu na GitHubie (github.com/Wojtoteka).
// Strona główna, kontakt i stopka biorą je stąd, żeby nie rozjechały się między sobą.

export const PROFILES = {
    github: 'https://github.com/Wojtoteka',
    discord: 'https://discord.com/users/1328758394588500024',
    googlePlay: 'https://play.google.com/store/apps/developer?id=Wojtoteka'
};

/**
 * Technologie z sekcji "Rzeczy, których używam". Ikony to te same SVG,
 * które pokazuje profil na GitHubie (go-skill-icons), zapisane w public/img/stack,
 * bo CSP strony nie wpuszcza obrazków z innych domen.
 */
export const STACK = [
    { name: 'HTML', icon: 'html' },
    { name: 'CSS', icon: 'css' },
    { name: 'JavaScript', icon: 'js' },
    { name: 'TypeScript', icon: 'ts' },
    { name: 'Next.js', icon: 'nextjs' },
    { name: 'Node.js', icon: 'nodejs' },
    { name: 'MySQL', icon: 'mysql' },
    { name: 'MariaDB', icon: 'mariadb' },
    { name: 'Kotlin', icon: 'kotlin' },
    { name: 'Gradle', icon: 'gradle' },
    { name: 'Nginx', icon: 'nginx' },
    { name: 'Docker', icon: 'docker' },
    { name: 'Python', icon: 'py' }
];

export interface Project {
    name: string;
    repo: string;
    /** Krótki opis na podstawie opisu repozytorium na GitHubie. */
    about: string;
    tech: string[];
    /** Strona projektu: podstrona na wojtoteka.ovh albo osobny adres. */
    page?: { href: string; label: string };
}

/** Wybrane projekty przypięte na profilu GitHub, z opisami z repozytoriów. */
export const PROJECTS: Project[] = [
    {
        name: 'Fishing Party',
        repo: 'FishingParty_apk',
        about: 'Gra o łowieniu ryb na Androida.',
        tech: ['Android']
    },
    {
        name: 'Kajet',
        repo: 'kajet_apk',
        about: 'Notatnik na Androida do pisma odręcznego i notatek w Markdownie.',
        tech: ['Kotlin', 'Compose'],
        page: { href: 'https://kajet.wojtoteka.ovh/download', label: 'Pobierz' }
    },
    {
        name: 'RoyalCasino Bot',
        repo: 'discord-casino-bot',
        about: 'Bot kasynowy na Discorda z 17 grami, wirtualną ekonomią i rankingiem na żywo.',
        tech: ['TypeScript'],
        page: { href: '/RoyalCasinoBot', label: 'Strona bota' }
    },
    {
        name: 'Symulator Wsioka Kaucyjnego',
        repo: 'symulator-wsioka-kaucyjnego',
        about: 'Gra 3D o zbieraniu butelek na kaucję, zrobiona trochę dla żartu.',
        tech: ['Godot 4.3', 'GDScript']
    }
];

export const repoUrl = (repo: string) => `${PROFILES.github}/${repo}`;
