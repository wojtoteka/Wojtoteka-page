'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { Tag } from '@/components/panel/ui';
import { avatarUrl, money, playerName, type PlayerLike } from '@/lib/royal/meta';
import styles from './royal.module.css';

export { styles as rs };

export const LOGIN = '/admin/logowanie';
export const API = '/api/admin/royal';

const TABS = [
    { href: '/admin/royal', label: 'Pulpit' },
    { href: '/admin/royal/gracze', label: 'Gracze' },
    { href: '/admin/royal/narzedzia', label: 'Narzędzia i akcje masowe' },
    { href: '/admin/royal/polecenia', label: 'Polecenia' },
    { href: '/admin/royal/gry', label: 'Logi gier' },
    { href: '/admin/royal/podejrzani', label: 'Podejrzani' },
    { href: '/admin/royal/rankingi', label: 'Rankingi' },
    { href: '/admin/royal/serwery', label: 'Serwery' },
    { href: '/admin/royal/zgloszenia', label: 'Zgłoszenia' },
    { href: '/admin/royal/wyplaty', label: 'Wypłaty' },
    { href: '/admin/royal/jackpot', label: 'Jackpot' },
    { href: '/admin/royal/log', label: 'Log admina' }
];

interface Status {
    configured: boolean;
    profiles?: boolean;
    guildInfo?: boolean;
}

/** Zakładki i sprawdzenie, czy strona widzi bazę bota. */
export function RoyalFrame({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data, error } = useResource<Status>(`${API}/status`, LOGIN);

    return (
        <>
            <nav className={styles.tabs} aria-label="Sekcje panelu RoyalCasino">
                {TABS.map(tab => {
                    const active = tab.href === '/admin/royal' ? pathname === tab.href : pathname === tab.href || pathname.startsWith(tab.href + '/');
                    return (
                        <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={active ? 'page' : undefined}>
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
            {error && <div className="notice notice-error">{error}</div>}
            {data && !data.configured && (
                <div className="notice notice-error">
                    <strong>Baza bota nie jest podłączona.</strong> Uzupełnij w <code>.env</code> strony pola <code>DB_ROYAL_NAME</code> (oraz{' '}
                    <code>DB_ROYAL_USER</code> i <code>DB_ROYAL_PASSWORD</code>, jeśli bot ma osobnego użytkownika bazy) i zrestartuj stronę.
                </div>
            )}
            {data?.configured && data.profiles === false && (
                <div className="notice">
                    Bot działa na starszej wersji bez zapisu nicków i awatarów. Po wdrożeniu nowej wersji bota panel i ranking pokażą nazwy graczy i serwerów.
                </div>
            )}
            {data?.configured && children}
        </>
    );
}

/**
 * Zlecenie dla bota (DM, odpowiedź na zgłoszenie, odświeżenie profilu...).
 * Strona zapisuje je w web_actions, bot wykonuje w ciągu kilku sekund;
 * tu czekamy na wynik i pokazujemy go jako powiadomienie.
 */
export function useBridge(onDone?: () => void) {
    const { toast } = useFeedback();
    const [busy, setBusy] = useState(false);

    const send = useCallback(
        async (body: Record<string, unknown>): Promise<boolean> => {
            setBusy(true);
            const queued = await api<{ id: number }>(`${API}/bridge`, { method: 'POST', loginPath: LOGIN, json: body });
            if (!queued.ok) {
                setBusy(false);
                toast(queued.data.message || 'Nie udało się zlecić.', 'error');
                return false;
            }
            const started = Date.now();
            while (Date.now() - started < 30_000) {
                await new Promise(r => window.setTimeout(r, 1500));
                const state = await api<{ status: string; result: string | null }>(`${API}/bridge/${queued.data.id}`, { loginPath: LOGIN });
                if (state.ok && (state.data.status === 'done' || state.data.status === 'failed')) {
                    setBusy(false);
                    toast(state.data.result || (state.data.status === 'done' ? 'Gotowe.' : 'Bot nie wykonał zlecenia.'), state.data.status === 'done' ? 'ok' : 'error');
                    onDone?.();
                    return state.data.status === 'done';
                }
            }
            setBusy(false);
            toast('Bot jeszcze nie odpowiedział. Zlecenie czeka w kolejce, wynik zobaczysz w Narzędziach.', 'error');
            return false;
        },
        [toast, onDone]
    );

    return { send, busy };
}

export function Player({ p, sub, link = true }: { p: PlayerLike; sub?: React.ReactNode; link?: boolean }) {
    const body = (
        <>
            <img className={styles.avatar} src={avatarUrl(p)} alt="" width={32} height={32} loading="lazy" />
            <span className={styles.playerText}>
                <span className={styles.playerName}>{playerName(p)}</span>
                <span className={styles.playerId}>{sub ?? p.user_id}</span>
            </span>
        </>
    );
    if (!p.user_id) return <span className="muted">brak</span>;
    return link ? (
        <Link href={`/admin/royal/gracze/${p.user_id}`} className={styles.player}>
            {body}
        </Link>
    ) : (
        <span className={styles.player}>{body}</span>
    );
}

export interface FlagRow {
    is_blocked?: number | boolean | null;
    is_frozen?: number | boolean | null;
    max_bet?: number | null;
    watched?: number | boolean | null;
    web_hidden?: number | boolean | null;
}

export function Flags({ row }: { row: FlagRow }) {
    const items: React.ReactNode[] = [];
    if (Number(row.is_blocked)) items.push(<Tag key="b" tone="warn">Zablokowany</Tag>);
    if (Number(row.is_frozen)) items.push(<Tag key="f" tone="warn">Zamrożony</Tag>);
    if (Number(row.max_bet) > 0) items.push(<Tag key="l">Limit {money(row.max_bet)}</Tag>);
    if (Number(row.watched)) items.push(<Tag key="w" tone="strong">Obserwowany</Tag>);
    if (Number(row.web_hidden)) items.push(<Tag key="h" tone="muted">Ukryty na WWW</Tag>);
    return items.length ? <span className={styles.flags}>{items}</span> : null;
}

export function Tiles({ items }: { items: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: 'pos' | 'neg' }[] }) {
    return (
        <dl className={styles.tiles}>
            {items.map(item => (
                <div key={item.label} className={styles.tile}>
                    <dt className={styles.tileLabel}>{item.label}</dt>
                    <dd className={`${styles.tileValue} ${item.tone ? styles[item.tone] : ''}`}>{item.value}</dd>
                    {item.note && <dd className={styles.tileNote}>{item.note}</dd>}
                </div>
            ))}
        </dl>
    );
}

/** Zysk/strata z kolorem i znakiem (kolor nie jest jedynym nośnikiem: jest też + / -). */
export function Net({ value, invert = false }: { value: number | string | null | undefined; invert?: boolean }) {
    const n = Number(value) || 0;
    const good = invert ? n < 0 : n > 0;
    const cls = n === 0 ? '' : good ? styles.pos : styles.neg;
    return <span className={cls}>{`${n > 0 ? '+' : ''}${money(n)}`}</span>;
}

const dateTime = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Czas zapisany w bazie bota jako Unix ms albo TIMESTAMP. */
export function when(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '' || value === 0 || value === '0') return '-';
    const date = typeof value === 'number' || /^\d+$/.test(String(value)) ? new Date(Number(value)) : new Date(String(value));
    return Number.isNaN(date.getTime()) ? '-' : dateTime.format(date);
}

/** Buduje adres API z parametrami, pomijając puste. */
export function url(path: string, params: Record<string, string | number | undefined | null>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    }
    const qs = search.toString();
    return `${API}${path}${qs ? `?${qs}` : ''}`;
}

/** Słupki jednej serii (np. obrót dziennie) z podpowiedzią po najechaniu i tabelą obok. */
export function DayBars<T extends { day: string }>({
    rows,
    value,
    label,
    format
}: {
    rows: T[];
    value: (row: T) => number;
    label: string;
    format: (n: number) => string;
}) {
    const values = rows.map(r => Math.max(0, value(r)));
    const max = Math.max(1, ...values);
    if (rows.length === 0) return <p className="muted">Brak gier w tym okresie.</p>;
    return (
        <figure className={styles.chart}>
            <div className={styles.plot} role="img" aria-label={`${label}, ${rows.length} dni. Dokładne liczby w tabeli poniżej.`}>
                {rows.map((row, i) => (
                    <span key={row.day} className={styles.barHit} tabIndex={0}>
                        <span className={styles.bar} style={{ height: `${(values[i] / max) * 100}%` }} />
                        <span className={styles.barTip}>
                            {row.day}: <strong>{format(values[i])}</strong>
                        </span>
                    </span>
                ))}
            </div>
            <figcaption className={styles.axis}>
                <span>{rows[0].day}</span>
                <span>maks. {format(max)}</span>
                <span>{rows[rows.length - 1].day}</span>
            </figcaption>
        </figure>
    );
}
