'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate, formatExpiry, isExpired } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { includesAny, useFilteredList, useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, Tag, ui } from '@/components/panel/ui';
import { BAN_DURATIONS } from './BanDialog';

interface Ban {
    id: number;
    ip_address: string;
    reason: string | null;
    scope: 'form' | 'site';
    expires_at: string | null;
    banned_at: string;
}

const LOGIN = '/admin/logowanie';

export function BansView() {
    const { data, error, loading, reload } = useResource<{ bannedIPs: Ban[] }>('/api/admin/banned-ips', LOGIN);
    const list = useFilteredList(data?.bannedIPs ?? [], (b, q) => includesAny(q, b.ip_address, b.reason));
    const { toast, confirm } = useFeedback();
    const [busy, setBusy] = useState(false);

    async function ban(payload: { ipAddress: string; reason: string; scope: string; days: number }) {
        const result = await api('/api/admin/ban-ip', { method: 'POST', loginPath: LOGIN, json: payload });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
        return result.ok;
    }

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        const ok = await ban({
            ipAddress: String(values.get('ip') || '').trim(),
            reason: String(values.get('reason') || ''),
            scope: String(values.get('scope') || 'form'),
            days: Number(values.get('days') || 0)
        });
        setBusy(false);
        if (ok) form.reset();
    }

    async function extend(entry: Ban) {
        const ok = await confirm({
            title: `Zablokować całą stronę dla ${entry.ip_address}?`,
            body: 'Ten adres przestanie otwierać jakąkolwiek podstronę. Czas blokady zostaje ten sam.',
            confirmLabel: 'Zablokuj całą stronę',
            danger: true
        });
        if (!ok) return;
        let days = 0;
        if (entry.expires_at) {
            const ms = new Date(entry.expires_at).getTime() - Date.now();
            days = ms > 0 ? Math.max(1, Math.ceil(ms / 86400000)) : 0;
        }
        await ban({ ipAddress: entry.ip_address, reason: entry.reason || 'Spam/Abuse', scope: 'site', days });
    }

    async function unban(entry: Ban) {
        const ok = await confirm({ title: `Zdjąć blokadę z ${entry.ip_address}?`, confirmLabel: 'Zdejmij blokadę' });
        if (!ok) return;
        const result = await api('/api/admin/unban-ip', { method: 'POST', loginPath: LOGIN, json: { ipAddress: entry.ip_address } });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    return (
        <>
            <PanelHeader
                title="Blokady IP"
                description="Blokada formularza zatrzymuje tylko wiadomości. Blokada całej strony pokazuje adresowi stronę „Dostęp zablokowany” zamiast treści."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <form className={ui.block} onSubmit={create}>
                <h2 className={ui.blockTitle}>Zablokuj adres</h2>
                <div className={ui.grid3}>
                    <div className="field">
                        <label htmlFor="ban-ip">Adres IP</label>
                        <input id="ban-ip" name="ip" className="input" required autoComplete="off" spellCheck={false} placeholder="np. 203.0.113.7" />
                    </div>
                    <div className="field">
                        <label htmlFor="ban-reason-new">Powód</label>
                        <input id="ban-reason-new" name="reason" className="input" defaultValue="Spam/Abuse" maxLength={255} />
                    </div>
                    <div className="field">
                        <label htmlFor="ban-days-new">Na jak długo</label>
                        <select id="ban-days-new" name="days" className="select" defaultValue="0">
                            {BAN_DURATIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <fieldset className={ui.fieldset}>
                    <legend>Zakres</legend>
                    <div className={ui.options}>
                        <label className="check">
                            <input type="radio" name="scope" value="form" defaultChecked /> Tylko formularz
                        </label>
                        <label className="check">
                            <input type="radio" name="scope" value="site" /> Cała strona
                        </label>
                    </div>
                </fieldset>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-danger" disabled={busy}>
                        <Icon name="ban" size={20} />
                        {busy ? 'Blokowanie...' : 'Zablokuj'}
                    </button>
                </div>
            </form>

            {error && <LoadError message={error} onRetry={reload} />}

            {data && (
                <>
                    <div className={ui.toolbar}>
                        <SearchBox value={list.query} onChange={list.setQuery} label="Szukaj po adresie lub powodzie" />
                    </div>
                    {list.visible.length === 0 ? (
                        <Empty>{list.query ? `Nic nie pasuje do „${list.query}”.` : 'Nikt nie jest zablokowany.'}</Empty>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Adres</th>
                                        <th scope="col">Zakres</th>
                                        <th scope="col">Do kiedy</th>
                                        <th scope="col">Powód</th>
                                        <th scope="col">Od</th>
                                        <th scope="col">
                                            <span className="sr-only">Akcje</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.visible.map(entry => {
                                        const expired = isExpired(entry.expires_at);
                                        return (
                                            <tr key={entry.id} className={expired ? ui.itemDimmed : undefined}>
                                                <td className={ui.mono}>{entry.ip_address}</td>
                                                <td>{entry.scope === 'site' ? <Tag tone="warn">Cała strona</Tag> : <Tag>Formularz</Tag>}</td>
                                                <td>{entry.expires_at ? (expired ? 'wygasła' : formatExpiry(entry.expires_at)) : 'na stałe'}</td>
                                                <td>{entry.reason || 'bez powodu'}</td>
                                                <td>{formatDate(entry.banned_at)}</td>
                                                <td>
                                                    <div className={ui.actions}>
                                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => unban(entry)}>
                                                            Odblokuj
                                                        </button>
                                                        {entry.scope !== 'site' && !expired && (
                                                            <button type="button" className="btn btn-danger btn-sm" onClick={() => extend(entry)}>
                                                                Cała strona
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Pager page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
                </>
            )}
        </>
    );
}
