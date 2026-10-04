import type { CSSProperties } from 'react';
import { getGithubStats } from '@/lib/github';
import { plural } from '@/lib/plural';
import { PROFILES } from '@/lib/profile';
import { Scramble } from './Scramble';
import styles from './GithubActivity.module.css';

const dayName = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatDay = (date: string) => dayName.format(new Date(`${date}T00:00:00Z`));

/** Na telefonie kalendarz pokazuje tylko ostatnie tygodnie, żeby kratki nie były za małe. */
const MOBILE_WEEKS = 26;

/**
 * Rok na GitHubie: liczba kontrybucji, kalendarz jak na profilu (w kolorach strony),
 * rekordy i języki z repozytoriów. Dane z lib/github.ts.
 */
export async function GithubActivity({ label }: { label: string }) {
    const gh = await getGithubStats();

    // Kalendarz zaczyna się od niedzieli, jak na GitHubie: pierwszy dzień trafia do swojego wiersza.
    const offset = gh.days.length ? new Date(`${gh.days[0].date}T00:00:00Z`).getUTCDay() : 0;
    const weeks = Math.ceil((gh.days.length + offset) / 7);
    const maxRepos = Math.max(1, ...gh.languages.map(l => l.repos));

    return (
        <section className={`wrap ${styles.section}`} aria-labelledby="github-title">
            <div className={styles.head} data-reveal>
                <p className="v2-label">
                    <b>{label}</b> Na GitHubie
                </p>
                <h2 id="github-title" className={styles.h2}>
                    Rok <span className="v2-outline">w kodzie</span>
                </h2>
                <a href={PROFILES.github} className="btn btn-ghost btn-sm" target="_blank" rel="noopener">
                    github.com/Wojtoteka <span className="v2-arrow" aria-hidden="true">↗</span>
                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                </a>
            </div>

            <div className={styles.total} data-reveal>
                <p className={styles.totalNum}>
                    <Scramble text={String(gh.contributions)} trigger="view" duration={1100} />
                </p>
                <p className={styles.totalText}>
                    {plural(gh.contributions, ['kontrybucja', 'kontrybucje', 'kontrybucji'])} w ostatnich 12 miesiącach. Kontrybucja to każda zapisana zmiana w kodzie,
                    zgłoszenie albo poprawka w projekcie.
                </p>
            </div>

            <dl className={styles.stats} data-reveal>
                <div>
                    <dt>Aktywne dni</dt>
                    <dd>{gh.activeDays}</dd>
                </div>
                {gh.bestDay && (
                    <div>
                        <dt>Rekord jednego dnia</dt>
                        <dd>{gh.bestDay.count}</dd>
                        <dd className={styles.statNote}>{formatDay(gh.bestDay.date)}</dd>
                    </div>
                )}
                <div>
                    <dt>Najdłuższa seria</dt>
                    <dd>
                        {gh.longestStreak} <small>{plural(gh.longestStreak, ['dzień', 'dni', 'dni'])}</small>
                    </dd>
                </div>
                <div>
                    <dt>Publiczne repozytoria</dt>
                    <dd>{gh.repos}</dd>
                    <dd className={styles.statNote}>na GitHubie od {gh.since}</dd>
                </div>
            </dl>

            {gh.days.length > 0 && (
                <figure className={styles.calendar} data-reveal>
                    <div className={styles.grid} style={{ '--weeks': weeks, '--weeks-m': MOBILE_WEEKS } as CSSProperties} aria-hidden="true">
                        {gh.days.map((day, i) => {
                            const week = Math.floor((i + offset) / 7);
                            return (
                                <span
                                    key={day.date}
                                    className={styles.cell}
                                    data-level={day.level}
                                    data-old={week < weeks - MOBILE_WEEKS || undefined}
                                    title={`${formatDay(day.date)}: ${day.count} ${plural(day.count, ['kontrybucja', 'kontrybucje', 'kontrybucji'])}`}
                                    style={{ '--w': week, gridRowStart: i === 0 ? offset + 1 : undefined } as CSSProperties}
                                />
                            );
                        })}
                    </div>
                    <figcaption className={styles.caption}>
                        <span>Każda kratka to jeden dzień. Im jaśniejsza, tym więcej zmian.</span>
                        <span className={styles.legend} aria-hidden="true">
                            Mniej
                            {[0, 1, 2, 3, 4].map(level => (
                                <i key={level} className={styles.cell} data-level={level} />
                            ))}
                            Więcej
                        </span>
                    </figcaption>
                </figure>
            )}

            {gh.languages.length > 0 && (
                <div className={styles.langs} data-reveal>
                    <p className="v2-label">Języki w repozytoriach</p>
                    <ul role="list" className={styles.langList}>
                        {gh.languages.map((lang, i) => (
                            <li key={lang.name} style={{ '--share': lang.repos / maxRepos, '--i': i } as CSSProperties}>
                                <span className={styles.langName}>{lang.name}</span>
                                <span className={styles.langBar} aria-hidden="true" />
                                <span className={styles.langCount}>
                                    {lang.repos} {plural(lang.repos, ['repozytorium', 'repozytoria', 'repozytoriów'])}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
