'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './RadioPlayer.module.css';

const SRC = '/nonStopPop/Gta%205%20NON-STOP%20POP%20radio%20(all%20songs).mp3';

// Czas startu utworu w sekundach nagrania.
const TRACKS = [
    { t: 30, name: '1 Thing' },
    { t: 253, name: 'Gimme More' },
    { t: 477, name: 'The Rhythm of the Night' },
    { t: 694, name: 'Glamorous' },
    { t: 932, name: 'Adult Education' },
    { t: 1204, name: "Don't Wanna Fall in Love" },
    { t: 1414, name: 'Work' },
    { t: 1608, name: 'Scandalous' },
    { t: 1870, name: 'Lady' },
    { t: 2074, name: 'Anthem' },
    { t: 2311, name: 'West End Girls' },
    { t: 2537, name: 'Only Girl' },
    { t: 2780, name: 'With Every Heartbeat' },
    { t: 3285, name: 'Everything She Wants' },
    { t: 3512, name: 'Circle in the Sand' },
    { t: 3737, name: 'I Want It That Way' },
    { t: 3961, name: 'Meet Me Halfway' },
    { t: 4212, name: 'On Our Own' },
    { t: 4485, name: 'Smalltown Boy' },
    { t: 4765, name: 'Me & U' },
    { t: 4965, name: 'Wait' },
    { t: 5160, name: 'Feel Good' },
    { t: 5389, name: 'New Sensation' },
    { t: 5633, name: 'Alright' },
    { t: 5866, name: 'Applause' },
    { t: 6075, name: 'Living In A Box' },
    { t: 6276, name: 'Tennis Court' },
    { t: 6480, name: 'Bad Girls' },
    { t: 6712, name: 'Midnight City' },
    { t: 6920, name: 'Cooler Than Me' },
    { t: 7147, name: 'The Time Is Now' },
    { t: 7384, name: 'Tape Loop' },
    { t: 7599, name: 'Moves like Jagger' },
    { t: 7814, name: 'Promises, Promises' },
    { t: 8053, name: 'Send Me an Angel' },
    { t: 8300, name: 'Something Get Started' },
    { t: 8533, name: "Let's Go All The Way" },
    { t: 8766, name: '6 Underground' }
];

// Ten sam klucz co na starej stronie: słuchacze nie tracą zapisanej pozycji.
const STORAGE_KEY = 'nonstoppop_position';

function formatTime(total: number): string {
    const sec = Math.floor(total);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = String(sec % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function trackAt(time: number): number {
    let index = 0;
    for (let i = 0; i < TRACKS.length; i++) if (time >= TRACKS[i].t) index = i;
    return index;
}

function writePosition(sec: number) {
    const value = sec.toFixed(1);
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${STORAGE_KEY}=${value};expires=${expires};path=/;SameSite=Lax`;
}

function readPosition(): number | null {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (raw === null) {
        const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${STORAGE_KEY}=([^;]*)`));
        if (match) raw = decodeURIComponent(match[1]);
    }
    const value = raw === null ? NaN : parseFloat(raw);
    return Number.isNaN(value) ? null : value;
}

export function RadioPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const current = trackAt(time);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        let restored = false;
        let lastSave = 0;

        // Dopóki pozycja nie wróci, nie nadpisujemy zapisu: nieudane
        // wznowienie skasowałoby go po kilku sekundach grania.
        const save = () => {
            if (restored && audio.currentTime > 1) writePosition(audio.currentTime);
        };

        const restore = () => {
            if (restored) return;
            const saved = readPosition();
            if (saved !== null && saved > 1 && saved < audio.duration - 2) audio.currentTime = saved;
            restored = true;
            setDuration(audio.duration);
            setTime(audio.currentTime);
        };

        const onTime = () => {
            setTime(audio.currentTime);
            const now = Date.now();
            if (now - lastSave > 2000) {
                lastSave = now;
                save();
            }
        };
        const onPlay = () => setPlaying(true);
        const onPause = () => {
            setPlaying(false);
            save();
        };
        const onHidden = () => {
            if (document.hidden) save();
        };

        // Metadane mogą być gotowe, zanim podepniemy zdarzenia (plik z cache).
        if (audio.readyState >= 1) restore();
        audio.addEventListener('loadedmetadata', restore);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        window.addEventListener('pagehide', save);
        document.addEventListener('visibilitychange', onHidden);
        return () => {
            audio.removeEventListener('loadedmetadata', restore);
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            window.removeEventListener('pagehide', save);
            document.removeEventListener('visibilitychange', onHidden);
        };
    }, []);

    function toggle() {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) void audio.play();
        else audio.pause();
    }

    function jump(seconds: number) {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = seconds;
        void audio.play();
    }

    const progress = duration ? (time / duration) * 100 : 0;

    return (
        <div className={styles.player}>
            <div className={styles.deck}>
                <div className={styles.disc} data-playing={playing || undefined}>
                    <img src="/nonStopPop/nonstopop.png" alt="Logo stacji Non-Stop Pop FM" width={320} height={320} />
                </div>

                <p className={styles.now} aria-live="polite">
                    <span className="muted">Teraz gra</span>
                    <strong>{TRACKS[current].name}</strong>
                </p>

                <div className={styles.controls}>
                    <button type="button" className={`btn btn-primary ${styles.play}`} onClick={toggle} aria-label={playing ? 'Pauza' : 'Odtwórz'}>
                        <Icon name={playing ? 'pause' : 'play'} size={22} />
                    </button>
                    <div className={styles.seek}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={0.01}
                            value={progress}
                            aria-label="Pozycja w nagraniu"
                            aria-valuetext={formatTime(time)}
                            onChange={event => {
                                const audio = audioRef.current;
                                if (audio && duration) audio.currentTime = (Number(event.target.value) / 100) * duration;
                            }}
                        />
                        <span className={styles.times}>
                            <span>{formatTime(time)}</span>
                            <span>{duration ? formatTime(duration) : '--:--'}</span>
                        </span>
                    </div>
                </div>

                <label className={styles.volume}>
                    <span>Głośność</span>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={event => {
                            const value = Number(event.target.value);
                            setVolume(value);
                            if (audioRef.current) audioRef.current.volume = value;
                        }}
                    />
                </label>

                <audio ref={audioRef} src={SRC} preload="metadata" />
            </div>

            <section className={styles.list} aria-labelledby="playlista">
                <h2 id="playlista">Playlista</h2>
                <ol role="list" className={styles.tracks}>
                    {TRACKS.map((track, i) => (
                        <li key={track.t}>
                            <button type="button" className={styles.track} aria-current={i === current ? 'true' : undefined} onClick={() => jump(track.t)}>
                                <span className={styles.trackTime}>{formatTime(track.t)}</span>
                                <span>{track.name}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}
