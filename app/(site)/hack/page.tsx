import type { Metadata } from 'next';
import styles from './hack.module.css';

export const metadata: Metadata = {
    title: 'Hack: skrypty Tampermonkey',
    description: 'Skrypty userscript do Blooket i Quizizz dla dodatku Tampermonkey.',
    alternates: { canonical: '/hack' }
};

const SCRIPTS = [
    { name: 'Blooket Z-Client', text: 'Zaawansowany klient do Blooket', file: 'z-client.js', tag: 'Beta' },
    { name: 'Blooket Classic', text: 'Klasyczny skrypt do Blooket', file: 'vblooket.js', tag: 'Legacy' },
    { name: 'Quizizz', text: 'Skrypt do platformy Quizizz', file: 'quiz.js', tag: 'Legacy' },
    { name: 'Wstawiacz kurwa', text: 'Bo czemu kurwa nie', file: 'kurwa.js', tag: 'Fun' }
];

export default function HackPage() {
    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">Wojtoteka Hack</h1>
                <p className="lead">
                    Skrypty userscript (kod, który dodatek do przeglądarki uruchamia na wybranej stronie). Kliknij nazwę, żeby otworzyć plik skryptu.
                </p>
            </header>

            <div className={styles.layout}>
                <section aria-labelledby="skrypty">
                    <h2 id="skrypty" className="sr-only">
                        Skrypty
                    </h2>
                    <ul role="list" className={styles.scripts}>
                        {SCRIPTS.map(script => (
                            <li key={script.file}>
                                <a href={`/hack/${script.file}`} className={styles.script}>
                                    <span className={styles.name}>{script.name}</span>
                                    <span className={styles.tag} data-tag={script.tag.toLowerCase()}>
                                        {script.tag}
                                    </span>
                                    <span className={styles.text}>{script.text}</span>
                                    <code className={styles.file}>{script.file}</code>
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>

                <aside className={styles.needs} aria-labelledby="potrzebne">
                    <h2 id="potrzebne">Co jest potrzebne</h2>
                    <p>
                        Na komputerze: dodatek <a href="https://www.tampermonkey.net/" target="_blank" rel="noopener">Tampermonkey</a>.
                    </p>
                    <p>
                        Na Androidzie: przeglądarka z obsługą dodatków, na przykład{' '}
                        <a href="https://github.com/kiwibrowser/src.next/releases" target="_blank" rel="noopener">
                            Kiwi Browser
                        </a>
                        .
                    </p>
                </aside>
            </div>
        </div>
    );
}
