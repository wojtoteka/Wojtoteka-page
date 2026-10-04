import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { PROFILES } from '@/lib/profile';
import { Scramble } from '@/components/v2/Scramble';
import { SplitText } from '@/components/v2/SplitText';
import { ContactForm } from './ContactForm';
import styles from './kontakt.module.css';

export const metadata: Metadata = pageMeta({
    title: 'Kontakt',
    description: 'Napisz do Wojtoteka przez formularz albo na kontakt@wojtoteka.ovh. Odpowiedź przychodzi na adres email, który podasz.',
    path: '/kontakt',
    image: 'kontakt',
});

// Klucz strony hCaptcha jest publiczny. Zmienna z .env ma pierwszeństwo,
// a wartość zapasowa to klucz, którego strona używała dotąd.
const HCAPTCHA_SITE_KEY = process.env.HCAPTCHA_SITE_KEY || 'db90b3e2-841e-418a-b3ce-d33a319256d2';

const EMAIL = 'kontakt@wojtoteka.ovh';

export default function ContactPage() {
    return (
        <div className="wrap">
            <header className={styles.head}>
                <p className="v2-label">
                    <b>[KONTAKT]</b>
                    <Scramble text="Kanał otwarty" delay={200} />
                </p>
                <h1 className={styles.title} aria-label="Napisz do mnie">
                    <SplitText text="NAPISZ" />
                    <SplitText text="DO MNIE" start={6} className={`v2-outline ${styles.titleSecond}`} />
                </h1>
                <p className={styles.lead}>Napisz, o co chodzi. Odpowiem na adres email, który podasz w formularzu.</p>
            </header>

            <div className={styles.split}>
                <section aria-label="Formularz kontaktowy" className={styles.formCol} data-reveal>
                    <ContactForm siteKey={HCAPTCHA_SITE_KEY} />
                </section>

                <aside className={styles.aside} data-reveal style={{ '--rd': '150ms' } as CSSProperties}>
                    <div className={styles.mailBox}>
                        <p className="v2-label">
                            <b>[ @ ]</b> Wolisz zwykłego maila?
                        </p>
                        <a className={styles.mail} href={`mailto:${EMAIL}`}>
                            {EMAIL}
                        </a>
                        <CopyButton text={EMAIL} label="Kopiuj adres" className="btn btn-ghost btn-sm" />
                    </div>

                    <div className={styles.channels}>
                        <p className="v2-label">
                            <b>[ + ]</b> Inne kanały
                        </p>
                        <ul role="list">
                            <li>
                                <a href={PROFILES.discord} target="_blank" rel="noopener">
                                    <span>Discord</span>
                                    <span aria-hidden="true">↗</span>
                                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                                </a>
                            </li>
                            <li>
                                <a href={PROFILES.github} target="_blank" rel="noopener">
                                    <span>GitHub</span>
                                    <span aria-hidden="true">↗</span>
                                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                                </a>
                            </li>
                            <li>
                                <a href={PROFILES.googlePlay} target="_blank" rel="noopener">
                                    <span>Google Play</span>
                                    <span aria-hidden="true">↗</span>
                                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <ol role="list" className={styles.notes}>
                        <li>
                            <h2 className={styles.noteTitle}>Co dzieje się z wiadomością</h2>
                            <p>
                                Trafia do mojej skrzynki, a ja dostaję o niej powiadomienie. Twojego adresu używam tylko po to, żeby odpisać.
                                Szczegóły są w <Link href="/polityka-prywatnosci">polityce prywatności</Link>.
                            </p>
                        </li>
                        <li>
                            <h2 className={styles.noteTitle}>Masz własną stronę?</h2>
                            <p>
                                Taki sam formularz możesz wstawić u siebie. Wiadomości przyjdą do Twojego panelu.{' '}
                                <Link href="/api">Zobacz dokumentację API</Link>.
                            </p>
                        </li>
                    </ol>
                </aside>
            </div>
        </div>
    );
}
