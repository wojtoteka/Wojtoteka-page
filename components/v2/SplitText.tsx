import type { CSSProperties } from 'react';

/**
 * Linia wielkiego napisu pocięta na litery. Każda litera wjeżdża od dołu
 * z małym opóźnieniem (--i), animacja jest w czystym CSS (.v2-char).
 * start przesuwa numerację, żeby druga linia ruszała po pierwszej.
 */
export function SplitText({ text, start = 0, delay, className }: { text: string; start?: number; delay?: number; className?: string }) {
    const style = delay !== undefined ? ({ '--d': `${delay}ms` } as CSSProperties) : undefined;

    return (
        <span className={`v2-line ${className ?? ''}`} aria-hidden="true" style={style}>
            {Array.from(text).map((char, i) => (
                <span key={i} className="v2-char" style={{ '--i': start + i } as CSSProperties}>
                    {char === ' ' ? ' ' : char}
                </span>
            ))}
        </span>
    );
}
