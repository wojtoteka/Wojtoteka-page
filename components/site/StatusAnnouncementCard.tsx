import styles from './StatusAnnouncementCard.module.css';

const LABELS = { info: 'Informacja', warning: 'Ostrzeżenie', important: 'Ważne' } as const;

export function StatusAnnouncementCard({ announcement, servers = [], id }: {
    announcement: { title: string; message: string; type: keyof typeof LABELS };
    /** Serwery, których dotyczy ogłoszenie; pusto = ogólne. */
    servers?: string[];
    id?: string;
}) {
    return (
        <article id={id} className={styles.card} data-type={announcement.type} aria-label={announcement.title || LABELS[announcement.type]}>
            <p className={styles.kind}>
                {LABELS[announcement.type]}
                {servers.length > 0 && (
                    <span className={styles.servers}>
                        <span className="sr-only">, dotyczy: </span>
                        {servers.map(name => <span key={name} className={styles.server}>{name}</span>)}
                    </span>
                )}
            </p>
            {announcement.title && <h2 className={styles.title}>{announcement.title}</h2>}
            <p className={styles.message}>{announcement.message}</p>
        </article>
    );
}
