'use client';

import { Icon } from '@/components/Icon';

/** Ponownie ładuje bieżący adres, np. po chwilowej awarii serwera. */
export function ReloadButton({ label = 'Spróbuj ponownie' }: { label?: string }) {
    return (
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            <Icon name="refresh" size={20} />
            {label}
        </button>
    );
}
