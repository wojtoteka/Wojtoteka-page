'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, ui } from '@/components/panel/ui';
import { money, vipTier, type PlayerLike } from '@/lib/royal/meta';
import { API, Flags, LOGIN, Player, rs, url, useBridge, when, type FlagRow } from './shared';

const QUICK = [
    { value: 'add', label: 'Dodaj pieniądze', field: 'amount' },
    { value: 'remove', label: 'Odejmij pieniądze', field: 'amount' },
    { value: 'set', label: 'Ustaw saldo', field: 'amount' },
    { value: 'credits', label: 'Dodaj kredyty', field: 'amount' },
    { value: 'block', label: 'Zablokuj na stałe', field: 'reason' },
    { value: 'unblock', label: 'Odblokuj', field: null },
    { value: 'freeze', label: 'Zamroź', field: null },
    { value: 'unfreeze', label: 'Odmroź', field: null },
    { value: 'dm', label: 'Wyślij DM', field: 'message' }
] as const;

/** Najczęstsze akcje po samym ID, bez otwierania karty gracza. */
function QuickActions({ onDone }: { onDone: () => void }) {
    const { toast } = useFeedback();
    const bridge = useBridge(onDone);
    const [op, setOp] = useState<(typeof QUICK)[number]['value']>('add');
    const [busy, setBusy] = useState(false);
    const field = QUICK.find(x => x.value === op)?.field;

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const v = new FormData(form);
        const id = String(v.get('id') || '').trim();
        if (!/^\d{15,21}$/.test(id)) {
            toast('Podaj ID Discorda gracza (15-21 cyfr).', 'error');
            return;
        }
        if (op === 'dm') {
            if (await bridge.send({ action: 'dm', target: id, message: v.get('value') })) form.reset();
            return;
        }
        const reason = String(v.get('reason') || '');
        const value = v.get('value');
        const call: Record<string, [string, unknown]> = {
            add: ['/balance', { currency: 'money', op: 'add', amount: value, reason }],
            remove: ['/balance', { currency: 'money', op: 'remove', amount: value, reason }],
            set: ['/balance', { currency: 'money', op: 'set', amount: value, reason }],
            credits: ['/balance', { currency: 'credits', op: 'add', amount: value, reason }],
            block: ['/block', { on: true, hours: 0, reason: value || reason }],
            unblock: ['/block', { on: false }],
            freeze: ['/freeze', { on: true, reason }],
            unfreeze: ['/freeze', { on: false }]
        };
        const [path, json] = call[op];
        setBusy(true);
        const result = await api(`${API}/players/${id}${path}`, { method: 'POST', loginPath: LOGIN, json });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            onDone();
            form.reset();
        }
    }

    return (
        <form className={ui.block} onSubmit={submit}>
            <h2 className={ui.blockTitle}>Szybka akcja</h2>
            <div className={rs.inline}>
                <div className="field">
                    <label htmlFor="qa-id">ID gracza</label>
                    <input id="qa-id" name="id" className="input" inputMode="numeric" required placeholder="np. 1328758394588500024" />
                </div>
                <div className="field">
                    <label htmlFor="qa-op">Akcja</label>
                    <select id="qa-op" className="select" value={op} onChange={e => setOp(e.target.value as typeof op)}>
                        {QUICK.map(x => (
                            <option key={x.value} value={x.value}>
                                {x.label}
                            </option>
                        ))}
                    </select>
                </div>
                {field && (
                    <div className="field">
                        <label htmlFor="qa-value">{field === 'amount' ? 'Kwota' : field === 'message' ? 'Treść wiadomości' : 'Powód blokady'}</label>
                        <input
                            id="qa-value"
                            name="value"
                            className="input"
                            type={field === 'amount' ? 'number' : 'text'}
                            min={field === 'amount' ? 0 : undefined}
                            maxLength={field === 'amount' ? undefined : 2000}
                            required={field !== 'reason'}
                        />
                    </div>
                )}
                {field === 'amount' && (
                    <div className="field">
                        <label htmlFor="qa-reason">Powód (do logu)</label>
                        <input id="qa-reason" name="reason" className="input" maxLength={500} />
                    </div>
                )}
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || bridge.busy}>
                    {busy || bridge.busy ? 'Wykonywanie...' : 'Wykonaj'}
                </button>
            </div>
        </form>
    );
}

/** Konto dla gracza, który jeszcze nie użył bota (np. nagroda z konkursu przed pierwszą grą). */
function CreatePlayer() {
    const router = useRouter();
    const { toast } = useFeedback();
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const v = new FormData(event.currentTarget);
        setBusy(true);
        const result = await api<{ userId?: string }>(`${API}/players`, { method: 'POST', loginPath: LOGIN, json: { userId: v.get('id'), money: v.get('money') } });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok && result.data.userId) router.push(`/admin/royal/gracze/${result.data.userId}`);
    }

    return (
        <details className={ui.block}>
            <summary className={ui.blockTitle}>Załóż konto graczowi</summary>
            <form className={rs.inline} onSubmit={submit}>
                <div className="field">
                    <label htmlFor="cp-id">ID Discorda</label>
                    <input id="cp-id" name="id" className="input" inputMode="numeric" required />
                </div>
                <div className="field">
                    <label htmlFor="cp-money">Saldo startowe</label>
                    <input id="cp-money" name="money" className="input" type="number" min={0} defaultValue={5000} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                    Załóż konto
                </button>
            </form>
            <p className={rs.hint}>Bot pobierze nick i awatar sam w ciągu kilku sekund.</p>
        </details>
    );
}

type Row = PlayerLike &
    FlagRow & {
        money: number;
        credits: number;
        level: number;
        total_games: number;
        total_wagered: number;
        biggest_win: number;
        created_at: string;
    };

const num = new Intl.NumberFormat('pl-PL');

export function PlayersView() {
    const router = useRouter();
    const initial = useSearchParams().get('q') ?? '';
    const [query, setQuery] = useState(initial);
    const [debounced, setDebounced] = useState(initial);
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState('money');
    const [dir, setDir] = useState<'desc' | 'asc'>('desc');
    const [page, setPage] = useState(1);
    const [goTo, setGoTo] = useState('');

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebounced(query.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);

    const { data, error, loading, reload } = useResource<{ rows: Row[]; total: number; per: number }>(
        url('/players', { q: debounced, filter, sort, dir, page }),
        LOGIN
    );
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;

    function sortBy(key: string) {
        if (sort === key) setDir(dir === 'desc' ? 'asc' : 'desc');
        else {
            setSort(key);
            setDir('desc');
        }
        setPage(1);
    }

    const head = (key: string, label: string) => (
        <th scope="col" className={rs.num} aria-sort={sort === key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            <button type="button" className={ui.linkButton} onClick={() => sortBy(key)}>
                {label}
                {sort === key ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
        </th>
    );

    return (
        <>
            <PanelHeader
                title="Gracze"
                description="Wszystkie konta z bazy bota. Szukaj po ID Discorda, nicku albo kodzie polecającym. Kliknij gracza, żeby otworzyć kartę z akcjami."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <QuickActions onDone={() => void reload()} />
            <CreatePlayer />

            <div className={rs.filters}>
                <SearchBox value={query} onChange={setQuery} label="ID, nick albo kod polecający" />
                <div className="field">
                    <label htmlFor="pl-filter">Pokaż</label>
                    <select
                        id="pl-filter"
                        className="select"
                        value={filter}
                        onChange={e => {
                            setFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Wszystkich</option>
                        <option value="blocked">Zablokowanych</option>
                        <option value="frozen">Zamrożonych</option>
                        <option value="limited">Z limitem zakładu</option>
                        <option value="watched">Obserwowanych</option>
                        <option value="hidden">Ukrytych na WWW</option>
                        <option value="vip">VIP Srebro i wyżej</option>
                        <option value="new">Nowych (7 dni)</option>
                    </select>
                </div>
                <form
                    className={rs.inline}
                    onSubmit={e => {
                        e.preventDefault();
                        if (/^\d{15,21}$/.test(goTo.trim())) router.push(`/admin/royal/gracze/${goTo.trim()}`);
                    }}
                >
                    <div className="field">
                        <label htmlFor="pl-goto">Otwórz po ID</label>
                        <input id="pl-goto" className="input" inputMode="numeric" value={goTo} onChange={e => setGoTo(e.target.value)} placeholder="ID Discorda" />
                    </div>
                    <button type="submit" className="btn btn-ghost btn-sm">
                        Otwórz
                    </button>
                </form>
            </div>

            {error && <LoadError message={error} onRetry={reload} />}
            {data &&
                (data.rows.length === 0 ? (
                    <Empty>Nie znaleziono graczy.</Empty>
                ) : (
                    <div className="table-wrap">
                        <table className={rs.compact}>
                            <thead>
                                <tr>
                                    <th scope="col">Gracz</th>
                                    {head('money', 'Saldo')}
                                    {head('credits', 'Kredyty')}
                                    {head('level', 'Poziom')}
                                    {head('wagered', 'Obstawione')}
                                    {head('games', 'Gry')}
                                    {head('biggest', 'Najw. wygrana')}
                                    {head('created', 'Konto od')}
                                    <th scope="col">Status</th>
                                    <th scope="col">
                                        <span className="sr-only">Akcje</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.map(row => (
                                    <tr key={row.user_id}>
                                        <td>
                                            <Player p={row} />
                                        </td>
                                        <td className={rs.num}>{money(row.money)}</td>
                                        <td className={rs.num}>{num.format(row.credits)}</td>
                                        <td className={rs.num}>
                                            {row.level} <span className="muted small">{vipTier(row.total_wagered).name}</span>
                                        </td>
                                        <td className={rs.num}>{money(row.total_wagered)}</td>
                                        <td className={rs.num}>{num.format(row.total_games)}</td>
                                        <td className={rs.num}>{money(row.biggest_win)}</td>
                                        <td className={rs.num}>{when(row.created_at)}</td>
                                        <td>
                                            <Flags row={row} />
                                        </td>
                                        <td>
                                            <Link href={`/admin/royal/gracze/${row.user_id}`} className="btn btn-ghost btn-sm">
                                                Zarządzaj
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            {data && <Pager page={page} pages={pages} total={data.total} onPage={setPage} />}
        </>
    );
}
