import type { Metadata } from 'next';
import { SettingsView } from '@/components/admin/SettingsView';

export const metadata: Metadata = { title: 'Ustawienia' };

export default function Page() {
    return <SettingsView />;
}
