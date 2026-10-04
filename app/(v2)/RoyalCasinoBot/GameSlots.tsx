'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './slots.module.css';

export type SlotGame = { name: string; command: string; text: string; meta: string[] };

type Tween = { from: number; to: number; start: number; dur: number; ease: (t: number) => number; done?: () => void };

// Prędkość samego kręcenia w grach na sekundę.
const CRUISE = 0.4;
// Kierunek bębnów: numer i komenda jadą w dół, nazwa w górę.
const DIRS = [-1, 1, -1];
// Losowanie: każdy kolejny bęben staje trochę później, jak w prawdziwym automacie.
const SPIN_MS = [1900, 2400, 2900];
const STEP_MS = 380;
// Po ręcznym ruchu (też na telefonie, gdzie nie ma najechania) bębny chwilę stoją.
const HOLD_MS = 6000;
const WHEEL_STEP = 60;

const pad = (n: number) => String(n).padStart(2, '0');
const mod = (n: number, m: number) => ((n % m) + m) % m;
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
// Lekkie przejechanie celu i powrót, jakby bęben trafił na zapadkę.
const easeOutBack = (t: number) => 1 + 1.6 * (t - 1) ** 3 + 0.6 * (t - 1) ** 2;

/**
 * Trzy bębny jak w automacie: numer, nazwa i komenda gry. Bębny to walce 3D,
 * każda gra to jedna ścianka. Kręcą się płynnie same, nazwa w przeciwną stronę
 * niż numer i komenda. Na bębnach numeru i komendy gry leżą w odwrotnej kolejności,
 * więc mimo przeciwnych kierunków na linii zawsze stoi ta sama gra.
 * Najechanie myszką zatrzymuje bębny na najbliższej grze. Kółko, przeciąganie,
 * strzałki, numery i Losuj przesuwają je ręcznie. Obok tablica z opisem gry z linii.
 * Przy ograniczonym ruchu bębny stoją i przeskakują bez animacji.
 */
export function GameSlots({ games }: { games: SlotGame[] }) {
    const count = games.length;
    const angle = 360 / count;

    const [shown, setShown] = useState(0);
    const [win, setWin] = useState(false);
    // Czytnik ekranu ogłasza tylko zmiany wywołane przez użytkownika, nie każdą grę przy samym kręceniu.
    const [announce, setAnnounce] = useState(false);

    const rootRef = useRef<HTMLDivElement>(null);
    const reelsRef = useRef<HTMLDivElement>(null);
    const windowRefs = useRef<(HTMLDivElement | null)[]>([]);
    const drumRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Pozycja każdego bębna w grach (ułamek to bęben w ruchu) i prędkość samego kręcenia.
    const posRef = useRef([0, 0, 0]);
    const velRef = useRef(0);
    const tweensRef = useRef<(Tween | null)[]>([null, null, null]);
    const hoverRef = useRef(false);
    const holdRef = useRef(0);
    const spinningRef = useRef(false);
    const dragRef = useRef<{ y: number; pos: number; faceH: number } | null>(null);
    const shownRef = useRef(0);
    const announceRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = useCallback(() => {
        posRef.current.forEach((pos, k) => {
            const drum = drumRefs.current[k];
            if (drum) drum.style.transform = `rotateX(${DIRS[k] * pos * angle}deg)`;
        });
        // Przy losowaniu tablica czeka na wynik, zamiast migać każdą mijaną grą.
        if (spinningRef.current) return;
        const index = mod(Math.round(posRef.current[1]), count);
        if (index !== shownRef.current) {
            shownRef.current = index;
            setShown(index);
        }
    }, [angle, count]);

    const setAnnounceOnce = (value: boolean) => {
        if (announceRef.current === value) return;
        announceRef.current = value;
        setAnnounce(value);
    };

    /** Ręczny ruch: wszystkie bębny jadą do tej samej gry i chwilę na niej stoją. */
    const goTo = useCallback(
        (target: number, dur: number) => {
            const now = performance.now();
            velRef.current = 0;
            holdRef.current = now + HOLD_MS;
            setAnnounceOnce(true);
            setWin(false);
            tweensRef.current = posRef.current.map(from => ({ from, to: target, start: now, dur: reducedMotion() ? 0 : dur, ease: easeOutCubic }));
        },
        []
    );

    // Gra, na której bębny staną po obecnym ruchu.
    const base = () => tweensRef.current[1]?.to ?? Math.round(posRef.current[1]);

    const step = useCallback(
        (delta: number) => {
            if (spinningRef.current) return;
            goTo(base() + delta, STEP_MS);
        },
        [goTo]
    );

    const jump = (i: number) => {
        if (spinningRef.current) return;
        // Najkrótsza droga, żeby z 01 na 16 nie kręcić przez cały bęben.
        let delta = mod(i - mod(base(), count), count);
        if (delta > count / 2) delta -= count;
        goTo(base() + delta, STEP_MS + Math.abs(delta) * 60);
    };

    /** Losowanie: bębny kręcą się kilka razy i stają kolejno na losowej grze. */
    const spin = () => {
        if (spinningRef.current) return;
        const now = performance.now();
        const from = Math.round(posRef.current[1]);
        const forward = 1 + Math.floor(Math.random() * (count - 1));
        const reduced = reducedMotion();

        velRef.current = 0;
        holdRef.current = now + Math.max(...SPIN_MS) + HOLD_MS;
        spinningRef.current = true;
        setAnnounceOnce(true);
        setWin(false);

        if (!reduced) {
            windowRefs.current.forEach((el, k) =>
                el?.animate([{ filter: 'blur(0)' }, { filter: 'blur(1.6px)', offset: 0.18 }, { filter: 'blur(0)', offset: 0.72 }], { duration: SPIN_MS[k] })
            );
        }

        // Każdy bęben robi o jeden pełny obrót więcej, więc pozycje różnią się o wielokrotność liczby gier.
        // Po zatrzymaniu wyrównujemy je w pętli, wygląd się nie zmienia.
        tweensRef.current = posRef.current.map((pos, k) => ({
            from: pos,
            to: from + forward + count * (2 + k),
            start: now,
            dur: reduced ? 0 : SPIN_MS[k],
            ease: easeOutBack,
            done:
                k === 2
                    ? () => {
                          spinningRef.current = false;
                          setWin(true);
                          timersRef.current.push(setTimeout(() => setWin(false), 1800));
                      }
                    : undefined
        }));
    };

    // Jedna pętla animacji: płynne kręcenie, hamowanie po najechaniu i ruchy ręczne.
    // Działa tylko, gdy bębny są na ekranie.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        let frame = 0;
        let last = 0;

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const pos = posRef.current;
            const tweens = tweensRef.current;

            tweens.forEach((tween, k) => {
                if (!tween) return;
                const t = tween.dur > 0 ? Math.min(1, (now - tween.start) / tween.dur) : 1;
                pos[k] = tween.from + (tween.to - tween.from) * tween.ease(t);
                if (t >= 1) {
                    pos[k] = tween.to;
                    tweens[k] = null;
                    tween.done?.();
                }
            });

            const moving = tweens.some(Boolean);
            // Fokus z klawiatury też zatrzymuje bębny. Kliknięty myszą przycisk zostaje w fokusie, więc liczy się tylko :focus-visible.
            const keyboard = root.querySelector(':focus-visible') !== null;
            const stopped = hoverRef.current || dragRef.current || keyboard || now < holdRef.current || reducedMotion();

            if (!moving && !dragRef.current) {
                pos.fill(pos[1]);
                const vel = velRef.current;
                if (stopped && vel > 0.001) {
                    // Hamowanie z tą samą prędkością, z jaką bęben jechał, aż do najbliższej gry przed nim.
                    const target = Math.ceil(pos[1] - 0.001);
                    const dist = target - pos[1];
                    const dur = Math.min(1200, Math.max(150, ((2 * dist) / vel) * 1000));
                    velRef.current = 0;
                    tweensRef.current = pos.map(from => ({ from, to: target, start: now, dur, ease: easeOutQuad }));
                } else if (!stopped) {
                    setAnnounceOnce(false);
                    velRef.current = vel + (CRUISE - vel) * Math.min(1, dt * 1.5);
                    pos.fill(pos[1] + velRef.current * dt);
                }
            }

            render();
            frame = requestAnimationFrame(tick);
        };

        const observer = new IntersectionObserver(([entry]) => {
            cancelAnimationFrame(frame);
            if (!entry.isIntersecting) return;
            last = performance.now();
            frame = requestAnimationFrame(tick);
        });
        observer.observe(root);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [render]);

    // Kółko myszy nad bębnami kręci nimi zamiast przewijać stronę.
    useEffect(() => {
        const reels = reelsRef.current;
        if (!reels) return;
        let sum = 0;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            sum += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
            if (Math.abs(sum) < WHEEL_STEP) return;
            step(Math.sign(sum));
            sum = 0;
        };
        reels.addEventListener('wheel', onWheel, { passive: false });
        return () => reels.removeEventListener('wheel', onWheel);
    }, [step]);

    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    // Przeciąganie palcem albo myszą: bębny idą za ręką, po puszczeniu stają na najbliższej grze.
    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (spinningRef.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const faceH = (windowRefs.current[1]?.clientHeight ?? 200) / 2.6;
        tweensRef.current = [null, null, null];
        velRef.current = 0;
        dragRef.current = { y: event.clientY, pos: posRef.current[1], faceH };
        setAnnounceOnce(true);
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        posRef.current.fill(drag.pos - (event.clientY - drag.y) / drag.faceH);
    };
    const onPointerUp = () => {
        if (!dragRef.current) return;
        dragRef.current = null;
        goTo(Math.round(posRef.current[1]), STEP_MS);
    };

    const game = games[shown];
    const reels: { key: string; render: (g: SlotGame, i: number) => React.ReactNode }[] = [
        { key: 'num', render: (_, i) => pad(i + 1) },
        { key: 'name', render: g => g.name },
        { key: 'cmd', render: g => g.command }
    ];

    return (
        <div
            ref={rootRef}
            className={styles.slots}
            role="group"
            aria-label="Bębny z grami"
            onMouseEnter={() => (hoverRef.current = true)}
            onMouseLeave={() => (hoverRef.current = false)}
        >
            <div className={styles.machine} data-win={win || undefined} style={{ '--count': count } as CSSProperties}>
                <div
                    ref={reelsRef}
                    className={`v2-frame ${styles.reels}`}
                    aria-hidden="true"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {reels.map((reel, k) => (
                        <div key={reel.key} ref={el => void (windowRefs.current[k] = el)} className={`${styles.reel} ${styles[reel.key]}`}>
                            <div ref={el => void (drumRefs.current[k] = el)} className={styles.drum}>
                                {games.map((g, i) => (
                                    <span key={g.command} className={styles.face} style={{ '--i': i } as CSSProperties}>
                                        {reel.render(g, i)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    <span className={styles.payline} />
                </div>

                <div className={styles.controls}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(-1)} aria-label="Poprzednia gra">
                        ↑
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(1)} aria-label="Następna gra">
                        ↓
                    </button>
                    <button type="button" className={`btn btn-primary btn-sm ${styles.spinBtn}`} onClick={spin}>
                        Losuj grę
                    </button>
                </div>
            </div>

            <div className={styles.paytable} aria-live={announce ? 'polite' : 'off'} aria-atomic="true">
                <div key={shown} className={styles.payInner}>
                    <p className={styles.payNum}>
                        Gra <b>{pad(shown + 1)}</b> z {count}
                    </p>
                    <h3 className={styles.payName}>{game.name}</h3>
                    <code className={styles.payCmd}>{game.command}</code>
                    <p className={styles.payText}>{game.text}</p>
                    <p className={styles.payMeta}>
                        {game.meta.map(item => (
                            <span key={item}>{item}</span>
                        ))}
                    </p>
                </div>
            </div>

            <ol role="list" className={styles.picker} aria-label="Wybierz grę">
                {games.map((g, i) => (
                    <li key={g.command}>
                        <button type="button" onClick={() => jump(i)} aria-current={i === shown || undefined} aria-label={g.name} title={g.name}>
                            {pad(i + 1)}
                        </button>
                    </li>
                ))}
            </ol>

            <p className={styles.hint}>Bębny kręcą się same. Najedź na nie myszką, żeby je zatrzymać, a potem przewiń kółkiem albo przeciągnij.</p>
        </div>
    );
}
