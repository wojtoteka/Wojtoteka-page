import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from './ContactForm';
import styles from './kontakt.module.css';

export const metadata: Metadata = {
    title: 'Kontakt',
    description: 'Napisz do Wojtoteka przez formularz albo na kontakt@wojtoteka.ovh. Odpowiedź przychodzi na adres email, który podasz.',
    alternates: { canonical: '/kontakt' }
};

// Klucz strony hCaptcha jest publiczny. Zmienna z .env ma pierwszeństwo,
// a wartość zapasowa to klucz, którego strona używała dotąd.
const HCAPTCHA_SITE_KEY = process.env.HCAPTCHA_SITE_KEY || 'db90b3e2-841e-418a-b3ce-d33a319256d2';

export default function ContactPage() {
    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">Kontakt</h1>
                <p className="lead">Napisz, o co chodzi. Odpowiem na adres email, który podasz w formularzu.</p>
            </header>

            <div className={styles.split}>
                <section aria-label="Formularz kontaktowy">
                    <ContactForm siteKey={HCAPTCHA_SITE_KEY} />
                </section>

                <aside className={styles.aside}>
                    <div>
                        <h2 className={styles.asideTitle}>Wolisz zwykłego maila?</h2>
                        <a className={styles.mail} href="mailto:kontakt@wojtoteka.ovh">
                            kontakt@wojtoteka.ovh
                        </a>
                    </div>

                    <div>
                        <h2 className={styles.asideTitle}>Co dzieje się z wiadomością</h2>
                        <p className="muted">
                            Trafia do mojej skrzynki, a ja dostaję o niej powiadomienie. Twojego adresu używam tylko po to, żeby odpisać.
                            Szczegóły są w <Link href="/polityka-prywatnosci">polityce prywatności</Link>.
                        </p>
                    </div>

                    <div>
                        <h2 className={styles.asideTitle}>Masz własną stronę?</h2>
                        <p className="muted">
                            Taki sam formularz możesz wstawić u siebie. Wiadomości przyjdą do Twojego panelu.{' '}
                            <Link href="/api">Zobacz dokumentację API</Link>.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
