import type { Metadata } from 'next';
import { UrlsView } from '@/components/admin/UrlsView';

export const metadata: Metadata = { title: 'Krótkie linki' };

export default function Page() {
    return <UrlsView />;
}
