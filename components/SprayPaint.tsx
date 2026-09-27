'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './SprayPaint.module.css';

// Farba zostaje, dopóki malujesz. IDLE ms po ostatnim ruchu cała warstwa
// znika naraz przez FADE ms.
const IDLE = 1500;
const FADE = 1800;
const SEA = '47, 211, 208';

/**
 * Napis, po którym kursor maluje morskim pędzlem. Płótno rysuje tylko przy
 * ruchu myszy (bez pętli w każdej klatce), a znikanie to przejście CSS
 * na opacity. Płótno ma mix-blend-mode: darken, więc kolor wychodzi tylko
 * na jasnych literach; na ciemnym tle darken zostawia tło bez zmian.
 */
export function SprayPaint({ children, className }: { children: ReactNode; className?: string }) {
    const boxRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const box = boxRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!box || !canvas || !ctx) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let ratio = 1;
        let radius = 0;
        let brush: HTMLCanvasElement | null = null;
        let last: { x: number; y: number } | null = null;
        let painted = false;
        let fading = false;
        let idleTimer = 0;
        let clearTimer = 0;

        // Pędzel: pełne koło z miękką krawędzią, przygotowane raz.
        function makeBrush() {
            const size = Math.ceil(radius * 2 * ratio);
            const sprite = document.createElement('canvas');
            sprite.width = sprite.height = size;
            const g = sprite.getContext('2d');
            if (!g) return null;
            const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            gradient.addColorStop(0, `rgba(${SEA}, 1)`);
            gradient.addColorStop(0.55, `rgba(${SEA}, 1)`);
            gradient.addColorStop(1, `rgba(${SEA}, 0)`);
            g.fillStyle = gradient;
            g.fillRect(0, 0, size, size);
            return sprite;
        }

        // Nowy rozmiar płótna czyści je, więc robimy to tylko przy faktycznej zmianie.
        function resize() {
            const nextRatio = Math.min(2, window.devicePixelRatio || 1);
            const width = Math.round(box!.clientWidth * nextRatio);
            const height = Math.round(box!.clientHeight * nextRatio);
            if (brush && width === canvas!.width && height === canvas!.height) return;
            ratio = nextRatio;
            canvas!.width = width;
            canvas!.height = height;
            ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
            radius = parseFloat(getComputedStyle(box!).fontSize) * 0.08;
            brush = makeBrush();
            painted = false;
        }

        function resetOpacity() {
            canvas!.style.transition = 'none';
            canvas!.style.opacity = '1';
        }

        // Malowanie w trakcie znikania: bieżącą przezroczystość "wypalamy"
        // w pikselach, żeby stara farba nie wróciła nagle do pełnego koloru.
        function stopFading() {
            if (!fading) return;
            window.clearTimeout(clearTimer);
            const opacity = parseFloat(getComputedStyle(canvas!).opacity);
            const copy = document.createElement('canvas');
            copy.width = canvas!.width;
            copy.height = canvas!.height;
            copy.getContext('2d')?.drawImage(canvas!, 0, 0);
            ctx!.save();
            ctx!.setTransform(1, 0, 0, 1, 0, 0);
            ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
            ctx!.globalAlpha = opacity;
            ctx!.drawImage(copy, 0, 0);
            ctx!.restore();
            resetOpacity();
            fading = false;
        }

        function startFading() {
            if (!painted) return;
            fading = true;
            canvas!.style.transition = `opacity ${FADE}ms ease-in`;
            canvas!.style.opacity = '0';
            clearTimer = window.setTimeout(() => {
                ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
                painted = false;
                fading = false;
                resetOpacity();
            }, FADE);
        }

        // Odciski pędzla co 1/3 promienia wzdłuż drogi kursora: linia bez przerw.
        function stroke(x: number, y: number) {
            if (!brush) return;
            stopFading();
            const from = last ?? { x, y };
            const distance = Math.hypot(x - from.x, y - from.y);
            const steps = Math.max(1, Math.ceil(distance / (radius / 3)));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                ctx!.drawImage(brush, from.x + (x - from.x) * t - radius, from.y + (y - from.y) * t - radius, radius * 2, radius * 2);
            }
            painted = true;
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(startFading, IDLE);
        }

        // Ruchy myszy zbieramy i rysujemy raz na klatkę: kilka zdarzeń
        // między klatkami to jedno rysowanie zamiast kilku.
        let queue: ({ x: number; y: number } | null)[] = [];
        let frame = 0;

        function flush() {
            frame = 0;
            for (const point of queue) {
                if (point === null) {
                    last = null;
                    continue;
                }
                stroke(point.x, point.y);
                last = point;
            }
            queue = [];
        }

        function onMove(event: PointerEvent) {
            if (event.pointerType === 'touch' || reduceMotion.matches) return;
            const rect = box!.getBoundingClientRect();
            queue.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
            if (!frame) frame = requestAnimationFrame(flush);
        }

        const onLeave = () => {
            queue.push(null);
            if (!frame) frame = requestAnimationFrame(flush);
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(box);
        box.addEventListener('pointermove', onMove);
        box.addEventListener('pointerleave', onLeave);
        return () => {
            observer.disconnect();
            box.removeEventListener('pointermove', onMove);
            box.removeEventListener('pointerleave', onLeave);
            window.clearTimeout(idleTimer);
            window.clearTimeout(clearTimer);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <span ref={boxRef} className={`${styles.box} ${className ?? ''}`}>
            {children}
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        </span>
    );
}
