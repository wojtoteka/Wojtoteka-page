import type { Metadata } from 'next';
import { ToolsView } from '@/components/admin/royal/ToolsViews';

export const metadata: Metadata = { title: 'RoyalCasino: narzędzia' };

export default function Page() {
    return <ToolsView />;
}
