import type { Metadata } from 'next';
import { SuspiciousView } from '@/components/admin/royal/InsightViews';

export const metadata: Metadata = { title: 'RoyalCasino: podejrzani' };

export default function Page() {
    return <SuspiciousView />;
}
