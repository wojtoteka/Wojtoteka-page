'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { HCaptcha, type HCaptchaHandle } from '@/components/forms/HCaptcha';
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
        <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.row}>
                <div className={styles.field}>
                    <label htmlFor="name">
                        <span>01</span> Imię lub nick
                    </label>
                    <input id="name" name="name" className={styles.input} required maxLength={255} autoComplete="name" placeholder="Jak mam się zwracać?" />
                </div>
                <div className={styles.field}>
                    <label htmlFor="email">
                        <span>02</span> Email do odpowiedzi
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        className={styles.input}
                        required
                        maxLength={255}
                        autoComplete="email"
                        placeholder="ty@przyklad.pl"
                    />
                </div>
            </div>

            <div className={styles.field}>
                <label htmlFor="subject">
                    <span>03</span> Temat
                </label>
                <input id="subject" name="subject" className={styles.input} required maxLength={255} placeholder="W kilku słowach" />
            </div>

            <div className={styles.field}>
                <label htmlFor="message">
                    <span>04</span> Wiadomość
                </label>
                <textarea
                    id="message"
                    name="message"
                    className={`${styles.input} ${styles.textarea}`}
                    required
                    maxLength={MAX_MESSAGE}
                    rows={7}
                    aria-describedby="message-count"
                    placeholder="Opisz, o co chodzi"
                    onChange={event => setLength(event.target.value.length)}
                />
                <p id="message-count" className={styles.counter}>
                    <span className={styles.meter} aria-hidden="true">
                        <span style={{ transform: `scaleX(${length / MAX_MESSAGE})` }} />
                    </span>
                    {length} z {MAX_MESSAGE} znaków
                </p>
            </div>

            <HCaptcha ref={captcha} siteKey={siteKey} />

            <p className={styles.consent}>
                Wysyłając wiadomość, akceptujesz <Link href="/polityka-prywatnosci">politykę prywatności</Link>.
            </p>

            <div aria-live="polite">
                {status && (
                    <p className={styles.status} data-kind={status.kind}>
                        <span className={styles.statusTag}>{status.kind === 'error' ? 'Nie wysłano' : 'Wysłano'}</span>
                        {status.text}
                    </p>
                )}
            </div>

            <div>
                <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={sending}>
                    {sending ? 'Wysyłanie...' : 'Wyślij wiadomość'}
                    <span className="v2-arrow" aria-hidden="true">
                        →
                    </span>
                </button>
            </div>
        </form>
    );
}
