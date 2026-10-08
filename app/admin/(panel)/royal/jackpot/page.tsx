import type { Metadata } from 'next';
import { JackpotView } from '@/components/admin/royal/OpsViews';

export const metadata: Metadata = { title: 'RoyalCasino: jackpot' };

export default function Page() {
    return <JackpotView />;
}
