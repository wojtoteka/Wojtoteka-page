'use client';

import { useRef, useState, type FormEvent } from 'react';
import { api } from '@/lib/client/api';
import styles from './Login.module.css';

type Step = 'email' | 'code' | 'done';

/** Reset hasła konta panelu: email, potem kod z maila i nowe hasło. */
export function ForgotPassword() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    function open() {
        setStep('email');
        setMessage(null);
        dialogRef.current?.showModal();
    }

    function close() {
        dialogRef.current?.close();
    }

    async function sendCode(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get('reset-email') || '').trim();
        setBusy(true);
        const result = await api<{ message: string }>('/api/panel/forgot-password', { method: 'POST', json: { email: value } });
        setBusy(false);
        if (!result.ok) {
            setMessage({ kind: 'error', text: result.data.message || 'Nie udało się wysłać kodu.' });
            return;
        }
        setEmail(value);
        setMessage({ kind: 'ok', text: result.data.message || 'Sprawdź skrzynkę.' });
        setStep('code');
    }

    async function resetPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const newPassword = String(data.get('new-password') || '');
        if (newPassword !== String(data.get('repeat-password') || '')) {
            setMessage({ kind: 'error', text: 'Hasła się różnią. Wpisz to samo hasło dwa razy.' });
            return;
        }
        setBusy(true);
        const result = await api<{ message: string }>('/api/panel/reset-password', {
            method: 'POST',
            json: { email, code: String(data.get('code') || '').trim(), newPassword }
        });
        setBusy(false);
        if (!result.ok) {
            setMessage({ kind: 'error', text: result.data.message || 'Nie udało się zmienić hasła.' });
            return;
        }
        setMessage(null);
        setStep('done');
    }

    return (
        <>
            <button type="button" className={styles.textButton} onClick={open}>
                Nie pamiętam hasła
            </button>

            <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="reset-title">
                <h2 id="reset-title" className={styles.dialogTitle}>
                    Nowe hasło
                </h2>

                {step === 'email' && (
                    <form className={styles.form} onSubmit={sendCode}>
                        <p className="muted">Podaj email konta. Wyślemy na niego 6-cyfrowy kod, ważny 10 minut.</p>
                        <div className="field">
                            <label htmlFor="reset-email">Adres email</label>
                            <input id="reset-email" name="reset-email" type="email" className="input" required autoComplete="email" />
                        </div>
                        {message && <p className={message.kind === 'error' ? 'notice notice-error' : 'notice'}>{message.text}</p>}
                        <div className={styles.dialogButtons}>
                            <button type="submit" className="btn btn-primary" disabled={busy}>
                                {busy ? 'Wysyłanie...' : 'Wyślij kod'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={close}>
                                Anuluj
                            </button>
                        </div>
                    </form>
                )}

                {step === 'code' && (
                    <form className={styles.form} onSubmit={resetPassword}>
                        {message && <p className={message.kind === 'error' ? 'notice notice-error' : 'notice'}>{message.text}</p>}
                        <div className="field">
                            <label htmlFor="code">Kod z maila</label>
                            <input
                                id="code"
                                name="code"
                                className={`input ${styles.code}`}
                                required
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                autoComplete="one-time-code"
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="new-password">Nowe hasło</label>
                            <input id="new-password" name="new-password" type="password" className="input" required minLength={8} maxLength={100} autoComplete="new-password" />
                            <p className="hint">Co najmniej 8 znaków.</p>
                        </div>
                        <div className="field">
                            <label htmlFor="repeat-password">Powtórz nowe hasło</label>
                            <input id="repeat-password" name="repeat-password" type="password" className="input" required minLength={8} maxLength={100} autoComplete="new-password" />
                        </div>
                        <div className={styles.dialogButtons}>
                            <button type="submit" className="btn btn-primary" disabled={busy}>
                                {busy ? 'Zapisywanie...' : 'Ustaw nowe hasło'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setStep('email')}>
                                Wyślij kod ponownie
                            </button>
                        </div>
                    </form>
                )}

                {step === 'done' && (
                    <div className={styles.form}>
                        <p>Hasło zmienione. Zaloguj się nowym hasłem.</p>
                        <div>
                            <button type="button" className="btn btn-primary" onClick={close}>
                                Wróć do logowania
                            </button>
                        </div>
                    </div>
                )}
            </dialog>
        </>
    );
}
