'use client';

import { useRef } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate, formatFullDate, plural } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { includesAny, useFilteredList, useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, ui } from '@/components/panel/ui';
import { BanDialog, type BanDialogHandle } from './BanDialog';

interface Message {
    id: number;
    name: string;
    email: string;
    subject: string;
    message: string;
    ip_address: string | null;
    created_at: string;
}

const LOGIN = '/admin/logowanie';

export function MessagesView() {
    const { data, error, loading, reload } = useResource<{ messages: Message[]; stats: { total: number; today: number; week: number } }>(
        '/api/admin/messages',
        LOGIN
    );
    const list = useFilteredList(data?.messages ?? [], (m, q) => includesAny(q, m.name, m.email, m.subject, m.message, m.ip_address));
    const { toast, confirm } = useFeedback();
    const banRef = useRef<BanDialogHandle>(null);

    async function remove(message: Message) {
        const ok = await confirm({
            title: 'Usunąć wiadomość?',
            body: `Od: ${message.name} (${message.email}). Tego nie da się cofnąć.`,
            confirmLabel: 'Usuń wiadomość',
            danger: true
        });
        if (!ok) return;
        const result = await api(`/api/admin/messages/${message.id}`, { method: 'DELETE', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    const stats = data?.stats;

    return (
        <>
            <PanelHeader
                title="Wiadomości"
                description={
                    stats
                        ? `Z formularza na stronie kontaktowej. Razem ${stats.total}, dziś ${stats.today}, w ostatnich 7 dniach ${stats.week}.`
                        : 'Z formularza na stronie kontaktowej.'
                }
                actions={
                    <>
                        <a href="/api/admin/export/messages" className="btn btn-ghost btn-sm">
                            <Icon name="download" size={16} />
                            Eksport CSV
                        </a>
                        <RefreshButton onClick={reload} loading={loading} />
                    </>
                }
            />

            {error && <LoadError message={error} onRetry={reload} />}

            {data && (
                <>
                    <div className={ui.toolbar}>
                        <SearchBox value={list.query} onChange={list.setQuery} label="Szukaj po nadawcy, emailu, treści lub IP" />
                        <span className="muted small">
                            {list.total} {plural(list.total, 'wiadomość', 'wiadomości', 'wiadomości')}
                        </span>
                    </div>

                    {list.visible.length === 0 ? (
                        <Empty>{list.query ? `Nic nie pasuje do „${list.query}”.` : 'Skrzynka jest pusta. Nowe wiadomości pojawią się tutaj.'}</Empty>
                    ) : (
                        <ul role="list" className={ui.list}>
                            {list.visible.map(message => (
                                <li key={message.id} className={ui.item}>
                                    <div className={ui.itemHead}>
                                        <h2 className={ui.itemTitle}>{message.subject || 'Bez tematu'}</h2>
                                        <time className={ui.itemDate} dateTime={message.created_at} title={formatFullDate(message.created_at)}>
                                            {formatDate(message.created_at)}
                                        </time>
                                    </div>
                                    <p className={ui.meta}>
                                        <span>{message.name}</span>
                                        <a href={`mailto:${message.email}`}>{message.email}</a>
                                        {message.ip_address && <span className={ui.mono}>IP {message.ip_address}</span>}
                                    </p>
                                    <p className={ui.itemBody}>{message.message}</p>
                                    <div className={ui.actions}>
                                        <a
                                            className="btn btn-ghost btn-sm"
                                            href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || 'Twoja wiadomość'}`)}`}
                                        >
                                            <Icon name="mail" size={16} />
                                            Odpowiedz
                                        </a>
                                        {message.ip_address && (
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => banRef.current?.open(message.ip_address!)}>
                                                <Icon name="ban" size={16} />
                                                Zablokuj IP
                                            </button>
                                        )}
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(message)}>
                                            <Icon name="trash" size={16} />
                                            Usuń
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Pager page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
                </>
            )}

            <BanDialog ref={banRef} />
        </>
    );
}
