import type { Metadata } from 'next';
import styles from './status.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Status usług',
    description: 'Czy strona, gry i API wojtoteka.ovh działają. Monitoring HetrixTools na żywo.',
    robots: { index: false, follow: true }
};

/** Adres raportu HetrixTools: pełny URL z .env albo samo ID raportu. */
function reportUrl(): string | null {
    const raw = (process.env.HETRIX_REPORT_URL || process.env.HETRIX_KEY || '').trim();
    if (!raw) return null;
    return /^https?:\/\//i.test(raw) ? raw : `https://wl.hetrixtools.com/r/${encodeURIComponent(raw)}/`;
}

export default function StatusPage() {
    const url = reportUrl();

    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">Status usług</h1>
                <p className="lead">Tu widać, czy strona i jej usługi odpowiadają. Dane odświeża zewnętrzny monitoring HetrixTools.</p>
            </header>

            {url ? (
                <iframe className={styles.frame} src={url} title="Raport dostępności usług Wojtoteka (HetrixTools)" loading="eager" />
            ) : (
                <p className="notice notice-error">
                    <strong>Brak konfiguracji. </strong>
                    Ustaw HETRIX_REPORT_URL albo HETRIX_KEY w pliku .env, żeby pokazać tu raport.
                </p>
            )}
        </div>
    );
}
