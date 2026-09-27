'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';
import styles from './Announcements.module.css';

interface Announcement {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'important';
    display_type: 'banner' | 'popup';
}

const STORAGE_KEY = 'ann_dismissed_v1';

const TYPE: Record<Announcement['type'], { label: string; icon: IconName }> = {
    info: { label: 'Informacja', icon: 'megaphone' },
    warning: { label: 'Uwaga', icon: 'megaphone' },
    important: { label: 'Ważne', icon: 'megaphone' }
};

function readDismissed(): string[] {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function rememberDismissed(key: string): void {
    try {
        const list = readDismissed();
        if (!list.includes(key)) sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...list, key]));
    } catch {
        // prywatne okno albo zablokowane dane strony: popup po prostu wróci
    }
}

/** Klucz strony zgodny z panelem ogłoszeń ("/" to "index", "/gry" to "gry"). */
function pageKey(pathname: string): string {
    const key = pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').replace(/\/index$/, '');
    return key || 'index';
}

export function Announcements() {
    const pathname = usePathname();
    const [items, setItems] = useState<Announcement[]>([]);
    const [popup, setPopup] = useState<Announcement | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const controller = new AbortController();
        setItems([]);
        setPopup(null);
        fetch(`/api/announcements?page=${encodeURIComponent(pageKey(pathname))}`, { signal: controller.signal })
            .then(r => (r.ok ? r.json() : { announcements: [] }))
            .then((data: { announcements?: Announcement[] }) => {
                const list = data.announcements || [];
                setItems(list.filter(a => a.display_type === 'banner'));
                const dismissed = readDismissed();
                const next = list.find(a => a.display_type === 'popup' && !dismissed.includes(`p_${a.id}`));
                if (next) window.setTimeout(() => setPopup(next), 700);
            })
            .catch(() => {});
        return () => controller.abort();
    }, [pathname]);

    useEffect(() => {
        if (popup && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    }, [popup]);

    function closePopup() {
        if (popup) rememberDismissed(`p_${popup.id}`);
        dialogRef.current?.close();
        setPopup(null);
    }

    return (
        <>
            {items.length > 0 && (
                <div className={styles.banners} role="region" aria-label="Ogłoszenia">
                    {items.map(item => (
                        <p key={item.id} className={`${styles.banner} ${styles[item.type]}`}>
                            <Icon name={TYPE[item.type].icon} size={18} className={styles.bannerIcon} />
                            <strong>{item.title}.</strong> <span>{item.message}</span>
                        </p>
                    ))}
                </div>
            )}

            {popup && (
                <dialog
                    ref={dialogRef}
                    className={`${styles.dialog} ${styles[popup.type]}`}
                    aria-labelledby={`ann-${popup.id}`}
                    onCancel={closePopup}
                    onClick={event => {
                        if (event.target === dialogRef.current) closePopup();
                    }}
                >
                    <p className={styles.kind}>{TYPE[popup.type].label}</p>
                    <h2 id={`ann-${popup.id}`} className={styles.dialogTitle}>
                        {popup.title}
                    </h2>
                    <p className={styles.dialogText}>{popup.message}</p>
                    <button type="button" className="btn btn-primary" onClick={closePopup}>
                        Rozumiem
                    </button>
                </dialog>
            )}
        </>
    );
}
