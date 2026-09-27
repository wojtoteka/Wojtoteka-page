import styles from './Docs.module.css';

export interface TocItem {
    id: string;
    label: string;
}

/** Dokument z bocznym spisem treści (API, polityki prywatności). */
export function DocsLayout({ toc, tocLabel, children }: { toc: TocItem[]; tocLabel: string; children: React.ReactNode }) {
    return (
        <div className={styles.layout}>
            <nav className={styles.toc} aria-label={tocLabel}>
                <p className={styles.tocTitle}>{tocLabel}</p>
                <ol role="list">
                    {toc.map(item => (
                        <li key={item.id}>
                            <a href={`#${item.id}`}>{item.label}</a>
                        </li>
                    ))}
                </ol>
            </nav>
            <div className={`prose ${styles.body}`}>{children}</div>
        </div>
    );
}
