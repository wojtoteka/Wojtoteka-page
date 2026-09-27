import type { Metadata } from 'next';
import { ShortenerForm } from './ShortenerForm';
import styles from './url.module.css';

export const metadata: Metadata = {
    title: 'Skracacz linków',
    description: 'Wklej długi adres i dostań krótki link na wojtoteka.ovh. Możesz ustawić, po jakim czasie link wygaśnie.',
    alternates: { canonical: '/url' }
};

export default function ShortenerPage() {
    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">Skracacz linków</h1>
                <p className="lead">Wklej długi adres, a dostaniesz krótki link w stylu wojtoteka.ovh/url/Ab12Cd.</p>
            </header>

            <ShortenerForm />

            <section className={styles.rules} aria-labelledby="zasady">
                <h2 id="zasady">Zanim skrócisz</h2>
                <dl className={styles.ruleList}>
                    <div>
                        <dt>Ważność</dt>
                        <dd>Bez wybranej daty link działa bez końca. Możesz też ustawić godzinę, dobę, 7 albo 30 dni.</dd>
                    </div>
                    <div>
                        <dt>Ten sam adres dwa razy</dt>
                        <dd>Jeśli ktoś już skrócił ten adres, dostaniesz istniejący link zamiast nowego.</dd>
                    </div>
                    <div>
                        <dt>Czego nie skrócisz</dt>
                        <dd>
                            Adresów bez HTTPS, adresów lokalnych, samych adresów IP, linków z loginem i hasłem oraz domen z listy blokad (m.in. treści
                            dla dorosłych).
                        </dd>
                    </div>
                    <div>
                        <dt>Limit</dt>
                        <dd>20 nowych linków na godzinę z jednego adresu IP.</dd>
                    </div>
                </dl>
            </section>
        </div>
    );
}
