'use client';

import { Icon, resolveIcon } from '@/components/Icon';
import type { BioLink } from '@/lib/site';
import styles from './BioLinkRow.module.css';

function destination(url: string): string {
    if (url.startsWith('/')) return `wojtoteka.ovh${url.replace(/\/$/, '') || ''}`;
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function BioLinkRow({ link }: { link: BioLink }) {
    const newTab = !!link.opens_new_tab;

    function track() {
        const endpoint = `/api/bio-links/${link.id}/click`;
        // sendBeacon przeżywa przejście na inną stronę, zwykły fetch nie zawsze.
        if (!navigator.sendBeacon?.(endpoint)) {
            fetch(endpoint, { method: 'POST', keepalive: true }).catch(() => {});
        }
    }

    return (
        <a
            href={link.url}
            className={styles.row}
            onClick={track}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener' : undefined}
        >
            <Icon name={resolveIcon(link.icon)} size={30} className={styles.icon} />
            <span className={styles.title}>{link.title}</span>
            <span className={styles.dest}>
                {destination(link.url)}
                {newTab && <Icon name="external" size={16} title="otwiera się w nowej karcie" />}
            </span>
        </a>
    );
}
