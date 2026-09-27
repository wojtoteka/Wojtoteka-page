import type { Metadata } from 'next';
import { AccountSettingsView } from '@/components/subpanel/AccountSettingsView';

export const metadata: Metadata = { title: 'Konto' };

export default function Page() {
    return <AccountSettingsView />;
}
