import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PanelShell, type PanelNavItem } from '@/components/panel/PanelShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: { template: '%s | Panel administratora', default: 'Panel administratora' },
    robots: { index: false, follow: false }
};

const NAV: PanelNavItem[] = [
    { href: '/admin', label: 'Wiadomości', icon: 'inbox', countKey: 'messages' },
    { href: '/admin/wiadomosci-api', label: 'Wiadomości z API', icon: 'mail', countKey: 'apiMessages' },
    { href: '/admin/klucze-api', label: 'Klucze API', icon: 'key', countKey: 'apiKeys' },
    { href: '/admin/konta', label: 'Konta panelu', icon: 'user', countKey: 'subAccounts' },
    { href: '/admin/blokady', label: 'Blokady IP', icon: 'ban', countKey: 'bannedIps' },
    { href: '/admin/ogloszenia', label: 'Ogłoszenia', icon: 'megaphone', countKey: 'announcements' },
    { href: '/admin/linki', label: 'Krótkie linki', icon: 'link', countKey: 'urls' },
    { href: '/admin/pliki', label: 'Pliki', icon: 'file', countKey: 'files' },
    { href: '/admin/strona-glowna', label: 'Strona główna', icon: 'home', countKey: 'bioLinks' },
    { href: '/admin/email', label: 'Wyślij email', icon: 'send' },
    { href: '/admin/ustawienia', label: 'Ustawienia', icon: 'settings' }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (session?.user?.role !== 'admin') redirect('/admin/logowanie');

    return (
        <PanelShell role="Panel administratora" user={session.user.username} nav={NAV} summaryUrl="/api/admin/summary" loginPath="/admin/logowanie">
            {children}
        </PanelShell>
    );
}
