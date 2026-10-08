'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Icon, type IconName } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { FeedbackProvider } from './Feedback';
import styles from './PanelShell.module.css';

export interface PanelNavItem {
    href: string;
    label: string;
    icon: IconName;
    /** Klucz licznika w odpowiedzi summaryUrl. */
    countKey?: string;
    /** Podświetlaj też na podstronach (np. /admin/royal/gracze). */
    matchPrefix?: boolean;
}

/** Wysłanie tego zdarzenia odświeża liczniki w menu (np. po usunięciu wpisu). */
export const PANEL_CHANGED = 'panel:changed';

export function notifyPanelChanged(): void {
    window.dispatchEvent(new Event(PANEL_CHANGED));
}

export function PanelShell({
    role,
    user,
    nav,
    summaryUrl,
    loginPath,
    children
}: {
    role: string;
    user: string;
    nav: PanelNavItem[];
    summaryUrl?: string;
    loginPath: string;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [leaving, setLeaving] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    const loadCounts = useCallback(async () => {
        if (!summaryUrl) return;
        const result = await api<Record<string, number>>(summaryUrl, { loginPath });
        if (result.ok) setCounts(result.data);
    }, [summaryUrl, loginPath]);

    useEffect(() => {
        void loadCounts();
        window.addEventListener(PANEL_CHANGED, loadCounts);
        return () => window.removeEventListener(PANEL_CHANGED, loadCounts);
    }, [loadCounts]);

    async function logout() {
        setLeaving(true);
        setLogoutError('');
        try {
            await signOut({ redirect: false, redirectTo: loginPath });
            // Auth.js może zwrócić adres nasłuchu serwera (np. 0.0.0.0).
            // Ścieżka względna zachowuje domenę/IP, protokół i port przeglądarki.
            window.location.replace(loginPath);
        } catch {
            setLogoutError('Nie udało się wylogować. Spróbuj ponownie.');
            setLeaving(false);
        }
    }

    return (
        <FeedbackProvider>
            <a href="#panel-tresc" className="skip-link">
                Przejdź do treści
            </a>
            <div className={styles.shell}>
                <aside className={styles.sidebar}>
                    <div className={styles.top}>
                        <Link href="/" className={styles.brand}>
                            <img src="/img/logo.png" alt="" width={32} height={32} />
                            <span>Wojtoteka</span>
                        </Link>
                        <p className={styles.role}>{role}</p>
                    </div>

                    <nav aria-label={role}>
                        <ul role="list" className={styles.nav}>
                            {nav.map(item => {
                                const active = pathname === item.href || (!!item.matchPrefix && pathname.startsWith(item.href + '/'));
                                const count = item.countKey ? counts[item.countKey] : undefined;
                                return (
                                    <li key={item.href}>
                                        <Link href={item.href} className={styles.navLink} aria-current={active ? 'page' : undefined}>
                                            <Icon name={item.icon} size={18} />
                                            <span className={styles.navLabel}>{item.label}</span>
                                            {count !== undefined && <span className={styles.count}>{count}</span>}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    <div className={styles.user}>
                        <p>
                            <span className="muted small">Zalogowano jako</span>
                            <br />
                            <strong>{user}</strong>
                        </p>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={logout} disabled={leaving}>
                            <Icon name="logout" size={16} />
                            {leaving ? 'Wylogowywanie...' : 'Wyloguj'}
                        </button>
                        {logoutError && <p role="alert">{logoutError}</p>}
                    </div>
                </aside>

                <main id="panel-tresc" className={styles.main}>
                    {children}
                </main>
            </div>
        </FeedbackProvider>
    );
}
