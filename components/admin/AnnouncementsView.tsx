'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate, formatFullDate, toDateTimeLocal } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, PanelHeader, RefreshButton, Tag, ui } from '@/components/panel/ui';
import { ANNOUNCEMENT_PAGES } from '@/lib/announcement-pages';
import { StatusAnnouncementCard } from '@/components/site/StatusAnnouncementCard';
import styles from './admin.module.css';

interface Announcement {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'important';
    display_type: 'banner' | 'popup' | 'status';
    pages: string;
    is_active: number;
    priority: number;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string;
}

const LOGIN = '/admin/logowanie';
const TYPES = { info: 'Informacja', warning: 'Ostrzeżenie', important: 'Ważne' } as const;
const COLORS = { info: 'niebieski', warning: 'żółty', important: 'czerwony' } as const;
const DISPLAY = { banner: 'Pasek nad stroną', popup: 'Okienko na środku', status: 'Pod statusem, nad serwerami' } as const;

function parsePages(raw: string): string[] {
    try {
        const pages = JSON.parse(raw || '[]');
        return Array.isArray(pages) ? pages : [];
    } catch {
        return [];
    }
}

export function AnnouncementsView({ serverStatus = false }: { serverStatus?: boolean }) {
    const { data, error, loading, reload } = useResource<{ announcements: Announcement[] }>('/api/admin/announcements', LOGIN);
    const { toast, confirm } = useFeedback();
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [busy, setBusy] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    // Klucz wymusza świeży formularz po zmianie edytowanego ogłoszenia.
    const formKey = editing ? `edit-${editing.id}` : 'new';

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        const payload = {
            title: values.get('title'),
            message: values.get('message'),
            type: values.get('type'),
            display_type: serverStatus ? 'status' : values.get('display_type'),
            pages: serverStatus ? ['status'] : values.getAll('pages'),
            priority: Number(values.get('priority') || 0),
            is_active: values.get('is_active') === 'on',
            // Czas lokalny z pola datetime-local, serwer zapisuje go bez przeliczania na UTC.
            starts_at: values.get('starts_at') || null,
            ends_at: values.get('ends_at') || null
        };
        setBusy(true);
        const result = await api(editing ? `/api/admin/announcements/${editing.id}` : '/api/admin/announcements', {
            method: editing ? 'PATCH' : 'POST',
            loginPath: LOGIN,
            json: payload
        });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            setEditing(null);
            form.reset();
            void reload();
            notifyPanelChanged();
        }
    }

    function edit(item: Announcement) {
        setEditing(item);
        window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }

    async function toggle(item: Announcement) {
        const result = await api(`/api/admin/announcements/${item.id}/toggle`, { method: 'PATCH', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    async function remove(item: Announcement) {
        const ok = await confirm({ title: item.title ? `Usunąć „${item.title}”?` : 'Usunąć ogłoszenie bez tytułu?', confirmLabel: 'Usuń ogłoszenie', danger: true });
        if (!ok) return;
        const result = await api(`/api/admin/announcements/${item.id}`, { method: 'DELETE', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            if (editing?.id === item.id) setEditing(null);
            void reload();
            notifyPanelChanged();
        }
    }

    const selectedPages = editing ? parsePages(editing.pages) : [];
    const announcements = data?.announcements.filter(item => serverStatus ? item.display_type === 'status' : item.display_type !== 'status') ?? [];

    return (
        <>
            <PanelHeader
                title={serverStatus ? 'Ogłoszenia serwerów' : 'Ogłoszenia'}
                description={serverStatus ? 'Komunikaty na /status, pod nagłówkiem stanu usług i nad listą serwerów. Ustaw treść, kolor i termin wyświetlania.' : 'Komunikat na wybranych podstronach: jako pasek nad treścią albo okienko, które odwiedzający zamyka jednym kliknięciem.'}
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <form key={formKey} ref={formRef} className={ui.block} onSubmit={submit}>
                <h2 className={ui.blockTitle}>{editing ? `Edycja: ${editing.title || 'ogłoszenie bez tytułu'}` : 'Nowe ogłoszenie'}</h2>
                <div className={ui.grid2}>
                    <div className="field">
                        <label htmlFor="ann-title">Tytuł{serverStatus ? ' (opcjonalnie)' : ''}</label>
                        <input id="ann-title" name="title" className="input" required={!serverStatus} maxLength={255} defaultValue={editing?.title} />
                    </div>
                    <div className="field">
                        <label htmlFor="ann-priority">Kolejność</label>
                        <input id="ann-priority" name="priority" type="number" className="input" min={-99} max={99} defaultValue={editing?.priority ?? 0} />
                        <p className="hint">Wyższa liczba wyświetla się wyżej.</p>
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="ann-message">Treść</label>
                    <textarea id="ann-message" name="message" className="textarea" required maxLength={2000} rows={4} defaultValue={editing?.message} />
                </div>
                <div className={ui.grid2}>
                    <fieldset className={ui.fieldset}>
                        <legend>Waga</legend>
                        <div className={ui.options}>
                            {(Object.keys(TYPES) as (keyof typeof TYPES)[]).map(type => (
                                <label key={type} className="check">
                                    <input type="radio" name="type" value={type} defaultChecked={(editing?.type ?? 'info') === type} />
                                    {serverStatus && <span className={styles.announcementSwatch} data-type={type} aria-hidden="true" />}
                                    {TYPES[type]}{serverStatus ? ` (${COLORS[type]})` : ''}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    {!serverStatus && <fieldset className={ui.fieldset}>
                        <legend>Jak pokazać</legend>
                        <div className={ui.options}>
                            {(['banner', 'popup'] as const).map(display => (
                                <label key={display} className="check">
                                    <input type="radio" name="display_type" value={display} defaultChecked={(editing?.display_type ?? 'banner') === display} />{' '}
                                    {DISPLAY[display]}
                                </label>
                            ))}
                        </div>
                    </fieldset>}
                </div>
                {!serverStatus && <fieldset className={ui.fieldset}>
                    <legend>Na których stronach</legend>
                    <div className={ui.options}>
                        {ANNOUNCEMENT_PAGES.map(page => (
                            <label key={page.value} className="check">
                                <input type="checkbox" name="pages" value={page.value} defaultChecked={selectedPages.includes(page.value)} /> {page.label}
                            </label>
                        ))}
                    </div>
                </fieldset>}
                <div className={ui.grid2}>
                    <div className="field">
                        <label htmlFor="ann-start">Pokazuj od (opcjonalnie)</label>
                        <input id="ann-start" name="starts_at" type="datetime-local" className="input" defaultValue={toDateTimeLocal(editing?.starts_at)} />
                    </div>
                    <div className="field">
                        <label htmlFor="ann-end">Pokazuj do (opcjonalnie)</label>
                        <input id="ann-end" name="ends_at" type="datetime-local" className="input" defaultValue={toDateTimeLocal(editing?.ends_at)} />
                    </div>
                </div>
                <label className="check">
                    <input type="checkbox" name="is_active" defaultChecked={editing ? !!editing.is_active : true} /> Włączone
                </label>
                <p className="hint">Puste „od” oznacza od razu, puste „do” — bez terminu końca. Daty według czasu lokalnego serwera. Ogłoszenie widać tylko wtedy, gdy jest włączone i mieści się w zakresie dat.</p>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        <Icon name={editing ? 'check' : 'plus'} size={20} />
                        {busy ? 'Zapisywanie...' : editing ? 'Zapisz zmiany' : 'Dodaj ogłoszenie'}
                    </button>
                    {editing && (
                        <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                            Anuluj edycję
                        </button>
                    )}
                </div>
            </form>

            {error && <LoadError message={error} onRetry={reload} />}

            {data &&
                (announcements.length === 0 ? (
                    <Empty>Nie ma ogłoszeń.</Empty>
                ) : (
                    <ul role="list" className={ui.list}>
                        {announcements.map(item => {
                            const pages = parsePages(item.pages);
                            return (
                                <li key={item.id} className={`${ui.item} ${item.is_active ? '' : ui.itemDimmed}`}>
                                    <div className={ui.itemHead}>
                                        <h2 className={ui.itemTitle}>{item.title || 'Ogłoszenie bez tytułu'}</h2>
                                        <span className={ui.itemDate}>dodane {formatDate(item.created_at)}</span>
                                    </div>
                                    <div className={ui.tags}>
                                        <Tag tone={item.type === 'important' ? 'warn' : undefined}>{TYPES[item.type]}</Tag>
                                        <Tag tone="muted">{DISPLAY[item.display_type]}</Tag>
                                        {item.is_active ? <Tag>Włączone</Tag> : <Tag tone="muted">Wyłączone</Tag>}
                                        {item.priority ? <Tag tone="muted">kolejność {item.priority}</Tag> : null}
                                    </div>
                                    {serverStatus ? <StatusAnnouncementCard announcement={item} /> : <p className={ui.itemBody}>{item.message}</p>}
                                    <p className={ui.meta}>
                                        <span>
                                            Strony:{' '}
                                            {pages.length
                                                ? pages.map(p => ANNOUNCEMENT_PAGES.find(x => x.value === p)?.label ?? p).join(', ')
                                                : 'żadna (ogłoszenie się nie pokaże)'}
                                        </span>
                                        {item.starts_at && <span>od {formatFullDate(item.starts_at)}</span>}
                                        {item.ends_at && <span>do {formatFullDate(item.ends_at)}</span>}
                                    </p>
                                    <div className={ui.actions}>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit(item)}>
                                            <Icon name="pencil" size={16} />
                                            Edytuj
                                        </button>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(item)}>
                                            {item.is_active ? 'Wyłącz' : 'Włącz'}
                                        </button>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(item)}>
                                            <Icon name="trash" size={16} />
                                            Usuń
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ))}
        </>
    );
}
