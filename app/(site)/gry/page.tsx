import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { GameStack } from '@/components/games/GameStack';
import { Icon } from '@/components/Icon';
import { SprayPaint } from '@/components/SprayPaint';
import { GAMES, WEB_GAMES, type Game } from '@/lib/games';
import styles from './gry.module.css';

export const metadata: Metadata = {
    title: 'Gry',
    description: 'Gry Wojtoteka: Night Drive, GloomCraft, Fishing Party, Ostatni Oddech i inne. Większość uruchomisz za darmo w przeglądarce.',
    alternates: { canonical: '/gry' }
};

// Nazwy osi przewijania: plansza cofa się, gdy wjeżdża na nią następna (--next).
const timeline = (i: number) => (i < GAMES.length ? `--plansza-${i}` : 'none');

function Stage({ game, index }: { game: Game; index: number }) {
    const flip = index % 2 === 1;
    const titleId = `${game.slug}-tytul`;
    const long = game.title.length > 14;

    return (
        <section
            id={game.slug}
            className={styles.stage}
            data-flip={flip || undefined}
            aria-labelledby={titleId}
            style={
                {
                    '--stage-bg': game.bg,
                    '--ink-color': game.frame,
                    '--tilt': `${game.tilt}deg`,
                    '--self': timeline(index),
                    '--next': timeline(index + 1)
                } as CSSProperties
            }
        >
            <div className={`wrap ${styles.stageInner}`}>
                <figure className={styles.art}>
                    <span className={`ink-frame ${styles.artFrame}`}>
                        <img
                            src={game.art.src}
                            alt={game.art.alt}
                            width={game.art.width}
                            height={game.art.height}
                            loading="lazy"
                            decoding="async"
                            className={game.art.pixel ? 'pixelated' : undefined}
                        />
                    </span>
                </figure>

                <div className={styles.copy}>
                    <h2 id={titleId} className={styles.stageTitle} data-long={long || undefined}>
                        {game.title}
                    </h2>
                    {game.platform === 'web' ? (
                        <>
                            <p className={styles.platform}>Działa w przeglądarce, bez instalacji i bez zakładania konta.</p>
                            <a href={game.href} className="btn btn-primary">
                                <Icon name="gamepad" size={20} />
                                Zagraj
                            </a>
                        </>
                    ) : (
                        <>
                            <p className={styles.platform}>Aplikacja na Androida, do pobrania z Google Play.</p>
                            <a href={game.href} className="btn btn-primary" target="_blank" rel="noopener">
                                <Icon name="play" size={20} />
                                Pobierz z Google Play
                                <Icon name="external" size={16} title="otwiera się w nowej karcie" />
                            </a>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function GamesPage() {
    const onlyApp = GAMES.find(game => game.platform === 'android');

    return (
        <>
            <section className={styles.intro} aria-labelledby="gry-tytul">
                <div className={`wrap ${styles.introInner}`}>
                    <h1 id="gry-tytul" className={styles.bigTitle}>
                        <SprayPaint className={styles.bigSpray}>Gry</SprayPaint>
                    </h1>
                    <div className={styles.introText}>
                        <p className="lead">
                            {GAMES.length} gier. {WEB_GAMES} uruchomisz w przeglądarce, bez instalacji.
                            {onlyApp ? ` ${onlyApp.title} jest w Google Play.` : ''}
                        </p>
                        <nav aria-label="Spis gier">
                            <ul role="list" className={styles.index}>
                                {GAMES.map(game => (
                                    <li key={game.slug}>
                                        <a href={`#${game.slug}`}>{game.title}</a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </div>
            </section>

            <GameStack
                className={styles.stack}
                style={{ '--scope': GAMES.map((_, i) => timeline(i)).join(', ') } as CSSProperties}
            >
                {GAMES.map((game, i) => (
                    <Stage key={game.slug} game={game} index={i} />
                ))}
            </GameStack>
        </>
    );
}
