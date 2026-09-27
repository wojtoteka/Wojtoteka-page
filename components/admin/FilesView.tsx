'use client';

import { useState, type FormEvent } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Icon } from '@/components/Icon';
import { api, uploadWithProgress } from '@/lib/client/api';
import { formatDate, formatExpiry, formatFileSize, isExpired, plural } from '@/lib/client/format';
import { useFeedback } from '@/components/panel/Feedback';
import { includesAny, useFilteredList, useResource } from '@/components/panel/hooks';
import { notifyPanelChanged } from '@/components/panel/PanelShell';
import { Empty, LoadError, Pager, PanelHeader, RefreshButton, SearchBox, Tag, ui } from '@/components/panel/ui';
import { EXPIRY_OPTIONS } from './UrlsView';
import styles from './admin.module.css';

interface SharedFile {
    id: number;
    code: string;
    original_name: string;
    mime_type: string;
    file_size: number;
    created_at: string;
    expires_at: string | null;
    preview_enabled: number;
    download_count: number;
}

const LOGIN = '/admin/logowanie';
const MAX_BYTES = 100 * 1024 * 1024;

export function FilesView() {
    const { data, error, loading, reload } = useResource<{ files: SharedFile[] }>('/api/admin/files', LOGIN);
    const list = useFilteredList(data?.files ?? [], (f, q) => includesAny(q, f.original_name, f.mime_type, f.code));
    const { toast, confirm } = useFeedback();
    const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
    const [created, setCreated] = useState('');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    async function upload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        const file = values.get('file');
        if (!(file instanceof File) || !file.size) {
            toast('Wybierz plik do przesłania.', 'error');
            return;
        }
        if (file.size > MAX_BYTES) {
            toast(`Plik ma ${formatFileSize(file.size)}, a limit to 100 MB.`, 'error');
            return;
        }
        if (!values.get('expires_hours')) values.delete('expires_hours');

        setProgress({ loaded: 0, total: file.size });
        const result = await uploadWithProgress('/api/admin/files', values, (loaded, total) => setProgress({ loaded, total }));
        setProgress(null);

        if (!result.ok) {
            toast(String(result.data.message || 'Nie udało się przesłać pliku.'), 'error');
            if (result.status === 401) window.location.assign(`${LOGIN}?wygasla=1`);
            return;
        }
        form.reset();
        setCreated(`${origin}/file/${String(result.data.code)}`);
        toast('Plik przesłany.');
        void reload();
        notifyPanelChanged();
    }

    async function remove(file: SharedFile) {
        const ok = await confirm({
            title: `Usunąć „${file.original_name}”?`,
            body: 'Plik zniknie z dysku serwera, a link przestanie działać.',
            confirmLabel: 'Usuń plik',
            danger: true
        });
        if (!ok) return;
        const result = await api(`/api/admin/files/${file.id}`, { method: 'DELETE', loginPath: LOGIN });
        toast(result.data.message || 'Gotowe.', result.ok ? 'ok' : 'error');
        if (result.ok) {
            void reload();
            notifyPanelChanged();
        }
    }

    return (
        <>
            <PanelHeader
                title="Pliki"
                description="Udostępnianie plików pod adresem /file/kod. Link może pobierać plik albo otwierać podgląd w przeglądarce."
                actions={<RefreshButton onClick={reload} loading={loading} />}
            />

            <form className={ui.block} onSubmit={upload}>
                <h2 className={ui.blockTitle}>Prześlij plik</h2>
                <div className={ui.grid3}>
                    <div className="field">
                        <label htmlFor="file-input">Plik (do 100 MB)</label>
                        <input id="file-input" name="file" type="file" className="input" required />
                    </div>
                    <div className="field">
                        <label htmlFor="file-expires">Wygasa</label>
                        <select id="file-expires" name="expires_hours" className="select" defaultValue="">
                            {EXPIRY_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="file-mode">Co robi link</label>
                        <select id="file-mode" name="preview_enabled" className="select" defaultValue="0">
                            <option value="0">Pobiera plik</option>
                            <option value="1">Otwiera podgląd</option>
                        </select>
                    </div>
                </div>
                <p className="hint">
                    Podgląd działa dla tekstu, kodu, PDF, obrazów, audio i wideo. Dopisanie ?download=1 do linku zawsze wymusza pobranie.
                </p>
                <div className={ui.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={progress !== null}>
                        <Icon name="upload" size={20} />
                        {progress ? 'Przesyłanie...' : 'Prześlij'}
                    </button>
                </div>
                {progress && (
                    <div>
                        <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress.loaded / progress.total) * 100)}>
                            <div className={styles.progressBar} style={{ width: `${(progress.loaded / progress.total) * 100}%` }} />
                        </div>
                        <p className="hint">
                            {formatFileSize(progress.loaded)} z {formatFileSize(progress.total)}
                        </p>
                    </div>
                )}
                {created && (
                    <div className={ui.keyValue}>
                        <code>{created}</code>
                        <CopyButton text={created} />
                    </div>
                )}
            </form>

            {error && <LoadError message={error} onRetry={reload} />}

            {data && (
                <>
                    <div className={ui.toolbar}>
                        <SearchBox value={list.query} onChange={list.setQuery} label="Szukaj po nazwie, typie albo kodzie" />
                        <span className="muted small">
                            {list.total} {plural(list.total, 'plik', 'pliki', 'plików')}
                        </span>
                    </div>
                    {list.visible.length === 0 ? (
                        <Empty>{list.query ? `Nic nie pasuje do „${list.query}”.` : 'Nie ma udostępnionych plików.'}</Empty>
                    ) : (
                        <ul role="list" className={ui.list}>
                            {list.visible.map(file => {
                                const link = `${origin}/file/${file.code}`;
                                const preview = Number(file.preview_enabled) === 1;
                                const expired = isExpired(file.expires_at);
                                return (
                                    <li key={file.id} className={`${ui.item} ${expired ? ui.itemDimmed : ''}`}>
                                        <div className={ui.itemHead}>
                                            <h2 className={ui.itemTitle}>{file.original_name}</h2>
                                            <span className={ui.itemDate}>{formatDate(file.created_at)}</span>
                                        </div>
                                        <p className={`${ui.meta} ${ui.mono}`}>{link}</p>
                                        <div className={ui.tags}>
                                            <Tag tone="muted">{formatFileSize(file.file_size)}</Tag>
                                            <Tag tone="muted">
                                                {file.download_count} {plural(file.download_count, 'pobranie', 'pobrania', 'pobrań')}
                                            </Tag>
                                            <Tag tone="muted">{file.mime_type}</Tag>
                                            <Tag>{preview ? 'Podgląd' : 'Pobieranie'}</Tag>
                                            <Tag tone={expired ? 'warn' : 'muted'}>{formatExpiry(file.expires_at)}</Tag>
                                        </div>
                                        <div className={ui.actions}>
                                            <a href={preview ? link : `${link}?download=1`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                                                <Icon name={preview ? 'eye' : 'download'} size={16} />
                                                {preview ? 'Otwórz' : 'Pobierz'}
                                            </a>
                                            <CopyButton text={link} label="Kopiuj link" />
                                            <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(file)}>
                                                <Icon name="trash" size={16} />
                                                Usuń
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <Pager page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
                </>
            )}
        </>
    );
}
