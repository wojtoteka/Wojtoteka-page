import { DocsLayout, type TocItem } from '@/components/docs/DocsLayout';

/** Wspólny układ dokumentów prawnych: nagłówek, data aktualizacji, spis treści. */
export function LegalPage({
    title = 'Polityka prywatności',
    subject,
    updated,
    toc,
    note,
    children
}: {
    title?: string;
    subject: string;
    updated: string;
    toc: TocItem[];
    /** Dopisek pod treścią, np. linki do powiązanych dokumentów. */
    note?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">{title}</h1>
                <p className="lead">{subject}</p>
                <p className="muted small">Ostatnia aktualizacja: {updated}</p>
            </header>
            <DocsLayout toc={toc} tocLabel="Spis treści">
                {children}
                <hr />
                {note}
            </DocsLayout>
        </div>
    );
}
