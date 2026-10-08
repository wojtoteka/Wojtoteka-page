'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useResource } from '@/components/panel/hooks';
import { Empty, LoadError, PanelHeader, RefreshButton, Tag } from '@/components/panel/ui';
import { gameName, guildIconUrl, money, type PlayerLike } from '@/lib/royal/meta';
import { Flags, LOGIN, Net, Player, rs, url, when, type FlagRow } from './shared';

type P = PlayerLike & FlagRow & Record<string, unknown>;
const num = new Intl.NumberFormat('pl-PL');
const n = (v: unknown) => Number(v) || 0;

function Section({ title, hint, children, wide = true }: { title: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
    return (
        <section className={`${rs.panel} ${wide ? rs.wide : ''}`}>
            <h2 className={rs.panelTitle}>{title}</h2>
            {hint && <p className={rs.hint}>{hint}</p>}
            {children}
        </section>
    );
}

function Table({ cols, rows, empty }: { cols: { label: string; num?: boolean; cell: (row: P) => React.ReactNode }[]; rows: P[]; empty: string }) {
    if (rows.length === 0) return <Empty>{empty}</Empty>;
    return (
        <div className="table-wrap">
            <table className={rs.compact}>
                <thead>
                    <tr>
                        {cols.map(c => (
                            <th key={c.label} scope="col" className={c.num ? rs.num : undefined}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={`${row.user_id}-${i}`}>
                            {cols.map(c => (
                                <td key={c.label} className={c.num ? rs.num : undefined}>
                                    {c.cell(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const playerCol = { label: 'Gracz', cell: (r: P) => <Player p={r} /> };
const flagsCol = { label: 'Status', cell: (r: P) => <Flags row={r} /> };

interface Suspicious {
    roi: P[];
    hugeWins: P[];
    winners24h: P[];
    newRich: P[];
    referrers: P[];
    drops: P[];
    watched: P[];
    restricted: P[];
}

export function SuspiciousView() {
    const { data, error, loading, reload } = useResource<Suspicious>(url('/suspicious', {}), LOGIN);
    return (
        <>
            <PanelHeader
                title="Podejrzani"
                description="Listy liczone z bazy na żywo, tymi samymi progami co alerty bota. To sygnały do sprawdzenia, nie wyroki: zanim zablokujesz, otwórz kartę gracza i jego historię."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            {error && <LoadError message={error} onRetry={reload} />}
            {data && (
                <div className={rs.columns}>
                    <Section title={`Wysokie ROI (${data.roi.length})`} hint="Zysk z historii większy niż 15% postawionych kwot przy co najmniej 30 grach. Przy przewadze kasyna to statystycznie bardzo mało prawdopodobne.">
                        <Table
                            rows={data.roi}
                            empty="Nikt nie przekracza progu."
                            cols={[
                                playerCol,
                                { label: 'ROI', num: true, cell: r => `${(n(r.roi) * 100).toFixed(1)}%` },
                                { label: 'Gry', num: true, cell: r => num.format(n(r.games)) },
                                { label: 'Obrót', num: true, cell: r => money(n(r.wagered)) },
                                { label: 'Zysk', num: true, cell: r => <Net value={n(r.net)} /> },
                                { label: 'Saldo', num: true, cell: r => money(n(r.money)) },
                                flagsCol
                            ]}
                        />
                    </Section>
                    <Section title={`Ogromne wygrane z 7 dni (${data.hugeWins.length})`} hint="Wygrana od $50k albo co najmniej 20× stawki przy stawce od $1k.">
                        <Table
                            rows={data.hugeWins}
                            empty="Brak."
                            cols={[
                                { label: 'Kiedy', num: true, cell: r => when(n(r.played_at)) },
                                playerCol,
                                { label: 'Gra', cell: r => gameName(String(r.game_type)) },
                                { label: 'Stawka', num: true, cell: r => money(n(r.bet_amount)) },
                                { label: 'Wygrana', num: true, cell: r => money(n(r.win_amount)) },
                                { label: 'Mnożnik', num: true, cell: r => (n(r.bet_amount) ? `${(n(r.win_amount) / n(r.bet_amount)).toFixed(1)}×` : '-') },
                                flagsCol
                            ]}
                        />
                    </Section>
                    <Section title="Najwięcej wygrali w 24h" wide={false}>
                        <Table
                            rows={data.winners24h}
                            empty="Brak."
                            cols={[playerCol, { label: 'Gry', num: true, cell: r => num.format(n(r.games)) }, { label: 'Zysk', num: true, cell: r => <Net value={n(r.net)} /> }]}
                        />
                    </Section>
                    <Section title="Nowe konta z dużym saldem" hint="Założone w ostatnich 7 dniach, saldo od $100k albo 1000+ kredytów." wide={false}>
                        <Table
                            rows={data.newRich}
                            empty="Brak."
                            cols={[playerCol, { label: 'Saldo', num: true, cell: r => money(n(r.money)) }, { label: 'Gry', num: true, cell: r => num.format(n(r.total_games)) }, { label: 'Od', num: true, cell: r => when(String(r.created_at)) }]}
                        />
                    </Section>
                    <Section title="Polecenia: możliwe multikonta" hint="Polecający z co najmniej 3 poleconymi. „Martwe” to polecone konta z mniej niż 5 grami: dużo martwych to typowy obraz zakładania kont pod bonus.">
                        <Table
                            rows={data.referrers}
                            empty="Brak."
                            cols={[
                                playerCol,
                                { label: 'Polecił', num: true, cell: r => num.format(n(r.referred)) },
                                { label: 'Martwe', num: true, cell: r => (n(r.idle) >= 3 ? <Tag tone="warn">{n(r.idle)}</Tag> : n(r.idle)) },
                                { label: 'Ostatnie', num: true, cell: r => when(String(r.last_at)) },
                                flagsCol
                            ]}
                        />
                    </Section>
                    <Section title="Dropy z 7 dni" hint="Bot pozwala na 5 dropów dziennie. Wielu odbiorów z jednego serwera warto się przyjrzeć." wide={false}>
                        <Table
                            rows={data.drops}
                            empty="Brak."
                            cols={[playerCol, { label: 'Odebrane', num: true, cell: r => num.format(n(r.claimed)) }, { label: 'Suma', num: true, cell: r => money(n(r.total)) }, { label: 'Serwery', num: true, cell: r => n(r.guilds) }]}
                        />
                    </Section>
                    <Section title={`Obserwowani (${data.watched.length})`} wide={false}>
                        <Table
                            rows={data.watched}
                            empty="Nikt nie jest obserwowany."
                            cols={[playerCol, { label: 'Notatka', cell: r => String(r.note || '-') }, { label: 'Od', num: true, cell: r => when(n(r.created_at)) }]}
                        />
                    </Section>
                    <Section title={`Ograniczeni (${data.restricted.length})`} hint="Zablokowani, zamrożeni i z limitem zakładu.">
                        <Table
                            rows={data.restricted}
                            empty="Nikt."
                            cols={[
                                playerCol,
                                flagsCol,
                                { label: 'Powód', cell: r => String(r.blocked_reason || '-') },
                                { label: 'Do', num: true, cell: r => (n(r.is_blocked) ? (n(r.blocked_until) ? when(n(r.blocked_until)) : 'na stałe') : n(r.max_bet) ? when(n(r.max_bet_until)) : '-') }
                            ]}
                        />
                    </Section>
                </div>
            )}
        </>
    );
}

interface Rankings {
    labels: Record<string, string>;
    boards: Record<string, P[]>;
    servers: (Record<string, unknown> & { guild_id: string; icon: string | null })[];
}

const MONEY_BOARDS = new Set(['money', 'wagered', 'biggest', 'rakeback', 'net', 'losers']);

export function RankingsView() {
    const [blocked, setBlocked] = useState(false);
    const [limit, setLimit] = useState(15);
    const { data, error, loading, reload } = useResource<Rankings>(url('/rankings', { blocked: blocked ? 1 : '', limit }), LOGIN);
    return (
        <>
            <PanelHeader
                title="Rankingi"
                description="Wszystkie rankingi z bazy w jednym miejscu, także te, których bot nie pokazuje graczom. Publiczny ranking na stronie pomija zablokowanych i ukrytych."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            <div className={rs.filters}>
                <label className="check">
                    <input type="checkbox" checked={blocked} onChange={e => setBlocked(e.target.checked)} /> Pokaż też zablokowanych
                </label>
                <div className="field">
                    <label htmlFor="rk-limit">Miejsc</label>
                    <select id="rk-limit" className="select" value={limit} onChange={e => setLimit(Number(e.target.value))}>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>
            {error && <LoadError message={error} onRetry={reload} />}
            {data && (
                <div className={rs.columns}>
                    {Object.entries(data.boards).map(([key, rows]) => (
                        <Section key={key} title={data.labels[key] ?? key} wide={false}>
                            <Table
                                rows={rows}
                                empty="Pusto."
                                cols={[
                                    { label: '#', num: true, cell: r => rows.indexOf(r) + 1 },
                                    playerCol,
                                    {
                                        label: 'Wartość',
                                        num: true,
                                        cell: r => (key === 'net' || key === 'losers' ? <Net value={n(r.value)} /> : MONEY_BOARDS.has(key) ? money(n(r.value)) : num.format(n(r.value)))
                                    },
                                    { label: '', cell: r => (n(r.is_blocked) ? <Tag tone="warn">blokada</Tag> : n(r.web_hidden) ? <Tag tone="muted">ukryty</Tag> : null) }
                                ]}
                            />
                        </Section>
                    ))}
                    <Section title="Serwery (obrót 30 dni)">
                        {data.servers.length === 0 ? (
                            <Empty>Brak gier na serwerach.</Empty>
                        ) : (
                            <div className="table-wrap">
                                <table className={rs.compact}>
                                    <thead>
                                        <tr>
                                            <th scope="col">#</th>
                                            <th scope="col">Serwer</th>
                                            <th scope="col" className={rs.num}>Gracze</th>
                                            <th scope="col" className={rs.num}>Gry</th>
                                            <th scope="col" className={rs.num}>Obrót</th>
                                            <th scope="col" className={rs.num}>Wynik kasyna</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.servers.map((s, i) => {
                                            const icon = guildIconUrl(s);
                                            return (
                                                <tr key={s.guild_id}>
                                                    <td>{i + 1}</td>
                                                    <td>
                                                        <Link href={`/admin/royal/serwery?q=${s.guild_id}`} className={rs.player}>
                                                            {icon && <img className={rs.avatar} src={icon} alt="" width={32} height={32} loading="lazy" />}
                                                            <span className={rs.playerText}>
                                                                <span className={rs.playerName}>{String(s.name || 'Bez nazwy')}</span>
                                                                <span className={rs.playerId}>{s.guild_id}</span>
                                                            </span>
                                                        </Link>
                                                    </td>
                                                    <td className={rs.num}>{num.format(n(s.players))}</td>
                                                    <td className={rs.num}>{num.format(n(s.games))}</td>
                                                    <td className={rs.num}>{money(n(s.wagered))}</td>
                                                    <td className={rs.num}>
                                                        <Net value={n(s.houseNet)} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>
                </div>
            )}
        </>
    );
}
