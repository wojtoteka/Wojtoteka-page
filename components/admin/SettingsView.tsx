'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate, plural } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { PanelHeader, RefreshButton, ui } from '@/components/panel/ui';
import styles from './admin.module.css';

const LOGIN = '/admin/logowanie';

type Mode = 'off' | 'full' | 'paths';

function PasswordForm() {
    const { toast } = useFeedback();
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        setBusy(true);
        const result = await api('/api/admin/change-password', { method: 'POST', loginPath: LOGIN, json: values });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) form.reset();
    }

    return (
        <form className={ui.block} onSubmit={submit}>
            <h2 className={ui.blockTitle}>Hasło administratora</h2>
            <div className={ui.grid3}>
                <div className="field">
                    <label htmlFor="pw-current">Obecne hasło</label>
                    <input id="pw-current" name="currentPassword" type="password" className="input" required autoComplete="current-password" />
                </div>
                <div className="field">
                    <label htmlFor="pw-new">Nowe hasło</label>
                    <input id="pw-new" name="newPassword" type="password" className="input" required minLength={8} maxLength={100} autoComplete="new-password" />
                    <p className="hint">Od 8 do 100 znaków.</p>
                </div>
                <div className="field">
                    <label htmlFor="pw-repeat">Powtórz nowe hasło</label>
                    <input id="pw-repeat" name="confirmPassword" type="password" className="input" required minLength={8} maxLength={100} autoComplete="new-password" />
                </div>
            </div>
            <div className={ui.formActions}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                    <Icon name="key" size={20} />
                    {busy ? 'Zapisywanie...' : 'Zmień hasło'}
                </button>
            </div>
        </form>
    );
}

function MaintenanceForm() {
    const { data } = useResource<{ settings: Record<string, string> }>('/api/admin/site-settings', LOGIN);
    const { toast } = useFeedback();
    const [mode, setMode] = useState<Mode | null>(null);
    const [paths, setPaths] = useState<string | null>(null);

    const savedMode = (data?.settings.maintenance_mode as Mode) || 'off';
    const savedPaths = (() => {
        try {
            return (JSON.parse(data?.settings.maintenance_paths || '[]') as string[]).join('\n');
        } catch {
            return '';
        }
    })();
    const currentMode = mode ?? savedMode;
    const currentPaths = paths ?? savedPaths;

    async function save(event: FormEvent) {
        event.preventDefault();
        const list = currentPaths.split('\n').map(p => p.trim()).filter(p => p.startsWith('/'));
        const result = await api('/api/admin/site-settings', {
            method: 'PUT',
            loginPath: LOGIN,
            json: { maintenance_mode: currentMode, maintenance_paths: list }
        });
        toast(
            result.ok ? (currentMode === 'off' ? 'Strona działa normalnie.' : 'Zapisano. Tryb konserwacji jest włączony.') : result.data.message || 'Nie zapisano.',
            result.ok ? 'ok' : 'error'
        );
    }

    return (
        <form className={ui.block} onSubmit={save}>
            <h2 className={ui.blockTitle}>Tryb konserwacji</h2>
            <p className="muted">Odwiedzający zobaczą stronę „Trwają prace na stronie”. Panele, API i gry działają dalej. Dopisanie ?dev do adresu omija tę stronę.</p>
            <fieldset className={ui.fieldset}>
                <legend>Tryb</legend>
                <div className={ui.options}>
                    <label className="check">
                        <input type="radio" name="mode" checked={currentMode === 'off'} onChange={() => setMode('off')} /> Wyłączony
                    </label>
                    <label className="check">
                        <input type="radio" name="mode" checked={currentMode === 'full'} onChange={() => setMode('full')} /> Cała strona
                    </label>
                    <label className="check">
                        <input type="radio" name="mode" checked={currentMode === 'paths'} onChange={() => setMode('paths')} /> Wybrane ścieżki
                    </label>
                </div>
            </fieldset>
            {currentMode === 'paths' && (
                <div className="field">
                    <label htmlFor="maint-paths">Ścieżki, każda w osobnym wierszu</label>
                    <textarea id="maint-paths" className="textarea" rows={4} value={currentPaths} onChange={event => setPaths(event.target.value)} placeholder="/gry" />
                    <p className="hint">Ścieżka zaczyna się od /. Obejmuje też podstrony: /gry obejmuje /gry/cokolwiek.</p>
                </div>
            )}
            <div className={ui.formActions}>
                <button type="submit" className="btn btn-primary">
                    Zapisz tryb
                </button>
            </div>
        </form>
    );
}

interface Stats {
    byPage: { path: string; total: string | number; last_seen: string | null }[];
    last30: { date: string; total: string | number }[];
    total: number;
}

function PageStats() {
    const { data, loading, reload, error } = useResource<Stats>('/api/admin/stats/page-views', LOGIN);
    const { toast, confirm } = useFeedback();

    async function cleanup() {
        const ok = await confirm({
            title: 'Wyczyścić wpisy botów?',
            body: 'Usunie ze statystyk wszystkie ścieżki spoza listy prawdziwych podstron. Tego nie da się cofnąć.',
            confirmLabel: 'Wyczyść',
            danger: true
        });
        if (!ok) return;
        const result = await api<{ deleted: number }>('/api/admin/stats/page-views/bot-cleanup', { method: 'DELETE', loginPath: LOGIN });
        toast(result.ok ? `Usunięto ${result.data.deleted} wpisów.` : result.data.message || 'Nie wyczyszczono.', result.ok ? 'ok' : 'error');
        if (result.ok) void reload();
    }

    const pages = (data?.byPage ?? []).map(p => ({ ...p, total: Number(p.total) }));
    const max = Math.max(1, ...pages.map(p => p.total));
    const last30 = data?.last30 ?? [];
    const last30Total = last30.reduce((sum, d) => sum + Number(d.total), 0);
    const dayMax = Math.max(1, ...last30.map(d => Number(d.total)));

    return (
        <section className={ui.block} aria-labelledby="stats-title">
            <div className={ui.toolbar}>
                <h2 id="stats-title" className={ui.blockTitle}>
                    Odwiedziny
                </h2>
                <div className={ui.actions}>
                    <RefreshButton onClick={reload} loading={loading} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={cleanup}>
                        Wyczyść wpisy botów
                    </button>
                </div>
            </div>

            {error && <p className="notice notice-error">{error}</p>}

            {data && (
                <>
                    <p>
                        Razem {data.total} {plural(data.total, 'odsłona', 'odsłony', 'odsłon')}, w ostatnich 30 dniach {last30Total}. Liczone są tylko
                        prawdziwe podstrony, bez ciasteczek i bez danych o osobach.
                    </p>

                    {last30.length > 0 && (
                        <figure>
                            <div className={styles.days} role="img" aria-label={`Odsłony dzień po dniu w ostatnich 30 dniach, najwięcej ${dayMax} jednego dnia`}>
                                {last30.slice(-30).map(day => (
                                    <div
                                        key={day.date}
                                        className={styles.day}
                                        style={{ height: `${(Number(day.total) / dayMax) * 100}%` }}
                                        title={`${formatDate(day.date)}: ${day.total}`}
                                    />
                                ))}
                            </div>
                            <figcaption className="hint">Ostatnie 30 dni, każdy słupek to jeden dzień.</figcaption>
                        </figure>
                    )}

                    <div className={styles.bars}>
                        {pages.slice(0, 30).map(page => (
                            <div key={page.path} className={styles.barRow}>
                                <span className={ui.mono}>{page.path}</span>
                                <span className={styles.barTrack}>
                                    <span className={styles.barFill} style={{ width: `${(page.total / max) * 100}%` }} />
                                </span>
                                <span className={styles.barValue}>{page.total}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

export function SettingsView() {
    return (
        <>
            <PanelHeader title="Ustawienia" description="Hasło, przerwa techniczna, eksport danych i statystyki odwiedzin." />
            <PasswordForm />
            <MaintenanceForm />
            <section className={ui.block} aria-labelledby="export-title">
                <h2 id="export-title" className={ui.blockTitle}>
                    Eksport danych
                </h2>
                <p className="muted">Plik CSV otworzysz w Excelu albo Arkuszach Google.</p>
                <div className={ui.formActions}>
                    <a href="/api/admin/export/messages" className="btn btn-ghost">
                        <Icon name="download" size={18} />
                        Wiadomości z formularza
                    </a>
                    <a href="/api/admin/export/api-messages" className="btn btn-ghost">
                        <Icon name="download" size={18} />
                        Wiadomości z API
                    </a>
                </div>
            </section>
            <PageStats />
        </>
    );
}
