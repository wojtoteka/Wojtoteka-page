import type { Metadata } from 'next';
import { ReferralsView } from '@/components/admin/royal/ToolsViews';

export const metadata: Metadata = { title: 'RoyalCasino: polecenia' };

export default function Page() {
    return <ReferralsView />;
}
