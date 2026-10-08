import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';
import { avatarUrl, gameName, money, playerName } from '@/lib/royal/meta';
import { BOARDS, getBoard, getPublicStats, type BoardKey } from '@/lib/royal/public';
import { PlayerBoard, ServerBoard } from '../RankingParts';
import styles from '../ranking.module.css';

export const metadata: Metadata = pageMeta({
    title: 'Ranking RoyalCasino',
    description: 'Ranking graczy bota RoyalCasino na żywo: saldo, poziom, obstawione kwoty, największe wygrane, serwery z największym obrotem i Royal Jackpot.',
    path: '/RoyalCasinoBot/ranking',
    image: 'royalcasinobot'
});

export const dynamic = 'force-dynamic';

const count = new Intl.NumberFormat('pl-PL');
const when = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });

export default async function RankingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const { tabela } = await searchParams;
    const board = BOARDS.find(b => b.key === tabela) ?? BOARDS[0];
    const [stats, rows] = await Promise.all([getPublicStats(), getBoard(board.key as BoardKey, 25)]);

    return (
        <div className={`wrap ${styles.page}`}>
            <header className={styles.intro}>
                <p className="v2-label">
                    <b>[01]</b> <Link href="/RoyalCasinoBot">RoyalCasino Bot</Link> / ranking
                </p>
                <h1 className={styles.title}>
                    Ranking <span className="v2-outline">na żywo</span>
                </h1>
                <p>
                    Gracze ze wszystkich serwerów, na których działa bot. Dane odświeżają się co minutę. Konta zablokowane za łamanie{' '}
                    <Link href="/RoyalCasinoBot/regulamin">regulaminu</Link> nie trafiają do rankingu. Nie chcesz być tu widoczny? Napisz przez{' '}
                    <code>/zgłoszenie</code> albo <Link href="/kontakt">formularz kontaktowy</Link>.
                </p>
            </header>

            {!stats || !rows ? (
                <p className={styles.empty}>Ranking jest chwilowo niedostępny. Spróbuj za kilka minut.</p>
            ) : (
                <>
                    <dl className={`${styles.totals} ${styles.totalsWide}`}>
                        <div>
                            <dt>Graczy</dt>
                            <dd>{count.format(stats.totals.players)}</dd>
                        </div>
                        <div>
                            <dt>Rozegranych gier</dt>
                            <dd>{count.format(stats.totals.games)}</dd>
                        </div>
                        <div>
                            <dt>Łącznie postawione</dt>
                            <dd>{money(stats.totals.wagered)}</dd>
                        </div>
                        <div>
                            <dt>Gier w 24h</dt>
                            <dd>{count.format(stats.totals.games24h)}</dd>
                        </div>
                    </dl>

                    <section aria-labelledby="tabela-tytul">
                        <h2 id="tabela-tytul" className={styles.blockTitle}>
                            Top 25: {board.label.toLowerCase()}
                        </h2>
                        <nav className={styles.tabs} aria-label="Rodzaj rankingu">
                            {BOARDS.map(b => (
                                <Link
                                    key={b.key}
                                    href={b.key === 'saldo' ? '/RoyalCasinoBot/ranking' : `/RoyalCasinoBot/ranking?tabela=${b.key}`}
                                    className={styles.tab}
                                    aria-current={b.key === board.key ? 'page' : undefined}
                                    scroll={false}
                                >
                                    {b.label}
                                </Link>
                            ))}
                        </nav>
                        <PlayerBoard rows={rows} board={board.key as BoardKey} label={`Top 25 graczy: ${board.label}`} />
                    </section>

                    <div className={styles.split}>
                        <section aria-labelledby="jackpot-tytul">
                            <h2 id="jackpot-tytul" className={styles.blockTitle}>
                                Royal Jackpot
                            </h2>
                            <div className={styles.jackpot}>
                                {stats.jackpot ? (
                                    <>
                                        <p className={styles.note}>Pula dzisiejszego losowania</p>
                                        <p className={styles.jackpotPot}>{money(stats.jackpot.pot)}</p>
                                        <p>
                                            {count.format(stats.jackpot.tickets)} biletów, {count.format(stats.jackpot.players)} graczy. Losowanie{' '}
                                            {when.format(new Date(stats.jackpot.drawAt))}.
                                        </p>
                                    </>
                                ) : (
                                    <p>Nowa runda wystartuje po najbliższym losowaniu.</p>
                                )}
                                {stats.lastJackpot && (
                                    <p className={styles.note}>
                                        Ostatnio wygrał {playerName(stats.lastJackpot)}: {money(stats.lastJackpot.pot)} ({when.format(new Date(stats.lastJackpot.drawnAt))}).
                                    </p>
                                )}
                                <p className={styles.note}>
                                    Bilety kupisz komendą <code>/jackpot</code>.
                                </p>
                            </div>
                        </section>

                        <section aria-labelledby="wygrane-tytul">
                            <h2 id="wygrane-tytul" className={styles.blockTitle}>
                                Wygrane tygodnia
                            </h2>
                            {stats.bigWins.length === 0 ? (
                                <p className={styles.empty}>W tym tygodniu jeszcze nikt nie trafił dużej wygranej.</p>
                            ) : (
                                <ol className={styles.board} aria-label="Największe wygrane z ostatnich 7 dni">
                                    {stats.bigWins.map((win, i) => (
                                        <li key={`${win.user_id}-${win.played_at}`} className={styles.row}>
                                            <span className={styles.rank}>{i + 1}</span>
                                            <img className={styles.avatar} src={avatarUrl(win)} alt="" width={40} height={40} loading="lazy" decoding="async" />
                                            <span className={styles.who}>
                                                <span className={styles.name}>{playerName(win)}</span>
                                                <span className={styles.sub}>
                                                    {gameName(win.game_type)} · stawka {money(win.bet_amount)}
                                                </span>
                                            </span>
                                            <span className={styles.value}>+{money(win.win_amount - win.bet_amount)}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    </div>

                    <section aria-labelledby="serwery-tytul">
                        <h2 id="serwery-tytul" className={styles.blockTitle}>
                            Serwer kontra serwer
                        </h2>
                        <p className={styles.lead}>
                            {count.format(stats.totals.servers)} serwerów z botem, według obrotu z ostatnich 30 dni.
                        </p>
                        <ServerBoard rows={stats.servers} />
                    </section>
                </>
            )}
        </div>
    );
}
