import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/Icon';
import { ReloadButton } from '@/components/site/ReloadButton';
import { AutoRefresh } from '@/components/site/AutoRefresh';
import { StatusAnnouncementCard } from '@/components/site/StatusAnnouncementCard';
import { Scramble } from '@/components/v2/Scramble';
import { SplitText } from '@/components/v2/SplitText';
import { getAnnouncementsFor } from '@/lib/site';
import { plural } from '@/lib/client/format';
import { getStatus, isConfigured, type StatusDay, type StatusLoad, type StatusMonitor, type StatusSnapshot } from '@/lib/hetrix';
import styles from './status.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    ...pageMeta({
        title: 'Status usług',
        description: 'Stan serwerów wojtoteka.ovh: czy działają, ile zajmuje pamięć, jak wyglądały ostatnie 30 dni i kiedy były przerwy.',
        path: '/status',
        image: 'status'
    }),
    robots: { index: false, follow: true }
};

const TZ = 'Europe/Warsaw';
const DAYS = 30;
const timeFmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const whenFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
const longDayFmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const percentFmt = new Intl.NumberFormat('pl-PL', { style: 'percent', maximumFractionDigits: 2 });

const STATE_LABEL: Record<StatusMonitor['state'], string> = {
    up: 'Działa',
    down: 'Offline',
    maintenance: 'Prace techniczne',
    paused: 'Wstrzymany'
};

const time = (unix: number) => timeFmt.format(unix * 1000);
const when = (unix: number) => whenFmt.format(unix * 1000);
const percent = (value: number) => percentFmt.format(value / 100);
const pad = (n: number) => String(n).padStart(2, '0');

/** "46 s", "2 min 46 s", "1 godz. 5 min", "2 dni 3 godz." */
function duration(seconds: number): string {
    const s = Math.max(0, Math.round(seconds));
    if (s < 60) return `${s} s`;
    const m = Math.floor(s / 60);
    if (m < 10) return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return m % 60 ? `${h} godz. ${m % 60} min` : `${h} godz.`;
    const d = Math.floor(h / 24);
    return `${d} ${plural(d, 'dzień', 'dni', 'dni')}${h % 24 ? ` ${h % 24} godz.` : ''}`;
}

/** Nagłówek i zdanie pod nim: jedno spojrzenie mówi, czy wszystko działa. */
function verdict(monitors: StatusMonitor[]): { title: string; line: string; tone: 'up' | 'down' | 'maintenance' } {
    const down = monitors.filter(m => m.state === 'down');
    const maintenance = monitors.filter(m => m.state === 'maintenance');
    const servers = monitors.every(m => m.type === 'heartbeat');
    const n = monitors.length;

    if (down.length) {
        const names = down.map(m => m.name);
        const first = down.reduce((a, b) => (a.since < b.since ? a : b));
        const rest = n - down.length;
        return {
            title: `Problem: ${names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names.at(-1)}` : names[0]}`,
            line: `${down.length > 1 ? 'Są offline' : 'Jest offline'} od ${when(first.since)}.${rest ? ' Reszta działa normalnie.' : ''}`,
            tone: 'down'
        };
    }
    if (maintenance.length) {
        return {
            title: 'Prace techniczne',
            line: `Trwa serwis: ${maintenance.map(m => m.name).join(', ')}. Reszta działa normalnie.`,
            tone: 'maintenance'
        };
    }
    const all =
        n === 1
            ? servers ? 'Serwer działa bez zastrzeżeń.' : 'Usługa działa bez zastrzeżeń.'
            : n === 2
              ? servers ? 'Oba serwery działają bez zastrzeżeń.' : 'Obie usługi działają bez zastrzeżeń.'
              : servers
                ? `Wszystkie serwery (${n}) działają bez zastrzeżeń.`
                : `Wszystkie usługi (${n}) działają bez zastrzeżeń.`;
    return { title: 'Wszystko działa', line: all, tone: 'up' };
}

function dayTone(d: StatusDay): string {
    return d.downtimes > 0 ? styles.dayDown : styles.dayUp;
}

/** Dymek nad dniem: data, dostępność i liczba przerw. Przy krawędziach paska wyrównany do brzegu. */
function DayTip({ d, index, total }: { d: StatusDay; index: number; total: number }) {
    const edge = index < 6 ? 'start' : index >= total - 6 ? 'end' : undefined;
    return (
        <span className={styles.tip} data-edge={edge}>
            <span className={styles.tipDate}>{longDayFmt.format(new Date(`${d.date}T12:00:00Z`))}</span>
            <span>
                Dostępność <strong>{percent(d.uptime)}</strong>
            </span>
            <span className={styles.tipNote}>
                {d.downtimes ? `${d.downtimes} ${plural(d.downtimes, 'przerwa', 'przerwy', 'przerw')}` : 'bez przerw'}
            </span>
        </span>
    );
}

/** Zajęta pamięć RAM: pasek i wartość. Starszy odczyt (klucz bez dostępu do metryk v3) ma podaną godzinę. */
function Load({ load }: { load: StatusLoad }) {
    const old = Date.now() / 1000 - load.at > 5 * 60;
    const used = Math.round(load.percent);
    return (
        <div className={styles.load} data-high={load.percent >= 85 || undefined}>
            <p className={styles.loadLabel}>
                <Icon name="memory" size={18} />
                Obciążenie
            </p>
            <p className={styles.loadValue}>
                {used}%
                {old && <span className={styles.loadNote}> (dane z {time(load.at)})</span>}
            </p>
            <div className={styles.meter} aria-hidden="true">
                <span style={{ transform: `scaleX(${Math.min(100, load.percent) / 100})` }} />
            </div>
        </div>
    );
}

/** Karta serwera: stan, dostępność z 30 dni, obciążenie i pasek dni. */
function MonitorCard({ monitor, index }: { monitor: StatusMonitor; index: number }) {
    const broken = monitor.days.filter(d => d.downtimes > 0).length;
    const missing = Math.max(0, DAYS - monitor.days.length);
    return (
        <li className={`v2-frame ${styles.monitor}`} data-state={monitor.state} data-reveal style={{ '--rd': `${index * 90}ms` } as CSSProperties}>
            <div className={styles.monitorTop}>
                <span>{pad(index + 1)}</span>
                <p className={styles.stateLabel}>
                    <span className={styles.dot} aria-hidden="true" />
                    {STATE_LABEL[monitor.state]}
                </p>
            </div>

            <div>
                <h3 className={styles.name}>{monitor.name}</h3>
                {monitor.region && <p className={styles.region}>{monitor.region}</p>}
            </div>

            <p className={styles.uptime}>
                <span className={styles.uptimeNum}>{monitor.uptime30 !== null ? percent(monitor.uptime30) : 'Brak danych'}</span>
                {monitor.uptime30 !== null && <span>dostępność z {monitor.days.length || DAYS} dni</span>}
            </p>

            {monitor.load && <Load load={monitor.load} />}

            {monitor.days.length > 0 && (
                <figure className={styles.history}>
                    <ol role="list" className={styles.days} aria-hidden="true">
                        {Array.from({ length: missing }, (_, i) => (
                            <li key={`brak-${i}`} className={styles.dayNone} />
                        ))}
                        {monitor.days.map((d, i) => (
                            <li key={d.date} className={dayTone(d)}>
                                <DayTip d={d} index={missing + i} total={DAYS} />
                            </li>
                        ))}
                    </ol>
                    <figcaption className={styles.axis}>
                        <span>{DAYS} dni temu</span>
                        <span className="sr-only">
                            {broken ? `Przerwy w ${broken} z ${monitor.days.length} dni.` : `Bez przerw przez ${monitor.days.length} dni.`}
                        </span>
                        <span>dziś</span>
                    </figcaption>
                </figure>
            )}
        </li>
    );
}

function Incidents({ snapshot, label }: { snapshot: StatusSnapshot; label: string }) {
    return (
        <section className={styles.incidents} aria-labelledby="przerwy">
            <div className={styles.sectionHead} data-reveal>
                <p className="v2-label">
                    <b>{label}</b> Historia
                </p>
                <h2 id="przerwy" className={styles.h2}>
                    Ostatnie <span className="v2-outline">przerwy</span>
                </h2>
            </div>
            {snapshot.incidents.length === 0 ? (
                <p className={styles.empty}>Nie było żadnych przerw.</p>
            ) : (
                <ol role="list" className={styles.incidentList} data-reveal>
                    {snapshot.incidents.map(incident => (
                        <li key={incident.id} className={styles.incident}>
                            <span className={styles.incidentWhen}>{when(incident.start)}</span>
                            <span className={styles.incidentServer}>
                                {incident.monitor}
                                {incident.maintenance && <span className={styles.incidentTag}>Prace techniczne</span>}
                            </span>
                            <span className={styles.incidentTime}>
                                {incident.end ? duration(incident.end - incident.start) : <strong className={styles.ongoing}>Trwa</strong>}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

/** Nagłówek jak na innych podstronach: pierwsze słowo pełne, reszta obrysem. */
function Head({ title, line, tone, note }: { title: string; line: string; tone?: string; note: string }) {
    const [first, ...others] = title.toUpperCase().split(' ');
    const rest = others.join(' ');
    return (
        <header className={styles.head} data-tone={tone}>
            <p className="v2-label">
                <b>[STATUS]</b>
                <Scramble text={note} delay={200} />
            </p>
            <h1 className={styles.title} aria-label={title}>
                {tone && <span className={styles.mark} aria-hidden="true" />}
                <span className={styles.titleText}>
                    <SplitText text={first} />
                    {rest && <SplitText text={rest} start={first.length} className={`v2-outline ${styles.titleSecond}`} />}
                </span>
            </h1>
            <p className={styles.lead}>{line}</p>
        </header>
    );
}

export default async function StatusPage() {
    const announcements = (await getAnnouncementsFor('status')).filter(item => item.display_type === 'status');
    const notices = announcements.length > 0 ? (
        <section className={styles.announcements} aria-label="Ogłoszenia dotyczące serwerów">
            {announcements.map(announcement => <StatusAnnouncementCard key={announcement.id} announcement={announcement} />)}
        </section>
    ) : null;

    if (!isConfigured()) {
        return (
            <div className="wrap">
                <AutoRefresh seconds={60} />
                <Head title="Status usług" line="Brak konfiguracji. Dodaj HETRIX_KEY (klucz API v3) do pliku .env, a tu pojawi się stan serwerów." note="Brak danych" />
                {notices}
            </div>
        );
    }

    let snapshot: StatusSnapshot;
    try {
        snapshot = await getStatus();
    } catch (error) {
        console.error('Status:', (error as Error).message);
        return (
            <div className="wrap">
                <AutoRefresh seconds={60} />
                <Head title="Status usług" line="Nie udało się pobrać danych z monitoringu. Spróbuj za minutę." note="Brak połączenia" />
                {notices}
                <ReloadButton label="Sprawdź ponownie" />
            </div>
        );
    }

    const monitors = [...snapshot.monitors].sort((a, b) => {
        if (!a.region && b.region) return 1;
        if (a.region && !b.region) return -1;
        return (a.region ?? '').localeCompare(b.region ?? '', 'pl') || a.name.localeCompare(b.name, 'pl', { numeric: true });
    });
    const summary = monitors.length ? verdict(monitors) : null;

    const measured = monitors.filter(m => m.uptime30 !== null);
    const average = measured.length ? measured.reduce((sum, m) => sum + (m.uptime30 ?? 0), 0) / measured.length : null;
    const monthAgo = snapshot.fetchedAt / 1000 - DAYS * 86400;
    const recent = snapshot.incidents.filter(i => i.start >= monthAgo).length;

    return (
        <div className="wrap">
            <AutoRefresh seconds={60} />

            <Head
                title={summary?.title ?? 'Status usług'}
                line={`${summary ? summary.line : 'Nie ma jeszcze żadnych serwerów do pokazania.'} Strona odświeża się sama co minutę.`}
                tone={summary?.tone}
                note={`Dane z ${time(snapshot.fetchedAt / 1000)}`}
            />

            {notices}

            {snapshot.stale && (
                <p className={`notice ${styles.notice}`}>Monitoring chwilowo nie odpowiada, więc pokazuję ostatnie zapisane dane.</p>
            )}

            {snapshot.announcement && (
                <div className={`notice ${styles.notice}`} data-tone={snapshot.announcement.tone}>
                    {snapshot.announcement.title && <p><strong>{snapshot.announcement.title}</strong></p>}
                    {snapshot.announcement.body && <p>{snapshot.announcement.body}</p>}
                </div>
            )}

            {monitors.length > 0 && (
                <>
                    <dl className={styles.stats} data-reveal>
                        <div>
                            <dt>Serwery</dt>
                            <dd>{pad(monitors.length)}</dd>
                        </div>
                        <div>
                            <dt>Średnia dostępność</dt>
                            <dd>{average !== null ? percent(average) : 'Brak'}</dd>
                        </div>
                        <div>
                            <dt>Przerwy w {DAYS} dni</dt>
                            <dd>{pad(recent)}</dd>
                        </div>
                        <div>
                            <dt>Ostatni pomiar</dt>
                            <dd>{time(snapshot.fetchedAt / 1000)}</dd>
                        </div>
                    </dl>

                    <section className={styles.servers} aria-labelledby="serwery">
                        <div className={styles.sectionHead} data-reveal>
                            <p className="v2-label">
                                <b>[01]</b> Serwery
                            </p>
                            <h2 id="serwery" className={styles.h2}>
                                Ostatnie <span className="v2-outline">{DAYS} dni</span>
                            </h2>
                        </div>
                        <ul role="list" className={styles.monitors}>
                            {monitors.map((monitor, i) => (
                                <MonitorCard key={monitor.id} monitor={monitor} index={i} />
                            ))}
                        </ul>
                        <p className={styles.legend}>
                            <span className={styles.legendItem}><span className={styles.dayUp} aria-hidden="true" />Bez przerw</span>
                            <span className={styles.legendItem}><span className={styles.dayDown} aria-hidden="true" />Była przerwa</span>
                            {monitors.some(m => m.days.length > 0 && m.days.length < DAYS) && (
                                <span className={styles.legendItem}><span className={styles.dayNone} aria-hidden="true" />Brak danych z tego dnia</span>
                            )}
                        </p>
                    </section>
                </>
            )}

            <Incidents snapshot={snapshot} label={monitors.length > 0 ? '[02]' : '[01]'} />
        </div>
    );
}
