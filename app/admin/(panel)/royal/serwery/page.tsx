import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuildsView } from '@/components/admin/royal/OpsViews';

export const metadata: Metadata = { title: 'RoyalCasino: serwery' };

export default function Page() {
    return (
        <Suspense>
            <GuildsView />
        </Suspense>
    );
}
