'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * Stos plansz na /gry. Każda plansza jest przyklejona (position: sticky)
 * i następna wjeżdża na nią przy przewijaniu. Plansza wyższa niż ekran
 * przykleja się dopiero, gdy widać jej dół: --stick to ujemne przesunięcie
 * równe różnicy wysokości ekranu i planszy.
 */
export function GameStack({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stack = ref.current;
        if (!stack) return;
        const stages = Array.from(stack.children) as HTMLElement[];

        const update = () => {
            const viewport = window.innerHeight;
            for (const stage of stages) {
                stage.style.setProperty('--stick', `${Math.min(0, viewport - stage.offsetHeight)}px`);
            }
        };

        update();
        const observer = new ResizeObserver(update);
        stages.forEach(stage => observer.observe(stage));
        window.addEventListener('resize', update);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    return (
        <div ref={ref} className={className} style={style}>
            {children}
        </div>
    );
}
