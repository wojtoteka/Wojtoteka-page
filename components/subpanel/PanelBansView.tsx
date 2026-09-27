'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { Empty, LoadError, PanelHeader, RefreshButton, ui } from '@/components/panel/ui';

interface Ban {
    id: number;
    ip_address: string;
    reason: string | null;
    banned_at: string;
}

const LOGIN = '/panel/logowanie';

export function PanelBansView() {
    const { data, error, loading, reload } = useResource<{ bannedIPs: Ban[] }>('/api/panel/banned-ips', LOGIN);
    const { toast, confirm } = useFeedback();
    const [busy, setBusy] = useState(false);

    async function add(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        const result = await api('/api/panel/ban-ip', {
            method: 'POST',
            loginPath: LOGIN,
            json: { ipAddress: String(values.get('ip') || '').trim(), reason: values.get('reason') }
        });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            form.reset();
            void reload();
        }
    }

    async function unban(entry: Ban) {
        const ok = await confirm({ title: `Zdjąć blokadę z ${entry.ip_address}?`, confirmLabel: 'Zdejmij blokadę' });
        if (!ok) return;
        const result = await api('/api/panel/unban-ip', { method: 'POST', loginPath: LOGIN, json: { ipAddress: entry.ip_address } });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) void reload();
    }

    return (
        <>
            <PanelHeader
                title="Blokady"
                description="Zablokowane adresy nie mogą wysłać wiadomości do Twojej skrzynki. Blokada nie wpływa na inne strony."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <form className={ui.block} onSubmit={add}>
                <h2 className={ui.blockTitle}>Zablokuj adres</h2>
                <div className={ui.grid2}>
                    <div className="field">
                        <label htmlFor="pban-ip">Adres IP</label>
                        <input id="pban-ip" name="ip" className="input" required autoComplete="off" spellCheck={false} />
                    </div>
                    <div className="field">
                        <label htmlFor="pban-reason">Powód</label>
                        <input id="pban-reason" name="reason" className="input" defaultValue="Spam/Abuse" maxLength={255} />
                    </div>
                </div>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-danger" disabled={busy}>
                        <Icon name="ban" size={20} />
                        {busy ? 'Blokowanie...' : 'Zablokuj'}
                    </button>
                </div>
            </form>

            {error && <LoadError message={error} onRetry={reload} />}
            {data &&
                (data.bannedIPs.length === 0 ? (
                    <Empty>Nie masz żadnych blokad.</Empty>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Adres</th>
                                    <th scope="col">Powód</th>
                                    <th scope="col">Od</th>
                                    <th scope="col">
                                        <span className="sr-only">Akcje</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.bannedIPs.map(entry => (
                                    <tr key={entry.id}>
                                        <td className={ui.mono}>{entry.ip_address}</td>
                                        <td>{entry.reason || 'bez powodu'}</td>
                                        <td>{formatDate(entry.banned_at)}</td>
                                        <td>
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => unban(entry)}>
                                                Odblokuj
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
        </>
    );
}
