import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PROFILES } from '@/lib/profile';
import { Marquee } from './Marquee';
import styles from './V2Footer.module.css';

const TICKER = ['Strony internetowe', 'Front-end i back-end', 'Projekty na GitHubie', 'Formularz kontaktowy przez API', 'Gry w przeglądarce', 'Bot na Discorda'];

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
            { href: 'https://kajet.wojtoteka.ovh/download', label: 'Kajet', external: true },
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
        title: 'Prywatność',
        links: [
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
            <Marquee className={styles.ticker} time={36}>
                {TICKER.map(item => (
                    <span key={item} className={styles.tick}>
                        <span className={styles.slash}>//</span> {item}
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
