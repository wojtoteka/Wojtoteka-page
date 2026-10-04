'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { plural } from '@/lib/plural';
import styles from './url.module.css';

const MAX_URL = 2048;

const EXPIRY = [
    { value: '', label: 'Nigdy' },
    { value: '1', label: '1 godzina' },
    { value: '24', label: '24 godziny' },
    { value: '168', label: '7 dni' },
    { value: '720', label: '30 dni' }
];

type Result = { shortUrl: string; message: string; from: number } | null;

const chars = (n: number) => `${n} ${plural(n, ['znak', 'znaki', 'znaków'])}`;

export function ShortenerForm() {
    const formRef = useRef<HTMLFormElement>(null);
    const [nonce, setNonce] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<Result>(null);
    const [length, setLength] = useState(0);

    useEffect(() => {
        fetch('/api/url/nonce', { credentials: 'same-origin', cache: 'no-store' })
            .then(r => r.json())
            .then((data: { nonce?: string }) => setNonce(data.nonce || ''))
            .catch(() => setError('Nie udało się połączyć z serwerem. Odśwież stronę.'));
    }, []);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const url = String(data.get('url') || '').trim();
        setBusy(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/url/shorten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    url,
                    expires_hours: data.get('expires_hours') || null,
                    website: data.get('website'),
                    nonce
                })
            });
            const body = await response.json().catch(() => ({}));
            if (body.newNonce) setNonce(body.newNonce);
            if (!response.ok) setError(body.message || 'Nie udało się skrócić linku.');
            else setResult({ shortUrl: body.shortUrl, message: body.message, from: url.length });
        } catch {
            setError('Brak połączenia z serwerem. Spróbuj ponownie.');
        } finally {
            setBusy(false);
        }
    }

    function again() {
        formRef.current?.reset();
        setLength(0);
        setResult(null);
        setError('');
        formRef.current?.querySelector<HTMLInputElement>('#url')?.focus();
    }

    const short = result?.shortUrl.replace(/^https?:\/\//, '') ?? '';

    return (
        <form ref={formRef} className={styles.form} onSubmit={onSubmit}>
            <div className={styles.field}>
                <label htmlFor="url">
                    <span>01</span> Adres do skrócenia
                </label>
                <input
                    id="url"
                    name="url"
                    type="url"
                    className={styles.input}
                    required
                    maxLength={MAX_URL}
                    placeholder="https://"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="url-count"
                    onChange={event => setLength(event.target.value.trim().length)}
                />
                <p id="url-count" className={styles.counter}>
                    <span className={styles.meter} aria-hidden="true">
                        <span style={{ transform: `scaleX(${length / MAX_URL})` }} />
                    </span>
                    {chars(length)} z {MAX_URL}
                </p>
            </div>

            <fieldset className={styles.field}>
                <legend>
                    <span>02</span> Link wygasa
                </legend>
                <div className={styles.chips}>
                    {EXPIRY.map(option => (
                        <label key={option.value} className={styles.chip}>
                            <input type="radio" name="expires_hours" value={option.value} defaultChecked={option.value === ''} />
                            <span>{option.label}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Pole-pułapka: ludzie go nie widzą, boty je wypełniają. */}
            <div className={styles.trap} aria-hidden="true">
                <label htmlFor="website">Strona WWW</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            <div aria-live="polite">
                {error && (
                    <p className={styles.status} data-kind="error">
                        <span className={styles.statusTag}>Nie skrócono</span>
                        {error}
                    </p>
                )}
                {result && (
                    <div className={styles.result}>
                        <p className={styles.statusTag}>Gotowe</p>
                        <a href={result.shortUrl} className={styles.shortUrl} target="_blank" rel="noopener noreferrer">
                            {short}
                        </a>
                        <p className={styles.saved}>
                            {result.from > short.length ? (
                                <>
                                    Z {chars(result.from)} zostało <b>{short.length}</b>.
                                </>
                            ) : (
                                result.message
                            )}
                        </p>
                        <div className={styles.resultActions}>
                            <CopyButton text={result.shortUrl} label="Kopiuj link" className="btn btn-primary" />
                            <button type="button" className="btn btn-ghost" onClick={again}>
                                Skróć następny
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {!result && (
                <div>
                    <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={busy || !nonce}>
                        {busy ? 'Skracanie...' : 'Skróć link'}
                        <span className="v2-arrow" aria-hidden="true">
                            →
                        </span>
                    </button>
                </div>
            )}
        </form>
    );
}
