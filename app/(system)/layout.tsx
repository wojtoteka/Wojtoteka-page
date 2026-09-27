import styles from './system.module.css';

// Strony przerwy (budowa, wkrótce, niedostępne): bez menu, bo linki
// i tak prowadziłyby na stronę, która teraz nie działa.
export default function SystemLayout({ children }: { children: React.ReactNode }) {
    const year = new Date().getFullYear();

    return (
        <>
            <header className={`wrap ${styles.bar}`}>
                <img src="/img/logo.png" alt="" width={36} height={36} className={styles.logo} />
                <span className={styles.wordmark}>Wojtoteka</span>
            </header>
            <main id="tresc">{children}</main>
            <footer className={`wrap ${styles.footer}`}>
                <p>&copy; Wojtoteka 2024-{year}</p>
                <p>
                    <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>
                </p>
            </footer>
        </>
    );
}
