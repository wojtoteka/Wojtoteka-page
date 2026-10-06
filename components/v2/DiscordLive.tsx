'use client';

import { useEffect, useRef, useState } from 'react';
import { BADGES, STATUS_LABELS, type DiscordActivity, type DiscordProfile } from '@/lib/discord';
import styles from './Discord.module.css';

/** Co ile otwarta strona pyta o świeży status, gdy sekcja jest na ekranie. */
const POLL = 15_000;

const clock = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function since(ms: number): string {
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 1) return 'Od chwili';
    if (minutes < 60) return `Od ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return minutes % 60 ? `Od ${hours} godz. ${minutes % 60} min` : `Od ${hours} godz.`;
}

function Activity({ activity, now }: { activity: DiscordActivity; now: number }) {
    const { start, end } = activity;
    const total = start && end ? end - start : 0;
    const done = total ? Math.min(Math.max(now - start!, 0), total) : 0;

    return (
        <li className={styles.activity} data-kind={activity.kind}>
            {activity.image ? (
                <img src={activity.image} alt="" width={96} height={96} loading="lazy" className={styles.art} />
            ) : (
                <span className={styles.art} aria-hidden="true">
                    {activity.title.charAt(0)}
                </span>
            )}
            <div className={styles.activityText}>
                <p className={styles.activityLabel}>{activity.label}</p>
                <p className={styles.activityTitle}>{activity.title}</p>
                {activity.lines.map(line => (
                    <p key={line} className={styles.activityLine}>
                        {line}
                    </p>
                ))}
                {total > 0 ? (
                    <p className={styles.progress}>
                        <span>{clock(done)}</span>
                        <span className={styles.bar} aria-hidden="true">
                            <span style={{ transform: `scaleX(${done / total})` }} />
                        </span>
                        <span>{clock(total)}</span>
                    </p>
                ) : start ? (
                    <p className={styles.activityLine}>{since(now - start)}</p>
                ) : null}
            </div>
        </li>
    );
}

/**
 * Karta profilu z Discorda i status na żywo. Dane z serwera są świeże przy
 * wczytaniu strony, potem co 15 s pytamy /discord/status, ale tylko gdy
 * karta przeglądarki jest otwarta, a sekcja widoczna (albo tuż obok).
 */
export function DiscordLive({ initial, href }: { initial: DiscordProfile | null; href: string }) {
    const root = useRef<HTMLDivElement>(null);
    const [profile, setProfile] = useState(initial);
    // Do pierwszego tyknięcia zegara czas z serwera: ten sam tekst na serwerze i w przeglądarce.
    const [now, setNow] = useState(initial?.at ?? 0);

    useEffect(() => {
        const element = root.current;
        if (!element) return;

        let onScreen = false;
        let timer = 0;
        let last = Date.now();
        let controller: AbortController | null = null;

        const load = async () => {
            last = Date.now();
            controller?.abort();
            controller = new AbortController();
            try {
                const response = await fetch('/discord/status', { cache: 'no-store', signal: controller.signal });
                const data = (await response.json()) as { profile: DiscordProfile | null };
                if (data.profile) setProfile(data.profile);
            } catch {
                // Brak sieci albo Lanyard nie odpowiada: zostaje ostatni znany status.
            }
        };

        const schedule = () => {
            window.clearInterval(timer);
            if (!onScreen || document.visibilityState !== 'visible') return;
            if (Date.now() - last > 5000) load();
            timer = window.setInterval(load, POLL);
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                onScreen = entry.isIntersecting;
                schedule();
            },
            { rootMargin: '300px 0px' }
        );
        observer.observe(element);
        document.addEventListener('visibilitychange', schedule);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', schedule);
            window.clearInterval(timer);
            controller?.abort();
        };
    }, []);

    // Przechył 3D za kursorem: panel się przegina, baner lekko jedzie w bok,
    // a boki podświetlają się w stronę, w którą przechylamy. Wyłączone na dotyku
    // i gdy ktoś woli mniej ruchu na ekranie.
    useEffect(() => {
        const element = root.current;
        if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const MAX_TILT = 7; // deg
        const MAX_GLOW = 46; // %
        const MAX_SHIFT = 10; // px

        let frame = 0;
        let pending: { x: number; y: number } | null = null;

        const apply = () => {
            frame = 0;
            if (!pending) return;
            const { x, y } = pending;
            const nx = x * 2 - 1;
            const ny = y * 2 - 1;
            element.style.setProperty('--tilt-x', `${(-ny * MAX_TILT).toFixed(2)}deg`);
            element.style.setProperty('--tilt-y', `${(nx * MAX_TILT).toFixed(2)}deg`);
            element.style.setProperty('--banner-x', `${(nx * MAX_SHIFT).toFixed(1)}px`);
            element.style.setProperty('--banner-y', `${(ny * MAX_SHIFT * 0.6).toFixed(1)}px`);
            element.style.setProperty('--glow-l', `${Math.max(0, -nx * MAX_GLOW).toFixed(1)}%`);
            element.style.setProperty('--glow-r', `${Math.max(0, nx * MAX_GLOW).toFixed(1)}%`);
        };

        const onMove = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            const rect = element.getBoundingClientRect();
            pending = {
                x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
                y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
            };
            if (!frame) frame = requestAnimationFrame(apply);
        };

        const onEnter = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            element.setAttribute('data-tilt', 'active');
            onMove(event);
        };

        const reset = () => {
            element.removeAttribute('data-tilt');
            element.style.setProperty('--tilt-x', '0deg');
            element.style.setProperty('--tilt-y', '0deg');
            element.style.setProperty('--banner-x', '0px');
            element.style.setProperty('--banner-y', '0px');
            element.style.setProperty('--glow-l', '0%');
            element.style.setProperty('--glow-r', '0%');
        };

        element.addEventListener('pointerenter', onEnter);
        element.addEventListener('pointermove', onMove);
        element.addEventListener('pointerleave', reset);

        return () => {
            element.removeEventListener('pointerenter', onEnter);
            element.removeEventListener('pointermove', onMove);
            element.removeEventListener('pointerleave', reset);
            cancelAnimationFrame(frame);
        };
    }, []);

    // Zegar tyka tylko wtedy, gdy jest co liczyć: co sekundę przy utworze, co pół minuty przy grze.
    const timed = profile?.activities.some(a => a.start) ?? false;
    const song = profile?.activities.some(a => a.end) ?? false;
    useEffect(() => {
        if (!timed) return;
        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), song ? 1000 : 30_000);
        return () => window.clearInterval(timer);
    }, [timed, song]);

    if (!profile) {
        return (
            <div ref={root} className={styles.panel} data-status="offline">
                <div className={styles.live}>
                    <p className={styles.statusNote}>Nie udało się teraz sprawdzić statusu. Spróbuję ponownie za chwilę.</p>
                    <a href={href} className={styles.fallback} target="_blank" rel="noopener">
                        Mój profil na Discordzie <span aria-hidden="true">↗</span>
                        <span className="sr-only"> (otwiera się w nowej karcie)</span>
                    </a>
                </div>
            </div>
        );
    }

    const { status } = profile;

    return (
        <div ref={root} className={styles.panel} data-status={status}>
            {/* ---------- Wizytówka ---------- */}
            <div className={styles.card}>
                <div className={styles.banner}>
                    <img src="/discord/banner" alt="" width={1024} height={410} loading="lazy" />
                </div>

                <div className={styles.id}>
                    <div className={styles.avatar}>
                        <img src={profile.avatar} alt="" width={128} height={128} loading="lazy" className={styles.avatarImg} />
                        {profile.decoration && (
                            <img src={profile.decoration} alt="" width={160} height={160} loading="lazy" className={styles.decoration} />
                        )}
                        <span className={styles.avatarDot} aria-hidden="true" />
                    </div>
                    <div className={styles.who}>
                        <h3 className={styles.name}>{profile.displayName}</h3>
                        <p className={styles.username}>@{profile.username}</p>
                    </div>
                </div>

                {profile.note && <p className={styles.note}>{profile.note}</p>}

                <ul role="list" className={styles.badges} aria-label="Odznaki">
                    {BADGES.map((badge, i) => (
                        <li key={badge.hash} title={badge.title}>
                            <img src={`/discord/badge/${i}`} alt={badge.title} width={28} height={28} loading="lazy" />
                        </li>
                    ))}
                </ul>
            </div>

            {/* ---------- Status i aktywność ---------- */}
            <div className={styles.live}>
                <p key={status} className={styles.statusWord}>
                    <span className={styles.statusDot} aria-hidden="true" />
                    <span className={status === 'offline' ? 'v2-outline' : undefined}>{STATUS_LABELS[status]}</span>
                </p>

                {profile.activities.length > 0 ? (
                    <ul role="list" className={styles.activities}>
                        {profile.activities.map((activity, i) => (
                            <Activity key={activity.title + i} activity={activity} now={now} />
                        ))}
                    </ul>
                ) : (
                    <div className={styles.activities} aria-hidden="true" />
                )}
            </div>
        </div>
    );
}
