import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { ReloadButton } from '@/components/site/ReloadButton';
import { AutoRefresh } from '@/components/site/AutoRefresh';
import { plural } from '@/lib/client/format';
import { getStatus, isConfigured, type StatusDay, type StatusLoad, type StatusMonitor, type StatusSnapshot } from '@/lib/hetrix';
import styles from './status.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Status usług',
    description: 'Czy serwery wojtoteka.ovh działają: stan na żywo, obciążenie RAM, dostępność z 30 dni i ostatnie przerwy.',
    robots: { index: false, follow: true }
};

const TZ = 'Europe/Warsaw';
const DAYS = 30;
const timeFmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const whenFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDayFmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const percentFmt = new Intl.NumberFormat('pl-PL', { style: 'percent', maximumFractionDigits: 2 });

const STATE_LABEL: Record<StatusMonitor['state'], string> = {
    up: 'Działa',
    down: 'Nie odpowiada',
    maintenance: 'Przerwa techniczna',
    paused: 'Wstrzymany'
};

const time = (unix: number) => timeFmt.format(unix * 1000);
const when = (unix: number) => whenFmt.format(unix * 1000);
const day = (date: string) => dayFmt.format(new Date(`${date}T12:00:00Z`));
const percent = (value: number) => percentFmt.format(value / 100);

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
            title: `Awaria: ${names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names.at(-1)}` : names[0]}`,
            line: `${down.length > 1 ? 'Nie odpowiadają' : 'Nie odpowiada'} od ${when(first.since)}.${rest ? ` ${rest === 1 ? 'Reszta działa.' : 'Pozostałe działają.'}` : ''}`,
            tone: 'down'
        };
    }
    if (maintenance.length) {
        return {
            title: 'Przerwa techniczna',
            line: `Trwają prace: ${maintenance.map(m => m.name).join(', ')}. Pozostałe działają.`,
            tone: 'maintenance'
        };
    }
    const all =
        n === 1
            ? servers ? 'Serwer odpowiada.' : 'Usługa działa.'
            : n === 2
              ? servers ? 'Oba serwery odpowiadają.' : 'Obie usługi działają.'
              : servers
                ? `Wszystkie ${n} ${plural(n, 'serwer', 'serwery', 'serwerów')} odpowiadają.`
                : `Wszystkie ${n} ${plural(n, 'usługa', 'usługi', 'usług')} działają.`;
    return { title: 'Wszystko działa', line: all, tone: 'up' };
}

function dayTone(d: StatusDay): string {
    return d.downtimes > 0 ? styles.dayDown : styles.dayUp;
}

/** Dymek nad dniem: data, dostępność i liczba przerw. Przy krawędziach paska wyrównany do brzegu. */
function DayTip({ d, index, total }: { d: StatusDay; index: number; total: number }) {
    const edge = index < 4 ? 'start' : index >= total - 4 ? 'end' : undefined;
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

/** Zajęty RAM: pasek i liczby. Starszy odczyt (klucz bez dostępu do metryk v3) ma podaną godzinę. */
function Load({ load }: { load: StatusLoad }) {
    const old = Date.now() / 1000 - load.at > 5 * 60;
    const used = Math.round(load.percent);
    return (
        <div className={styles.load} data-high={load.percent >= 85 || undefined}>
            <p className={styles.loadLabel}>
                <Icon name="memory" size={22} />
                Obciążenie
            </p>
            <div className={styles.meter} aria-hidden="true">
                <span style={{ width: `${Math.min(100, load.percent)}%` }} />
            </div>
            <p className={styles.loadValue}>
                {used}%
                {old && <span className={styles.loadNote}> (odczyt o {time(load.at)})</span>}
            </p>
        </div>
    );
}

function MonitorRow({ monitor }: { monitor: StatusMonitor }) {
    const broken = monitor.days.filter(d => d.downtimes > 0).length;
    const missing = Math.max(0, DAYS - monitor.days.length);
    return (
        <li className={styles.monitor} data-state={monitor.state}>
            <div className={styles.monitorHead}>
                <div>
                    <h3 className={styles.name}>{monitor.name}</h3>
                    {monitor.region && <p className={styles.region}>{monitor.region}</p>}
                </div>
                <div className={styles.state}>
                    <p className={styles.stateLabel}>
                        <span className={styles.dot} aria-hidden="true" />
                        {STATE_LABEL[monitor.state]}
                    </p>
                    <p className={styles.uptime}>
                        {monitor.uptime30 !== null ? `${percent(monitor.uptime30)} z ${monitor.days.length || DAYS} dni` : 'Brak raportu'}
                    </p>
                </div>
            </div>

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
                            {broken
                                ? `Przerwy w ${broken} ${plural(broken, 'dniu', 'dniach', 'dniach')} z ${monitor.days.length}.`
                                : `Bez przerw przez ${monitor.days.length} dni.`}
                        </span>
                        <span>dziś</span>
                    </figcaption>
                </figure>
            )}
        </li>
    );
}

function Incidents({ snapshot }: { snapshot: StatusSnapshot }) {
    return (
        <section className={styles.incidents} aria-labelledby="przerwy">
            <h2 id="przerwy">Ostatnie przerwy</h2>
            {snapshot.incidents.length === 0 ? (
                <p className="muted">Monitoring nie zanotował żadnej przerwy.</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Początek</th>
                                <th scope="col">Serwer</th>
                                <th scope="col">Czas trwania</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.incidents.map(incident => (
                                <tr key={incident.id}>
                                    <td>{when(incident.start)}</td>
                                    <td>
                                        {incident.monitor}
                                        {incident.maintenance && <span className="muted"> (prace techniczne)</span>}
                                    </td>
                                    <td>
                                        {incident.end ? duration(incident.end - incident.start) : <strong className={styles.ongoing}>trwa</strong>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default async function StatusPage() {
    if (!isConfigured()) {
        return (
            <div className="wrap">
                <header className="page-head">
                    <h1 className="page-title">Status usług</h1>
                </header>
                <p className="notice notice-error">
                    <strong>Brak konfiguracji. </strong>
                    Ustaw HETRIX_KEY (klucz API v3) w pliku .env, żeby pokazać tu stan serwerów.
                </p>
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
                <header className="page-head">
                    <h1 className="page-title">Status usług</h1>
                    <p className="lead">Nie udało się pobrać danych z monitoringu. Spróbuj ponownie za minutę.</p>
                </header>
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

    return (
        <div className="wrap">
            <AutoRefresh seconds={60} />

            <header className={`page-head ${styles.head}`} data-tone={summary?.tone}>
                <h1 className={`page-title ${styles.verdict}`}>
                    {summary && <span className={styles.mark} aria-hidden="true" />}
                    <span>{summary?.title ?? 'Status usług'}</span>
                </h1>
                <p className="lead">
                    {summary ? `${summary.line} ` : 'Brak monitorów do pokazania. '}
                    Ostatni odczyt o {time(snapshot.fetchedAt / 1000)}.
                </p>
            </header>

            {snapshot.stale && (
                <p className={`notice ${styles.notice}`}>Monitoring chwilowo nie odpowiada. Poniżej ostatnie pobrane dane.</p>
            )}

            {snapshot.announcement && (
                <div className={`notice ${styles.notice}`} data-tone={snapshot.announcement.tone}>
                    {snapshot.announcement.title && <p><strong>{snapshot.announcement.title}</strong></p>}
                    {snapshot.announcement.body && <p>{snapshot.announcement.body}</p>}
                </div>
            )}

            {monitors.length > 0 && (
                <section aria-labelledby="serwery">
                    <h2 id="serwery" className="sr-only">
                        Serwery
                    </h2>
                    <ul role="list" className={styles.monitors}>
                        {monitors.map(monitor => (
                            <MonitorRow key={monitor.id} monitor={monitor} />
                        ))}
                    </ul>
                    <p className={styles.legend}>
                        <span className={styles.legendItem}><span className={styles.dayUp} aria-hidden="true" />dzień bez przerw</span>
                        <span className={styles.legendItem}><span className={styles.dayDown} aria-hidden="true" />była przerwa</span>
                        {monitors.some(m => m.days.length > 0 && m.days.length < DAYS) && (
                            <span className={styles.legendItem}><span className={styles.dayNone} aria-hidden="true" />monitor jeszcze nie działał</span>
                        )}
                    </p>
                </section>
            )}

            <Incidents snapshot={snapshot} />
        </div>
    );
}
