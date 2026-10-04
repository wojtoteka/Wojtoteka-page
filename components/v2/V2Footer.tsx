import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getGithubStats } from '@/lib/github';
import { plural } from '@/lib/plural';
import { PROFILES } from '@/lib/profile';
import { Marquee } from './Marquee';
import styles from './V2Footer.module.css';

interface Tick {
    /** Liczba wyróżniona na żółto przed tekstem. */
    n?: number | string;
    text: string;
}

/**
 * Pas nad stopką: na zmianę to, czym się zajmuję, i liczby z GitHuba.
 */
async function ticker(): Promise<Tick[]> {
    const gh = await getGithubStats();
    const [first, second] = gh.languages;
    const ticks: Tick[] = [
        { text: 'Strony internetowe' },
        { n: gh.contributions, text: `${plural(gh.contributions, ['kontrybucja', 'kontrybucje', 'kontrybucji'])} na GitHubie w ostatnim roku` },
        { text: 'Gry w przeglądarce' },
        { n: gh.repos, text: plural(gh.repos, ['publiczne repozytorium', 'publiczne repozytoria', 'publicznych repozytoriów']) },
        { text: 'Front-end i back-end' },
        { text: 'Boty na Discorda' },
        { text: 'Formularz kontaktowy przez API' },
        { text: 'Aplikacje na Androida' }
    ];
    if (first && second) ticks.push({ text: `Najczęściej ${first.name} i ${second.name}` });
    if (gh.bestDay) ticks.push({ n: gh.bestDay.count, text: `${plural(gh.bestDay.count, ['kontrybucja', 'kontrybucje', 'kontrybucji'])} jednego dnia` });
    if (gh.longestStreak > 1) ticks.push({ n: gh.longestStreak, text: 'dni programowania z rzędu' });
    ticks.push({ text: `Na GitHubie od ${gh.since}` });
    return ticks;
}

const COLUMNS = [
    {
        title: 'Strony',
        links: [
            { href: '/gry', label: 'Gry' },
            { href: '/kontakt', label: 'Kontakt' },
            { href: '/url', label: 'Skracacz linków' },
            { href: '/status', label: 'Status usług' }
        ]
    },
    {
        title: 'Projekty',
        links: [
            { href: '/RoyalCasinoBot', label: 'RoyalCasino Bot' },
            { href: '/inne/litho', label: 'Litho Studio' },
            { href: 'https://kajet.wojtoteka.ovh', label: 'Kajet', external: true },
            { href: 'https://rivox.wojtoteka.ovh/', label: 'Rivox', external: true }
        ]
    },
    {
        title: 'Znajdziesz mnie',
        links: [
            { href: PROFILES.github, label: 'GitHub', external: true, newTab: true },
            { href: PROFILES.discord, label: 'Discord', external: true, newTab: true },
            { href: PROFILES.googlePlay, label: 'Google Play', external: true, newTab: true }
        ]
    },
    {
        title: 'Formularz na Twoją stronę',
        links: [
            { href: '/api', label: 'Dokumentacja API' },
            { href: '/panel', label: 'Panel skrzynki' }
        ]
    },
    {
        title: 'Dokumenty',
        links: [
            { href: '/regulamin', label: 'Regulamin' },
            { href: '/polityka-prywatnosci', label: 'Polityka prywatności' },
            { href: '/polityka-nightdrive', label: 'Night Drive' },
            { href: '/polityka-fishingparty', label: 'Fishing Party' },
            { href: '/RoyalCasinoBot/polityka', label: 'RoyalCasino Bot' }
        ]
    }
];

export async function V2Footer() {
    const year = new Date().getFullYear();
    const ticks = await ticker();

    return (
        <footer className={styles.footer}>
            <Marquee className={styles.ticker} time={70} reverse pauseOnHover>
                {ticks.map(tick => (
                    <span key={tick.text} className={styles.tick}>
                        <span className={styles.slash}>//</span> {tick.n !== undefined && <b className={styles.tickNum}>{tick.n}</b>} {tick.text}
                    </span>
                ))}
            </Marquee>

            <div className={`wrap ${styles.top}`}>
                <div className={styles.ask}>
                    <p className="v2-label">
                        <b>[ / ]</b> Kontakt
                    </p>
                    <p className={styles.askTitle}>Masz pytanie albo pomysł na współpracę?</p>
                    <a className={styles.mail} href="mailto:kontakt@wojtoteka.ovh">
                        kontakt@wojtoteka.ovh
                    </a>
                </div>

                <div className={styles.cols}>
                    {COLUMNS.map(column => (
                        <nav key={column.title} aria-label={column.title} className={styles.col}>
                            <h2 className={styles.colTitle}>{column.title}</h2>
                            <ul role="list">
                                {column.links.map(link => (
                                    <li key={link.href}>
                                        {'newTab' in link ? (
                                            <a href={link.href} target="_blank" rel="noopener">
                                                {link.label}
                                                <span className="sr-only"> (otwiera się w nowej karcie)</span>
                                            </a>
                                        ) : 'external' in link ? (
                                            <a href={link.href}>{link.label}</a>
                                        ) : (
                                            <Link href={link.href}>{link.label}</Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>
            </div>

            {/* Wielki napis na dole: każda litera podskakuje po najechaniu. */}
            <p className={styles.giant} aria-hidden="true">
                {Array.from('WOJTOTEKA').map((char, i) => (
                    <span key={i} style={{ '--i': i } as CSSProperties}>
                        {char}
                    </span>
                ))}
            </p>

            <div className={`wrap ${styles.legal}`}>
                <p>&copy; Wojtoteka 2024-{year}</p>
                <a href="#" className={styles.up}>
                    Do góry <span aria-hidden="true">↑</span>
                </a>
            </div>
        </footer>
    );
}
