import type { Metadata } from 'next';
import { AnnouncementsView } from '@/components/admin/AnnouncementsView';

export const metadata: Metadata = { title: 'Ogłoszenia serwerów' };

export default function Page() {
    return <AnnouncementsView serverStatus />;
}
