'use client';

import { Fragment, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, Tag, ui } from '@/components/panel/ui';
import { AUDIT_ACTIONS, guildIconUrl, money, type PlayerLike } from '@/lib/royal/meta';
import { API, LOGIN, Player, Tiles, rs, url, useBridge, when } from './shared';

const num = new Intl.NumberFormat('pl-PL');
const n = (v: unknown) => Number(v) || 0;

/** POST/DELETE z powiadomieniem i odświeżeniem listy. */
function useAction(reload: () => void) {
    const { toast } = useFeedback();
    const [busy, setBusy] = useState(false);
    async function run(path: string, json: unknown, method: 'POST' | 'DELETE' = 'POST'): Promise<boolean> {
        setBusy(true);
        const result = await api(`${API}${path}`, { method, loginPath: LOGIN, json });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            reload();
            notifyPanelChanged();
        }
        return result.ok;
    }
    return { run, busy };
}

// ---------- Serwery ----------

interface Guild {
    guild_id: string;
    name?: string | null;
    icon?: string | null;
    member_count?: number;
    left_at?: number;
    joined_at: number;
    casino_channel_id: string | null;
    drops_channel_id: string | null;
    announce_channel_id: string | null;
    drops_enabled: number;
    drops_banned: number;
    duels_enabled: number;
    language: string | null;
    games: number | null;
    wagered: number | null;
    players: number | null;
    last_at: number | null;
}

export function GuildsView() {
    const params = useSearchParams();
    const [query, setQuery] = useState(params.get('q') ?? '');
    const [debounced, setDebounced] = useState(query);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<string | null>(null);
    useEffect(() => {
        const t = window.setTimeout(() => {
            setDebounced(query.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(t);
    }, [query]);
    const { data, error, loading, reload } = useResource<{ rows: Guild[]; total: number; per: number; guildInfo: boolean }>(url('/guilds', { q: debounced, filter, page }), LOGIN);
    const { run, busy } = useAction(() => void reload());
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;

    async function save(event: FormEvent<HTMLFormElement>, guildId: string) {
        event.preventDefault();
        const v = new FormData(event.currentTarget);
        const ok = await run(`/guilds/${guildId}`, {
            language: v.get('language') || null,
            casino_channel_id: v.get('casino') || null,
            drops_channel_id: v.get('drops') || null,
            announce_channel_id: v.get('announce') || null,
            drops_enabled: v.get('drops_enabled') === 'on',
            duels_enabled: v.get('duels_enabled') === 'on'
        });
        if (ok) setEditing(null);
    }

    return (
        <>
            <PanelHeader
                title="Serwery"
                description="Serwery z ustawieniami bota i aktywnością z 30 dni. Blokada dropów działa jak przycisk w panelu bota: wyłącza dropy i nie pozwala administratorowi serwera ich włączyć."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            <div className={rs.filters}>
                <SearchBox value={query} onChange={setQuery} label="Nazwa albo ID serwera" />
                <div className="field">
                    <label htmlFor="g-filter">Pokaż</label>
                    <select
                        id="g-filter"
                        className="select"
                        value={filter}
                        onChange={e => {
                            setFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Wszystkie</option>
                        <option value="active">Bot jest na serwerze</option>
                        <option value="left">Bot usunięty</option>
                        <option value="drops">Z włączonymi dropami</option>
                        <option value="banned">Z blokadą dropów</option>
                    </select>
                </div>
            </div>
            {error && <LoadError message={error} onRetry={reload} />}
            {data &&
                (data.rows.length === 0 ? (
                    <Empty>Brak serwerów.</Empty>
                ) : (
                    <div className="table-wrap">
                        <table className={rs.compact}>
                            <thead>
                                <tr>
                                    <th scope="col">Serwer</th>
                                    <th scope="col" className={rs.num}>Członkowie</th>
                                    <th scope="col" className={rs.num}>Gracze 30 dni</th>
                                    <th scope="col" className={rs.num}>Obrót 30 dni</th>
                                    <th scope="col">Ustawienia</th>
                                    <th scope="col">
                                        <span className="sr-only">Akcje</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.map(g => {
                                    const icon = guildIconUrl(g);
                                    return (
                                        <Fragment key={g.guild_id}>
                                            <tr className={n(g.left_at) ? ui.itemDimmed : undefined}>
                                                <td>
                                                    <span className={rs.player}>
                                                        {icon && <img className={rs.avatar} src={icon} alt="" width={32} height={32} loading="lazy" />}
                                                        <span className={rs.playerText}>
                                                            <span className={rs.playerName}>{g.name || 'Bez nazwy'}</span>
                                                            <span className={rs.playerId}>
                                                                {g.guild_id} · od {when(g.joined_at)}
                                                                {n(g.left_at) ? ` · usunął bota ${when(g.left_at)}` : ''}
                                                            </span>
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className={rs.num}>{n(g.member_count) ? num.format(n(g.member_count)) : '-'}</td>
                                                <td className={rs.num}>{num.format(n(g.players))}</td>
                                                <td className={rs.num}>
                                                    <Link href={`/admin/royal/gry?guild=${g.guild_id}`}>{money(n(g.wagered))}</Link>
                                                </td>
                                                <td>
                                                    <span className={rs.flags}>
                                                        {g.drops_banned ? <Tag tone="warn">Dropy zablokowane</Tag> : g.drops_enabled ? <Tag tone="strong">Dropy</Tag> : null}
                                                        {!g.duels_enabled && <Tag tone="muted">Bez pojedynków</Tag>}
                                                        {g.casino_channel_id && <Tag>Kanał kasyna</Tag>}
                                                        {g.announce_channel_id && <Tag>Ogłoszenia</Tag>}
                                                        {g.language && <Tag>{g.language.toUpperCase()}</Tag>}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={ui.actions}>
                                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(editing === g.guild_id ? null : g.guild_id)}>
                                                            {editing === g.guild_id ? 'Zamknij' : 'Edytuj'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${g.drops_banned ? 'btn-ghost' : 'btn-danger'}`}
                                                            disabled={busy}
                                                            onClick={() => run(`/guilds/${g.guild_id}`, { drops_banned: !g.drops_banned })}
                                                        >
                                                            {g.drops_banned ? 'Odblokuj dropy' : 'Zablokuj dropy'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {editing === g.guild_id && (
                                                <tr>
                                                    <td colSpan={6}>
                                                        <form className={rs.inline} onSubmit={e => save(e, g.guild_id)}>
                                                            <div className="field">
                                                                <label htmlFor={`gl-${g.guild_id}`}>Język</label>
                                                                <select id={`gl-${g.guild_id}`} name="language" className="select" defaultValue={g.language ?? ''}>
                                                                    <option value="">Domyślny (polski)</option>
                                                                    <option value="pl">Polski</option>
                                                                    <option value="en">English</option>
                                                                </select>
                                                            </div>
                                                            <div className="field">
                                                                <label htmlFor={`gc-${g.guild_id}`}>Kanał kasyna (ID)</label>
                                                                <input id={`gc-${g.guild_id}`} name="casino" className="input" defaultValue={g.casino_channel_id ?? ''} inputMode="numeric" />
                                                            </div>
                                                            <div className="field">
                                                                <label htmlFor={`gd-${g.guild_id}`}>Kanał dropów (ID)</label>
                                                                <input id={`gd-${g.guild_id}`} name="drops" className="input" defaultValue={g.drops_channel_id ?? ''} inputMode="numeric" />
                                                            </div>
                                                            <div className="field">
                                                                <label htmlFor={`ga-${g.guild_id}`}>Kanał ogłoszeń (ID)</label>
                                                                <input id={`ga-${g.guild_id}`} name="announce" className="input" defaultValue={g.announce_channel_id ?? ''} inputMode="numeric" />
                                                            </div>
                                                            <label className="check">
                                                                <input type="checkbox" name="drops_enabled" defaultChecked={!!g.drops_enabled} disabled={!!g.drops_banned} /> Dropy
                                                            </label>
                                                            <label className="check">
                                                                <input type="checkbox" name="duels_enabled" defaultChecked={!!g.duels_enabled} /> Pojedynki
                                                            </label>
                                                            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                                                                Zapisz
                                                            </button>
                                                        </form>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
            {data && <Pager page={page} pages={pages} total={data.total} onPage={setPage} />}
        </>
    );
}

// ---------- Zgłoszenia ----------

interface Report {
    id: number;
    reporter_id: string;
    reported_id: string | null;
    type: string;
    description: string;
    guild_id: string | null;
    status: string;
    created_at: number;
    [key: string]: unknown;
}

const REPORT_TYPES: Record<string, string> = { bug: 'Błąd', naduzycie: 'Nadużycie', inne: 'Inne' };

function person(row: Report, prefix: 'reporter' | 'reported'): PlayerLike {
    return {
        user_id: String(row[`${prefix}_id`] ?? ''),
        username: row[`${prefix}_username`] as string | null,
        display_name: row[`${prefix}_display_name`] as string | null,
        avatar: row[`${prefix}_avatar`] as string | null
    };
}

export function ReportsView() {
    const [status, setStatus] = useState('open');
    const [page, setPage] = useState(1);
    const { data, error, loading, reload } = useResource<{ rows: Report[]; total: number; per: number }>(url('/reports', { status, page }), LOGIN);
    const { run, busy } = useAction(() => void reload());
    const bridge = useBridge(() => void reload());
    const [replying, setReplying] = useState<number | null>(null);
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;

    async function reply(event: FormEvent<HTMLFormElement>, report: Report) {
        event.preventDefault();
        const v = new FormData(event.currentTarget);
        const ok = await bridge.send({ action: 'report_reply', reportId: report.id, target: report.reporter_id, message: v.get('message'), close: v.get('close') === 'on' });
        if (ok) setReplying(null);
    }

    return (
        <>
            <PanelHeader
                title="Zgłoszenia"
                description="Zgłoszenia wysłane przez graczy komendą /zgłoszenie. Odpowiedź idzie do gracza DM-em od bota RoyalCasino."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            <div className={rs.filters}>
                <div className="field">
                    <label htmlFor="r-status">Status</label>
                    <select
                        id="r-status"
                        className="select"
                        value={status}
                        onChange={e => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="open">Otwarte</option>
                        <option value="closed">Zamknięte</option>
                        <option value="">Wszystkie</option>
                    </select>
                </div>
            </div>
            {error && <LoadError message={error} onRetry={reload} />}
            {data &&
                (data.rows.length === 0 ? (
                    <Empty>Brak zgłoszeń.</Empty>
                ) : (
                    <ul className={ui.list}>
                        {data.rows.map(r => (
                            <li key={r.id} className={`${ui.item} ${r.status === 'closed' ? ui.itemDimmed : ''}`}>
                                <div className={ui.itemHead}>
                                    <span className={rs.flags}>
                                        <strong>#{r.id}</strong> <Tag tone={r.type === 'naduzycie' ? 'warn' : undefined}>{REPORT_TYPES[r.type] ?? r.type}</Tag>
                                        {r.status === 'open' ? <Tag tone="strong">otwarte</Tag> : <Tag tone="muted">zamknięte</Tag>}
                                    </span>
                                    <span className={ui.itemDate}>{when(r.created_at)}</span>
                                </div>
                                <div className={ui.actions}>
                                    <span>
                                        Od: <Player p={person(r, 'reporter')} />
                                    </span>
                                    {r.reported_id && (
                                        <span>
                                            Na: <Player p={person(r, 'reported')} />
                                        </span>
                                    )}
                                </div>
                                <p>{r.description}</p>
                                {r.guild_id && <p className={rs.hint}>Serwer {r.guild_id}</p>}
                                <div className={ui.actions}>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setReplying(replying === r.id ? null : r.id)}>
                                        {replying === r.id ? 'Anuluj odpowiedź' : 'Odpowiedz DM-em'}
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(`/reports/${r.id}`, { status: r.status === 'open' ? 'closed' : 'open' })}>
                                        {r.status === 'open' ? 'Zamknij' : 'Otwórz ponownie'}
                                    </button>
                                    {r.reported_id && (
                                        <Link href={`/admin/royal/gracze/${r.reported_id}`} className="btn btn-ghost btn-sm">
                                            Karta zgłoszonego
                                        </Link>
                                    )}
                                </div>
                                {replying === r.id && (
                                    <form className={rs.dialogForm} onSubmit={e => reply(e, r)}>
                                        <div className="field">
                                            <label htmlFor={`rep-${r.id}`}>Odpowiedź do gracza</label>
                                            <textarea id={`rep-${r.id}`} name="message" className="textarea" rows={4} maxLength={3500} required />
                                        </div>
                                        <div className={ui.actions}>
                                            <label className="check">
                                                <input type="checkbox" name="close" defaultChecked /> Zamknij zgłoszenie po wysłaniu
                                            </label>
                                            <button type="submit" className="btn btn-primary btn-sm" disabled={bridge.busy}>
                                                {bridge.busy ? 'Wysyłanie...' : 'Wyślij'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </li>
                        ))}
                    </ul>
                ))}
            {data && <Pager page={page} pages={pages} total={data.total} onPage={setPage} />}
        </>
    );
}

// ---------- Wypłaty ----------

interface Payout extends PlayerLike {
    id: number;
    amount: number;
    status: string;
    note: string | null;
    created_at: number;
}

export function PayoutsView() {
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const { data, error, loading, reload } = useResource<{ rows: Payout[]; total: number; sum: number; per: number }>(url('/payouts', { status, page }), LOGIN);
    const { run, busy } = useAction(() => void reload());
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const v = new FormData(form);
        if (await run('/payouts', { userId: v.get('userId'), amount: v.get('amount'), status: v.get('status'), note: v.get('note') })) form.reset();
    }

    return (
        <>
            <PanelHeader
                title="Wypłaty"
                description="Księga ręcznych wypłat kredytów prowadzona przez staff (to samo co /payout w bocie admina). Wpis nie zmienia salda gracza."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            <form className={ui.block} onSubmit={create}>
                <h2 className={ui.blockTitle}>Nowy wpis</h2>
                <div className={rs.inline}>
                    <div className="field">
                        <label htmlFor="po-user">ID gracza</label>
                        <input id="po-user" name="userId" className="input" inputMode="numeric" required />
                    </div>
                    <div className="field">
                        <label htmlFor="po-amount">Kredyty</label>
                        <input id="po-amount" name="amount" className="input" type="number" min={1} required />
                    </div>
                    <div className="field">
                        <label htmlFor="po-status">Status</label>
                        <select id="po-status" name="status" className="select">
                            <option value="oczekuje">Oczekuje</option>
                            <option value="zrobione">Zrobione</option>
                            <option value="odrzucone">Odrzucone</option>
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="po-note">Notatka</label>
                        <input id="po-note" name="note" className="input" maxLength={1000} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                        Dodaj
                    </button>
                </div>
            </form>
            <div className={rs.filters}>
                <div className="field">
                    <label htmlFor="po-filter">Status</label>
                    <select
                        id="po-filter"
                        className="select"
                        value={status}
                        onChange={e => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Wszystkie</option>
                        <option value="oczekuje">Oczekuje</option>
                        <option value="zrobione">Zrobione</option>
                        <option value="odrzucone">Odrzucone</option>
                    </select>
                </div>
                {data && <p className="muted">Suma w filtrze: {num.format(data.sum)} kredytów</p>}
            </div>
            {error && <LoadError message={error} onRetry={reload} />}
            {data &&
                (data.rows.length === 0 ? (
                    <Empty>Brak wpisów.</Empty>
                ) : (
                    <div className="table-wrap">
                        <table className={rs.compact}>
                            <thead>
                                <tr>
                                    <th scope="col">Kiedy</th>
                                    <th scope="col">Gracz</th>
                                    <th scope="col" className={rs.num}>Kredyty</th>
                                    <th scope="col">Notatka</th>
                                    <th scope="col">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.map(p => (
                                    <tr key={p.id}>
                                        <td className={rs.num}>{when(p.created_at)}</td>
                                        <td>
                                            <Player p={p} />
                                        </td>
                                        <td className={rs.num}>{num.format(p.amount)}</td>
                                        <td>{p.note || '-'}</td>
                                        <td>
                                            <select
                                                className="select"
                                                value={p.status}
                                                disabled={busy}
                                                aria-label={`Status wpisu ${p.id}`}
                                                onChange={e => run(`/payouts/${p.id}`, { status: e.target.value })}
                                            >
                                                <option value="oczekuje">Oczekuje</option>
                                                <option value="zrobione">Zrobione</option>
                                                <option value="odrzucone">Odrzucone</option>
                                            </select>
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

// ---------- Jackpot ----------

interface Round extends PlayerLike {
    id: number;
    status: string;
    pot: number;
    total_tickets: number;
    draw_at: number;
    winner_id: string | null;
    winner_tickets: number;
    drawn_at: number;
}

export function JackpotView() {
    const { data, error, loading, reload } = useResource<{ rounds: Round[]; tickets: (PlayerLike & { tickets: number; is_blocked: number })[] }>(url('/jackpot', {}), LOGIN);
    const { run, busy } = useAction(() => void reload());
    const { confirm } = useFeedback();
    const open = data?.rounds.find(r => r.status === 'open');
    const totalTickets = data?.tickets.reduce((s, t) => s + n(t.tickets), 0) ?? 0;

    async function draw() {
        if (await confirm({ title: 'Rozlosować jackpot teraz?', body: 'Bot rozlosuje rundę w ciągu minuty, wypłaci pulę i wyśle ogłoszenia.', confirmLabel: 'Losuj teraz' })) {
            await run('/jackpot/draw', {});
        }
    }

    return (
        <>
            <PanelHeader title="Royal Jackpot" description="Bieżąca runda, bilety graczy i historia losowań." actions={<RefreshButton onClick={reload} loading={loading} />} />
            {error && <LoadError message={error} onRetry={reload} />}
            {data && (
                <>
                    {open ? (
                        <>
                            <Tiles
                                items={[
                                    { label: 'Pula', value: money(open.pot) },
                                    { label: 'Bilety', value: num.format(open.total_tickets) },
                                    { label: 'Gracze', value: num.format(data.tickets.length) },
                                    { label: 'Losowanie', value: when(open.draw_at) }
                                ]}
                            />
                            <div className={rs.filters}>
                                <button type="button" className="btn btn-primary btn-sm" onClick={draw} disabled={busy}>
                                    Losuj teraz
                                </button>
                            </div>
                            <div className={rs.columns}>
                                <section className={rs.panel}>
                                    <h2 className={rs.panelTitle}>Bilety w tej rundzie</h2>
                                    {data.tickets.length === 0 ? (
                                        <Empty>Nikt jeszcze nie kupił biletu.</Empty>
                                    ) : (
                                        <div className="table-wrap">
                                            <table className={rs.compact}>
                                                <thead>
                                                    <tr>
                                                        <th scope="col">Gracz</th>
                                                        <th scope="col" className={rs.num}>Bilety</th>
                                                        <th scope="col" className={rs.num}>Szansa</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.tickets.map(t => (
                                                        <tr key={t.user_id}>
                                                            <td>
                                                                <Player p={t} /> {n(t.is_blocked) ? <Tag tone="warn">blokada, nie wylosuje</Tag> : null}
                                                            </td>
                                                            <td className={rs.num}>{num.format(n(t.tickets))}</td>
                                                            <td className={rs.num}>{totalTickets ? `${((n(t.tickets) / totalTickets) * 100).toFixed(1)}%` : '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                                <RoundHistory rounds={data.rounds.filter(r => r.status !== 'open')} />
                            </div>
                        </>
                    ) : (
                        <RoundHistory rounds={data.rounds} />
                    )}
                </>
            )}
        </>
    );
}

function RoundHistory({ rounds }: { rounds: Round[] }) {
    return (
        <section className={rs.panel}>
            <h2 className={rs.panelTitle}>Historia</h2>
            {rounds.length === 0 ? (
                <Empty>Jeszcze nie było losowania.</Empty>
            ) : (
                <div className="table-wrap">
                    <table className={rs.compact}>
                        <thead>
                            <tr>
                                <th scope="col">Runda</th>
                                <th scope="col">Zwycięzca</th>
                                <th scope="col" className={rs.num}>Pula</th>
                                <th scope="col" className={rs.num}>Bilety</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rounds.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        #{r.id} <span className="muted small">{when(r.drawn_at || r.draw_at)}</span>
                                    </td>
                                    <td>{r.winner_id ? <Player p={{ ...r, user_id: r.winner_id }} sub={`${num.format(r.winner_tickets)} biletów`} /> : <span className="muted">pusta, pula przeszła dalej</span>}</td>
                                    <td className={rs.num}>{money(r.pot)}</td>
                                    <td className={rs.num}>{num.format(r.total_tickets)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

// ---------- Log admina ----------

interface AuditRow extends PlayerLike {
    id: number;
    admin_id: string;
    action: string;
    target_user_id: string | null;
    details: string | null;
    reason: string | null;
    created_at: number;
}

export function AuditView() {
    const [action, setAction] = useState('');
    const [user, setUser] = useState('');
    const [userDraft, setUserDraft] = useState('');
    const [source, setSource] = useState('');
    const [page, setPage] = useState(1);
    const { data, error, loading, reload } = useResource<{ rows: AuditRow[]; total: number; per: number; actions: string[] }>(url('/audit', { action, user, source, page }), LOGIN);
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;
    return (
        <>
            <PanelHeader
                title="Log admina"
                description="Wszystko, co zrobili admini: z bota (/panel, komendy) i z tej strony (oznaczone jako WWW)."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            <div className={rs.filters}>
                <div className="field">
                    <label htmlFor="a-action">Akcja</label>
                    <select
                        id="a-action"
                        className="select"
                        value={action}
                        onChange={e => {
                            setAction(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Wszystkie</option>
                        {data?.actions.map(a => (
                            <option key={a} value={a}>
                                {AUDIT_ACTIONS[a] ?? a}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="a-user">ID gracza</label>
                    <input
                        id="a-user"
                        className="input"
                        inputMode="numeric"
                        value={userDraft}
                        onChange={e => {
                            const v = e.target.value.trim();
                            setUserDraft(v);
                            // Filtr rusza dopiero przy pełnym ID (albo pustym polu), żeby nie pytać API o każdą cyfrę.
                            if (v === '' || /^\d{15,21}$/.test(v)) {
                                setUser(v);
                                setPage(1);
                            }
                        }}
                    />
                </div>
                <label className="check">
                    <input type="checkbox" checked={source === 'www'} onChange={e => setSource(e.target.checked ? 'www' : '')} /> Tylko ze strony
                </label>
            </div>
            {error && <LoadError message={error} onRetry={reload} />}
            {data &&
                (data.rows.length === 0 ? (
                    <Empty>Brak wpisów.</Empty>
                ) : (
                    <div className="table-wrap">
                        <table className={rs.compact}>
                            <thead>
                                <tr>
                                    <th scope="col">Kiedy</th>
                                    <th scope="col">Akcja</th>
                                    <th scope="col">Gracz</th>
                                    <th scope="col">Powód</th>
                                    <th scope="col">Szczegóły</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.map(row => {
                                    const www = (row.details || '').includes('"source":"www"');
                                    return (
                                        <tr key={row.id}>
                                            <td className={rs.num}>{when(row.created_at)}</td>
                                            <td>
                                                {AUDIT_ACTIONS[row.action] ?? row.action} {www && <Tag tone="muted">WWW</Tag>}
                                            </td>
                                            <td>{row.target_user_id ? <Player p={{ ...row, user_id: row.target_user_id }} /> : '-'}</td>
                                            <td>{row.reason || '-'}</td>
                                            <td className={rs.cell} title={row.details ?? ''}>
                                                {row.details || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
            {data && <Pager page={page} pages={pages} total={data.total} onPage={setPage} />}
        </>
    );
}
