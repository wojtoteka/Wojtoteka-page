'use client';

import { useEffect, useRef } from 'react';
import styles from './Shelf.module.css';

/**
 * Półka przypięta do ekranu: przewijanie w dół przesuwa tor z grami w bok.
 * Wysokość sekcji = ekran + długość toru, więc pionowy scroll "zużywa się"
 * dokładnie na przejechanie całej półki. Na telefonie zwykłe przewijanie w bok.
 */
export function Shelf({ children, head }: { children: React.ReactNode; head: React.ReactNode }) {
    const outerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const outer = outerRef.current;
        const track = trackRef.current;
        if (!outer || !track) return;

        const media = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
        let distance = 0;
        let frame = 0;

        const update = () => {
            frame = 0;
            if (!media.matches || distance <= 0) return;
            const progress = Math.min(1, Math.max(0, -outer.getBoundingClientRect().top / distance));
            track.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px, 0, 0)`;
            outer.style.setProperty('--shelf-p', progress.toFixed(3));
        };

        const measure = () => {
            if (!media.matches) {
                outer.style.height = '';
                track.style.transform = '';
                distance = 0;
                return;
            }
            distance = Math.max(0, track.scrollWidth - window.innerWidth);
            outer.style.height = `${window.innerHeight + distance}px`;
            update();
        };

        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(track);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', schedule, { passive: true });
        media.addEventListener('change', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', schedule);
            media.removeEventListener('change', measure);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div ref={outerRef} className={styles.outer}>
            <div className={styles.pin}>
                {head}
                <div ref={trackRef} className={styles.track}>
                    {children}
                </div>
                <div className={styles.progress} aria-hidden="true">
                    <span />
                </div>
            </div>
        </div>
    );
}
