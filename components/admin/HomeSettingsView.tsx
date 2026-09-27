'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BIO_ICON_CHOICES, Icon, resolveIcon, type IconName } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { plural } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, PanelHeader, RefreshButton, Tag, ui } from '@/components/panel/ui';
import styles from './admin.module.css';

interface BioLink {
    id: number;
    title: string;
    url: string;
    icon: string;
    sort_order: number;
    is_active: number;
    opens_new_tab: number;
    click_count: number;
}

const LOGIN = '/admin/logowanie';

function TaglineForm() {
    const { data } = useResource<{ settings: Record<string, string> }>('/api/admin/site-settings', LOGIN);
    const { toast } = useFeedback();
    const [value, setValue] = useState<string | null>(null);
    const current = value ?? data?.settings.tagline ?? '';

    async function save(event: FormEvent) {
        event.preventDefault();
        const result = await api('/api/admin/site-settings', { method: 'PUT', loginPath: LOGIN, json: { tagline: current } });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
    }

    return (
        <form className={ui.block} onSubmit={save}>
            <h2 className={ui.blockTitle}>Podpis pod nazwą</h2>
            <div className="field">
                <label htmlFor="tagline">Tekst pod „Wojtoteka” na stronie głównej</label>
                <input id="tagline" className="input" maxLength={200} value={current} onChange={event => setValue(event.target.value)} />
                <p className="hint">{current.length} z 200 znaków. Puste pole przywraca domyślny podpis.</p>
            </div>
            <div className={ui.formActions}>
                <button type="submit" className="btn btn-primary">
                    Zapisz podpis
                </button>
            </div>
        </form>
    );
}

export function HomeSettingsView() {
    const { data, error, loading, reload } = useResource<{ links: BioLink[] }>('/api/admin/bio-links', LOGIN);
    const { toast, confirm } = useFeedback();
    const [editing, setEditing] = useState<BioLink | null>(null);
    const [icon, setIcon] = useState<IconName>('link');
    const [busy, setBusy] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        setIcon(editing ? resolveIcon(editing.icon) : 'link');
    }, [editing]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        const result = await api(editing ? `/api/admin/bio-links/${editing.id}` : '/api/admin/bio-links', {
            method: editing ? 'PATCH' : 'POST',
            loginPath: LOGIN,
            json: {
                title: values.get('title'),
                url: values.get('url'),
                icon,
                sort_order: Number(values.get('sort_order') || 0),
                is_active: values.get('is_active') === 'on',
                opens_new_tab: values.get('opens_new_tab') === 'on'
            }
        });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            setEditing(null);
            form.reset();
            setIcon('link');
            void reload();
            notifyPanelChanged();
        }
    }

    async function run(link: BioLink, kind: 'toggle' | 'reset' | 'delete') {
        if (kind === 'delete') {
            const ok = await confirm({ title: `Usunąć link „${link.title}”?`, confirmLabel: 'Usuń link', danger: true });
            if (!ok) return;
        }
        if (kind === 'reset') {
            const ok = await confirm({ title: `Wyzerować licznik „${link.title}”?`, body: `Teraz: ${link.click_count}.`, confirmLabel: 'Wyzeruj' });
            if (!ok) return;
        }
        const url =
            kind === 'delete'
                ? `/api/admin/bio-links/${link.id}`
                : `/api/admin/bio-links/${link.id}/${kind === 'toggle' ? 'toggle' : 'reset-clicks'}`;
        const method = kind === 'delete' ? 'DELETE' : kind === 'toggle' ? 'PATCH' : 'POST';
        const result = await api(url, { method, loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            if (editing?.id === link.id) setEditing(null);
            void reload();
            notifyPanelChanged();
        }
    }

    function edit(link: BioLink) {
        setEditing(link);
        window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }

    return (
        <>
            <PanelHeader
                title="Strona główna"
                description="Podpis pod nazwą i lista dużych linków. Kolejność: mniejsza liczba jest wyżej."
                actions={
                    <>
                        <a href="/" target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                            <Icon name="external" size={16} />
                            Zobacz stronę
                        </a>
                        <RefreshButton onClick={reload} loading={loading} />
                    </>
                }
            />

            <TaglineForm />

            <form key={editing ? `edit-${editing.id}` : 'new'} ref={formRef} className={ui.block} onSubmit={submit}>
                <h2 className={ui.blockTitle}>{editing ? `Edycja: ${editing.title}` : 'Nowy link'}</h2>
                <fieldset className={ui.fieldset}>
                    <legend>Ikona</legend>
                    <div className={styles.iconGrid}>
                        {BIO_ICON_CHOICES.map(choice => (
                            <button
                                key={choice.name}
                                type="button"
                                className={styles.iconChoice}
                                aria-pressed={icon === choice.name}
                                onClick={() => setIcon(choice.name)}
                                title={choice.label}
                            >
                                <Icon name={choice.name} size={22} title={choice.label} />
                            </button>
                        ))}
                    </div>
                </fieldset>
                <div className={ui.grid3}>
                    <div className="field">
                        <label htmlFor="bio-title">Tekst linku</label>
                        <input id="bio-title" name="title" className="input" required maxLength={255} defaultValue={editing?.title} />
                    </div>
                    <div className="field">
                        <label htmlFor="bio-url">Adres</label>
                        <input id="bio-url" name="url" className="input" required maxLength={2048} defaultValue={editing?.url} placeholder="https:// albo /sciezka" />
                    </div>
                    <div className="field">
                        <label htmlFor="bio-order">Kolejność</label>
                        <input id="bio-order" name="sort_order" type="number" className="input" min={-99} max={999} defaultValue={editing?.sort_order ?? 0} />
                    </div>
                </div>
                <div className={ui.options}>
                    <label className="check">
                        <input type="checkbox" name="is_active" defaultChecked={editing ? !!editing.is_active : true} /> Widoczny na stronie
                    </label>
                    <label className="check">
                        <input type="checkbox" name="opens_new_tab" defaultChecked={!!editing?.opens_new_tab} /> Otwiera się w nowej karcie
                    </label>
                </div>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        <Icon name={editing ? 'check' : 'plus'} size={20} />
                        {busy ? 'Zapisywanie...' : editing ? 'Zapisz link' : 'Dodaj link'}
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
                (data.links.length === 0 ? (
                    <Empty>Strona główna nie ma linków. Dodaj pierwszy powyżej.</Empty>
                ) : (
                    <ul role="list" className={ui.list}>
                        {data.links.map(link => (
                            <li key={link.id} className={`${ui.item} ${link.is_active ? '' : ui.itemDimmed}`}>
                                <div className={ui.itemHead}>
                                    <h2 className={ui.itemTitle}>
                                        <Icon name={resolveIcon(link.icon)} size={22} /> {link.title}
                                    </h2>
                                    <span className={ui.itemDate}>kolejność {link.sort_order}</span>
                                </div>
                                <p className={`${ui.meta} ${ui.mono}`}>{link.url}</p>
                                <div className={ui.tags}>
                                    {link.is_active ? <Tag>Widoczny</Tag> : <Tag tone="muted">Ukryty</Tag>}
                                    {!!link.opens_new_tab && <Tag tone="muted">Nowa karta</Tag>}
                                    <Tag tone="muted">
                                        {link.click_count || 0} {plural(link.click_count || 0, 'kliknięcie', 'kliknięcia', 'kliknięć')}
                                    </Tag>
                                </div>
                                <div className={ui.actions}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit(link)}>
                                        <Icon name="pencil" size={16} />
                                        Edytuj
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => run(link, 'toggle')}>
                                        {link.is_active ? 'Ukryj' : 'Pokaż'}
                                    </button>
                                    {link.click_count > 0 && (
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => run(link, 'reset')}>
                                            Wyzeruj licznik
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => run(link, 'delete')}>
                                        <Icon name="trash" size={16} />
                                        Usuń
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ))}
        </>
    );
}
