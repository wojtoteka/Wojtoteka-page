'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { PanelHeader, ui } from '@/components/panel/ui';
import styles from './admin.module.css';

const LOGIN = '/admin/logowanie';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function EmailView() {
    const { toast } = useFeedback();
    const [recipients, setRecipients] = useState<string[]>([]);
    const [draft, setDraft] = useState('');
    const [html, setHtml] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ message: string; failed: { email: string }[] } | null>(null);

    function addRecipients(raw: string): boolean {
        const parts = raw.split(/[,;\s]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
        const bad = parts.filter(p => !EMAIL.test(p));
        if (bad.length) {
            toast(`To nie wygląda na adres email: ${bad.join(', ')}`, 'error');
            return false;
        }
        setRecipients(list => [...new Set([...list, ...parts])]);
        return true;
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            if (draft.trim() && addRecipients(draft)) setDraft('');
        } else if (event.key === 'Backspace' && !draft && recipients.length) {
            setRecipients(list => list.slice(0, -1));
        }
    }

    async function send(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        let list = recipients;
        if (draft.trim()) {
            if (!addRecipients(draft)) return;
            list = [...new Set([...recipients, ...draft.split(/[,;\s]+/).map(p => p.trim().toLowerCase()).filter(Boolean)])];
            setDraft('');
        }
        if (!list.length) {
            toast('Dodaj co najmniej jednego odbiorcę.', 'error');
            return;
        }
        const values = new FormData(form);
        setBusy(true);
        const response = await api<{ message: string; failed: { email: string }[] }>('/api/admin/send-email', {
            method: 'POST',
            loginPath: LOGIN,
            json: { fromName: values.get('fromName'), recipients: list, subject: values.get('subject'), body: values.get('body'), isHtml: html }
        });
        setBusy(false);
        if (!response.ok) {
            toast(response.data.message || 'Nie udało się wysłać.', 'error');
            return;
        }
        setResult({ message: response.data.message, failed: response.data.failed || [] });
        setRecipients([]);
        form.reset();
        setHtml(false);
    }

    return (
        <>
            <PanelHeader
                title="Wyślij email"
                description="Wiadomość idzie z serwera SMTP strony. Każdy odbiorca dostaje osobny mail i nie widzi pozostałych."
            />

            <form className={ui.block} onSubmit={send}>
                <div className={ui.grid2}>
                    <div className="field">
                        <label htmlFor="mail-from">Od (nazwa nadawcy)</label>
                        <input id="mail-from" name="fromName" className="input" required maxLength={100} defaultValue="Wojtoteka" />
                    </div>
                    <div className="field">
                        <label htmlFor="mail-subject">Temat</label>
                        <input id="mail-subject" name="subject" className="input" required maxLength={255} />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="mail-to">Do</label>
                    <div className={styles.chips}>
                        {recipients.map(email => (
                            <span key={email} className={styles.chip}>
                                {email}
                                <button type="button" onClick={() => setRecipients(list => list.filter(e => e !== email))} aria-label={`Usuń ${email}`}>
                                    <Icon name="close" size={14} />
                                </button>
                            </span>
                        ))}
                        <input
                            id="mail-to"
                            className={styles.chipInput}
                            value={draft}
                            onChange={event => setDraft(event.target.value)}
                            onKeyDown={onKeyDown}
                            onBlur={() => {
                                if (draft.trim() && addRecipients(draft)) setDraft('');
                            }}
                            autoComplete="off"
                            inputMode="email"
                        />
                    </div>
                    <p className="hint">Wpisz adres i naciśnij Enter albo przecinek. Możesz też wkleić kilka adresów naraz. Najwyżej 100 odbiorców.</p>
                </div>

                <fieldset className={ui.fieldset}>
                    <legend>Format treści</legend>
                    <div className={ui.options}>
                        <label className="check">
                            <input type="radio" name="format" checked={!html} onChange={() => setHtml(false)} /> Zwykły tekst
                        </label>
                        <label className="check">
                            <input type="radio" name="format" checked={html} onChange={() => setHtml(true)} /> HTML
                        </label>
                    </div>
                </fieldset>

                <div className="field">
                    <label htmlFor="mail-body">Treść</label>
                    <textarea id="mail-body" name="body" className="textarea" required rows={10} placeholder={html ? '<p>Cześć!</p>' : ''} />
                </div>

                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        <Icon name="send" size={20} />
                        {busy ? `Wysyłanie do ${recipients.length || 1}...` : 'Wyślij'}
                    </button>
                </div>
            </form>

            {result && (
                <div className="notice" role="status">
                    <p>{result.message}</p>
                    {result.failed.length > 0 && <p className="muted">Nie doszło do: {result.failed.map(f => f.email).join(', ')}</p>}
                </div>
            )}
        </>
    );
}
