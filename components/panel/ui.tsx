'use client';

import { Icon } from '@/components/Icon';
import styles from './ui.module.css';

export { styles as ui };

export function PanelHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <header className={styles.header}>
            <div className={styles.headerText}>
                <h1 className={styles.title}>{title}</h1>
                {description && <p className={styles.description}>{description}</p>}
            </div>
            {actions && <div className={styles.headerActions}>{actions}</div>}
        </header>
    );
}

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
    return (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClick} disabled={loading}>
            <Icon name="refresh" size={16} />
            {loading ? 'Odświeżanie...' : 'Odśwież'}
        </button>
    );
}

export function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
    return (
        <div className={styles.search}>
            <Icon name="search" size={18} className={styles.searchIcon} />
            <input
                type="search"
                className="input"
                value={value}
                onChange={event => onChange(event.target.value)}
                aria-label={label}
                placeholder={label}
            />
        </div>
    );
}

export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (page: number) => void }) {
    if (pages <= 1) return null;
    return (
        <nav className={styles.pager} aria-label="Strony listy">
            <span className="muted small">
                {total} pozycji, strona {page} z {pages}
            </span>
            <div className={styles.pagerButtons}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
                    Poprzednia
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPage(page + 1)} disabled={page >= pages}>
                    Następna
                </button>
            </div>
        </nav>
    );
}

export function Empty({ children }: { children: React.ReactNode }) {
    return <p className={styles.empty}>{children}</p>;
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="notice notice-error">
            <strong>Nie wczytano. </strong>
            {message}{' '}
            <button type="button" className={styles.linkButton} onClick={onRetry}>
                Spróbuj ponownie
            </button>
        </div>
    );
}

export function Tag({ children, tone }: { children: React.ReactNode; tone?: 'muted' | 'warn' | 'strong' }) {
    return <span className={`${styles.tag} ${tone ? styles[`tag_${tone}`] : ''}`}>{children}</span>;
}
