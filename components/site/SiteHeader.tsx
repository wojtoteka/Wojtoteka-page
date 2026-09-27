'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './SiteHeader.module.css';

const NAV = [
    { href: '/gry', label: 'Gry' },
    { href: '/kontakt', label: 'Kontakt' },
    { href: '/api', label: 'API' },
    { href: '/url', label: 'Skracacz' }
];

export function SiteHeader() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Po przejściu na inną stronę menu się zamyka.
    useEffect(() => setOpen(false), [pathname]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <header className={styles.header} data-open={open || undefined}>
            <div className={`wrap ${styles.bar}`}>
                <Link href="/" className={styles.brand} aria-label="Wojtoteka, strona główna">
                    <img src="/img/logo.png" alt="" width={36} height={36} className={styles.logo} />
                    <span className={styles.wordmark}>Wojtoteka</span>
                </Link>

                <button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={open}
                    aria-controls="main-menu"
                    onClick={() => setOpen(value => !value)}
                >
                    <span className={styles.burger} aria-hidden="true" />
                    {open ? 'Zamknij' : 'Menu'}
                </button>

                <nav id="main-menu" aria-label="Główne menu" className={styles.menu}>
                    <ul role="list" className={styles.nav}>
                        {NAV.map(item => {
                            const active = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={styles.navLink}
                                        aria-current={active ? 'page' : undefined}
                                        onClick={() => setOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>
        </header>
    );
}
