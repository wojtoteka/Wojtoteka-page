'use client';

import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { ApiMessageList, type ApiMessage } from '@/components/admin/ApiMessagesView';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, PanelHeader, RefreshButton } from '@/components/panel/ui';

const LOGIN = '/panel/logowanie';

export function InboxView() {
    const me = useResource<{ username: string; apiKeyName: string | null }>('/api/panel/me', LOGIN);
    const { data, error, loading, reload } = useResource<{ messages: ApiMessage[]; stats: { total: number; today: number; week: number } }>(
        '/api/panel/messages',
        LOGIN
    );
    const { toast, confirm } = useFeedback();

    async function remove(message: ApiMessage) {
        const ok = await confirm({ title: 'Usunąć wiadomość?', body: 'Tego nie da się cofnąć.', confirmLabel: 'Usuń wiadomość', danger: true });
        if (!ok) return;
        const result = await api(`/api/panel/messages/${message.id}`, { method: 'DELETE', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) void reload();
    }

    async function ban(message: ApiMessage) {
        if (!message.ip_address) return;
        const ok = await confirm({
            title: `Zablokować ${message.ip_address}?`,
            body: 'Z tego adresu nie przyjdzie już żadna wiadomość do Twojej skrzynki. Blokadę zdejmiesz w zakładce Blokady.',
            confirmLabel: 'Zablokuj adres',
            danger: true
        });
        if (!ok) return;
        const result = await api('/api/panel/ban-ip', { method: 'POST', loginPath: LOGIN, json: { ipAddress: message.ip_address, reason: 'Spam/Abuse' } });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) notifyPanelChanged();
    }

    const stats = data?.stats;
    const box = me.data?.apiKeyName;

    return (
        <>
            <PanelHeader
                title="Wiadomości"
                description={
                    box
                        ? `Skrzynka „${box}”.${stats ? ` Razem ${stats.total}, dziś ${stats.today}, w ostatnich 7 dniach ${stats.week}.` : ''}`
                        : 'Wiadomości z formularza na Twojej stronie.'
                }
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />
            {me.data && !box && (
                <Empty>To konto nie ma jeszcze przypisanej skrzynki. Poproś administratora o przypisanie klucza API.</Empty>
            )}
            {error && <LoadError message={error} onRetry={reload} />}
            {data && box && (
                <ApiMessageList
                    messages={data.messages}
                    onDelete={remove}
                    extraActions={message =>
                        message.ip_address ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => ban(message)}>
                                <Icon name="ban" size={16} />
                                Zablokuj IP
                            </button>
                        ) : null
                    }
                />
            )}
        </>
    );
}
