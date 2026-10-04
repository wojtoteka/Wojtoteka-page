'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import styles from './api.module.css';

type FieldKey = 'name' | 'email' | 'phone' | 'subject' | 'message';

const FIELDS: { key: FieldKey; label: string; type: 'text' | 'email' | 'textarea'; example: string }[] = [
    { key: 'name', label: 'Imię lub nick (name)', type: 'text', example: 'Test API' },
    { key: 'email', label: 'Email (email)', type: 'email', example: 'test@example.com' },
    { key: 'phone', label: 'Telefon (phone)', type: 'text', example: '+48 500 111 222' },
    { key: 'subject', label: 'Tytuł (subject)', type: 'text', example: 'Test z dokumentacji API' },
    { key: 'message', label: 'Treść (message)', type: 'textarea', example: 'To jest wiadomość testowa wysłana z dokumentacji API na wojtoteka.ovh.' }
];

type Config = { keyName: string; fields: Record<FieldKey, boolean> };

export function ApiTester() {
    const [apiKey, setApiKey] = useState('');
    const [config, setConfig] = useState<Config | null>(null);
    const [values, setValues] = useState<Record<FieldKey, string>>(
        () => Object.fromEntries(FIELDS.map(f => [f.key, f.example])) as Record<FieldKey, string>
    );
    const [busy, setBusy] = useState<'config' | 'send' | null>(null);
    const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

    async function loadConfig(): Promise<Config | null> {
        if (!apiKey.trim()) {
            setResult({ ok: false, text: 'Wklej klucz API, żeby wczytać jego pola.' });
            return null;
        }
        setBusy('config');
        setResult(null);
        try {
            const response = await fetch('/api/v1/contact/config', { headers: { 'X-API-Key': apiKey.trim() } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Nie udało się pobrać konfiguracji.');
            const next: Config = { keyName: data.keyName || 'bez nazwy', fields: data.requiredFields };
            setConfig(next);
            return next;
        } catch (error) {
            setConfig(null);
            setResult({ ok: false, text: (error as Error).message });
            return null;
        } finally {
            setBusy(null);
        }
    }

    async function send(event: FormEvent) {
        event.preventDefault();
        const active = config ?? (await loadConfig());
        if (!active) return;

        const body: Partial<Record<FieldKey, string>> = {};
        for (const field of FIELDS) {
            if (!active.fields[field.key]) continue;
            if (!values[field.key].trim()) {
                setResult({ ok: false, text: `Uzupełnij pole: ${field.label}.` });
                return;
            }
            body[field.key] = values[field.key].trim();
        }

        setBusy('send');
        try {
            const response = await fetch('/api/v1/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey.trim() },
                body: JSON.stringify(body)
            });
            const data = await response.json().catch(() => ({}));
            setResult({ ok: response.ok, text: `HTTP ${response.status}\n${JSON.stringify(data, null, 2)}` });
        } catch (error) {
            setResult({ ok: false, text: `Błąd połączenia: ${(error as Error).message}` });
        } finally {
            setBusy(null);
        }
    }

    const visible = FIELDS.filter(field => config?.fields[field.key]);

    return (
        <form className={styles.tester} onSubmit={send}>
            <div className="field">
                <label htmlFor="tester-key">Twój klucz API</label>
                <div className={styles.keyRow}>
                    <input
                        id="tester-key"
                        className="input"
                        value={apiKey}
                        onChange={event => {
                            setApiKey(event.target.value);
                            setConfig(null);
                        }}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button type="button" className="btn btn-ghost" onClick={loadConfig} disabled={busy !== null}>
                        {busy === 'config' ? 'Wczytywanie...' : 'Wczytaj pola'}
                    </button>
                </div>
                <p className="hint">Klucz trafia tylko do tego serwera, tak samo jak z Twojej strony.</p>
            </div>

            {config && (
                <>
                    <p className="notice">
                        Klucz <strong>{config.keyName}</strong> zbiera pola:{' '}
                        {visible.length ? visible.map(f => f.key).join(', ') : 'żadnych (włącz pola w panelu)'}.
                    </p>
                    {visible.map(field => (
                        <div className="field" key={field.key}>
                            <label htmlFor={`tester-${field.key}`}>{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    id={`tester-${field.key}`}
                                    className="textarea"
                                    rows={4}
                                    value={values[field.key]}
                                    onChange={event => setValues(v => ({ ...v, [field.key]: event.target.value }))}
                                />
                            ) : (
                                <input
                                    id={`tester-${field.key}`}
                                    type={field.type}
                                    className="input"
                                    value={values[field.key]}
                                    onChange={event => setValues(v => ({ ...v, [field.key]: event.target.value }))}
                                />
                            )}
                        </div>
                    ))}
                </>
            )}

            <div>
                <button type="submit" className="btn btn-primary" disabled={busy !== null}>
                    <Icon name="send" size={20} />
                    {busy === 'send' ? 'Wysyłanie...' : 'Wyślij żądanie testowe'}
                </button>
            </div>

            <div aria-live="polite">
                {result && <pre className={result.ok ? styles.resultOk : styles.resultError}>{result.text}</pre>}
            </div>
        </form>
    );
}
