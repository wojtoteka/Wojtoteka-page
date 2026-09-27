import type { Metadata } from 'next';
import { AccountsView } from '@/components/admin/AccountsView';

export const metadata: Metadata = { title: 'Konta panelu' };

export default function Page() {
    return <AccountsView />;
}
