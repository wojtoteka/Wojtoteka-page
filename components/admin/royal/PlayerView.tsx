'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { Empty, LoadError, PanelHeader, RefreshButton, Tag, ui } from '@/components/panel/ui';
import { ACHIEVEMENTS, AUDIT_ACTIONS, THEMES, avatarUrl, gameName, money, playerName, vipTier, VIP_TIERS, type PlayerLike } from '@/lib/royal/meta';
import { PlayerGames } from './GamesView';
import { API, Flags, LOGIN, Net, Player, Tiles, rs, useBridge, when } from './shared';

type R = Record<string, unknown>;

interface Card {
    user: R & PlayerLike;
    rank: number | null;
    stats: R;
    last7: R;
    perGame: { game_type: string; games: number; wagered: number; net: number; best: number }[];
    guilds: { guild_id: string; games: number; name: string | null }[];
    achievements: { achievement_id: string; unlocked_at: number }[];
    quests: { id: number; quest_label: string; progress: number; target: number; completed: number; reward_money: number }[];
    notes: { id: number; note: string; created_at: number }[];
    watch: { note: string | null; created_at: number } | null;
    referrer: PlayerLike | null;
    referred: (PlayerLike & { total_games: number; money: number; created_at: string })[];
    votes: { total: number; last: number | null };
    drops: { claimed: number; total: number; last: number | null };
    mines: { bet: number; mines_count: number; created_at: number } | null;
    liveBets: { round_id: string; bet: number }[];
    jackpot: { round_id: number; tickets: number; status: string; winner_id: string | null }[];
    payouts: { id: number; amount: number; status: string; note: string | null; created_at: number }[];
    reports: { id: number; reporter_id: string; reported_id: string | null; type: string; description: string; status: string; created_at: number }[];
    log: { id: number; action: string; details: string | null; reason: string | null; created_at: number }[];
}

const num = new Intl.NumberFormat('pl-PL');
const n = (v: unknown) => Number(v) || 0;

export function PlayerView({ userId }: { userId: string }) {
    const router = useRouter();
    const { data, error, loading, reload } = useResource<Card>(`${API}/players/${userId}`, LOGIN);
    const { toast, confirm } = useFeedback();
    const [busy, setBusy] = useState(false);
    const bridge = useBridge(() => void reload());

    async function act(path: string, json: unknown, method: 'POST' | 'DELETE' = 'POST'): Promise<boolean> {
        setBusy(true);
        const result = await api(`${API}/players/${userId}${path}`, { method, loginPath: LOGIN, json });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) void reload();
        return result.ok;
    }

    function formSubmit(path: string, build: (values: FormData) => unknown, reset = true) {
        return async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = event.currentTarget;
            if ((await act(path, build(new FormData(form)))) && reset) form.reset();
        };
    }

    if (error) {
        return (
            <>
                <PanelHeader title="Gracz" />
                <LoadError message={error} onRetry={reload} />
                <Link href="/admin/royal/gracze">← Lista graczy</Link>
            </>
        );
    }
    if (!data) return <PanelHeader title="Gracz" description="Wczytywanie..." />;

    const u = data.user;
    const tier = vipTier(n(u.total_wagered));
    const nextTier = VIP_TIERS[VIP_TIERS.findIndex(t => t.id === tier.id) + 1];
    const blocked = n(u.is_blocked) === 1;
    const frozen = n(u.is_frozen) === 1;
    const hidden = n(u.web_hidden) === 1;
    const ownedIds = (() => {
        try {
            const parsed = JSON.parse(String(u.owned_themes || '[]'));
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [] as string[];
        }
    })();
    const owned = ownedIds.map(t => THEMES[t] ?? t);

    async function resetAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const stats = form.get('stats') === 'on';
        const history = form.get('history') === 'on';
        const ok = await confirm({
            title: `Zresetować konto ${playerName(u)}?`,
            body: `Saldo wróci do $5,000, kredyty, cashback, poziom, XP i seria daily się wyzerują${stats ? ', razem ze statystykami' : ''}${history ? '. Historia gier, osiągnięcia i questy zostaną usunięte' : ''}. Tego nie da się cofnąć.`,
            confirmLabel: 'Zresetuj konto',
            danger: true
        });
        if (ok) await act('/reset', { stats, history, reason: form.get('reason') });
    }
    const unlocked = new Set(data.achievements.map(a => a.achievement_id));

    async function remove() {
        const ok = await confirm({
            title: `Usunąć konto ${playerName(u)}?`,
            body: 'Znikną saldo, historia gier, osiągnięcia, questy, notatki, zgłoszenia i bilety. Tego nie da się cofnąć. Gracz przy następnej komendzie zacznie od nowa.',
            confirmLabel: 'Usuń konto na zawsze',
            danger: true
        });
        if (ok && (await act('', { reason: 'usunięcie z panelu WWW' }, 'DELETE'))) router.push('/admin/royal/gracze');
    }

    return (
        <>
            <PanelHeader
                title="Karta gracza"
                description={
                    <Link href="/admin/royal/gracze" className="muted">
                        ← Lista graczy
                    </Link>
                }
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <div className={rs.profile}>
                <img className={`${rs.avatar} ${rs.avatarBig}`} src={avatarUrl(u)} alt="" width={72} height={72} />
                <div className={rs.playerText}>
                    <span className={rs.profileName}>{playerName(u)}</span>
                    <span className="muted">
                        {u.username ? `@${String(u.username)} · ` : ''}
                        <span className={ui.mono}>{u.user_id}</span>
                    </span>
                    <Flags row={{ ...u, watched: data.watch ? 1 : 0 } as never} />
                </div>
                <div className={ui.actions}>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={bridge.busy} onClick={() => bridge.send({ action: 'refresh_profile', target: userId })}>
                        {bridge.busy ? 'Bot pracuje...' : 'Odśwież nick i awatar'}
                    </button>
                    <a href="#dm-t" className="btn btn-ghost btn-sm">
                        Napisz DM
                    </a>
                    <a href="#hist-t" className="btn btn-ghost btn-sm">
                        Historia gier
                    </a>
                </div>
            </div>

            <Tiles
                items={[
                    { label: 'Saldo', value: money(n(u.money)), note: data.rank ? `#${data.rank} w rankingu` : 'poza rankingiem' },
                    { label: 'Kredyty', value: num.format(n(u.credits)) },
                    { label: 'Poziom', value: n(u.level), note: `${num.format(n(u.xp))} XP` },
                    { label: 'VIP', value: tier.name, note: nextTier ? `do ${nextTier.name}: ${money(nextTier.minWagered - n(u.total_wagered))}` : 'najwyższy' },
                    { label: 'Cashback', value: money(n(u.rakeback_balance)), note: `łącznie ${money(n(u.rakeback_total))}` },
                    { label: 'Obstawione', value: money(n(u.total_wagered)) },
                    { label: 'Wynik z historii', value: <Net value={n(data.stats.net)} />, note: `${num.format(n(data.stats.games))} gier, ROI ${n(data.stats.wagered) ? ((n(data.stats.net) / n(data.stats.wagered)) * 100).toFixed(1) : '0'}%` },
                    { label: 'Ostatnie 7 dni', value: <Net value={n(data.last7.net)} />, note: `${num.format(n(data.last7.games))} gier, ${money(n(data.last7.wagered))}` }
                ]}
            />

            <div className={rs.columns}>
                {/* ---------- Saldo ---------- */}
                <section className={rs.panel} aria-labelledby="saldo-t">
                    <h2 id="saldo-t" className={rs.panelTitle}>
                        Saldo i waluty
                    </h2>
                    <form
                        className={rs.inline}
                        onSubmit={formSubmit('/balance', v => ({ currency: v.get('currency'), op: v.get('op'), amount: v.get('amount'), reason: v.get('reason') }))}
                    >
                        <div className="field">
                            <label htmlFor="b-cur">Waluta</label>
                            <select id="b-cur" name="currency" className="select">
                                <option value="money">Pieniądze ($)</option>
                                <option value="credits">Kredyty</option>
                                <option value="rakeback">Cashback do odbioru</option>
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="b-op">Operacja</label>
                            <select id="b-op" name="op" className="select">
                                <option value="add">Dodaj</option>
                                <option value="remove">Odejmij</option>
                                <option value="set">Ustaw na</option>
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="b-amount">Kwota</label>
                            <input id="b-amount" name="amount" className="input" type="number" min={0} required />
                        </div>
                        <div className="field">
                            <label htmlFor="b-reason">Powód (do logu)</label>
                            <input id="b-reason" name="reason" className="input" maxLength={500} />
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                            Zapisz
                        </button>
                    </form>
                    <p className={rs.hint}>Zmiana idzie pod tą samą blokadą co gra w bocie, więc nie nadpisze trwającej rozgrywki.</p>
                </section>

                {/* ---------- Moderacja ---------- */}
                <section className={rs.panel} aria-labelledby="mod-t">
                    <h2 id="mod-t" className={rs.panelTitle}>
                        Moderacja
                    </h2>
                    {blocked ? (
                        <div className={rs.inline}>
                            <p>
                                Zablokowany {n(u.blocked_until) ? `do ${when(n(u.blocked_until))}` : 'na stałe'}: {String(u.blocked_reason || 'bez powodu')}
                            </p>
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act('/block', { on: false })}>
                                Odblokuj
                            </button>
                        </div>
                    ) : (
                        <form className={rs.inline} onSubmit={formSubmit('/block', v => ({ on: true, hours: v.get('hours'), reason: v.get('reason') }))}>
                            <div className="field">
                                <label htmlFor="bl-reason">Powód blokady</label>
                                <input id="bl-reason" name="reason" className="input" maxLength={500} placeholder="Naruszenie regulaminu" />
                            </div>
                            <div className="field">
                                <label htmlFor="bl-hours">Na ile</label>
                                <select id="bl-hours" name="hours" className="select" defaultValue="0">
                                    <option value="1">1 godzina</option>
                                    <option value="24">1 dzień</option>
                                    <option value="72">3 dni</option>
                                    <option value="168">7 dni</option>
                                    <option value="720">30 dni</option>
                                    <option value="0">Na stałe</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-danger btn-sm" disabled={busy}>
                                Zablokuj
                            </button>
                        </form>
                    )}
                    <div className={ui.actions}>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('/freeze', { on: !frozen })}>
                            {frozen ? 'Odmroź konto' : 'Zamroź konto'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('/watch', { on: !data.watch })}>
                            {data.watch ? 'Przestań obserwować' : 'Obserwuj'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('/hidden', { on: !hidden })}>
                            {hidden ? 'Pokaż w rankingu WWW' : 'Ukryj w rankingu WWW'}
                        </button>
                    </div>
                    <form className={rs.inline} onSubmit={formSubmit('/limit', v => ({ amount: v.get('amount'), hours: v.get('hours') }), false)}>
                        <div className="field">
                            <label htmlFor="lim-amount">Limit zakładu ($, 0 = zdejmij)</label>
                            <input id="lim-amount" name="amount" className="input" type="number" min={0} defaultValue={n(u.max_bet) || ''} />
                        </div>
                        <div className="field">
                            <label htmlFor="lim-hours">Godziny</label>
                            <input id="lim-hours" name="hours" className="input" type="number" min={1} defaultValue={24} />
                        </div>
                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                            Ustaw limit
                        </button>
                    </form>
                    {n(u.max_bet) > 0 && <p className={rs.hint}>Obecny limit {money(n(u.max_bet))} do {when(n(u.max_bet_until))}.</p>}
                </section>

                {/* ---------- Wiadomość ---------- */}
                <section className={rs.panel} aria-labelledby="dm-t">
                    <h2 id="dm-t" className={rs.panelTitle}>
                        Wiadomość do gracza (DM od bota)
                    </h2>
                    <form
                        className={rs.dialogForm}
                        onSubmit={async event => {
                            event.preventDefault();
                            const form = event.currentTarget;
                            const v = new FormData(form);
                            if (await bridge.send({ action: 'dm', target: userId, title: v.get('title'), message: v.get('message') })) form.reset();
                        }}
                    >
                        <div className="field">
                            <label htmlFor="dm-title">Tytuł</label>
                            <input id="dm-title" name="title" className="input" maxLength={200} placeholder="Wiadomość od administracji RoyalCasino" />
                        </div>
                        <div className="field">
                            <label htmlFor="dm-msg">Treść</label>
                            <textarea id="dm-msg" name="message" className="textarea" rows={4} maxLength={3500} required />
                        </div>
                        <div className={ui.actions}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={bridge.busy}>
                                {bridge.busy ? 'Wysyłanie...' : 'Wyślij przez bota'}
                            </button>
                        </div>
                    </form>
                    <p className={rs.hint}>Wiadomość wysyła bot RoyalCasino w ciągu kilku sekund. Jeśli gracz ma zamknięte DM, zobaczysz błąd.</p>
                </section>

                {/* ---------- Postęp ---------- */}
                <section className={rs.panel} aria-labelledby="post-t">
                    <h2 id="post-t" className={rs.panelTitle}>
                        Postęp i ustawienia
                    </h2>
                    <form className={rs.inline} onSubmit={formSubmit('/progress', v => ({ level: v.get('level'), xp: v.get('xp') }), false)}>
                        <div className="field">
                            <label htmlFor="p-level">Poziom</label>
                            <input id="p-level" name="level" className="input" type="number" min={1} max={999} defaultValue={n(u.level)} key={`l${n(u.level)}`} />
                        </div>
                        <div className="field">
                            <label htmlFor="p-xp">XP</label>
                            <input id="p-xp" name="xp" className="input" type="number" min={0} defaultValue={n(u.xp)} key={`x${n(u.xp)}`} />
                        </div>
                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                            Zapisz
                        </button>
                    </form>
                    <form className={rs.inline} onSubmit={formSubmit('/xp', v => ({ amount: v.get('amount'), reason: v.get('reason') }))}>
                        <div className="field">
                            <label htmlFor="p-addxp">Dodaj XP (z awansami)</label>
                            <input id="p-addxp" name="amount" className="input" type="number" min={1} required />
                        </div>
                        <div className="field">
                            <label htmlFor="p-xpreason">Powód</label>
                            <input id="p-xpreason" name="reason" className="input" maxLength={500} />
                        </div>
                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                            Dodaj XP
                        </button>
                    </form>
                    <form
                        className={rs.inline}
                        onSubmit={formSubmit(
                            '/settings',
                            v => ({ language: v.get('language'), duel_enabled: v.get('duels') === 'on', vote_reminder: v.get('reminder') === 'on' }),
                            false
                        )}
                    >
                        <div className="field">
                            <label htmlFor="s-lang">Język</label>
                            <select id="s-lang" name="language" className="select" defaultValue={String(u.language || 'pl')}>
                                <option value="pl">Polski</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        <label className="check">
                            <input type="checkbox" name="duels" defaultChecked={n(u.duel_enabled) !== 0} /> Pojedynki
                        </label>
                        <label className="check">
                            <input type="checkbox" name="reminder" defaultChecked={n(u.vote_reminder) === 1} /> Przypomnienie o głosie
                        </label>
                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                            Zapisz
                        </button>
                    </form>
                    <div className={ui.actions}>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('/reset-daily', { streak: false })}>
                            Odblokuj daily
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('/reset-daily', { streak: true })}>
                            Daily + zeruj serię
                        </button>
                        {data.mines && (
                            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('/close-mines', {})}>
                                Zamknij Miny (zwrot {money(data.mines.bet)})
                            </button>
                        )}
                    </div>
                    <dl className={rs.kv}>
                        <dt>Konto od</dt>
                        <dd>{when(String(u.created_at))}</dd>
                        <dt>Ostatnie daily</dt>
                        <dd>
                            {when(n(u.last_daily))} (seria {n(u.daily_streak)})
                        </dd>
                        <dt>Głosy</dt>
                        <dd>
                            {num.format(n(data.votes.total))}, ostatni {when(n(data.votes.last))}
                        </dd>
                        <dt>Dropy</dt>
                        <dd>
                            {num.format(n(data.drops.claimed))} za {money(n(data.drops.total))}
                        </dd>
                        <dt>Motyw profilu</dt>
                        <dd>
                            {THEMES[String(u.profile_theme)] ?? String(u.profile_theme || '-')}
                            {owned.length > 0 && <span className="muted"> (kupione: {owned.join(', ')})</span>}
                        </dd>
                        <dt>Profil z Discorda</dt>
                        <dd>{n(u.profile_synced_at) ? `odświeżony ${when(n(u.profile_synced_at))}` : 'jeszcze nie zapisany'}</dd>
                    </dl>
                </section>

                {/* ---------- Notatki ---------- */}
                <section className={rs.panel} aria-labelledby="not-t">
                    <h2 id="not-t" className={rs.panelTitle}>
                        Notatki admina
                    </h2>
                    {data.watch && <p className="notice">Obserwowany od {when(data.watch.created_at)}{data.watch.note ? `: ${data.watch.note}` : ''}</p>}
                    <form className={rs.inline} onSubmit={formSubmit('/notes', v => ({ note: v.get('note') }))}>
                        <div className="field">
                            <label htmlFor="n-note">Nowa notatka</label>
                            <input id="n-note" name="note" className="input" maxLength={2000} required />
                        </div>
                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                            Dodaj
                        </button>
                    </form>
                    {data.notes.length === 0 ? (
                        <p className="muted">Brak notatek.</p>
                    ) : (
                        <ul className={ui.list}>
                            {data.notes.map(note => (
                                <li key={note.id} className={ui.item}>
                                    <div className={ui.itemHead}>
                                        <span className={ui.itemDate}>{when(note.created_at)}</span>
                                        <button type="button" className={ui.linkButton} onClick={() => act(`/notes/${note.id}`, {}, 'DELETE')}>
                                            Usuń
                                        </button>
                                    </div>
                                    <p>{note.note}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ---------- Osiągnięcia i questy ---------- */}
                <section className={rs.panel} aria-labelledby="ach-t">
                    <h2 id="ach-t" className={rs.panelTitle}>
                        Osiągnięcia ({unlocked.size}/{Object.keys(ACHIEVEMENTS).length})
                    </h2>
                    <div className={rs.flags}>
                        {Object.entries(ACHIEVEMENTS).map(([id, name]) => (
                            <button
                                key={id}
                                type="button"
                                className={`btn btn-sm ${unlocked.has(id) ? 'btn-primary' : 'btn-ghost'}`}
                                disabled={busy}
                                aria-pressed={unlocked.has(id)}
                                title={unlocked.has(id) ? 'Kliknij, żeby odebrać' : 'Kliknij, żeby przyznać (bez nagrody)'}
                                onClick={() => act('/achievement', { id, on: !unlocked.has(id) })}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                    <h3 className={rs.panelTitle}>Questy na dziś</h3>
                    {data.quests.length === 0 ? (
                        <p className="muted">Gracz nie otworzył dziś questów.</p>
                    ) : (
                        <ul>
                            {data.quests.map(qst => (
                                <li key={qst.id}>
                                    {qst.quest_label}: {qst.progress}/{qst.target} {n(qst.completed) ? <Tag>odebrany</Tag> : null}
                                </li>
                            ))}
                        </ul>
                    )}
                    {data.quests.length > 0 && (
                        <div className={ui.actions}>
                            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('/reset-quests', {})}>
                                Wylosuj nowe questy na dziś
                            </button>
                        </div>
                    )}
                </section>

                {/* ---------- Gry ---------- */}
                <section className={rs.panel} aria-labelledby="gry-t">
                    <h2 id="gry-t" className={rs.panelTitle}>
                        Wyniki w grach
                    </h2>
                    {data.perGame.length === 0 ? (
                        <p className="muted">Jeszcze nie grał.</p>
                    ) : (
                        <div className="table-wrap">
                            <table className={rs.compact}>
                                <thead>
                                    <tr>
                                        <th scope="col">Gra</th>
                                        <th scope="col" className={rs.num}>Gry</th>
                                        <th scope="col" className={rs.num}>Obrót</th>
                                        <th scope="col" className={rs.num}>Netto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.perGame.map(row => (
                                        <tr key={row.game_type}>
                                            <td>{gameName(row.game_type)}</td>
                                            <td className={rs.num}>{num.format(row.games)}</td>
                                            <td className={rs.num}>{money(row.wagered)}</td>
                                            <td className={rs.num}>
                                                <Net value={row.net} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {data.guilds.length > 0 && (
                        <p className={rs.hint}>
                            Gra na serwerach:{' '}
                            {data.guilds.map((g, i) => (
                                <span key={g.guild_id}>
                                    {i > 0 && ', '}
                                    <Link href={`/admin/royal/gry?guild=${g.guild_id}&user=${userId}`}>{g.name || g.guild_id}</Link> ({g.games})
                                </span>
                            ))}
                        </p>
                    )}
                </section>

                {/* ---------- Polecenia ---------- */}
                <section className={rs.panel} aria-labelledby="ref-t">
                    <h2 id="ref-t" className={rs.panelTitle}>
                        Polecenia
                    </h2>
                    <dl className={rs.kv}>
                        <dt>Kod polecający</dt>
                        <dd className={ui.mono}>{String(u.referral_code || '-')}</dd>
                        <dt>Polecił go</dt>
                        <dd>{data.referrer ? <Player p={data.referrer} /> : 'nikt'}</dd>
                    </dl>
                    <form className={rs.inline} onSubmit={formSubmit('/referrer', v => ({ referrer: v.get('referrer'), bonus: v.get('bonus') === 'on' }))}>
                        <div className="field">
                            <label htmlFor="ref-who">Polecający (ID albo kod, puste = usuń)</label>
                            <input id="ref-who" name="referrer" className="input" maxLength={40} />
                        </div>
                        <label className="check">
                            <input type="checkbox" name="bonus" /> Wypłać bonus $2,000 obu stronom
                        </label>
                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                            Zapisz
                        </button>
                    </form>
                    <form className={rs.inline} onSubmit={formSubmit('/referral-code', v => ({ code: v.get('code') }))}>
                        <div className="field">
                            <label htmlFor="ref-code">Nowy kod (puste = losowy)</label>
                            <input id="ref-code" name="code" className="input" maxLength={8} />
                        </div>
                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                            Zmień kod
                        </button>
                    </form>
                    <h3 className={rs.panelTitle}>Polecił ({data.referred.length})</h3>
                    {data.referred.length === 0 ? (
                        <p className="muted">Nikogo.</p>
                    ) : (
                        <ul className={ui.list}>
                            {data.referred.map(r => (
                                <li key={r.user_id} className={ui.item}>
                                    <Player p={r} sub={`${num.format(r.total_games)} gier · ${money(r.money)} · od ${when(r.created_at)}`} />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ---------- Motywy ---------- */}
                <section className={rs.panel} aria-labelledby="mot-t">
                    <h2 id="mot-t" className={rs.panelTitle}>
                        Motywy profilu (sklep)
                    </h2>
                    <form
                        className={rs.dialogForm}
                        key={`${String(u.owned_themes)}-${String(u.profile_theme)}`}
                        onSubmit={formSubmit('/themes', v => ({ owned: v.getAll('owned'), active: v.get('active') }), false)}
                    >
                        <div className={rs.flags}>
                            {Object.entries(THEMES)
                                .filter(([id]) => id !== 'emerald')
                                .map(([id, name]) => (
                                    <label key={id} className="check">
                                        <input type="checkbox" name="owned" value={id} defaultChecked={ownedIds.includes(id)} /> {name}
                                    </label>
                                ))}
                        </div>
                        <div className={rs.inline}>
                            <div className="field">
                                <label htmlFor="mot-active">Aktywny motyw</label>
                                <select id="mot-active" name="active" className="select" defaultValue={String(u.profile_theme || 'emerald')}>
                                    {Object.entries(THEMES).map(([id, name]) => (
                                        <option key={id} value={id}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                                Zapisz motywy
                            </button>
                        </div>
                    </form>
                    <p className={rs.hint}>Zaznaczone motywy gracz ma jako kupione. Szmaragd jest darmowy dla każdego.</p>
                </section>

                {/* ---------- Jackpot, wypłaty, zgłoszenia ---------- */}
                <section className={rs.panel} aria-labelledby="inne-t">
                    <h2 id="inne-t" className={rs.panelTitle}>
                        Jackpot, wypłaty, zgłoszenia
                    </h2>
                    <dl className={rs.kv}>
                        <dt>Bilety jackpota</dt>
                        <dd>
                            {data.jackpot.length === 0
                                ? '-'
                                : data.jackpot.map(j => `#${j.round_id}: ${j.tickets}${j.winner_id === userId ? ' (wygrana)' : ''}`).join(', ')}
                        </dd>
                        <dt>Otwarte Crash Live</dt>
                        <dd>{data.liveBets.length ? data.liveBets.map(b => money(b.bet)).join(', ') : '-'}</dd>
                        <dt>Wypłaty</dt>
                        <dd>{data.payouts.length ? data.payouts.map(p => `${num.format(p.amount)} kr. (${p.status})`).join(', ') : '-'}</dd>
                    </dl>
                    {data.reports.length > 0 && (
                        <ul className={ui.list}>
                            {data.reports.map(r => (
                                <li key={r.id} className={ui.item}>
                                    <div className={ui.itemHead}>
                                        <span>
                                            {r.reporter_id === userId ? 'Zgłosił' : 'Zgłoszony'} · {r.type} · <Tag tone={r.status === 'open' ? 'warn' : 'muted'}>{r.status === 'open' ? 'otwarte' : 'zamknięte'}</Tag>
                                        </span>
                                        <span className={ui.itemDate}>{when(r.created_at)}</span>
                                    </div>
                                    <p>{r.description}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ---------- Historia gier ---------- */}
                <section className={`${rs.panel} ${rs.wide}`} aria-labelledby="hist-t">
                    <h2 id="hist-t" className={rs.panelTitle}>
                        Historia gier
                    </h2>
                    <PlayerGames userId={userId} />
                </section>

                {/* ---------- Log ---------- */}
                <section className={`${rs.panel} ${rs.wide}`} aria-labelledby="log-t">
                    <h2 id="log-t" className={rs.panelTitle}>
                        Działania admina wobec gracza
                    </h2>
                    {data.log.length === 0 ? (
                        <Empty>Brak wpisów.</Empty>
                    ) : (
                        <ul className={ui.list}>
                            {data.log.map(entry => (
                                <li key={entry.id} className={ui.item}>
                                    <div className={ui.itemHead}>
                                        <strong>{AUDIT_ACTIONS[entry.action] ?? entry.action}</strong>
                                        <span className={ui.itemDate}>{when(entry.created_at)}</span>
                                    </div>
                                    {entry.reason && <p>{entry.reason}</p>}
                                    {entry.details && <p className={`${ui.mono} ${rs.hint}`}>{entry.details}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={`${rs.panel} ${rs.wide}`} aria-labelledby="del-t">
                    <h2 id="del-t" className={rs.panelTitle}>
                        Strefa niebezpieczna
                    </h2>
                    <form className={rs.inline} onSubmit={resetAccount}>
                        <div className="field">
                            <label htmlFor="rst-reason">Powód resetu</label>
                            <input id="rst-reason" name="reason" className="input" maxLength={500} />
                        </div>
                        <label className="check">
                            <input type="checkbox" name="stats" /> Wyzeruj też statystyki
                        </label>
                        <label className="check">
                            <input type="checkbox" name="history" /> Usuń historię gier i osiągnięcia
                        </label>
                        <button type="submit" className="btn btn-danger btn-sm" disabled={busy}>
                            Zresetuj konto
                        </button>
                    </form>
                    <p>Usunięcie kasuje konto i wszystkie powiązane dane (to samo robi bot przy prośbie o usunięcie danych z RODO).</p>
                    <div className={ui.actions}>
                        <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
                            Usuń konto gracza
                        </button>
                    </div>
                </section>
            </div>
        </>
    );
}
