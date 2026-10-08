'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, Tag, ui } from '@/components/panel/ui';
import { money, type PlayerLike } from '@/lib/royal/meta';
import { API, LOGIN, Player, Tiles, rs, url, useBridge, when } from './shared';

const num = new Intl.NumberFormat('pl-PL');
const n = (v: unknown) => Number(v) || 0;

function ago(ms: number): string {
    const minutes = Math.floor((Date.now() - ms) / 60_000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return hours < 48 ? `${hours} godz.` : `${Math.floor(hours / 24)} dni`;
}

// ---------- Akcje masowe ----------

function BulkActions({ onDone }: { onDone: () => void }) {
    const { toast, confirm } = useFeedback();
    const [form, setForm] = useState({ action: 'money', amount: '', audience: 'active', days: '7', guild: '', minWagered: '250000', ids: '', reason: '' });
    const [preview, setPreview] = useState<{ count: number; label: string } | null>(null);
    const [previewError, setPreviewError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }));

    // Podgląd: ilu graczy obejmie akcja, liczony na bieżąco przy zmianie odbiorców.
    useEffect(() => {
        const timer = window.setTimeout(async () => {
            const result = await api<{ count: number; label: string }>(
                url('/bulk/preview', { audience: form.audience, days: form.days, guild: form.guild, minWagered: form.minWagered, ids: form.audience === 'list' ? form.ids : '' }),
                { loginPath: LOGIN }
            );
            if (result.ok) {
                setPreview(result.data);
                setPreviewError('');
            } else {
                setPreview(null);
                setPreviewError(result.data.message || '');
            }
        }, 400);
        return () => window.clearTimeout(timer);
    }, [form.audience, form.days, form.guild, form.minWagered, form.ids]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!preview || preview.count === 0) {
            toast(previewError || 'Ta grupa jest pusta.', 'error');
            return;
        }
        const what =
            form.action === 'money' ? `${money(n(form.amount))} każdemu` : form.action === 'credits' ? `${num.format(n(form.amount))} kredytów każdemu` : 'odblokowanie daily';
        const ok = await confirm({
            title: `${what}: ${num.format(preview.count)} graczy?`,
            body: `Odbiorcy: ${preview.label}. Konta zablokowane są pomijane. Tego nie cofniesz jednym kliknięciem.`,
            confirmLabel: 'Wykonaj',
            danger: true
        });
        if (!ok) return;
        setBusy(true);
        const result = await api(`${API}/bulk`, { method: 'POST', loginPath: LOGIN, json: form });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) onDone();
    }

    return (
        <form className={ui.block} onSubmit={submit}>
            <h2 className={ui.blockTitle}>Rozdaj graczom</h2>
            <div className={rs.inline}>
                <div className="field">
                    <label htmlFor="bk-action">Co</label>
                    <select id="bk-action" className="select" value={form.action} onChange={set('action')}>
                        <option value="money">Pieniądze ($)</option>
                        <option value="credits">Kredyty</option>
                        <option value="reset_daily">Odblokuj daily</option>
                    </select>
                </div>
                {form.action !== 'reset_daily' && (
                    <div className="field">
                        <label htmlFor="bk-amount">Ile każdemu</label>
                        <input id="bk-amount" className="input" type="number" min={1} required value={form.amount} onChange={set('amount')} />
                    </div>
                )}
                <div className="field">
                    <label htmlFor="bk-aud">Komu</label>
                    <select id="bk-aud" className="select" value={form.audience} onChange={set('audience')}>
                        <option value="active">Grającym w ostatnich dniach</option>
                        <option value="all">Wszystkim graczom</option>
                        <option value="guild">Graczom z serwera</option>
                        <option value="vip">VIP (od kwoty obstawień)</option>
                        <option value="list">Lista ID</option>
                    </select>
                </div>
                {(form.audience === 'active' || form.audience === 'guild') && (
                    <div className="field">
                        <label htmlFor="bk-days">Dni wstecz</label>
                        <input id="bk-days" className="input" type="number" min={1} max={365} value={form.days} onChange={set('days')} />
                    </div>
                )}
                {form.audience === 'guild' && (
                    <div className="field">
                        <label htmlFor="bk-guild">ID serwera</label>
                        <input id="bk-guild" className="input" inputMode="numeric" value={form.guild} onChange={set('guild')} />
                    </div>
                )}
                {form.audience === 'vip' && (
                    <div className="field">
                        <label htmlFor="bk-vip">Obstawione od ($)</label>
                        <select id="bk-vip" className="select" value={form.minWagered} onChange={set('minWagered')}>
                            <option value="250000">Srebro ($250k)</option>
                            <option value="2500000">Złoto ($2.5M)</option>
                            <option value="25000000">Platyna ($25M)</option>
                            <option value="250000000">Diament ($250M)</option>
                            <option value="2500000000">Royal ($2.5B)</option>
                        </select>
                    </div>
                )}
                <div className="field">
                    <label htmlFor="bk-reason">Powód (do logu)</label>
                    <input id="bk-reason" className="input" maxLength={500} value={form.reason} onChange={set('reason')} placeholder="np. nagroda za event" />
                </div>
            </div>
            {form.audience === 'list' && (
                <div className="field">
                    <label htmlFor="bk-ids">ID graczy (dowolnie rozdzielone, do 1000)</label>
                    <textarea id="bk-ids" className="textarea" rows={3} value={form.ids} onChange={set('ids')} />
                </div>
            )}
            <div className={ui.actions}>
                <button type="submit" className="btn btn-danger btn-sm" disabled={busy || !preview?.count}>
                    {busy ? 'Wykonywanie...' : 'Wykonaj'}
                </button>
                <span className="muted small" aria-live="polite">
                    {preview ? `Obejmie ${num.format(preview.count)} graczy (${preview.label}).` : previewError}
                </span>
            </div>
        </form>
    );
}

// ---------- Zlecenia dla bota ----------

interface BridgeRow extends PlayerLike {
    id: number;
    action: string;
    target_id: string | null;
    status: string;
    result: string | null;
    created_at: number;
    done_at: number;
}

const STATUS: Record<string, { label: string; tone?: 'warn' | 'muted' | 'strong' }> = {
    pending: { label: 'czeka', tone: 'warn' },
    running: { label: 'w toku', tone: 'warn' },
    done: { label: 'wykonane', tone: 'muted' },
    failed: { label: 'błąd', tone: 'strong' }
};

export function ToolsView() {
    const queue = useResource<{ available: boolean; rows: BridgeRow[]; labels: Record<string, string>; pending: { c: number; oldest: number | null } | null }>(url('/bridge', {}), LOGIN);
    const sessions = useResource<{ mines: (PlayerLike & Record<string, unknown>)[]; live: (PlayerLike & Record<string, unknown>)[] }>(url('/sessions', {}), LOGIN);
    const reloadAll = () => {
        void queue.reload();
        void sessions.reload();
    };
    const bridge = useBridge(reloadAll);
    const { toast, confirm } = useFeedback();
    const [busy, setBusy] = useState(false);

    const stuck = queue.data?.pending && n(queue.data.pending.c) > 0 && n(queue.data.pending.oldest) > 0 && Date.now() - n(queue.data.pending.oldest) > 60_000;

    async function post(path: string, json: unknown, question: string) {
        if (!(await confirm({ title: question, confirmLabel: 'Tak' }))) return;
        setBusy(true);
        const result = await api(`${API}${path}`, { method: 'POST', loginPath: LOGIN, json });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) reloadAll();
    }

    return (
        <>
            <PanelHeader
                title="Narzędzia"
                description="Akcje masowe na graczach, zlecenia wykonywane przez samego bota i otwarte sesje gier."
                actions={<RefreshButton onClick={reloadAll} loading={queue.loading || sessions.loading} />}
            />

            <BulkActions onDone={reloadAll} />

            <section className={ui.block} aria-labelledby="bot-t">
                <h2 id="bot-t" className={ui.blockTitle}>
                    Zlecenia dla bota
                </h2>
                {queue.data && !queue.data.available && (
                    <div className="notice notice-error">Bot nie ma jeszcze tabeli zleceń. Wdróż nową wersję bota, żeby działały DM-y, odpowiedzi na zgłoszenia i odświeżanie nicków.</div>
                )}
                {stuck && <div className="notice notice-error">Zlecenia czekają ponad minutę. Sprawdź, czy bot działa i czy ma wdrożoną nową wersję.</div>}
                <div className={ui.actions}>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={bridge.busy} onClick={() => bridge.send({ action: 'refresh_profiles' })}>
                        Pobierz brakujące nicki i awatary
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={bridge.busy} onClick={() => bridge.send({ action: 'refresh_guilds' })}>
                        Odśwież listę serwerów
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={bridge.busy} onClick={() => bridge.send({ action: 'cleanup_mines' })}>
                        Zamknij porzucone Miny (ponad 2h)
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={bridge.busy} onClick={() => bridge.send({ action: 'jackpot_tick' })}>
                        Sprawdź losowanie jackpota teraz
                    </button>
                </div>
                <p className={rs.hint}>
                    Nicki starych graczy bot pobiera też sam w tle (60 graczy co 2 minuty, najpierw najbogatsi). Przycisk tylko przyspiesza kolejną turę.
                </p>
            </section>

            <div className={rs.columns}>
                <section className={rs.panel} aria-labelledby="mines-t">
                    <h2 id="mines-t" className={rs.panelTitle}>
                        Otwarte gry w Miny
                    </h2>
                    {sessions.error && <LoadError message={sessions.error} onRetry={sessions.reload} />}
                    {sessions.data &&
                        (sessions.data.mines.length === 0 ? (
                            <Empty>Nikt teraz nie gra w Miny.</Empty>
                        ) : (
                            <div className="table-wrap">
                                <table className={rs.compact}>
                                    <thead>
                                        <tr>
                                            <th scope="col">Gracz</th>
                                            <th scope="col" className={rs.num}>Stawka</th>
                                            <th scope="col" className={rs.num}>Od</th>
                                            <th scope="col">
                                                <span className="sr-only">Akcje</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.data.mines.map(m => (
                                            <tr key={String(m.id)}>
                                                <td>
                                                    <Player p={m} sub={`${n(m.mines_count)} min`} />
                                                </td>
                                                <td className={rs.num}>{money(n(m.bet))}</td>
                                                <td className={rs.num}>{ago(n(m.created_at))}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        disabled={busy}
                                                        onClick={() => post(`/players/${m.user_id}/close-mines`, {}, `Zamknąć grę i zwrócić ${money(n(m.bet))}?`)}
                                                    >
                                                        Zamknij ze zwrotem
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                </section>

                <section className={rs.panel} aria-labelledby="live-t">
                    <h2 id="live-t" className={rs.panelTitle}>
                        Otwarte zakłady Crash Live
                    </h2>
                    {sessions.data &&
                        (sessions.data.live.length === 0 ? (
                            <Empty>Brak otwartych zakładów.</Empty>
                        ) : (
                            <div className="table-wrap">
                                <table className={rs.compact}>
                                    <thead>
                                        <tr>
                                            <th scope="col">Gracz</th>
                                            <th scope="col" className={rs.num}>Stawka</th>
                                            <th scope="col" className={rs.num}>Od</th>
                                            <th scope="col">
                                                <span className="sr-only">Akcje</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.data.live.map(b => {
                                            const old = Date.now() - n(b.created_at) > 10 * 60_000;
                                            return (
                                                <tr key={`${String(b.round_id)}-${b.user_id}`}>
                                                    <td>
                                                        <Player p={b} />
                                                    </td>
                                                    <td className={rs.num}>{money(n(b.bet))}</td>
                                                    <td className={rs.num}>{ago(n(b.created_at))}</td>
                                                    <td>
                                                        {old ? (
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm"
                                                                disabled={busy}
                                                                onClick={() => post('/sessions/live-refund', { roundId: b.round_id, userId: b.user_id }, `Zwrócić ${money(n(b.bet))}?`)}
                                                            >
                                                                Zwróć stawkę
                                                            </button>
                                                        ) : (
                                                            <span className="muted small">runda trwa</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                </section>

                <section className={`${rs.panel} ${rs.wide}`} aria-labelledby="queue-t">
                    <h2 id="queue-t" className={rs.panelTitle}>
                        Historia zleceń
                    </h2>
                    {queue.error && <LoadError message={queue.error} onRetry={queue.reload} />}
                    {queue.data &&
                        (queue.data.rows.length === 0 ? (
                            <Empty>Jeszcze nic nie zlecono.</Empty>
                        ) : (
                            <div className="table-wrap">
                                <table className={rs.compact}>
                                    <thead>
                                        <tr>
                                            <th scope="col">Kiedy</th>
                                            <th scope="col">Zlecenie</th>
                                            <th scope="col">Gracz</th>
                                            <th scope="col">Stan</th>
                                            <th scope="col">Wynik</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queue.data.rows.map(row => {
                                            const st = STATUS[row.status] ?? { label: row.status };
                                            return (
                                                <tr key={row.id}>
                                                    <td className={rs.num}>{when(row.created_at)}</td>
                                                    <td>{queue.data?.labels[row.action] ?? row.action}</td>
                                                    <td>{row.target_id ? <Player p={{ ...row, user_id: row.target_id }} /> : '-'}</td>
                                                    <td>
                                                        <Tag tone={st.tone}>{st.label}</Tag>
                                                    </td>
                                                    <td>{row.result || '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                </section>
            </div>
        </>
    );
}

// ---------- Polecenia ----------

interface ReferralRow {
    user_id: string;
    referred_by: string;
    referral_code: string | null;
    total_games: number;
    money: number;
    created_at: string;
    is_blocked: number;
    r_blocked: number;
    [key: string]: unknown;
}

function side(row: ReferralRow, prefix: 'n' | 'r'): PlayerLike {
    return {
        user_id: prefix === 'n' ? row.user_id : row.referred_by,
        username: row[`${prefix}_username`] as string | null,
        display_name: row[`${prefix}_display_name`] as string | null,
        avatar: row[`${prefix}_avatar`] as string | null
    };
}

export function ReferralsView() {
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [page, setPage] = useState(1);
    useEffect(() => {
        const t = window.setTimeout(() => {
            setDebounced(query.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(t);
    }, [query]);
    const { data, error, loading, reload } = useResource<{
        rows: ReferralRow[];
        top: (PlayerLike & Record<string, unknown>)[];
        total: number;
        per: number;
        all: number;
        bonus: number;
    }>(url('/referrals', { q: debounced, page }), LOGIN);
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;

    return (
        <>
            <PanelHeader
                title="Polecenia"
                description="Kto kogo zaprosił przez /polecenie. Polecającego i kod gracza zmienisz na jego karcie. Podejrzane schematy (dużo martwych kont) są też w zakładce Podejrzani."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            {error && <LoadError message={error} onRetry={reload} />}
            {data && (
                <>
                    <Tiles
                        items={[
                            { label: 'Poleceń łącznie', value: num.format(data.all) },
                            { label: 'Wypłacone bonusy', value: money(data.all * data.bonus * 2), note: `${money(data.bonus)} dla każdej strony` }
                        ]}
                    />
                    <div className={rs.columns}>
                        <section className={rs.panel}>
                            <h2 className={rs.panelTitle}>Najwięcej poleceń</h2>
                            {data.top.length === 0 ? (
                                <Empty>Nikt jeszcze nikogo nie polecił.</Empty>
                            ) : (
                                <div className="table-wrap">
                                    <table className={rs.compact}>
                                        <thead>
                                            <tr>
                                                <th scope="col">Gracz</th>
                                                <th scope="col" className={rs.num}>Polecił</th>
                                                <th scope="col" className={rs.num}>Martwe konta</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.top.map(r => (
                                                <tr key={r.user_id}>
                                                    <td>
                                                        <Player p={r} sub={`kod ${String(r.referral_code || '-')}`} />
                                                    </td>
                                                    <td className={rs.num}>{num.format(n(r.referred))}</td>
                                                    <td className={rs.num}>{n(r.idle) >= 3 ? <Tag tone="warn">{n(r.idle)}</Tag> : n(r.idle)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                        <section className={`${rs.panel} ${rs.wide}`}>
                            <h2 className={rs.panelTitle}>Wszystkie polecenia</h2>
                            <SearchBox value={query} onChange={setQuery} label="ID, nick albo kod polecający" />
                            {data.rows.length === 0 ? (
                                <Empty>Brak poleceń.</Empty>
                            ) : (
                                <div className="table-wrap">
                                    <table className={rs.compact}>
                                        <thead>
                                            <tr>
                                                <th scope="col">Polecony</th>
                                                <th scope="col">Polecił go</th>
                                                <th scope="col" className={rs.num}>Gry</th>
                                                <th scope="col" className={rs.num}>Saldo</th>
                                                <th scope="col" className={rs.num}>Konto od</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.rows.map(row => (
                                                <tr key={row.user_id}>
                                                    <td>
                                                        <Player p={side(row, 'n')} /> {n(row.is_blocked) ? <Tag tone="warn">blokada</Tag> : null}
                                                    </td>
                                                    <td>
                                                        <Player p={side(row, 'r')} sub={row.referral_code ? `kod ${row.referral_code}` : undefined} />
                                                    </td>
                                                    <td className={rs.num}>{n(row.total_games) < 5 ? <Tag tone="muted">{n(row.total_games)}</Tag> : num.format(n(row.total_games))}</td>
                                                    <td className={rs.num}>{money(n(row.money))}</td>
                                                    <td className={rs.num}>{when(row.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <Pager page={page} pages={pages} total={data.total} onPage={setPage} />
                        </section>
                    </div>
                </>
            )}
        </>
    );
}
