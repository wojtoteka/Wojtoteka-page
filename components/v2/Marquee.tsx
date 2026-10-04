'use client';

import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Tekst przewijany w kółko. Tor przesuwa się o własną szerokość, więc musi być
 * co najmniej tak szeroki jak ekran, inaczej z boku zostaje pustka.
 * Dlatego mierzymy jedną kopię treści i powielamy ją tyle razy, ile trzeba.
 * Druga kopia toru jest ukryta przed czytnikiem ekranu.
 */
export function Marquee({
    children,
    className,
    time = 28,
    gap = 48,
    reverse = false,
    pauseOnHover = false
}: {
    children: React.ReactNode;
    className?: string;
    time?: number;
    gap?: number;
    reverse?: boolean;
    pauseOnHover?: boolean;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const unitRef = useRef<HTMLSpanElement>(null);
    const [copies, setCopies] = useState(2);

    useEffect(() => {
        const root = rootRef.current;
        const unit = unitRef.current;
        if (!root || !unit) return;

        const measure = () => {
            const unitWidth = unit.getBoundingClientRect().width + gap;
            if (unitWidth <= 0) return;
            setCopies(Math.max(2, Math.ceil(root.clientWidth / unitWidth) + 1));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(root);
        observer.observe(unit);
        return () => observer.disconnect();
    }, [gap]);

    const style = {
        '--mq-time': `${time * (copies / 2)}s`,
        '--mq-gap': `${gap}px`,
        '--mq-hover': pauseOnHover ? 'paused' : 'running',
        '--mq-dir': reverse ? 'reverse' : 'normal'
    } as CSSProperties;

    const track = (hidden: boolean) => (
        <div className="v2-marquee-track" aria-hidden={hidden || undefined}>
            {Array.from({ length: copies }, (_, i) =>
                i === 0 && !hidden ? (
                    <span key={i} ref={unitRef} className="v2-marquee-unit">
                        {children}
                    </span>
                ) : (
                    <Fragment key={i}>
                        <span className="v2-marquee-unit" aria-hidden="true">
                            {children}
                        </span>
                    </Fragment>
                )
            )}
        </div>
    );

    return (
        <div ref={rootRef} className={`v2-marquee ${className ?? ''}`} style={style}>
            {track(false)}
            {track(true)}
        </div>
    );
}
