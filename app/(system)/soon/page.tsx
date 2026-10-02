import type { Metadata } from 'next';
import Link from 'next/link';
import { SystemPage } from '@/components/site/SystemPage';

export const metadata: Metadata = {
    title: 'Wkrótce',
    robots: { index: false, follow: false }
};

export default function SoonPage() {
    return (
        <SystemPage
            code="Wkrótce"
            title="Jeszcze nie gotowe"
            actions={
                <Link href="/" className="btn btn-ghost">
                    Strona główna
                </Link>
            }
        >
            <p>Ta strona jest w przygotowaniu i pojawi się niedługo.</p>
            <p>Na razie zajrzyj na stronę główną, tam jest wszystko, co już działa.</p>
        </SystemPage>
    );
}
