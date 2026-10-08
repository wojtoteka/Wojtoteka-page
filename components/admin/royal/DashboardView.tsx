'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { LoadError, PanelHeader, RefreshButton, Tag, ui } from '@/components/panel/ui';
import { gameName, money, moneyShort } from '@/lib/royal/meta';
import { API, DayBars, LOGIN, Net, Tiles, rs, url, when } from './shared';

interface Dashboard {
    users: Record<string, number>;
    last24h: Record<string, number>;
    votes: Record<string, number>;
    daily: { day: string; games: number; wagered: number; houseNet: number; players: number }[];
    perGame: { game_type: string; games: number; wagered: number; houseNet: number }[];
    events: { event_type: string; value: number; expires_at: number }[];
    maintenance: boolean;
    jackpot: { id: number; pot: number; total_tickets: number; draw_at: number; players: number } | null;
    counts: Record<string, number>;
}

const num = new Intl.NumberFormat('pl-PL');

export function DashboardView() {
    const [days, setDays] = useState(30);
    const [metric, setMetric] = useState<'wagered' | 'games' | 'players'>('wagered');
    const { data, error, loading, reload } = useResource<Dashboard>(url('/dashboard', { days }), LOGIN);
    const { toast, confirm } = useFeedback();
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function post(path: string, json: unknown) {
        setBusy(true);
        const result = await api(`${API}${path}`, { method: 'POST', loginPath: LOGIN, json });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    async function toggleMaintenance() {
        if (!data) return;
        const on = !data.maintenance;
        const ok = await confirm({
            title: on ? 'Włączyć konserwację bota?' : 'Wyłączyć konserwację?',
            body: on ? 'Gracze nie zagrają w żadną grę, dopóki jej nie wyłączysz. Komendy informacyjne działają dalej.' : undefined,
            confirmLabel: on ? 'Włącz konserwację' : 'Wyłącz',
            danger: on
        });
        if (ok) await post('/maintenance', { on });
    }

    async function draw() {
        const ok = await confirm({
            title: 'Rozlosować jackpot teraz?',
            body: 'Bot rozlosuje otwartą rundę przy najbliższym sprawdzeniu (do minuty), wypłaci pulę i wyśle ogłoszenia.',
            confirmLabel: 'Losuj teraz'
        });
        if (ok) await post('/jackpot/draw', {});
    }

    async function customEvent(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        await post('/events', { action: 'custom', hours: values.get('hours'), xp: values.get('xp'), daily: values.get('daily') });
    }

    const u = data?.users;
    const d = data?.last24h;
    const series = data?.daily ?? [];

    return (
        <>
            <PanelHeader
                title="RoyalCasino"
                description="Stan bota na żywo z jego bazy. Zmiany z panelu bot widzi po kilku sekundach (ma krótkie cache), a każda trafia do logu admina bota."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            {error && <LoadError message={error} onRetry={reload} />}

            <form
                className={ui.block}
                onSubmit={event => {
                    event.preventDefault();
                    const value = String(new FormData(event.currentTarget).get('find') || '').trim();
                    if (!value) return;
                    router.push(/^\d{15,21}$/.test(value) ? `/admin/royal/gracze/${value}` : `/admin/royal/gracze?q=${encodeURIComponent(value)}`);
                }}
            >
                <div className={rs.inline}>
                    <div className="field">
                        <label htmlFor="find-player">Zarządzaj graczem: ID Discorda, nick albo kod polecający</label>
                        <input id="find-player" name="find" className="input" autoComplete="off" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">
                        Otwórz
                    </button>
                    <Link href="/admin/royal/narzedzia" className="btn btn-ghost btn-sm">
                        Rozdaj graczom
                    </Link>
                </div>
            </form>

            {data && u && d && (
                <>
                    <Tiles
                        items={[
                            { label: 'Gracze', value: num.format(u.total), note: `+${num.format(u.new24h)} w 24h · +${num.format(u.new7d)} w 7 dni` },
                            { label: 'Serwery', value: num.format(data.counts.guilds) },
                            { label: 'Gry w 24h', value: num.format(d.games), note: `${num.format(d.players)} graczy` },
                            { label: 'Obrót 24h', value: moneyShort(d.wagered), note: money(d.wagered) },
                            { label: 'Wynik kasyna 24h', value: <Net value={d.houseNet} />, note: 'stawki minus wypłaty' },
                            { label: 'Pieniądze w obiegu', value: moneyShort(u.money), note: `${num.format(u.credits)} kredytów` },
                            { label: 'Cashback do odbioru', value: moneyShort(u.rakeback) },
                            { label: 'Gry łącznie', value: num.format(u.games) },
                            { label: 'Głosy', value: num.format(data.votes.total), note: `${num.format(data.votes.last24h || 0)} w 24h` },
                            { label: 'Dropy w 24h', value: num.format(data.counts.drops24h) }
                        ]}
                    />

                    <div className={rs.columns}>
                        <section className={`${rs.panel} ${rs.wide}`} aria-labelledby="wykres-tytul">
                            <div className={ui.toolbar}>
                                <h2 id="wykres-tytul" className={rs.panelTitle}>
                                    {metric === 'wagered' ? 'Obrót' : metric === 'games' ? 'Gry' : 'Aktywni gracze'} dziennie
                                </h2>
                                <div className={rs.inline}>
                                    <select className="select" value={metric} onChange={e => setMetric(e.target.value as typeof metric)} aria-label="Miara">
                                        <option value="wagered">Obrót</option>
                                        <option value="games">Gry</option>
                                        <option value="players">Aktywni gracze</option>
                                    </select>
                                    <select className="select" value={days} onChange={e => setDays(Number(e.target.value))} aria-label="Okres">
                                        <option value={7}>7 dni</option>
                                        <option value={30}>30 dni</option>
                                        <option value={90}>90 dni</option>
                                    </select>
                                </div>
                            </div>
                            <DayBars
                                rows={series}
                                value={row => Number(row[metric]) || 0}
                                label={metric === 'wagered' ? 'Obrót dziennie' : metric === 'games' ? 'Gry dziennie' : 'Aktywni gracze dziennie'}
                                format={n => (metric === 'wagered' ? money(n) : num.format(n))}
                            />
                            <details>
                                <summary>Tabela dzienna</summary>
                                <div className="table-wrap">
                                    <table className={rs.compact}>
                                        <thead>
                                            <tr>
                                                <th scope="col">Dzień</th>
                                                <th scope="col" className={rs.num}>Gry</th>
                                                <th scope="col" className={rs.num}>Gracze</th>
                                                <th scope="col" className={rs.num}>Obrót</th>
                                                <th scope="col" className={rs.num}>Wynik kasyna</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...series].reverse().map(row => (
                                                <tr key={row.day}>
                                                    <td>{row.day}</td>
                                                    <td className={rs.num}>{num.format(row.games)}</td>
                                                    <td className={rs.num}>{num.format(row.players)}</td>
                                                    <td className={rs.num}>{money(row.wagered)}</td>
                                                    <td className={rs.num}>
                                                        <Net value={row.houseNet} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        </section>

                        <section className={rs.panel} aria-labelledby="sterowanie-tytul">
                            <h2 id="sterowanie-tytul" className={rs.panelTitle}>
                                Sterowanie botem
                            </h2>
                            <p>
                                Konserwacja: {data.maintenance ? <Tag tone="warn">włączona</Tag> : <Tag>wyłączona</Tag>}
                            </p>
                            <div className={ui.actions}>
                                <button type="button" className={`btn btn-sm ${data.maintenance ? 'btn-primary' : 'btn-danger'}`} onClick={toggleMaintenance} disabled={busy}>
                                    {data.maintenance ? 'Wyłącz konserwację' : 'Włącz konserwację'}
                                </button>
                            </div>
                            <p>
                                Aktywne eventy:{' '}
                                {data.events.length === 0
                                    ? 'brak'
                                    : data.events.map(ev => (
                                          <Tag key={ev.event_type} tone="strong">
                                              {ev.event_type === 'xp_multiplier' ? `XP ×${ev.value}` : `Daily +${ev.value}%`} do {when(ev.expires_at)}
                                          </Tag>
                                      ))}
                            </p>
                            <div className={ui.actions}>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => post('/events', { action: 'xp2' })}>
                                    XP ×2 na 24h
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => post('/events', { action: 'daily50' })}>
                                    Daily +50% na 24h
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => post('/events', { action: 'weekend' })}>
                                    Weekend (oba, 48h)
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={busy || data.events.length === 0} onClick={() => post('/events', { action: 'off' })}>
                                    Wyłącz eventy
                                </button>
                            </div>
                            <form className={rs.inline} onSubmit={customEvent}>
                                <div className="field">
                                    <label htmlFor="ev-xp">Mnożnik XP</label>
                                    <input id="ev-xp" name="xp" className="input" type="number" min={1} max={10} step={0.1} placeholder="np. 1.5" />
                                </div>
                                <div className="field">
                                    <label htmlFor="ev-daily">Daily +%</label>
                                    <input id="ev-daily" name="daily" className="input" type="number" min={1} max={500} placeholder="np. 25" />
                                </div>
                                <div className="field">
                                    <label htmlFor="ev-hours">Godziny</label>
                                    <input id="ev-hours" name="hours" className="input" type="number" min={1} max={720} defaultValue={24} required />
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                                    Ustaw
                                </button>
                            </form>
                        </section>

                        <section className={rs.panel} aria-labelledby="stan-tytul">
                            <h2 id="stan-tytul" className={rs.panelTitle}>
                                Do zrobienia
                            </h2>
                            <dl className={rs.kv}>
                                <dt>Otwarte zgłoszenia</dt>
                                <dd>
                                    <Link href="/admin/royal/zgloszenia">{num.format(data.counts.reports)}</Link>
                                </dd>
                                <dt>Wypłaty oczekujące</dt>
                                <dd>
                                    <Link href="/admin/royal/wyplaty">{num.format(data.counts.payouts)}</Link>
                                </dd>
                                <dt>Obserwowani</dt>
                                <dd>
                                    <Link href="/admin/royal/podejrzani">{num.format(data.counts.watched)}</Link>
                                </dd>
                                <dt>Zablokowani / zamrożeni</dt>
                                <dd>
                                    {num.format(u.blocked)} / {num.format(u.frozen)}
                                </dd>
                                <dt>Otwarte Miny</dt>
                                <dd>
                                    {num.format(data.counts.mines)}
                                    {data.counts.staleMines > 0 && ` (${data.counts.staleMines} porzuconych ponad 2h)`}
                                </dd>
                                <dt>Otwarte zakłady Crash Live</dt>
                                <dd>{num.format(data.counts.liveBets)}</dd>
                            </dl>
                            <h3 className={rs.panelTitle}>Royal Jackpot</h3>
                            {data.jackpot ? (
                                <>
                                    <p>
                                        Pula <strong>{money(data.jackpot.pot)}</strong>, {num.format(data.jackpot.total_tickets)} biletów, {num.format(data.jackpot.players)} graczy. Losowanie{' '}
                                        {when(data.jackpot.draw_at)}.
                                    </p>
                                    <div className={ui.actions}>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={draw} disabled={busy}>
                                            Losuj teraz
                                        </button>
                                        <Link href="/admin/royal/jackpot" className="btn btn-ghost btn-sm">
                                            Bilety i historia
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <p className="muted">Brak otwartej rundy.</p>
                            )}
                        </section>

                        <section className={`${rs.panel} ${rs.wide}`} aria-labelledby="gry-tytul">
                            <h2 id="gry-tytul" className={rs.panelTitle}>
                                Gry z ostatnich 7 dni
                            </h2>
                            <div className="table-wrap">
                                <table className={rs.compact}>
                                    <thead>
                                        <tr>
                                            <th scope="col">Gra</th>
                                            <th scope="col" className={rs.num}>Rozgrywki</th>
                                            <th scope="col" className={rs.num}>Obrót</th>
                                            <th scope="col" className={rs.num}>Wynik kasyna</th>
                                            <th scope="col" className={rs.num}>Przewaga</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.perGame.map(row => (
                                            <tr key={row.game_type}>
                                                <td>
                                                    <Link href={`/admin/royal/gry?game=${encodeURIComponent(row.game_type)}`}>{gameName(row.game_type)}</Link>
                                                </td>
                                                <td className={rs.num}>{num.format(row.games)}</td>
                                                <td className={rs.num}>{money(row.wagered)}</td>
                                                <td className={rs.num}>
                                                    <Net value={row.houseNet} />
                                                </td>
                                                <td className={rs.num}>{row.wagered > 0 ? `${((row.houseNet / row.wagered) * 100).toFixed(1)}%` : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </>
            )}
        </>
    );
}
