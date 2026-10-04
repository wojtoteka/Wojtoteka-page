'use client';

import { useEffect, useState } from 'react';

/** Adres, który ktoś próbował otworzyć. Czytany w przeglądarce, bo strona 404 nie dostaje go jako parametru. */
export function RequestedPath({ className }: { className?: string }) {
    const [path, setPath] = useState('');

    useEffect(() => {
        setPath(decodeURIComponent(window.location.pathname + window.location.search));
    }, []);

    if (!path) return null;
    return <code className={className}>{path}</code>;
}
