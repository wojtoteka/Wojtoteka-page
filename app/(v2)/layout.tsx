import { Announcements } from '@/components/site/Announcements';
import { StatusPill } from '@/components/v2/StatusPill';
import { V2Footer } from '@/components/v2/V2Footer';
import { V2Header } from '@/components/v2/V2Header';
import { V2Shell } from '@/components/v2/V2Shell';

// Strony w nowym stylu (główna, gry, kontakt). Reszta serwisu zostaje w (site).
export default function V2Layout({ children }: { children: React.ReactNode }) {
    return (
        <V2Shell>
            <a href="#tresc" className="skip-link">
                Przejdź do treści
            </a>
            <Announcements />
            <V2Header />
            <main id="tresc">{children}</main>
            <V2Footer />
            <StatusPill />
        </V2Shell>
    );
}
