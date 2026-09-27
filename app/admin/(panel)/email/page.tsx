import type { Metadata } from 'next';
import { EmailView } from '@/components/admin/EmailView';

export const metadata: Metadata = { title: 'Wyślij email' };

export default function Page() {
    return <EmailView />;
}
