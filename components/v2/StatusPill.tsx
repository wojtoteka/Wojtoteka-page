'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './StatusPill.module.css';

/** Przypięta pigułka w lewym dolnym rogu: link do statusu i skrót do kontaktu. */
export function StatusPill() {
    const pathname = usePathname();
    const [hidden, setHidden] = useState(false);

    // Przewijanie w dół chowa pigułkę (nie zasłania tekstu), w górę ją przywraca.
    useEffect(() => {
        let last = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            if (Math.abs(y - last) < 8) return;
            setHidden(y > last && y > 200);
            last = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    if (pathname === '/kontakt') return null;

    return (
        <div className={styles.pill} data-hidden={hidden || undefined}>
            <Link href="/status" className={styles.status}>
                <span className={styles.dot} aria-hidden="true" />
                Status: online
            </Link>
            <Link href="/kontakt" className={styles.cta}>
                Napisz
            </Link>
        </div>
    );
}
