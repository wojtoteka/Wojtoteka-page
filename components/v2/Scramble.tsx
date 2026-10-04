'use client';

import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUWXYZ0123456789#%&*+=/<>';
// Liczby losują same cyfry: litery są szersze i tekst skakałby na boki.
const DIGITS = '0123456789';

/**
 * Tekst, który "dekoduje się" z losowych znaków, litera po literze od lewej.
 * mount: zaraz po wczytaniu, view: gdy wjedzie na ekran,
 * hover: przy każdym najechaniu na najbliższy link lub przycisk.
 * Czytnik ekranu dostaje od razu pełny tekst, animacja jest tylko dla oka.
 */
export function Scramble({
    text,
    className,
    trigger = 'mount',
    delay = 0,
    duration = 650
}: {
    text: string;
    className?: string;
    trigger?: 'mount' | 'view' | 'hover';
    delay?: number;
    duration?: number;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const [shown, setShown] = useState(text);

    useEffect(() => {
        setShown(text);
        const element = ref.current;
        if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let frame = 0;
        let timer = 0;
        let lastSwap = 0;
        const pool = /^\d+$/.test(text) ? DIGITS : GLYPHS;

        const run = () => {
            cancelAnimationFrame(frame);
            const begin = performance.now();
            const tick = (now: number) => {
                const progress = (now - begin) / duration;
                if (progress >= 1) {
                    setShown(text);
                    return;
                }
                // Losowe znaki zmieniają się co ok. 45 ms, nie w każdej klatce.
                if (now - lastSwap > 45) {
                    lastSwap = now;
                    const solved = Math.floor(progress * text.length);
                    let next = '';
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        next += i < solved || char === ' ' ? char : pool[Math.floor(Math.random() * pool.length)];
                    }
                    setShown(next);
                }
                frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        };

        const start = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(run, delay);
        };

        let observer: IntersectionObserver | null = null;
        const host = element.closest<HTMLElement>('a, button') ?? element;

        if (trigger === 'mount') start();
        if (trigger === 'view') {
            observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    start();
                    observer?.disconnect();
                }
            });
            observer.observe(element);
        }
        if (trigger === 'hover') host.addEventListener('mouseenter', run);

        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(timer);
            observer?.disconnect();
            host.removeEventListener('mouseenter', run);
        };
    }, [text, trigger, delay, duration]);

    return (
        <span ref={ref} className={className}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true">{shown}</span>
        </span>
    );
}
