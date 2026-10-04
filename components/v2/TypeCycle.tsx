'use client';

import { useEffect, useState } from 'react';

const TYPE_MS = 75;
const DELETE_MS = 35;
const HOLD_MS = 1600;
const GAP_MS = 250;

// Losowa kolejność bez powtórek. Nowa runda nie zaczyna się od słowa, które było ostatnie.
function shuffle(words: string[], last?: string): string[] {
    const order = [...words];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.length > 1 && order[0] === last) [order[0], order[1]] = [order[1], order[0]];
    return order;
}

/**
 * Napis, który sam się wypisuje i kasuje, jak w terminalu: po kolei wszystkie
 * słowa w losowej kolejności. Pierwsze słowo jest gotowe od razu (tak samo
 * na serwerze i w przeglądarce). Przy ograniczonym ruchu zostaje pierwsze słowo.
 * Czytnik ekranu dostaje jedno stałe zdanie zamiast migających liter.
 */
export function TypeCycle({ words, label }: { words: string[]; label: string }) {
    const [text, setText] = useState(words[0]);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let queue = shuffle(words.slice(1), words[0]);
        let word = words[0];
        let timer: ReturnType<typeof setTimeout>;

        const erase = (length: number) => {
            setText(word.slice(0, length));
            if (length > 0) timer = setTimeout(() => erase(length - 1), DELETE_MS);
            else timer = setTimeout(next, GAP_MS);
        };

        const type = (length: number) => {
            setText(word.slice(0, length));
            if (length < word.length) timer = setTimeout(() => type(length + 1), TYPE_MS);
            else timer = setTimeout(() => erase(word.length - 1), HOLD_MS);
        };

        const next = () => {
            if (!queue.length) queue = shuffle(words, word);
            word = queue.shift()!;
            type(1);
        };

        timer = setTimeout(() => erase(word.length - 1), HOLD_MS);
        return () => clearTimeout(timer);
    }, [words]);

    return (
        <>
            <span aria-hidden="true">{text}</span>
            <span className="sr-only">{label}</span>
        </>
    );
}
