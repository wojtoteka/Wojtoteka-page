'use client';

import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent } from 'react';
import { api } from '@/lib/client/api';
import { useFeedback } from '@/components/panel/Feedback';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { ui } from '@/components/panel/ui';
import styles from './admin.module.css';

export interface BanDialogHandle {
    open: (ip: string) => void;
}

export const BAN_DURATIONS = [
    { value: '0', label: 'Na stałe' },
    { value: '1', label: '1 dzień' },
    { value: '3', label: '3 dni' },
    { value: '7', label: '7 dni' },
    { value: '30', label: '30 dni' },
    { value: '90', label: '90 dni' },
    { value: '365', label: '1 rok' }
];

/** Okno blokady IP otwierane z listy wiadomości. */
export const BanDialog = forwardRef<BanDialogHandle, { onBanned?: () => void }>(function BanDialog({ onBanned }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [ip, setIp] = useState('');
    const [busy, setBusy] = useState(false);
    const { toast } = useFeedback();

    useImperativeHandle(ref, () => ({
        open(value: string) {
            setIp(value);
            dialogRef.current?.showModal();
        }
    }));

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        const result = await api('/api/admin/ban-ip', {
            method: 'POST',
            loginPath: '/admin/logowanie',
            json: { ipAddress: ip, reason: data.get('reason'), scope: data.get('scope'), days: Number(data.get('days')) }
        });
        setBusy(false);
        toast(result.data.message || (result.ok ? 'Zablokowano.' : 'Nie udało się zablokować.'), result.ok ? 'ok' : 'error');
        if (result.ok) {
            dialogRef.current?.close();
            notifyPanelChanged();
            onBanned?.();
        }
    }

    return (
        <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="ban-title">
            <form className={styles.dialogForm} onSubmit={onSubmit}>
                <h2 id="ban-title" className={styles.dialogTitle}>
                    Zablokuj {ip}
                </h2>
                <div className="field">
                    <label htmlFor="ban-reason">Powód (widzisz go tylko Ty)</label>
                    <input id="ban-reason" name="reason" className="input" defaultValue="Spam/Abuse" maxLength={255} />
                </div>
                <fieldset className={ui.fieldset}>
                    <legend>Co blokujemy</legend>
                    <label className="check">
                        <input type="radio" name="scope" value="form" defaultChecked /> Tylko formularz kontaktowy
                    </label>
                    <label className="check">
                        <input type="radio" name="scope" value="site" /> Całą stronę (ten adres nic nie otworzy)
                    </label>
                </fieldset>
                <div className="field">
                    <label htmlFor="ban-days">Na jak długo</label>
                    <select id="ban-days" name="days" className="select" defaultValue="0">
                        {BAN_DURATIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-danger" disabled={busy}>
                        {busy ? 'Blokowanie...' : 'Zablokuj adres'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()}>
                        Anuluj
                    </button>
                </div>
            </form>
        </dialog>
    );
});
