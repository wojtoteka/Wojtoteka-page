import Link from 'next/link';
import styles from './Login.module.css';

/** Strona logowania: formularz po lewej, maskotka po prawej. */
export function LoginView({
    title,
    intro,
    expired,
    children
}: {
    title: string;
    intro: string;
    expired: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={styles.page}>
            <main className={styles.formSide}>
                <Link href="/" className={styles.brand}>
                    <img src="/img/logo.png" alt="" width={32} height={32} />
                    <span>Wojtoteka</span>
                </Link>

                <div className={styles.formWrap}>
                    <h1 className="page-title">{title}</h1>
                    <p className="muted">{intro}</p>
                    {expired && <p className="notice">Sesja wygasła albo została zamknięta. Zaloguj się ponownie.</p>}
                    {children}
                </div>

                <p className="muted small">Sesja kończy się po 30 minutach bez aktywności i wtedy, gdy zmieni się Twój adres IP lub przeglądarka.</p>
            </main>

            <div className={styles.artSide} aria-hidden="true">
                <figure className={`ink-frame ${styles.duck}`}>
                    <img src="/img/glogo.gif" alt="" width={220} height={220} />
                </figure>
            </div>
        </div>
    );
}
