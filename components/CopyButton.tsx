'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';

export function CopyButton({ text, label = 'Kopiuj', className = 'btn btn-ghost btn-sm' }: { text: string; label?: string; className?: string }) {
    const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');

    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setState('done');
        } catch {
            setState('fail');
        }
        window.setTimeout(() => setState('idle'), 2000);
    }

    return (
        <button type="button" className={className} onClick={copy} aria-live="polite">
            <Icon name={state === 'done' ? 'check' : 'copy'} size={16} />
            {state === 'done' ? 'Skopiowano' : state === 'fail' ? 'Nie udało się' : label}
        </button>
    );
}
