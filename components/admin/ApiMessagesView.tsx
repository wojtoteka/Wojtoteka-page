'use client';

import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate, formatFullDate, plural } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { includesAny, useFilteredList, useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, Tag, ui } from '@/components/panel/ui';

export interface ApiMessage {
    id: number;
    api_key_name?: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    subject: string | null;
    message: string | null;
    ip_address: string | null;
    created_at: string;
}

/**
 * Lista wiadomości z publicznego API. Używa jej panel administratora
 * (wszystkie klucze) i panel skrzynki (tylko własny klucz).
 */
export function ApiMessageList({
    messages,
    onDelete,
    extraActions
}: {
    messages: ApiMessage[];
    onDelete: (message: ApiMessage) => void;
    extraActions?: (message: ApiMessage) => React.ReactNode;
}) {
    const list = useFilteredList(messages, (m, q) => includesAny(q, m.name, m.email, m.phone, m.subject, m.message, m.api_key_name, m.ip_address));

    return (
        <>
            <div className={ui.toolbar}>
                <SearchBox value={list.query} onChange={list.setQuery} label="Szukaj po nadawcy, treści, skrzynce lub IP" />
                <span className="muted small">
                    {list.total} {plural(list.total, 'wiadomość', 'wiadomości', 'wiadomości')}
                </span>
            </div>

            {list.visible.length === 0 ? (
                <Empty>{list.query ? `Nic nie pasuje do „${list.query}”.` : 'Brak wiadomości. Pojawią się, gdy ktoś wyśle formularz z Twojej strony.'}</Empty>
            ) : (
                <ul role="list" className={ui.list}>
                    {list.visible.map(message => (
                        <li key={message.id} className={ui.item}>
                            <div className={ui.itemHead}>
                                <h2 className={ui.itemTitle}>{message.subject || message.name || 'Wiadomość bez tematu'}</h2>
                                <time className={ui.itemDate} dateTime={message.created_at} title={formatFullDate(message.created_at)}>
                                    {formatDate(message.created_at)}
                                </time>
                            </div>
                            <p className={ui.meta}>
                                {message.api_key_name && <Tag>{message.api_key_name}</Tag>}
                                {message.name && <span>{message.name}</span>}
                                {message.email && <a href={`mailto:${message.email}`}>{message.email}</a>}
                                {message.phone && <a href={`tel:${message.phone.replace(/\s+/g, '')}`}>{message.phone}</a>}
                                {message.ip_address && <span className={ui.mono}>IP {message.ip_address}</span>}
                            </p>
                            {message.message && <p className={ui.itemBody}>{message.message}</p>}
                            <div className={ui.actions}>
                                {message.email && (
                                    <a
                                        className="btn btn-ghost btn-sm"
                                        href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || 'Twoja wiadomość'}`)}`}
                                    >
                                        <Icon name="mail" size={16} />
                                        Odpowiedz
                                    </a>
                                )}
                                {extraActions?.(message)}
                                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(message)}>
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
    );
}

const LOGIN = '/admin/logowanie';

export function ApiMessagesView() {
    const { data, error, loading, reload } = useResource<{ messages: ApiMessage[]; stats: { total: number; today: number } }>(
        '/api/admin/api-messages',
        LOGIN
    );
    const { toast, confirm } = useFeedback();

    async function remove(message: ApiMessage) {
        const ok = await confirm({
            title: 'Usunąć wiadomość?',
            body: 'Zniknie też z panelu właściciela skrzynki. Tego nie da się cofnąć.',
            confirmLabel: 'Usuń wiadomość',
            danger: true
        });
        if (!ok) return;
        const result = await api(`/api/admin/api-messages/${message.id}`, { method: 'DELETE', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    return (
        <>
            <PanelHeader
                title="Wiadomości z API"
                description={
                    data
                        ? `Ze wszystkich skrzynek (kluczy API). Razem ${data.stats.total}, dziś ${data.stats.today}.`
                        : 'Ze wszystkich skrzynek (kluczy API).'
                }
                actions={
                    <>
                        <a href="/api/admin/export/api-messages" className="btn btn-ghost btn-sm">
                            <Icon name="download" size={16} />
                            Eksport CSV
                        </a>
                        <RefreshButton onClick={reload} loading={loading} />
                    </>
                }
            />
            {error && <LoadError message={error} onRetry={reload} />}
            {data && <ApiMessageList messages={data.messages} onDelete={remove} />}
        </>
    );
}
