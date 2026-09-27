'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { Icon } from '@/components/Icon';
import { LOGIN_ERRORS } from '@/lib/auth/constants';
import styles from './Login.module.css';

type Provider = 'admin' | 'panel';

export function LoginForm({ provider, redirectTo }: { provider: Provider; redirectTo: string }) {
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const idField = provider === 'admin' ? 'username' : 'email';

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError('');

        const result = await signIn(provider, {
            [idField]: String(data.get(idField) || ''),
            password: String(data.get('password') || ''),
            redirect: false
        });

        if (result?.error) {
            setError(LOGIN_ERRORS[result.code || 'credentials'] || LOGIN_ERRORS.credentials);
            setBusy(false);
            return;
        }
        // Pełne przeładowanie: serwer od razu widzi nowe ciasteczko sesji.
        window.location.assign(redirectTo);
    }

    return (
        <form className={styles.form} onSubmit={onSubmit}>
            {provider === 'admin' ? (
                <div className="field">
                    <label htmlFor="username">Login</label>
                    <input id="username" name="username" className="input" required maxLength={100} autoComplete="username" autoFocus />
                </div>
            ) : (
                <div className="field">
                    <label htmlFor="email">Adres email</label>
                    <input id="email" name="email" type="email" className="input" required maxLength={255} autoComplete="email" autoFocus />
                </div>
            )}
            <div className="field">
                <label htmlFor="password">Hasło</label>
                <input id="password" name="password" type="password" className="input" required maxLength={100} autoComplete="current-password" />
            </div>

            <div aria-live="assertive">
                {error && (
                    <p className="notice notice-error">
                        <strong>Nie zalogowano. </strong>
                        {error}
                    </p>
                )}
            </div>

            <div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                    <Icon name="key" size={20} />
                    {busy ? 'Sprawdzanie...' : 'Zaloguj się'}
                </button>
            </div>
        </form>
    );
}
