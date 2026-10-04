'use client';

import { useEffect, useRef, useState } from 'react';
import type { Game } from '@/lib/games';
import styles from './GameIndex.module.css';

/**
 * Spis gier jako lista wierszy. Po najechaniu na wiersz obok kursora
 * pojawia się okładka gry i płynnie za nim podąża.
 */
export function GameIndex({ games }: { games: Game[] }) {
    const previewRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<number | null>(null);

    useEffect(() => {
        const preview = previewRef.current;
        if (!preview || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return;

        const target = { x: 0, y: 0 };
        const current = { x: 0, y: 0 };
        let frame = 0;
        let started = false;

        const tick = () => {
            current.x += (target.x - current.x) * 0.16;
            current.y += (target.y - current.y) * 0.16;
            preview.style.transform = `translate3d(${current.x.toFixed(1)}px, ${current.y.toFixed(1)}px, 0)`;
            frame = requestAnimationFrame(tick);
        };

        const onMove = (event: PointerEvent) => {
            target.x = event.clientX + 28;
            target.y = event.clientY - 90;
            if (!started) {
                started = true;
                current.x = target.x;
                current.y = target.y;
                frame = requestAnimationFrame(tick);
            }
        };

        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            window.removeEventListener('pointermove', onMove);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div className={styles.index} onMouseLeave={() => setActive(null)}>
            <ol role="list" className={styles.list}>
                {games.map((game, i) => (
                    <li key={game.slug}>
                        <a href={`#${game.slug}`} className={styles.row} onMouseEnter={() => setActive(i)} onFocus={() => setActive(null)}>
                            <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                            <span className={styles.title}>{game.title}</span>
                            <span className={styles.platform}>{game.platform === 'web' ? 'Przeglądarka' : 'Android'}</span>
                            <span className={styles.arrow} aria-hidden="true">
                                ↓
                            </span>
                        </a>
                    </li>
                ))}
            </ol>

            <div ref={previewRef} className={styles.preview} data-show={active !== null || undefined} aria-hidden="true">
                {games.map((game, i) => (
                    <img
                        key={game.slug}
                        src={game.art.src}
                        alt=""
                        width={game.art.width}
                        height={game.art.height}
                        loading="lazy"
                        data-on={active === i || undefined}
                        className={game.art.pixel ? 'pixelated' : undefined}
                    />
                ))}
            </div>
        </div>
    );
}
