import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SystemPage } from '@/components/site/SystemPage';

export const metadata: Metadata = {
    title: 'Nie ma takiej strony',
    robots: { index: false, follow: false }
};

export default function NotFound() {
    return (
        <>
            <SiteHeader />
            <main id="tresc">
                <SystemPage
                    code="404"
                    title="Tej strony tu nie ma"
                    actions={
                        <>
                            <Link href="/" className="btn btn-primary">
                                Strona główna
                            </Link>
                            <Link href="/gry" className="btn btn-ghost">
                                Gry
                            </Link>
                            <Link href="/kontakt" className="btn btn-ghost">
                                Kontakt
                            </Link>
                        </>
                    }
                >
                    <p>Adres mógł się zmienić albo link ma literówkę.</p>
                    <p>Skrócone linki i udostępnione pliki mogą też po prostu wygasnąć.</p>
                </SystemPage>
            </main>
            <SiteFooter />
        </>
    );
}
