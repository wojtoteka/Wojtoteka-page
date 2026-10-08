import type { Metadata } from 'next';
import { ReportsView } from '@/components/admin/royal/OpsViews';

export const metadata: Metadata = { title: 'RoyalCasino: zgłoszenia' };

export default function Page() {
    return <ReportsView />;
}
