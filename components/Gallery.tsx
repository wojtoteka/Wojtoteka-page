'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './Gallery.module.css';

export type Shot = { src: string; alt: string; caption: string; width: number; height: number; wide?: boolean };

/** Zrzuty ekranu: kliknięcie otwiera obraz w pełnym rozmiarze w oknie dialogowym. */
export function Gallery({ shots }: { shots: Shot[] }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [open, setOpen] = useState<Shot | null>(null);

    function show(shot: Shot) {
        setOpen(shot);
        dialogRef.current?.showModal();
    }

    return (
        <>
            <ul role="list" className={styles.grid}>
                {shots.map(shot => (
                    <li key={shot.src} className={shot.wide ? styles.wide : undefined}>
                        <button type="button" className={styles.shot} onClick={() => show(shot)} aria-label={`Powiększ: ${shot.caption}`}>
                            <img src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} loading="lazy" />
                        </button>
                        <p className={styles.caption}>{shot.caption}</p>
                    </li>
                ))}
            </ul>

            <dialog
                ref={dialogRef}
                className={styles.dialog}
                aria-label={open?.caption ?? 'Podgląd'}
                onClose={() => setOpen(null)}
                onClick={event => {
                    if (event.target === dialogRef.current) dialogRef.current.close();
                }}
            >
                {open && (
                    <figure className={styles.full}>
                        <img src={open.src} alt={open.alt} width={open.width} height={open.height} />
                        <figcaption>{open.caption}</figcaption>
                    </figure>
                )}
                <form method="dialog">
                    <button type="submit" className={`btn btn-sm btn-ghost ${styles.close}`}>
                        <Icon name="close" size={16} />
                        Zamknij
                    </button>
                </form>
            </dialog>
        </>
    );
}
