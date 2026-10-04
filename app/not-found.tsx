import type { Metadata } from 'next';
import Link from 'next/link';
import { RequestedPath } from '@/components/v2/RequestedPath';
import { Scramble } from '@/components/v2/Scramble';
import { StatusPill } from '@/components/v2/StatusPill';
import { V2Footer } from '@/components/v2/V2Footer';
import { V2Header } from '@/components/v2/V2Header';
import { V2Shell } from '@/components/v2/V2Shell';
import styles from './not-found.module.css';

export const metadata: Metadata = {
    title: 'Nie ma takiej strony',
    robots: { index: false, follow: false }
};

const WAYS = [
    { href: '/', label: 'Strona główna', note: 'Wszystkie linki' },
    { href: '/gry', label: 'Gry', note: 'Zagraj w przeglądarce' },
    { href: '/kontakt', label: 'Kontakt', note: 'Zgłoś zepsuty link' }
];

export default function NotFound() {
    return (
        <V2Shell>
            <V2Header />
            <main id="tresc">
                <div className={`wrap ${styles.page}`}>
                    <p className="v2-label">
                        <b>[ERR 404]</b> Adres nie istnieje
                    </p>

                    <p className={styles.code} data-text="404" aria-hidden="true">
                        404
                    </p>

                    <div className={styles.copy}>
                        <h1 className={styles.title}>
                            <Scramble text="Tej strony tu nie ma" delay={250} duration={900} />
                        </h1>
                        <p className={styles.path}>
                            <span className={styles.prompt}>&gt; GET</span> <RequestedPath />
                            <span className={styles.caret} aria-hidden="true" />
                        </p>
                        <p className={styles.text}>
                            Adres mógł się zmienić albo link ma literówkę. Skrócone linki i udostępnione pliki mogą też wygasnąć.
                        </p>
                    </div>

                    <nav aria-label="Gdzie dalej" className={styles.ways}>
                        <p className="v2-label">
                            <b>[ → ]</b> Gdzie dalej
                        </p>
                        <ul role="list">
                            {WAYS.map((way, i) => (
                                <li key={way.href}>
                                    <Link href={way.href} className={styles.way}>
                                        <span className={styles.wayNum}>0{i + 1}</span>
                                        <span className={styles.wayLabel}>{way.label}</span>
                                        <span className={styles.wayNote}>{way.note}</span>
                                        <span aria-hidden="true">→</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </main>
            <V2Footer />
            <StatusPill />
        </V2Shell>
    );
}
