import { avatarUrl, guildIconUrl, money, playerName, vipTier } from '@/lib/royal/meta';
import type { BoardKey, BoardRow, ServerRow } from '@/lib/royal/public';
import styles from './ranking.module.css';

const num = new Intl.NumberFormat('pl-PL');

export function boardValue(key: BoardKey, row: BoardRow): string {
    if (key === 'poziom') return `Poz. ${row.value}`;
    if (key === 'gry') return num.format(row.value);
    return money(row.value);
}

export function PlayerBoard({ rows, board, label }: { rows: BoardRow[]; board: BoardKey; label: string }) {
    if (rows.length === 0) return <p className={styles.empty}>Nikt jeszcze nie trafił do tego rankingu.</p>;
    return (
        <ol className={styles.board} aria-label={label}>
            {rows.map((row, i) => (
                <li key={row.user_id} className={styles.row}>
                    <span className={styles.rank}>{i + 1}</span>
                    <img className={styles.avatar} src={avatarUrl(row)} alt="" width={40} height={40} loading="lazy" decoding="async" />
                    <span className={styles.who}>
                        <span className={styles.name}>{playerName(row)}</span>
                        <span className={styles.sub}>
                            Poziom {row.level} · VIP {vipTier(row.total_wagered).name}
                        </span>
                    </span>
                    <span className={styles.value}>{boardValue(board, row)}</span>
                </li>
            ))}
        </ol>
    );
}

export function ServerBoard({ rows }: { rows: ServerRow[] }) {
    if (rows.length === 0) return <p className={styles.empty}>Lista serwerów pojawi się, gdy bot ją zsynchronizuje.</p>;
    return (
        <ol className={styles.board} aria-label="Serwery z największym obrotem w ostatnich 30 dniach">
            {rows.map((row, i) => {
                const icon = guildIconUrl(row);
                const name = row.name || `Serwer …${row.guild_id.slice(-4)}`;
                return (
                    <li key={row.guild_id} className={styles.row}>
                        <span className={styles.rank}>{i + 1}</span>
                        {icon ? (
                            <img className={styles.avatar} src={icon} alt="" width={40} height={40} loading="lazy" decoding="async" />
                        ) : (
                            <span className={styles.serverIcon} aria-hidden="true">
                                {name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <span className={styles.who}>
                            <span className={styles.name}>{name}</span>
                            <span className={styles.sub}>
                                {num.format(row.players)} graczy · {num.format(row.games)} gier
                                {row.members > 0 ? ` · ${num.format(row.members)} członków` : ''}
                            </span>
                        </span>
                        <span className={styles.value}>{money(row.wagered)}</span>
                    </li>
                );
            })}
        </ol>
    );
}
