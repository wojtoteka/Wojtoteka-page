'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { useResource } from '@/components/panel/hooks';
import { PanelHeader, ui } from '@/components/panel/ui';

const LOGIN = '/panel/logowanie';

export function AccountSettingsView() {
    const me = useResource<{ username: string; email: string; apiKeyName: string | null }>('/api/panel/me', LOGIN);
    const { toast } = useFeedback();
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        if (values.get('newPassword') !== values.get('repeatPassword')) {
            toast('Nowe hasło i powtórzenie się różnią.', 'error');
            return;
        }
        setBusy(true);
        const result = await api('/api/panel/change-password', {
            method: 'POST',
            loginPath: LOGIN,
            json: { currentPassword: values.get('currentPassword'), newPassword: values.get('newPassword') }
        });
        setBusy(false);
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) form.reset();
    }

    return (
        <>
            <PanelHeader title="Konto" description="Dane konta i zmiana hasła." />

            {me.data && (
                <section className={ui.block} aria-label="Dane konta">
                    <dl className={ui.grid3}>
                    <div>
                        <dt className="muted small">Nazwa użytkownika</dt>
                        <dd>{me.data.username}</dd>
                    </div>
                    <div>
                        <dt className="muted small">Email do logowania</dt>
                        <dd>{me.data.email}</dd>
                    </div>
                    <div>
                        <dt className="muted small">Skrzynka</dt>
                        <dd>{me.data.apiKeyName || 'nieprzypisana'}</dd>
                    </div>
                    </dl>
                    <p className="hint">
                        Jak wstawić formularz na swoją stronę, opisuje <Link href="/api">dokumentacja API</Link>.
                    </p>
                </section>
            )}

            <form className={ui.block} onSubmit={submit}>
                <h2 className={ui.blockTitle}>Zmiana hasła</h2>
                <div className={ui.grid3}>
                    <div className="field">
                        <label htmlFor="acc-current">Obecne hasło</label>
                        <input id="acc-current" name="currentPassword" type="password" className="input" required autoComplete="current-password" />
                    </div>
                    <div className="field">
                        <label htmlFor="acc-new">Nowe hasło</label>
                        <input id="acc-new" name="newPassword" type="password" className="input" required minLength={8} maxLength={100} autoComplete="new-password" />
                        <p className="hint">Od 8 do 100 znaków.</p>
                    </div>
                    <div className="field">
                        <label htmlFor="acc-repeat">Powtórz nowe hasło</label>
                        <input id="acc-repeat" name="repeatPassword" type="password" className="input" required minLength={8} maxLength={100} autoComplete="new-password" />
                    </div>
                </div>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        <Icon name="key" size={20} />
                        {busy ? 'Zapisywanie...' : 'Zmień hasło'}
                    </button>
                </div>
            </form>
        </>
    );
}
