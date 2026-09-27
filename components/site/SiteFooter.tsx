import Link from 'next/link';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={`wrap ${styles.grid}`}>
                <div className={styles.about}>
                    <p className={styles.name}>Wojtoteka</p>
                    <p className="muted">Gry w przeglądarce, aplikacje na Androida i bot na Discorda.</p>
                    <p>
                        <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>
                    </p>
                </div>

                <nav aria-label="Strony" className={styles.col}>
                    <h2 className={styles.colTitle}>Strony</h2>
                    <ul role="list">
                        <li><Link href="/gry">Gry</Link></li>
                        <li><Link href="/kontakt">Kontakt</Link></li>
                        <li><Link href="/url">Skracacz linków</Link></li>
                        <li><Link href="/status">Status usług</Link></li>
                    </ul>
                </nav>

                <nav aria-label="Projekty" className={styles.col}>
                    <h2 className={styles.colTitle}>Projekty</h2>
                    <ul role="list">
                        <li><Link href="/RoyalCasinoBot">RoyalCasino Bot</Link></li>
                        <li><Link href="/inne/litho">Litho Studio</Link></li>
                    </ul>
                </nav>

                <nav aria-label="Dla twórców stron" className={styles.col}>
                    <h2 className={styles.colTitle}>Formularz na Twoją stronę</h2>
                    <ul role="list">
                        <li><Link href="/api">Dokumentacja API</Link></li>
                        <li><Link href="/panel">Panel skrzynki</Link></li>
                    </ul>
                </nav>

                <nav aria-label="Dokumenty" className={styles.col}>
                    <h2 className={styles.colTitle}>Prywatność</h2>
                    <ul role="list">
                        <li><Link href="/polityka-prywatnosci">Polityka prywatności</Link></li>
                        <li><Link href="/polityka-nightdrive">Night Drive</Link></li>
                        <li><Link href="/polityka-fishingparty">Fishing Party</Link></li>
                        <li><Link href="/RoyalCasinoBot/polityka">RoyalCasino Bot</Link></li>
                    </ul>
                </nav>
            </div>

            <div className={`wrap ${styles.legal}`}>
                <p>&copy; Wojtoteka 2024-{year}</p>
            </div>
        </footer>
    );
}
