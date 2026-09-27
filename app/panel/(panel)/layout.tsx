import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PanelShell, type PanelNavItem } from '@/components/panel/PanelShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: { template: '%s | Panel skrzynki', default: 'Panel skrzynki' },
    robots: { index: false, follow: false }
};

const NAV: PanelNavItem[] = [
    { href: '/panel', label: 'Wiadomości', icon: 'inbox' },
    { href: '/panel/blokady', label: 'Blokady', icon: 'ban' },
    { href: '/panel/konto', label: 'Konto', icon: 'user' }
];

export default async function SubPanelLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (session?.user?.role !== 'panel') redirect('/panel/logowanie');

    return (
        <PanelShell role="Panel skrzynki" user={session.user.email || session.user.username} nav={NAV} loginPath="/panel/logowanie">
            {children}
        </PanelShell>
    );
}
