import type { Metadata } from 'next';
import { ReloadButton } from '@/components/site/ReloadButton';
import { SystemPage } from '@/components/site/SystemPage';

export const metadata: Metadata = {
    title: 'Przerwa techniczna',
    robots: { index: false, follow: false }
};

export default function MaintenancePage() {
    return (
        <SystemPage code="503" label="Przerwa" title="Trwają prace na stronie" actions={<ReloadButton label="Sprawdź ponownie" />}>
            <p>Ta część strony jest w trakcie przebudowy. Zajrzyj tu później.</p>
            <p>
                Coś pilnego? Napisz na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>.
            </p>
        </SystemPage>
    );
}
