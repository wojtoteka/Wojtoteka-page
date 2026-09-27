import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoginView } from '@/components/auth/LoginView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Logowanie administratora',
    robots: { index: false, follow: false }
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const session = await auth();
    if (session?.user?.role === 'admin') redirect('/admin');
    const params = await searchParams;

    return (
        <LoginView
            title="Panel administratora"
            intro="Wiadomości, klucze API, blokady, ogłoszenia i ustawienia strony."
            expired={params.wygasla === '1'}
        >
            <LoginForm provider="admin" redirectTo="/admin" />
        </LoginView>
    );
}
