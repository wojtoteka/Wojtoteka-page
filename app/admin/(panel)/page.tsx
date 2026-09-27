import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MessagesView } from '@/components/admin/MessagesView';

export const metadata: Metadata = { title: 'Wiadomości' };

// Stare zakładki panelu (/admin?tab=...) prowadzą teraz na osobne adresy.
const OLD_TABS: Record<string, string> = {
    apiKeys: '/admin/klucze-api',
    accounts: '/admin/konta',
    bannedIPs: '/admin/blokady',
    announcements: '/admin/ogloszenia',
    urlShortener: '/admin/linki',
    fileManager: '/admin/pliki',
    bioLinks: '/admin/strona-glowna',
    sendEmail: '/admin/email',
    settings: '/admin/ustawienia'
};

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const { tab } = await searchParams;
    if (tab && OLD_TABS[tab]) redirect(OLD_TABS[tab]);
    return <MessagesView />;
}
