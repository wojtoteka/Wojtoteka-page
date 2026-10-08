import type { Metadata } from 'next';
import { AuditView } from '@/components/admin/royal/OpsViews';

export const metadata: Metadata = { title: 'RoyalCasino: log admina' };

export default function Page() {
    return <AuditView />;
}
