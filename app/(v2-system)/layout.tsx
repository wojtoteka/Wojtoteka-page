import { V2Shell } from '@/components/v2/V2Shell';
import styles from './system.module.css';

// Strona awarii w nowym stylu: bez menu, bo linki i tak prowadziłyby
// na strony, które teraz nie działają.
export default function V2SystemLayout({ children }: { children: React.ReactNode }) {
    const year = new Date().getFullYear();

    return (
        <V2Shell>
            <header className={`wrap ${styles.bar}`}>
                <img src="/img/logo.png" alt="" width={32} height={32} className={styles.logo} />
                <span className={styles.wordmark}>Wojtoteka</span>
            </header>
            <main id="tresc" className={styles.main} data-bare>
                {children}
            </main>
            <footer className={`wrap ${styles.footer}`}>
                <p>&copy; Wojtoteka 2024-{year}</p>
                <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>
            </footer>
        </V2Shell>
    );
}
