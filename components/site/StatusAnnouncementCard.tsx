import styles from './StatusAnnouncementCard.module.css';

const LABELS = { info: 'Informacja', warning: 'Ostrzeżenie', important: 'Ważne' } as const;

export function StatusAnnouncementCard({ announcement }: {
    announcement: { title: string; message: string; type: keyof typeof LABELS };
}) {
    return (
        <article className={styles.card} data-type={announcement.type} aria-label={announcement.title || LABELS[announcement.type]}>
            <p className={styles.kind}>{LABELS[announcement.type]}</p>
            {announcement.title && <h2 className={styles.title}>{announcement.title}</h2>}
            <p className={styles.message}>{announcement.message}</p>
        </article>
    );
}
