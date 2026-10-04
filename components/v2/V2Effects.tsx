'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Efekty dla całej strony v2, bez własnego HTML:
 * poświata idzie za kursorem z opóźnieniem, a elementy z [data-reveal]
 * wjeżdżają, gdy pojawią się na ekranie.
 */
export function V2Effects() {
    const pathname = usePathname();

    // Poświata: pozycja dogania kursor o 8% na klatkę, więc ruch jest miękki.
    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.v2');
        if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const target = { x: 0.72, y: 0.18 };
        const current = { ...target };
        let frame = 0;

        const tick = () => {
            current.x += (target.x - current.x) * 0.08;
            current.y += (target.y - current.y) * 0.08;
            root.style.setProperty('--mx', `${(current.x * 100).toFixed(2)}%`);
            root.style.setProperty('--my', `${(current.y * 100).toFixed(2)}%`);
            const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
            frame = settled ? 0 : requestAnimationFrame(tick);
        };

        const onMove = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            target.x = event.clientX / window.innerWidth;
            target.y = event.clientY / window.innerHeight;
            if (!frame) frame = requestAnimationFrame(tick);
        };

        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            window.removeEventListener('pointermove', onMove);
            cancelAnimationFrame(frame);
        };
    }, []);

    // Napisy z [data-sweep] (TEKA, CASINO) zalewają się kolorem od strony, z której
    // wjechała myszka, i gasną w stronę, w którą wyjechała.
    useEffect(() => {
        const side = (element: HTMLElement, x: number) => {
            const box = element.getBoundingClientRect();
            element.dataset.from = x > box.left + box.width / 2 ? 'right' : 'left';
        };
        const onOver = (event: PointerEvent) => {
            const element = (event.target as Element).closest<HTMLElement>('[data-sweep]');
            if (element && !element.contains(event.relatedTarget as Node | null)) side(element, event.clientX);
        };
        const onOut = (event: PointerEvent) => {
            const element = (event.target as Element).closest<HTMLElement>('[data-sweep]');
            if (element && !element.contains(event.relatedTarget as Node | null)) side(element, event.clientX);
        };
        document.addEventListener('pointerover', onOver);
        document.addEventListener('pointerout', onOut);
        return () => {
            document.removeEventListener('pointerover', onOver);
            document.removeEventListener('pointerout', onOut);
        };
    }, []);

    // Wjazd sekcji. Po zmianie strony szukamy nowych elementów.
    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.v2');
        if (!root) return;
        root.setAttribute('data-ready', '');

        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.setAttribute('data-in', '');
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: '0px 0px -12% 0px' }
        );

        root.querySelectorAll('[data-reveal]:not([data-in])').forEach(element => observer.observe(element));
        return () => observer.disconnect();
    }, [pathname]);

    return null;
}
