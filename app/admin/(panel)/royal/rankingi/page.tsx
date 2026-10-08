import type { Metadata } from 'next';
import { RankingsView } from '@/components/admin/royal/InsightViews';

export const metadata: Metadata = { title: 'RoyalCasino: rankingi' };

export default function Page() {
    return <RankingsView />;
}
