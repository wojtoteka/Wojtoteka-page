'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { HCaptcha, type HCaptchaHandle } from '@/components/forms/HCaptcha';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import styles from './kontakt.module.css';

const MAX_MESSAGE = 5000;

type Status = { kind: 'ok' | 'error'; text: string } | null;

export function ContactForm({ siteKey }: { siteKey: string }) {
    const captcha = useRef<HCaptchaHandle>(null);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<Status>(null);
    const [length, setLength] = useState(0);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const hcaptchaToken = captcha.current?.getResponse() || '';

        if (!hcaptchaToken) {
            setStatus({ kind: 'error', text: 'Zaznacz weryfikację hCaptcha nad przyciskiem.' });
            return;
        }

        setSending(true);
        setStatus(null);
        const result = await api<{ message: string }>('/api/contact', {
            method: 'POST',
            json: {
                name: data.get('name'),
                email: data.get('email'),
                subject: data.get('subject'),
                message: data.get('message'),
                hcaptchaToken
            }
        });
        setSending(false);
        captcha.current?.reset();

        if (result.ok) {
            form.reset();
            setLength(0);
            setStatus({ kind: 'ok', text: result.data.message || 'Wiadomość wysłana.' });
        } else {
            setStatus({ kind: 'error', text: result.data.message || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.' });
        }
    }

    return (
        <form className={styles.form} onSubmit={onSubmit} noValidate={false}>
            <div className={styles.row}>
                <div className="field">
                    <label htmlFor="name">Imię lub nick</label>
                    <input id="name" name="name" className="input" required maxLength={255} autoComplete="name" />
                </div>
                <div className="field">
                    <label htmlFor="email">Email do odpowiedzi</label>
                    <input id="email" name="email" type="email" className="input" required maxLength={255} autoComplete="email" />
                </div>
            </div>

            <div className="field">
                <label htmlFor="subject">Temat</label>
                <input id="subject" name="subject" className="input" required maxLength={255} />
            </div>

            <div className="field">
                <label htmlFor="message">Wiadomość</label>
                <textarea
                    id="message"
                    name="message"
                    className="textarea"
                    required
                    maxLength={MAX_MESSAGE}
                    rows={8}
                    aria-describedby="message-count"
                    onChange={event => setLength(event.target.value.length)}
                />
                <p id="message-count" className="hint">
                    {length} z {MAX_MESSAGE} znaków
                </p>
            </div>

            <HCaptcha ref={captcha} siteKey={siteKey} />

            <p className="hint">
                Wysyłając wiadomość, akceptujesz <Link href="/polityka-prywatnosci">politykę prywatności</Link>.
            </p>

            <div aria-live="polite">
                {status && (
                    <p className={status.kind === 'error' ? 'notice notice-error' : 'notice'}>
                        {status.kind === 'error' ? <strong>Nie wysłano. </strong> : null}
                        {status.text}
                    </p>
                )}
            </div>

            <div>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                    <Icon name="send" size={20} />
                    {sending ? 'Wysyłanie...' : 'Wyślij wiadomość'}
                </button>
            </div>
        </form>
    );
}
