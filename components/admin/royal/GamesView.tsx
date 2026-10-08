'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useResource } from '@/components/panel/hooks';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, Tag } from '@/components/panel/ui';
import { gameName, money, type PlayerLike } from '@/lib/royal/meta';
import { LOGIN, Net, Player, Tiles, rs, url, when } from './shared';

interface GameRow extends PlayerLike {
    id: number;
    game_type: string;
    bet_amount: number;
    win_amount: number;
    result: string;
    played_at: number;
    guild_id: string | null;
    guild_name: string | null;
}

interface GamesResponse {
    rows: GameRow[];
    total: number;
    per: number;
    summary: { games: number; players: number; wagered: number; paid: number; houseNet: number };
    types: string[];
}

const num = new Intl.NumberFormat('pl-PL');
const RESULT: Record<string, string> = { win: 'wygrana', loss: 'przegrana', tie: 'remis' };

export function GamesTable({ rows, showPlayer = true }: { rows: GameRow[]; showPlayer?: boolean }) {
    if (rows.length === 0) return <Empty>Brak gier dla tych filtrów.</Empty>;
    return (
        <div className="table-wrap">
            <table className={rs.compact}>
                <thead>
                    <tr>
                        <th scope="col">Kiedy</th>
                        {showPlayer && <th scope="col">Gracz</th>}
                        <th scope="col">Gra</th>
                        <th scope="col" className={rs.num}>Stawka</th>
                        <th scope="col" className={rs.num}>Wypłata</th>
                        <th scope="col" className={rs.num}>Netto</th>
                        <th scope="col">Wynik</th>
                        <th scope="col">Serwer</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => {
                        const net = row.win_amount - row.bet_amount;
                        const huge = row.win_amount >= 50_000 || (row.bet_amount >= 1000 && row.win_amount >= 20 * row.bet_amount);
                        return (
                            <tr key={row.id}>
                                <td className={rs.num}>{when(row.played_at)}</td>
                                {showPlayer && (
                                    <td>
                                        <Player p={row} />
                                    </td>
                                )}
                                <td>{gameName(row.game_type)}</td>
                                <td className={rs.num}>{money(row.bet_amount)}</td>
                                <td className={rs.num}>{money(row.win_amount)}</td>
                                <td className={rs.num}>
                                    <Net value={net} /> {huge && <Tag tone="warn">duża</Tag>}
                                </td>
                                <td>{RESULT[row.result] ?? row.result}</td>
                                <td>
                                    {row.guild_id ? (
                                        <Link href={`/admin/royal/gry?guild=${row.guild_id}`} title={row.guild_id}>
                                            {row.guild_name || `…${row.guild_id.slice(-6)}`}
                                        </Link>
                                    ) : (
                                        <span className="muted">DM</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/** Historia gier jednego gracza (karta gracza). */
export function PlayerGames({ userId }: { userId: string }) {
    const [page, setPage] = useState(1);
    const [game, setGame] = useState('');
    const { data, error, reload } = useResource<GamesResponse>(url('/games', { user: userId, game, page, per: 25 }), LOGIN);
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;
    return (
        <>
            <div className={rs.filters}>
                <div className="field">
                    <label htmlFor="pg-game">Gra</label>
                    <select
                        id="pg-game"
                        className="select"
                        value={game}
                        onChange={e => {
                            setGame(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Wszystkie</option>
                        {data?.types.map(t => (
                            <option key={t} value={t}>
                                {gameName(t)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {error && <LoadError message={error} onRetry={reload} />}
            {data && <GamesTable rows={data.rows} showPlayer={false} />}
            {data && <Pager page={page} pages={pages} total={data.total} onPage={setPage} />}
        </>
    );
}

export function GamesView() {
    const params = useSearchParams();
    const [filters, setFilters] = useState({
        user: params.get('user') ?? '',
        game: params.get('game') ?? '',
        guild: params.get('guild') ?? '',
        result: '',
        minBet: '',
        minNet: '',
        from: '',
        to: '',
        sort: ''
    });
    const [draft, setDraft] = useState(filters);
    const [page, setPage] = useState(1);
    const { data, error, loading, reload } = useResource<GamesResponse>(url('/games', { ...filters, page }), LOGIN);
    const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1;

    const field = (key: keyof typeof draft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
        <div className="field">
            <label htmlFor={`gf-${key}`}>{label}</label>
            <input id={`gf-${key}`} className="input" value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} {...props} />
        </div>
    );

    return (
        <>
            <PanelHeader
                title="Logi gier"
                description="Każda rozgrywka zapisana przez bota. Filtruj po graczu, grze, serwerze, kwotach i datach; podsumowanie liczy się z całego wyniku filtra."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <form
                className={rs.filters}
                onSubmit={e => {
                    e.preventDefault();
                    setFilters(draft);
                    setPage(1);
                }}
            >
                {field('user', 'Gracz (ID lub nick)')}
                <div className="field">
                    <label htmlFor="gf-game">Gra</label>
                    <select id="gf-game" className="select" value={draft.game} onChange={e => setDraft({ ...draft, game: e.target.value })}>
                        <option value="">Wszystkie</option>
                        {data?.types.map(t => (
                            <option key={t} value={t}>
                                {gameName(t)}
                            </option>
                        ))}
                    </select>
                </div>
                {field('guild', 'ID serwera', { inputMode: 'numeric' })}
                <div className="field">
                    <label htmlFor="gf-result">Wynik</label>
                    <select id="gf-result" className="select" value={draft.result} onChange={e => setDraft({ ...draft, result: e.target.value })}>
                        <option value="">Każdy</option>
                        <option value="win">Wygrana</option>
                        <option value="loss">Przegrana</option>
                        <option value="tie">Remis</option>
                    </select>
                </div>
                {field('minBet', 'Stawka od', { type: 'number', min: 0 })}
                {field('minNet', 'Zysk gracza od', { type: 'number', min: 0 })}
                {field('from', 'Od dnia', { type: 'date' })}
                {field('to', 'Do dnia', { type: 'date' })}
                <div className="field">
                    <label htmlFor="gf-sort">Kolejność</label>
                    <select id="gf-sort" className="select" value={draft.sort} onChange={e => setDraft({ ...draft, sort: e.target.value })}>
                        <option value="">Najnowsze</option>
                        <option value="net">Największy zysk gracza</option>
                        <option value="bet">Największa stawka</option>
                    </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                    Filtruj
                </button>
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                        const empty = { user: '', game: '', guild: '', result: '', minBet: '', minNet: '', from: '', to: '', sort: '' };
                        setDraft(empty);
                        setFilters(empty);
                        setPage(1);
                    }}
                >
                    Wyczyść
                </button>
            </form>

            {error && <LoadError message={error} onRetry={reload} />}
            {data && (
                <>
                    <Tiles
                        items={[
                            { label: 'Gry', value: num.format(data.summary.games) },
                            { label: 'Gracze', value: num.format(data.summary.players) },
                            { label: 'Postawione', value: money(data.summary.wagered) },
                            { label: 'Wypłacone', value: money(data.summary.paid) },
                            { label: 'Wynik kasyna', value: <Net value={data.summary.houseNet} /> }
                        ]}
                    />
                    <GamesTable rows={data.rows} />
                    <Pager page={page} pages={pages} total={data.total} onPage={setPage} />
                </>
            )}
        </>
    );
}
