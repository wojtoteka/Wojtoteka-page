import type { Metadata } from 'next';
import { ApiMessagesView } from '@/components/admin/ApiMessagesView';

export const metadata: Metadata = { title: 'Wiadomości z API' };

export default function Page() {
    return <ApiMessagesView />;
}
