import type { Metadata } from 'next';
import { ApiKeysView } from '@/components/admin/ApiKeysView';

export const metadata: Metadata = { title: 'Klucze API' };

export default function Page() {
    return <ApiKeysView />;
}
