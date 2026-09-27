'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Co jakiś czas pobiera świeże dane strony z serwera, ale tylko gdy karta jest widoczna. */
export function AutoRefresh({ seconds }: { seconds: number }) {
    const router = useRouter();

    useEffect(() => {
        const id = window.setInterval(() => {
            if (document.visibilityState === 'visible') router.refresh();
        }, seconds * 1000);
        return () => window.clearInterval(id);
    }, [router, seconds]);

    return null;
}
