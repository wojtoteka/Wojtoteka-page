'use client';

import { useRef, useState, type FormEvent } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { formatDate } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, PanelHeader, RefreshButton, Tag, ui } from '@/components/panel/ui';
import styles from './admin.module.css';

export interface ApiKeyRow {
    id: number;
    api_key: string;
    name: string;
    collect_name: number;
    collect_email: number;
    collect_phone: number;
    collect_subject: number;
    collect_message: number;
    notification_email: string | null;
    is_active: number;
    created_at: string;
}

const LOGIN = '/admin/logowanie';

const FIELDS = [
    { key: 'collect_name', field: 'name', label: 'Imię lub nick', defaultOn: true },
    { key: 'collect_email', field: 'email', label: 'Email', defaultOn: true },
    { key: 'collect_phone', field: 'phone', label: 'Telefon', defaultOn: false },
    { key: 'collect_subject', field: 'subject', label: 'Temat', defaultOn: true },
    { key: 'collect_message', field: 'message', label: 'Treść', defaultOn: true }
] as const;

function integrationCode(key: ApiKeyRow, origin: string): string {
    const active = FIELDS.filter(f => key[f.key]);
    const inputs = active
        .map(f =>
            f.field === 'message'
                ? `  <label>${f.label} <textarea name="message" required></textarea></label>`
                : `  <label>${f.label} <input name="${f.field}"${f.field === 'email' ? ' type="email"' : f.field === 'phone' ? ' type="tel"' : ''} required></label>`
        )
        .join('\n');
    const body = active.map(f => `        ${f.field}: form.${f.field}.value`).join(',\n');

    return `<form id="apiContactForm">
${inputs}
  <button type="submit">Wyślij wiadomość</button>
</form>
<p id="formStatus" role="status"></p>

<script>
document.getElementById('apiContactForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const status = document.getElementById('formStatus');
  try {
    const response = await fetch('${origin}/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': '${key.api_key}' },
      body: JSON.stringify({
${body}
      })
    });
    const data = await response.json();
    status.textContent = data.message;
    if (response.ok) form.reset();
  } catch (error) {
    status.textContent = 'Brak połączenia. Spróbuj ponownie.';
  }
});
</script>`;
}

export function ApiKeysView() {
    const { data, error, loading, reload } = useResource<{ apiKeys: ApiKeyRow[] }>('/api/admin/api-keys', LOGIN);
    const { toast, confirm } = useFeedback();
    const [created, setCreated] = useState<{ name: string; key: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [guide, setGuide] = useState<ApiKeyRow | null>(null);
    const guideRef = useRef<HTMLDialogElement>(null);

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        const result = await api<{ apiKey: { api_key: string; name: string } }>('/api/admin/api-keys', {
            method: 'POST',
            loginPath: LOGIN,
            json: {
                name: values.get('name'),
                notification_email: values.get('notification_email') || null,
                ...Object.fromEntries(FIELDS.map(f => [f.key, values.get(f.key) === 'on']))
            }
        });
        setBusy(false);
        if (!result.ok) {
            toast(result.data.message || 'Nie udało się utworzyć klucza.', 'error');
            return;
        }
        form.reset();
        setCreated({ name: result.data.apiKey.name, key: result.data.apiKey.api_key });
        void reload();
        notifyPanelChanged();
    }

    async function toggle(key: ApiKeyRow) {
        const result = await api(`/api/admin/api-keys/${key.id}/toggle`, { method: 'PATCH', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) void reload();
    }

    async function remove(key: ApiKeyRow) {
        const ok = await confirm({
            title: `Usunąć klucz „${key.name}”?`,
            body: 'Razem z kluczem znikną wszystkie jego wiadomości, a formularze na stronach z tym kluczem przestaną działać.',
            confirmLabel: 'Usuń klucz i wiadomości',
            danger: true
        });
        if (!ok) return;
        const result = await api(`/api/admin/api-keys/${key.id}`, { method: 'DELETE', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    function openGuide(key: ApiKeyRow) {
        setGuide(key);
        window.setTimeout(() => guideRef.current?.showModal(), 0);
    }

    return (
        <>
            <PanelHeader
                title="Klucze API"
                description="Każdy klucz to osobna skrzynka dla formularza na cudzej stronie. Wybierasz, jakie pola zbiera i gdzie wysyła powiadomienia."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <form className={ui.block} onSubmit={create}>
                <h2 className={ui.blockTitle}>Nowy klucz</h2>
                <div className={ui.grid2}>
                    <div className="field">
                        <label htmlFor="key-name">Nazwa</label>
                        <input id="key-name" name="name" className="input" required maxLength={255} />
                        <p className="hint">Np. nazwa strony klienta. Widać ją w mailach z powiadomieniem.</p>
                    </div>
                    <div className="field">
                        <label htmlFor="key-email">Email do powiadomień</label>
                        <input id="key-email" name="notification_email" type="email" className="input" maxLength={255} />
                        <p className="hint">Puste pole: bez maili, wiadomości tylko w panelu.</p>
                    </div>
                </div>
                <fieldset className={ui.fieldset}>
                    <legend>Pola formularza (każde zaznaczone będzie wymagane)</legend>
                    <div className={ui.options}>
                        {FIELDS.map(f => (
                            <label key={f.key} className="check">
                                <input type="checkbox" name={f.key} defaultChecked={f.defaultOn} /> {f.label}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        <Icon name="plus" size={20} />
                        {busy ? 'Tworzenie...' : 'Utwórz klucz'}
                    </button>
                </div>
                {created && (
                    <div className="notice">
                        <p>
                            Klucz <strong>{created.name}</strong> jest gotowy. Przekaż go właścicielowi strony:
                        </p>
                        <div className={ui.keyValue}>
                            <code>{created.key}</code>
                            <CopyButton text={created.key} />
                        </div>
                    </div>
                )}
            </form>

            {error && <LoadError message={error} onRetry={reload} />}

            {data &&
                (data.apiKeys.length === 0 ? (
                    <Empty>Nie ma jeszcze żadnego klucza. Utwórz pierwszy formularzem powyżej.</Empty>
                ) : (
                    <ul role="list" className={ui.list}>
                        {data.apiKeys.map(key => (
                            <li key={key.id} className={`${ui.item} ${key.is_active ? '' : ui.itemDimmed}`}>
                                <div className={ui.itemHead}>
                                    <h2 className={ui.itemTitle}>{key.name}</h2>
                                    <span className={ui.itemDate}>utworzony {formatDate(key.created_at)}</span>
                                </div>
                                <p className={ui.meta}>
                                    {key.is_active ? <Tag>Aktywny</Tag> : <Tag tone="warn">Wyłączony</Tag>}
                                    <span>{key.notification_email ? `Powiadomienia: ${key.notification_email}` : 'Bez powiadomień mailem'}</span>
                                </p>
                                <div className={ui.tags}>
                                    {FIELDS.filter(f => key[f.key]).map(f => (
                                        <Tag key={f.key} tone="muted">
                                            {f.label}
                                        </Tag>
                                    ))}
                                </div>
                                <div className={ui.keyValue}>
                                    <code>{key.api_key}</code>
                                    <CopyButton text={key.api_key} />
                                </div>
                                <div className={ui.actions}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openGuide(key)}>
                                        <Icon name="code" size={16} />
                                        Kod do wklejenia
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(key)}>
                                        <Icon name={key.is_active ? 'pause' : 'play'} size={16} />
                                        {key.is_active ? 'Wyłącz' : 'Włącz'}
                                    </button>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(key)}>
                                        <Icon name="trash" size={16} />
                                        Usuń
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ))}

            <dialog ref={guideRef} className={`${styles.dialog} ${styles.dialogWide}`} aria-labelledby="guide-title" onClose={() => setGuide(null)}>
                {guide && (
                    <div className={styles.dialogProse}>
                        <h2 id="guide-title" className={styles.dialogTitle}>
                            Formularz dla „{guide.name}”
                        </h2>
                        <p className="muted">
                            Właściciel strony wkleja ten kod w miejscu, gdzie ma być formularz. Pola odpowiadają ustawieniom klucza. Opis wszystkich
                            odpowiedzi serwera jest w <a href="/api#odpowiedzi">dokumentacji API</a>.
                        </p>
                        <pre>
                            <code>{integrationCode(guide, window.location.origin)}</code>
                        </pre>
                        <div className={ui.formActions}>
                            <CopyButton text={integrationCode(guide, window.location.origin)} label="Kopiuj kod" className="btn btn-primary" />
                            <button type="button" className="btn btn-ghost" onClick={() => guideRef.current?.close()}>
                                Zamknij
                            </button>
                        </div>
                    </div>
                )}
            </dialog>
        </>
    );
}
