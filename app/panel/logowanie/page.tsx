import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ForgotPassword } from '@/components/auth/ForgotPassword';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoginView } from '@/components/auth/LoginView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Logowanie do panelu skrzynki',
    robots: { index: false, follow: false }
};

export default async function PanelLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const session = await auth();
    if (session?.user?.role === 'panel') redirect('/panel');
    const params = await searchParams;

    return (
        <LoginView
            title="Panel skrzynki"
            intro="Wiadomości z formularza na Twojej stronie. Logujesz się adresem email, na który przyszło hasło."
            expired={params.wygasla === '1'}
        >
            <LoginForm provider="panel" redirectTo="/panel" />
            <ForgotPassword />
        </LoginView>
    );
}
