import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import type { CSSProperties } from 'react';
import { Scramble } from '@/components/v2/Scramble';
import { SplitText } from '@/components/v2/SplitText';
import { ShortenerForm } from './ShortenerForm';
import styles from './url.module.css';

export const metadata: Metadata = pageMeta({
    title: 'Skracacz linków',
    description: 'Wklej długi adres i dostań krótki link na wojtoteka.ovh. Możesz ustawić, po jakim czasie link wygaśnie.',
    path: '/url',
    image: 'url',
});

export default function ShortenerPage() {
    return (
        <div className="wrap">
            <header className={styles.head}>
                <p className="v2-label">
                    <b>[SKRACACZ]</b>
                    <Scramble text="Długi adres, krótki link" delay={200} />
                </p>
                <h1 className={styles.title} aria-label="Skróć link">
                    <SplitText text="SKRÓĆ" />
                    <SplitText text="LINK" start={5} className={`v2-outline ${styles.titleSecond}`} />
                </h1>
                <p className={styles.lead}>Wklej długi adres, a dostaniesz krótki link w stylu wojtoteka.ovh/url/Ab12Cd. Bez konta i bez reklam.</p>
            </header>

            <div className={styles.split}>
                <section aria-label="Skracanie linku" className={styles.formCol} data-reveal>
                    <ShortenerForm />
                </section>

                <aside className={styles.aside} data-reveal style={{ '--rd': '150ms' } as CSSProperties}>
                    <div className={styles.example}>
                        <p className="v2-label">
                            <b>[ → ]</b> Tak wygląda krótki link
                        </p>
                        <p className={styles.exampleUrl} aria-label="wojtoteka.ovh/url/Ab12Cd">
                            <span>wojtoteka.ovh/url/</span>
                            <b>Ab12Cd</b>
                        </p>
                        <p className={styles.exampleNote}>Sześć znaków na końcu jest losowych. Po kliknięciu link od razu przenosi na Twój adres.</p>
                    </div>

                    <div className={styles.rules}>
                        <p className="v2-label">
                            <b>[ ? ]</b> Zanim skrócisz
                        </p>
                        <ol role="list" className={styles.notes}>
                            <li>
                                <h2 className={styles.noteTitle}>Ważność</h2>
                                <p>Bez wybranej daty link działa bez końca. Możesz też ustawić godzinę, dobę, 7 albo 30 dni.</p>
                            </li>
                            <li>
                                <h2 className={styles.noteTitle}>Ten sam adres dwa razy</h2>
                                <p>Jeśli ktoś już skrócił ten adres, dostaniesz istniejący link zamiast nowego.</p>
                            </li>
                            <li>
                                <h2 className={styles.noteTitle}>Czego nie skrócisz</h2>
                                <p>
                                    Adresów bez HTTPS, adresów lokalnych, samych adresów IP, linków z loginem i hasłem oraz domen z listy blokad (m.in.
                                    treści dla dorosłych).
                                </p>
                            </li>
                        </ol>
                    </div>
                </aside>
            </div>
        </div>
    );
}
