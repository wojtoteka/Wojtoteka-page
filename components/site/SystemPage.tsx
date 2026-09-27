import type { CSSProperties } from 'react';
import styles from './SystemPage.module.css';

/**
 * Strona błędu lub przerwy: tekst z lewej, z prawej numer jako pusty
 * kontur z odrobiną wody na dnie.
 * Ten sam motyw wody co w napisie na stronie głównej.
 */
export function SystemPage({
    code,
    title,
    children,
    actions
}: {
    code: string;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <div className={styles.system}>
            <div className={`wrap ${styles.inner}`}>
                <div className={styles.art} aria-hidden="true" style={{ '--chars': code.length } as CSSProperties}>
                    <p className={styles.code}>{code}</p>
                </div>

                <div className={styles.copy}>
                    <h1 className={`page-title ${styles.title}`}>{title}</h1>
                    <div className={styles.text}>{children}</div>
                    {actions && <div className={styles.actions}>{actions}</div>}
                </div>
            </div>
        </div>
    );
}
