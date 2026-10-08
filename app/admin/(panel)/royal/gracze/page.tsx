import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlayersView } from '@/components/admin/royal/PlayersView';

export const metadata: Metadata = { title: 'RoyalCasino: gracze' };

export default function Page() {
    return (
        <Suspense>
            <PlayersView />
        </Suspense>
    );
}
