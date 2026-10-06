'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import styles from '../api.module.css';

const ENDPOINTS = [
    { value: '', label: 'GET /api/v1/status', server: false, optional: false },
    { value: '/servers', label: 'GET /servers', server: false, optional: false },
    { value: '/servers/{name}', label: 'GET /servers/{name}', server: true, optional: false },
    { value: '/servers/{name}/uptime', label: 'GET /servers/{name}/uptime', server: true, optional: false },
    { value: '/servers/{name}/load', label: 'GET /servers/{name}/load', server: true, optional: false },
    { value: '/announcements', label: 'GET /announcements', server: true, optional: true },
    { value: '/incidents', label: 'GET /incidents', server: true, optional: true },
    { value: '/events', label: 'GET /events', server: true, optional: true }
];

const BASE = '/api/v1/status';

/** Wysyła prawdziwe żądanie GET i pokazuje odpowiedź; drugi przycisk otwiera strumień SSE. */
export function StatusTester({ servers }: { servers: string[] }) {
    const [endpoint, setEndpoint] = useState('');
    const [server, setServer] = useState(servers[0] ?? '');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
    const [streamLog, setStreamLog] = useState<string[] | null>(null);
    const source = useRef<EventSource | null>(null);

    const chosen = ENDPOINTS.find(e => e.value === endpoint)!;

    useEffect(() => () => source.current?.close(), []);

    function url(): string | null {
        const name = server.trim();
        if (chosen.server && !chosen.optional && !name) return null;
        if (chosen.value.includes('{name}')) return BASE + chosen.value.replace('{name}', encodeURIComponent(name));
        return BASE + chosen.value + (chosen.optional && name ? `?server=${encodeURIComponent(name)}` : '');
    }

    async function send(event: FormEvent) {
        event.preventDefault();
        const target = url();
        if (!target) {
            setResult({ ok: false, text: 'Wpisz nazwę serwera.' });
            return;
        }
        setBusy(true);
        try {
            const response = await fetch(target, { cache: 'no-store' });
            const data = await response.json().catch(() => ({}));
            const left = response.headers.get('RateLimit-Remaining');
            setResult({ ok: response.ok, text: `GET ${target}\nHTTP ${response.status}${left ? `  (zostało ${left} żądań w tej minucie)` : ''}\n\n${JSON.stringify(data, null, 2)}` });
        } catch (error) {
            setResult({ ok: false, text: `Błąd połączenia: ${(error as Error).message}` });
        } finally {
            setBusy(false);
        }
    }

    function toggleStream() {
        if (source.current) {
            source.current.close();
            source.current = null;
            setStreamLog(log => [...(log ?? []), '— rozłączono —']);
            return;
        }
        const name = server.trim();
        const target = `${BASE}/stream${name ? `?server=${encodeURIComponent(name)}` : ''}`;
        const time = () => new Date().toLocaleTimeString('pl-PL');
        const add = (line: string) => setStreamLog(log => [...(log ?? []), line].slice(-30));
        setStreamLog([`${time()}  łączenie z ${target}`]);
        const es = new EventSource(target);
        source.current = es;
        es.addEventListener('ready', () => add(`${time()}  połączono, czekam na zdarzenia (zmień ogłoszenie albo poczekaj na zmianę stanu serwera)`));
        for (const type of ['announcement.created', 'announcement.updated', 'announcement.resolved', 'server.state_changed']) {
            es.addEventListener(type, e => add(`${time()}  ${type}\n${JSON.stringify(JSON.parse((e as MessageEvent).data), null, 2)}`));
        }
        es.onerror = () => add(`${time()}  połączenie przerwane, przeglądarka spróbuje ponownie`);
    }

    return (
        <form className={styles.tester} onSubmit={send}>
            <div className={styles.testerRow}>
                <div className="field">
                    <label htmlFor="status-endpoint">Endpoint</label>
                    <select id="status-endpoint" className="input" value={endpoint} onChange={e => setEndpoint(e.target.value)}>
                        {ENDPOINTS.map(e => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="status-server">Serwer{chosen.server ? (chosen.optional ? ' (opcjonalnie)' : '') : ' (nieużywany)'}</label>
                    <input
                        id="status-server"
                        className="input"
                        list="status-server-names"
                        value={server}
                        onChange={e => setServer(e.target.value)}
                        disabled={!chosen.server}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <datalist id="status-server-names">
                        {servers.map(name => <option key={name} value={name} />)}
                    </datalist>
                </div>
            </div>

            <div className={styles.testerActions}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                    <Icon name="send" size={20} />
                    {busy ? 'Wysyłanie...' : 'Wyślij żądanie'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={toggleStream}>
                    {streamLog && source.current ? 'Rozłącz strumień' : 'Słuchaj zdarzeń na żywo'}
                </button>
            </div>
            <p className="hint">Strumień używa pola „Serwer” jako filtra; puste pole = wszystkie zdarzenia.</p>

            <div aria-live="polite">
                {result && <pre className={result.ok ? styles.resultOk : styles.resultError}>{result.text}</pre>}
                {streamLog && <pre className={styles.resultOk}>{streamLog.join('\n\n')}</pre>}
            </div>
        </form>
    );
}
