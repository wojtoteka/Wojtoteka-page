'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, PanelHeader, RefreshButton, Tag, ui } from '@/components/panel/ui';
import type { ApiKeyRow } from './ApiKeysView';
import styles from './admin.module.css';

interface Account {
    id: number;
    email: string;
    username: string;
    api_key_id: number | null;
    api_key_name: string | null;
    is_active: number;
    is_locked: number;
    failed_login_attempts: number;
    created_at: string;
    last_login: string | null;
    last_login_ip: string | null;
}

const LOGIN = '/admin/logowanie';

function KeyOptions({ keys }: { keys: ApiKeyRow[] }) {
    return (
        <>
            <option value="">Bez skrzynki</option>
            {keys.map(key => (
                <option key={key.id} value={key.id}>
                    {key.name}
                    {key.is_active ? '' : ' (wyłączony)'}
                </option>
            ))}
        </>
    );
}

export function AccountsView() {
    const accounts = useResource<{ subAccounts: Account[] }>('/api/admin/sub-accounts', LOGIN);
    const keys = useResource<{ apiKeys: ApiKeyRow[] }>('/api/admin/api-keys', LOGIN);
    const { toast, confirm } = useFeedback();
    const [busy, setBusy] = useState(false);
    const [assignments, setAssignments] = useState<Record<number, string>>({});
    const apiKeys = keys.data?.apiKeys ?? [];

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        const result = await api('/api/admin/sub-accounts', {
            method: 'POST',
            loginPath: LOGIN,
            json: { username: values.get('username'), email: values.get('email'), api_key_id: values.get('api_key_id') || null }
        });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            form.reset();
            void accounts.reload();
            notifyPanelChanged();
        }
    }

    async function saveKey(account: Account) {
        const value = assignments[account.id] ?? String(account.api_key_id ?? '');
        const result = await api(`/api/admin/sub-accounts/${account.id}/api-key`, {
            method: 'PATCH',
            loginPath: LOGIN,
            json: { api_key_id: value || null }
        });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) void accounts.reload();
    }

    async function action(account: Account, kind: 'reset' | 'unlock' | 'delete') {
        if (kind === 'reset') {
            const ok = await confirm({
                title: `Nowe hasło dla ${account.username}?`,
                body: `Wygenerujemy losowe hasło i wyślemy je na ${account.email}. Stare przestanie działać.`,
                confirmLabel: 'Wyślij nowe hasło'
            });
            if (!ok) return;
        }
        if (kind === 'delete') {
            const ok = await confirm({
                title: `Usunąć konto ${account.username}?`,
                body: 'Osoba straci dostęp do panelu. Wiadomości skrzynki zostają, bo należą do klucza API.',
                confirmLabel: 'Usuń konto',
                danger: true
            });
            if (!ok) return;
        }
        const url =
            kind === 'delete'
                ? `/api/admin/sub-accounts/${account.id}`
                : `/api/admin/sub-accounts/${account.id}/${kind === 'reset' ? 'reset-password' : 'unlock'}`;
        const result = await api(url, { method: kind === 'delete' ? 'DELETE' : 'POST', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void accounts.reload();
            if (kind === 'delete') notifyPanelChanged();
        }
    }

    const reloadAll = () => {
        void accounts.reload();
        void keys.reload();
    };

    return (
        <>
            <PanelHeader
                title="Konta panelu"
                description="Konta dla osób, które czytają wiadomości ze swojej skrzynki w /panel. Hasło generuje się samo i idzie mailem."
                actions={<RefreshButton onClick={reloadAll} loading={accounts.loading} />}
            />

            <form className={ui.block} onSubmit={create}>
                <h2 className={ui.blockTitle}>Nowe konto</h2>
                <div className={ui.grid3}>
                    <div className="field">
                        <label htmlFor="acc-username">Nazwa użytkownika</label>
                        <input id="acc-username" name="username" className="input" required minLength={3} maxLength={50} />
                    </div>
                    <div className="field">
                        <label htmlFor="acc-email">Email (login)</label>
                        <input id="acc-email" name="email" type="email" className="input" required maxLength={255} />
                    </div>
                    <div className="field">
                        <label htmlFor="acc-key">Skrzynka (klucz API)</label>
                        <select id="acc-key" name="api_key_id" className="select" defaultValue="">
                            <KeyOptions keys={apiKeys} />
                        </select>
                    </div>
                </div>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        <Icon name="plus" size={20} />
                        {busy ? 'Tworzenie...' : 'Utwórz konto i wyślij hasło'}
                    </button>
                </div>
            </form>

            {accounts.error && <LoadError message={accounts.error} onRetry={accounts.reload} />}

            {accounts.data &&
                (accounts.data.subAccounts.length === 0 ? (
                    <Empty>Nie ma jeszcze kont panelu.</Empty>
                ) : (
                    <ul role="list" className={ui.list}>
                        {accounts.data.subAccounts.map(account => (
                            <li key={account.id} className={ui.item}>
                                <div className={ui.itemHead}>
                                    <h2 className={ui.itemTitle}>{account.username}</h2>
                                    <span className={ui.itemDate}>założone {formatDate(account.created_at)}</span>
                                </div>
                                <p className={ui.meta}>
                                    <a href={`mailto:${account.email}`}>{account.email}</a>
                                    {account.is_locked ? <Tag tone="warn">Zablokowane</Tag> : account.is_active ? <Tag>Aktywne</Tag> : <Tag tone="muted">Wyłączone</Tag>}
                                    <span>
                                        {account.last_login
                                            ? `Ostatnio ${formatDate(account.last_login)}${account.last_login_ip ? `, IP ${account.last_login_ip}` : ''}`
                                            : 'Jeszcze się nie logowało'}
                                    </span>
                                    {account.failed_login_attempts > 0 && <span>Nieudane próby: {account.failed_login_attempts}</span>}
                                </p>
                                <div className={styles.inlineRow}>
                                    <label htmlFor={`acc-key-${account.id}`} className="label">
                                        Skrzynka
                                    </label>
                                    <select
                                        id={`acc-key-${account.id}`}
                                        className="select"
                                        value={assignments[account.id] ?? String(account.api_key_id ?? '')}
                                        onChange={event => setAssignments(a => ({ ...a, [account.id]: event.target.value }))}
                                    >
                                        <KeyOptions keys={apiKeys} />
                                    </select>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveKey(account)}>
                                        Zapisz
                                    </button>
                                </div>
                                <div className={ui.actions}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => action(account, 'reset')}>
                                        <Icon name="key" size={16} />
                                        Nowe hasło
                                    </button>
                                    {!!account.is_locked && (
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => action(account, 'unlock')}>
                                            <Icon name="unlock" size={16} />
                                            Odblokuj
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => action(account, 'delete')}>
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
