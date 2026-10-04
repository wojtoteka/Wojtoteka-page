'use client';

import { useEffect, useState } from 'react';

/** Odlicza sekundy i sam przeładowuje stronę. Można to wyłączyć jednym kliknięciem. */
export function RetryCountdown({ seconds = 30, className }: { seconds?: number; className?: string }) {
    const [left, setLeft] = useState(seconds);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        if (left <= 0) {
            window.location.reload();
            return;
        }
        const id = window.setTimeout(() => setLeft(value => value - 1), 1000);
        return () => window.clearTimeout(id);
    }, [left, paused]);

    return (
        <p className={className} aria-live="off">
            {paused ? (
                <>Automatyczne odświeżanie wyłączone.</>
            ) : (
                <>
                    Sprawdzę ponownie za <b>{String(Math.max(left, 0)).padStart(2, '0')} s</b>.{' '}
                    <button type="button" onClick={() => setPaused(true)}>
                        Nie odświeżaj
                    </button>
                </>
            )}
        </p>
    );
}
