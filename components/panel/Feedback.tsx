'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './Feedback.module.css';

// Powiadomienia (toast) i okno potwierdzenia dla paneli.
// Zastępują alert() i confirm() z poprzedniej wersji.

type Toast = { id: number; text: string; kind: 'ok' | 'error' };

interface ConfirmOptions {
    title: string;
    body?: string;
    confirmLabel: string;
    danger?: boolean;
}

interface FeedbackApi {
    toast: (text: string, kind?: 'ok' | 'error') => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
    const value = useContext(FeedbackContext);
    if (!value) throw new Error('useFeedback musi być użyte wewnątrz <FeedbackProvider>');
    return value;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [pending, setPending] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const nextId = useRef(1);

    const toast = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
        const id = nextId.current++;
        setToasts(list => [...list, { id, text, kind }]);
        window.setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), kind === 'error' ? 7000 : 4500);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        setPending(options);
        window.setTimeout(() => dialogRef.current?.showModal(), 0);
        return new Promise<boolean>(resolve => {
            resolver.current = resolve;
        });
    }, []);

    function settle(value: boolean) {
        resolver.current?.(value);
        resolver.current = null;
        dialogRef.current?.close();
        setPending(null);
    }

    return (
        <FeedbackContext.Provider value={{ toast, confirm }}>
            {children}

            <div className={styles.toasts} aria-live="polite" aria-atomic="false">
                {toasts.map(t => (
                    <p key={t.id} className={`${styles.toast} ${t.kind === 'error' ? styles.toastError : ''}`}>
                        <Icon name={t.kind === 'error' ? 'close' : 'check'} size={18} />
                        {t.text}
                    </p>
                ))}
            </div>

            <dialog ref={dialogRef} className={styles.dialog} onCancel={() => settle(false)} aria-labelledby="confirm-title">
                {pending && (
                    <form
                        method="dialog"
                        onSubmit={event => {
                            event.preventDefault();
                            settle(true);
                        }}
                    >
                        <h2 id="confirm-title" className={styles.title}>
                            {pending.title}
                        </h2>
                        {pending.body && <p className={styles.body}>{pending.body}</p>}
                        <div className={styles.buttons}>
                            <button type="submit" className={`btn ${pending.danger ? 'btn-danger' : 'btn-primary'}`} autoFocus>
                                {pending.confirmLabel}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => settle(false)}>
                                Anuluj
                            </button>
                        </div>
                    </form>
                )}
            </dialog>
        </FeedbackContext.Provider>
    );
}
