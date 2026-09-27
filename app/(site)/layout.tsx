import { Announcements } from '@/components/site/Announcements';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <a href="#tresc" className="skip-link">
                Przejdź do treści
            </a>
            <Announcements />
            <SiteHeader />
            <main id="tresc">{children}</main>
            <SiteFooter />
        </>
    );
}
