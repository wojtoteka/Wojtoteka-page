import { SprayPaint } from '@/components/SprayPaint';
import styles from './HeroWordmark.module.css';

export function HeroWordmark({ id, text }: { id: string; text: string }) {
    return (
        <h1 id={id} className={styles.title}>
            <SprayPaint className={styles.spray}>
                <span className={styles.word}>{text}</span>
            </SprayPaint>
        </h1>
    );
}
