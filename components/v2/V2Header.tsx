'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PROFILES } from '@/lib/profile';
import { Scramble } from './Scramble';
import styles from './V2Header.module.css';

const NAV = [
    { href: '/gry', label: 'Gry' },
    { href: '/kontakt', label: 'Kontakt' },
    { href: '/status', label: 'Status usług' },
    { href: '/url', label: 'Skracacz' }
];

/** Licznik HUD: ile procent strony już przewinięto, plus cienki pasek. */
function ScrollMeter() {
    const ref = useRef<HTMLSpanElement>(null);
    const [percent, setPercent] = useState(0);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
            ref.current?.style.setProperty('--sp', value.toFixed(3));
            setPercent(Math.round(value * 100));
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <span ref={ref} className={styles.meter}>
            <span className={styles.meterBar} />
            <span className={styles.meterValue}>{String(percent).padStart(3, '0')}%</span>
        </span>
    );
}

export function V2Header() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => setOpen(false), [pathname]);

    // Po zjechaniu z samej góry pasek dostaje tło i linię.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Otwarte menu na telefonie: Escape zamyka, strona pod spodem się nie przewija.
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.documentElement.style.overflow = '';
        };
    }, [open]);

    return (
        <header className={styles.header} data-scrolled={scrolled || undefined} data-open={open || undefined}>
            <div className={`wrap ${styles.bar}`}>
                <Link href="/" className={styles.brand} aria-label="Wojtoteka, strona główna">
                    <img src="/img/logo.png" alt="" width={32} height={32} className={styles.logo} />
                    <span className={styles.wordmark}>Wojtoteka</span>
                </Link>

                <p className={styles.hud} aria-hidden="true">
                    <span>Scroll</span>
                    <ScrollMeter />
                </p>

                <button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={open}
                    aria-controls="v2-menu"
                    onClick={() => setOpen(value => !value)}
                >
                    {open ? 'Zamknij' : 'Menu'}
                    <span className={styles.burger} aria-hidden="true" />
                </button>

                <nav id="v2-menu" aria-label="Główne menu" className={styles.menu}>
                    <ul role="list" className={styles.nav}>
                        {NAV.map((item, i) => {
                            const active = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <li key={item.href} style={{ '--i': i } as CSSProperties}>
                                    <Link href={item.href} className={styles.link} aria-current={active ? 'page' : undefined}>
                                        <span className={styles.num}>0{i + 1}</span>
                                        <Scramble text={item.label} trigger="hover" duration={420} className={styles.label} />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Tylko na telefonie: kontakt i profile pod linkami, żeby panel nie świecił pustką. */}
                    <div className={styles.extra}>
                        <p className="v2-label">
                            <b>[ @ ]</b> Napisz albo zajrzyj
                        </p>
                        <a href="mailto:kontakt@wojtoteka.ovh" className={styles.extraMail}>
                            kontakt@wojtoteka.ovh
                        </a>
                        <ul role="list" className={styles.extraLinks}>
                            <li>
                                <a href={PROFILES.github} target="_blank" rel="noopener">
                                    GitHub <span aria-hidden="true">↗</span>
                                </a>
                            </li>
                            <li>
                                <a href={PROFILES.discord} target="_blank" rel="noopener">
                                    Discord <span aria-hidden="true">↗</span>
                                </a>
                            </li>
                            <li>
                                <a href={PROFILES.googlePlay} target="_blank" rel="noopener">
                                    Google Play <span aria-hidden="true">↗</span>
                                </a>
                            </li>
                            <li>
                                <Link href="/status">Status usług</Link>
                            </li>
                        </ul>
                    </div>
                </nav>
            </div>
        </header>
    );
}
