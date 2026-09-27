import type { Metadata } from 'next';
import { BansView } from '@/components/admin/BansView';

export const metadata: Metadata = { title: 'Blokady IP' };

export default function Page() {
    return <BansView />;
}
