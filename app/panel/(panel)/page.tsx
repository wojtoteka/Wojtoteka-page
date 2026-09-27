import type { Metadata } from 'next';
import { InboxView } from '@/components/subpanel/InboxView';

export const metadata: Metadata = { title: 'Wiadomości' };

export default function Page() {
    return <InboxView />;
}
