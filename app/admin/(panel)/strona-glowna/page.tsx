import type { Metadata } from 'next';
import { HomeSettingsView } from '@/components/admin/HomeSettingsView';

export const metadata: Metadata = { title: 'Strona główna' };

export default function Page() {
    return <HomeSettingsView />;
}
