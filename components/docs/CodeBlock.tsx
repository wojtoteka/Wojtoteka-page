import { CopyButton } from '@/components/CopyButton';
import styles from './Docs.module.css';

export function CodeBlock({ code, label }: { code: string; label: string }) {
    return (
        <figure className={styles.code}>
            <figcaption className={styles.codeBar}>
                <span>{label}</span>
                <CopyButton text={code} />
            </figcaption>
            <pre>
                <code>{code}</code>
            </pre>
        </figure>
    );
}
