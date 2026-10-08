import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PROFILES } from '@/lib/profile';
import { Marquee } from './Marquee';
import styles from './V2Footer.module.css';

/** Pas nad stopką: hasła o tym, czym się zajmuję. */
const TICKS = [
    'Strony internetowe',
    'Gry w przeglądarce',
    'Front-end i back-end',
    'Boty na Discorda',
    'Formularz kontaktowy przez API',
    'Aplikacje na Androida',
    'Na GitHubie od 2023'
];

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
            { href: 'https://github.com/wojtoteka/FishingParty_apk', label: 'Fishing Party', external: true, newTab: true },
            { href: 'https://kajet.wojtoteka.ovh', label: 'Kajet', external: true }
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
        title: 'API',
        links: [
            { href: '/api', label: 'API formularza' },
            { href: '/api/status', label: 'API Status' },
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

export function V2Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <Marquee className={styles.ticker} time={70} reverse pauseOnHover>
                {TICKS.map(text => (
                    <span key={text} className={styles.tick}>
                        <span className={styles.slash}>//</span> {text}
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
