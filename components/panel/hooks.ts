'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client/api';

/** Pobiera dane z API panelu; reload() odświeża, np. po usunięciu wpisu. */
export function useResource<T>(url: string, loginPath: string) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const result = await api<T>(url, { loginPath });
        if (result.ok) {
            setData(result.data);
            setError('');
        } else {
            setError(result.data.message || 'Nie udało się pobrać danych.');
        }
        setLoading(false);
    }, [url, loginPath]);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { data, error, loading, reload };
}

export const PER_PAGE = 10;

/** Wyszukiwanie i stronicowanie listy po stronie przeglądarki. */
export function useFilteredList<T>(items: T[], matches: (item: T, query: string) => boolean) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? items.filter(item => matches(item, q)) : items;
        // matches to zwykle funkcja inline, więc zależymy tylko od danych i zapytania
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, query]);

    const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const current = Math.min(page, pages);
    const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

    return {
        query,
        setQuery: (value: string) => {
            setQuery(value);
            setPage(1);
        },
        page: current,
        pages,
        setPage,
        total: filtered.length,
        visible
    };
}

/** Sprawdza, czy któreś z pól zawiera szukany tekst (bez wielkości liter). */
export function includesAny(query: string, ...values: (string | null | undefined)[]): boolean {
    return values.some(value => (value || '').toLowerCase().includes(query));
}
