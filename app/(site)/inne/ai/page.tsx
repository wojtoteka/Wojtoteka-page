import type { Metadata } from 'next';
import styles from './ai.module.css';

export const metadata: Metadata = {
    title: 'Porównanie AI: ChatGPT, Claude i Gemini',
    description: 'Cztery modele AI dostały to samo polecenie: zrobić stronę serwera Minecraft. Zobacz, co zrobił każdy z nich.',
    alternates: { canonical: '/inne/ai' }
};

const RESULTS = [
    { model: 'ChatGPT 5.1', dir: 'gpt5.1', winner: true },
    { model: 'ChatGPT 5.1 Codex', dir: 'gpt5.1codex', winner: false },
    { model: 'Claude Sonnet 4.5', dir: 'Sonnet4.5', winner: false },
    { model: 'Gemini 2.5 Pro', dir: '2.5pro', winner: false }
];

export default function AiComparePage() {
    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">Porównanie AI</h1>
                <p className="lead">Poprosiłem różne modele AI o stworzenie strony internetowej. Każdy dostał to samo polecenie.</p>
                <p className="muted">Wyniki są zaskakujące. Kliknij zrzut, żeby otworzyć stronę dokładnie taką, jaką zrobił model.</p>
            </header>

            <ol role="list" className={styles.results}>
                {RESULTS.map(result => (
                    <li key={result.dir} className={result.winner ? styles.winner : undefined}>
                        <a href={`/inne/${result.dir}/`} className={styles.result}>
                            <span className={`ink-frame ${styles.shot}`}>
                                <img
                                    src={`/img/ai/${result.dir}.webp`}
                                    alt={`Strona zrobiona przez ${result.model}, widok pierwszego ekranu`}
                                    width={1280}
                                    height={800}
                                    loading="lazy"
                                />
                            </span>
                            <span className={styles.label}>
                                <span className={styles.model}>{result.model}</span>
                                {result.winner ? <span className={styles.badge}>Zwycięzca</span> : <span className="muted">Zobacz wynik</span>}
                            </span>
                        </a>
                    </li>
                ))}
            </ol>
        </div>
    );
}
