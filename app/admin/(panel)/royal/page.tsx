import type { Metadata } from 'next';
import { DashboardView } from '@/components/admin/royal/DashboardView';

export const metadata: Metadata = { title: 'RoyalCasino' };

export default function Page() {
    return <DashboardView />;
}
