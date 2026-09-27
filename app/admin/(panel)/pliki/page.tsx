import type { Metadata } from 'next';
import { FilesView } from '@/components/admin/FilesView';

export const metadata: Metadata = { title: 'Pliki' };

export default function Page() {
    return <FilesView />;
}
