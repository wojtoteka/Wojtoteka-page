import type { Metadata } from 'next';
import { PanelBansView } from '@/components/subpanel/PanelBansView';

export const metadata: Metadata = { title: 'Blokady' };

export default function Page() {
    return <PanelBansView />;
}
