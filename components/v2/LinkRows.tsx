'use client';

import { Icon, resolveIcon } from '@/components/Icon';
import type { BioLink } from '@/lib/site';
import styles from './LinkRows.module.css';

function destination(url: string): string {
    if (url.startsWith('/')) return `wojtoteka.ovh${url.replace(/\/$/, '') || ''}`;
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

function track(id: number) {
    const endpoint = `/api/bio-links/${id}/click`;
    // sendBeacon przeżywa przejście na inną stronę, zwykły fetch nie zawsze.
    if (!navigator.sendBeacon?.(endpoint)) {
        fetch(endpoint, { method: 'POST', keepalive: true }).catch(() => {});
    }
}

/** Linki ze strony głównej jako wielkie wiersze. Po najechaniu wiersz zalewa się żółtym od lewej. */
export function LinkRows({ links }: { links: BioLink[] }) {
    return (
        <ul role="list" className={styles.list}>
            {links.map((link, i) => {
                const newTab = !!link.opens_new_tab;
                return (
                    <li key={link.id}>
                        <a
                            href={link.url}
                            className={styles.row}
                            onClick={() => track(link.id)}
                            target={newTab ? '_blank' : undefined}
                            rel={newTab ? 'noopener' : undefined}
                        >
                            <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                            <Icon name={resolveIcon(link.icon)} size={26} className={styles.icon} />
                            <span className={styles.title}>{link.title}</span>
                            <span className={styles.dest}>
                                {destination(link.url)}
                                {newTab && <span className="sr-only"> (otwiera się w nowej karcie)</span>}
                            </span>
                            <span className={styles.arrow} aria-hidden="true">
                                {newTab ? '↗' : '→'}
                            </span>
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}
