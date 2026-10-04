import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { GameStack } from '@/components/games/GameStack';
import { GameIndex } from '@/components/v2/GameIndex';
import { Scramble } from '@/components/v2/Scramble';
import { SplitText } from '@/components/v2/SplitText';
import { ANDROID_GAMES, GAMES, WEB_GAMES, type Game } from '@/lib/games';
import styles from './gry.module.css';

export const metadata: Metadata = {
    title: 'Gry',
    description: 'Gry Wojtoteka: Night Drive, Przerębel, GloomCraft, Fishing Party, Ostatni Oddech i inne. Większość uruchomisz za darmo w przeglądarce.',
    alternates: { canonical: '/gry' }
};

const pad = (n: number) => String(n).padStart(2, '0');

// Nazwy osi przewijania: plansza cofa się, gdy wjeżdża na nią następna (--next).
const timeline = (i: number) => (i < GAMES.length ? `--plansza-${i}` : 'none');

function Stage({ game, index }: { game: Game; index: number }) {
    const titleId = `${game.slug}-tytul`;
    const web = game.platform === 'web';

    return (
        <section
            id={game.slug}
            className={styles.stage}
            data-flip={index % 2 === 1 || undefined}
            aria-labelledby={titleId}
            style={
                {
                    '--stage-bg': game.bg,
                    '--frame': game.frame,
                    '--tilt': `${game.tilt}deg`,
                    '--self': timeline(index),
                    '--next': timeline(index + 1)
                } as CSSProperties
            }
        >
            <div className={`wrap ${styles.stageInner}`}>
                <p className={styles.bar}>
                    <span className={styles.barNum}>
                        {pad(index + 1)} / {pad(GAMES.length)}
                    </span>
                    <span>{web ? 'Przeglądarka' : 'Android'}</span>
                    <span className={styles.barLine} aria-hidden="true" />
                    <span>{web ? 'Bez instalacji' : 'Google Play'}</span>
                </p>

                <span className={styles.ghost} aria-hidden="true">
                    {pad(index + 1)}
                </span>

                <figure className={styles.art}>
                    <span className={`v2-frame ${styles.artFrame}`}>
                        <img
                            src={game.logo.src}
                            alt={game.logo.alt}
                            width={512}
                            height={512}
                            loading="lazy"
                            decoding="async"
                            className={game.logo.pixel ? 'pixelated' : undefined}
                        />
                    </span>
                </figure>

                <div className={styles.copy}>
                    <h2 id={titleId} className={styles.stageTitle} data-long={game.title.length > 14 || undefined}>
                        {game.title}
                    </h2>
                    {web ? (
                        <>
                            <p className={styles.platform}>Działa w przeglądarce, bez instalacji i bez konta.</p>
                            <a href={game.href} className="btn btn-primary">
                                Zagraj <span className="v2-arrow" aria-hidden="true">→</span>
                            </a>
                        </>
                    ) : (
                        <>
                            <p className={styles.platform}>Aplikacja na Androida, do pobrania w Google Play.</p>
                            <a href={game.href} className="btn btn-primary" target="_blank" rel="noopener">
                                Pobierz z Google Play <span className="v2-arrow" aria-hidden="true">↗</span>
                                <span className="sr-only"> (otwiera się w nowej karcie)</span>
                            </a>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function GamesPage() {
    return (
        <>
            <section className={`wrap ${styles.intro}`} aria-labelledby="gry-tytul">
                <p className="v2-label">
                    <b>[GRY]</b>
                    <Scramble text="Katalog" delay={200} />
                </p>

                <div className={styles.introGrid}>
                    <h1 id="gry-tytul" className={styles.bigTitle} aria-label="Gry">
                        <SplitText text="GRY" />
                    </h1>

                    <dl className={styles.count}>
                        <div>
                            <dt>Wszystkie</dt>
                            <dd>{pad(GAMES.length)}</dd>
                        </div>
                        <div>
                            <dt>W przeglądarce</dt>
                            <dd>{pad(WEB_GAMES)}</dd>
                        </div>
                        <div>
                            <dt>Na Androida</dt>
                            <dd>{pad(ANDROID_GAMES)}</dd>
                        </div>
                    </dl>
                </div>

                <p className={styles.lead}>
                    Większość gier uruchomisz od razu w przeglądarce. Wybierz tytuł z listy albo przewiń niżej.
                </p>

                <nav aria-label="Spis gier" className={styles.index} data-reveal>
                    <GameIndex games={GAMES} />
                </nav>
            </section>

            <GameStack className={styles.stack} style={{ '--scope': GAMES.map((_, i) => timeline(i)).join(', ') } as CSSProperties}>
                {GAMES.map((game, i) => (
                    <Stage key={game.slug} game={game} index={i} />
                ))}
            </GameStack>
        </>
    );
}
