import type { Metadata } from 'next';
import { PayoutsView } from '@/components/admin/royal/OpsViews';

export const metadata: Metadata = { title: 'RoyalCasino: wypłaty' };

export default function Page() {
    return <PayoutsView />;
}
