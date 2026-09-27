'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Icon } from '@/components/Icon';
import styles from './url.module.css';

type Result = { shortUrl: string; message: string } | null;

export function ShortenerForm() {
    const [nonce, setNonce] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<Result>(null);

    useEffect(() => {
        fetch('/api/url/nonce', { credentials: 'same-origin', cache: 'no-store' })
            .then(r => r.json())
            .then((data: { nonce?: string }) => setNonce(data.nonce || ''))
            .catch(() => setError('Nie udało się połączyć z serwerem. Odśwież stronę.'));
    }, []);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/url/shorten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    url: String(data.get('url') || '').trim(),
                    expires_hours: data.get('expires_hours') || null,
                    website: data.get('website'),
                    nonce
                })
            });
            const body = await response.json().catch(() => ({}));
            if (body.newNonce) setNonce(body.newNonce);
            if (!response.ok) setError(body.message || 'Nie udało się skrócić linku.');
            else setResult({ shortUrl: body.shortUrl, message: body.message });
        } catch {
            setError('Brak połączenia z serwerem. Spróbuj ponownie.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={styles.tool}>
            <form className={styles.form} onSubmit={onSubmit}>
                <div className={`field ${styles.urlField}`}>
                    <label htmlFor="url">Adres do skrócenia</label>
                    <input
                        id="url"
                        name="url"
                        type="url"
                        className={`input ${styles.urlInput}`}
                        required
                        maxLength={2048}
                        placeholder="https://"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
                <div className="field">
                    <label htmlFor="expires">Link wygasa</label>
                    <select id="expires" name="expires_hours" className="select" defaultValue="">
                        <option value="">Nigdy</option>
                        <option value="1">Za godzinę</option>
                        <option value="24">Za 24 godziny</option>
                        <option value="168">Za 7 dni</option>
                        <option value="720">Za 30 dni</option>
                    </select>
                </div>
                {/* Pole-pułapka: ludzie go nie widzą, boty je wypełniają. */}
                <div className={styles.trap} aria-hidden="true">
                    <label htmlFor="website">Strona WWW</label>
                    <input id="website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={busy || !nonce}>
                    <Icon name="link" size={20} />
                    {busy ? 'Skracanie...' : 'Skróć link'}
                </button>
            </form>

            <div aria-live="polite">
                {error && (
                    <p className="notice notice-error">
                        <strong>Nie skrócono. </strong>
                        {error}
                    </p>
                )}
                {result && (
                    <div className={styles.result}>
                        <p className="muted">{result.message}</p>
                        <a href={result.shortUrl} className={styles.shortUrl} target="_blank" rel="noopener noreferrer">
                            {result.shortUrl.replace(/^https?:\/\//, '')}
                        </a>
                        <CopyButton text={result.shortUrl} label="Kopiuj link" className="btn btn-ghost" />
                    </div>
                )}
            </div>
        </div>
    );
}
