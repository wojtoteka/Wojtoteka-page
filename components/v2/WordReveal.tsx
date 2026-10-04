'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Akapit, w którym słowa zapalają się jedno po drugim w trakcie przewijania.
 * Na element trafia tylko jedna zmienna (--p, od 0 do 1),
 * a jasność każdego słowa liczy CSS (.v2-word w v2.css).
 */
export function WordReveal({ text, className }: { text: string; className?: string }) {
    const ref = useRef<HTMLParagraphElement>(null);
    const words = text.split(' ');

    useEffect(() => {
        const element = ref.current;
        if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const rect = element.getBoundingClientRect();
            const viewport = window.innerHeight;
            const progress = (viewport * 0.85 - rect.top) / (rect.height + viewport * 0.25);
            element.style.setProperty('--p', Math.min(1, Math.max(0, progress)).toFixed(3));
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <p ref={ref} className={className} style={{ '--n': words.length } as CSSProperties}>
            {words.map((word, i) => (
                <span key={i} className="v2-word" style={{ '--i': i } as CSSProperties}>
                    {word}{' '}
                </span>
            ))}
        </p>
    );
}
