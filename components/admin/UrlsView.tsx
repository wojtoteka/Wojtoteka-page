'use client';

import { useState, type FormEvent } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate, formatExpiry, isExpired, plural } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { includesAny, useFilteredList, useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, Tag, ui } from '@/components/panel/ui';

interface ShortUrl {
    id: number;
    code: string;
    original_url: string;
    created_at: string;
    expires_at: string | null;
    click_count: number;
}

const LOGIN = '/admin/logowanie';

export const EXPIRY_OPTIONS = [
    { value: '', label: 'Nigdy' },
    { value: '1', label: 'Za godzinę' },
    { value: '24', label: 'Za 24 godziny' },
    { value: '168', label: 'Za 7 dni' },
    { value: '720', label: 'Za 30 dni' }
];

export function UrlsView() {
    const { data, error, loading, reload } = useResource<{ urls: ShortUrl[] }>('/api/admin/urls', LOGIN);
    const list = useFilteredList(data?.urls ?? [], (u, q) => includesAny(q, u.original_url, u.code));
    const { toast, confirm } = useFeedback();
    const [busy, setBusy] = useState(false);
    const [created, setCreated] = useState('');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        const result = await api<{ code: string }>('/api/admin/urls', {
            method: 'POST',
            loginPath: LOGIN,
            json: { original_url: values.get('url'), expires_hours: values.get('expires') || null }
        });
        setBusy(false);
        if (!result.ok) {
            toast(result.data.message || 'Nie udało się skrócić linku.', 'error');
            return;
        }
        form.reset();
        setCreated(`${origin}/url/${result.data.code}`);
        void reload();
        notifyPanelChanged();
    }

    async function remove(url: ShortUrl) {
        const ok = await confirm({
            title: `Usunąć /url/${url.code}?`,
            body: 'Link przestanie działać dla wszystkich, którzy go mają.',
            confirmLabel: 'Usuń link',
            danger: true
        });
        if (!ok) return;
        const result = await api(`/api/admin/urls/${url.id}`, { method: 'DELETE', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    return (
        <>
            <PanelHeader
                title="Krótkie linki"
                description="Wszystkie skrócone adresy: Twoje i te z publicznego skracacza. Link z panelu omija limit 20 na godzinę."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <form className={ui.block} onSubmit={create}>
                <h2 className={ui.blockTitle}>Skróć link</h2>
                <div className={ui.grid3}>
                    <div className={`field ${ui.span2}`}>
                        <label htmlFor="url-target">Adres docelowy</label>
                        <input id="url-target" name="url" type="url" className="input" required maxLength={2048} placeholder="https://" />
                    </div>
                    <div className="field">
                        <label htmlFor="url-expires">Wygasa</label>
                        <select id="url-expires" name="expires" className="select" defaultValue="">
                            {EXPIRY_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        <Icon name="link" size={20} />
                        {busy ? 'Skracanie...' : 'Skróć'}
                    </button>
                </div>
                {created && (
                    <div className={ui.keyValue}>
                        <code>{created}</code>
                        <CopyButton text={created} />
                    </div>
                )}
            </form>

            {error && <LoadError message={error} onRetry={reload} />}

            {data && (
                <>
                    <div className={ui.toolbar}>
                        <SearchBox value={list.query} onChange={list.setQuery} label="Szukaj po adresie albo kodzie" />
                        <span className="muted small">
                            {list.total} {plural(list.total, 'link', 'linki', 'linków')}
                        </span>
                    </div>
                    {list.visible.length === 0 ? (
                        <Empty>{list.query ? `Nic nie pasuje do „${list.query}”.` : 'Nie ma jeszcze skróconych linków.'}</Empty>
                    ) : (
                        <ul role="list" className={ui.list}>
                            {list.visible.map(url => {
                                const short = `${origin}/url/${url.code}`;
                                const expired = isExpired(url.expires_at);
                                return (
                                    <li key={url.id} className={`${ui.item} ${expired ? ui.itemDimmed : ''}`}>
                                        <div className={ui.itemHead}>
                                            <h2 className={`${ui.itemTitle} ${ui.mono}`}>/url/{url.code}</h2>
                                            <span className={ui.itemDate}>{formatDate(url.created_at)}</span>
                                        </div>
                                        <p className={ui.itemBody}>
                                            <a href={url.original_url} target="_blank" rel="noopener noreferrer">
                                                {url.original_url}
                                            </a>
                                        </p>
                                        <div className={ui.tags}>
                                            <Tag tone="muted">
                                                {url.click_count} {plural(url.click_count, 'kliknięcie', 'kliknięcia', 'kliknięć')}
                                            </Tag>
                                            <Tag tone={expired ? 'warn' : 'muted'}>{formatExpiry(url.expires_at)}</Tag>
                                        </div>
                                        <div className={ui.actions}>
                                            <CopyButton text={short} label="Kopiuj krótki link" />
                                            <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(url)}>
                                                <Icon name="trash" size={16} />
                                                Usuń
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <Pager page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
                </>
            )}
        </>
    );
}
