import type { Metadata } from 'next';
import { ReloadButton } from '@/components/site/ReloadButton';
import { SystemPage } from '@/components/site/SystemPage';

export const metadata: Metadata = {
    title: 'Serwer chwilowo niedostępny',
    robots: { index: false, follow: false }
};

export default function UnavailablePage() {
    return (
        <SystemPage
            code="503"
            title="Serwer chwilowo nie odpowiada"
            actions={
                <>
                    <ReloadButton />
                    <a href="/" className="btn btn-ghost">
                        Strona główna
                    </a>
                </>
            }
        >
            <p>Serwer ma chwilowy problem. Spróbuj ponownie za kilka minut.</p>
            <p>
                Jeśli problem wraca, napisz na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a> i podaj adres strony, na której
                się pojawił.
            </p>
        </SystemPage>
    );
}
