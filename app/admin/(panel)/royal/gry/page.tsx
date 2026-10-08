import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GamesView } from '@/components/admin/royal/GamesView';

export const metadata: Metadata = { title: 'RoyalCasino: logi gier' };

export default function Page() {
    return (
        <Suspense>
            <GamesView />
        </Suspense>
    );
}
