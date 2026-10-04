import type { CSSProperties } from 'react';
import styles from './SystemPage.module.css';

/**
 * Strona przerwy (budowa, wkrótce) w nowym stylu: etykieta HUD, wielki kod
 * konturem z linią skanu, pod nim tekst i przyciski. Ten sam motyw co 503.
 */
export function SystemPage({
    code,
    label,
    title,
    children,
    actions
}: {
    code: string;
    label: string;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <div className={`wrap ${styles.page}`}>
            <p className="v2-label">
                <b>[{label}]</b> Wojtoteka
            </p>

            <p className={styles.code} aria-hidden="true" style={{ '--chars': code.length } as CSSProperties}>
                {code}
            </p>

            <div className={styles.copy}>
                <h1 className={styles.title}>{title}</h1>
                <div className={styles.text}>{children}</div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </div>
        </div>
    );
}
