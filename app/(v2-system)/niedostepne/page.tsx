import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { ReloadButton } from '@/components/site/ReloadButton';
import { RetryCountdown } from '@/components/v2/RetryCountdown';
import styles from './niedostepne.module.css';

export const metadata: Metadata = {
    title: 'Serwer chwilowo niedostępny',
    robots: { index: false, follow: false }
};

// Linie "dziennika" pojawiają się po kolei, jak w terminalu.
const LOG = [
    { text: '> łączenie z wojtoteka.ovh', state: 'ok' },
    { text: '> serwer nie odpowiada', state: 'err' },
    { text: '> kod odpowiedzi: 503', state: 'err' },
    { text: '> czekam na ponowną próbę', state: 'wait' }
];

export default function UnavailablePage() {
    return (
        <div className={`wrap ${styles.page}`}>
            <p className="v2-label">
                <b>[ERR 503]</b> Brak sygnału
            </p>

            <p className={styles.code} aria-hidden="true">
                503
            </p>

            <div className={styles.copy}>
                <h1 className={styles.title}>Serwer chwilowo nie odpowiada</h1>
                <p className={styles.text}>Serwer ma chwilowe problemy. Spróbuj ponownie za kilka minut.</p>
                <p className={styles.text}>
                    Jeśli problem wraca, napisz na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a> i podaj adres strony, na
                    której się pojawił.
                </p>
                <div className={styles.actions}>
                    <ReloadButton />
                    <a href="/" className="btn btn-ghost">
                        Strona główna
                    </a>
                </div>
                <RetryCountdown className={styles.retry} />
            </div>

            <ol role="list" className={styles.log} aria-label="Przebieg połączenia">
                {LOG.map((line, i) => (
                    <li key={line.text} data-state={line.state} style={{ '--i': i } as CSSProperties}>
                        {line.text}
                    </li>
                ))}
            </ol>
        </div>
    );
}
