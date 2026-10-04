import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { ReloadButton } from '@/components/site/ReloadButton';
import { AutoRefresh } from '@/components/site/AutoRefresh';
import { StatusAnnouncementCard } from '@/components/site/StatusAnnouncementCard';
import { getAnnouncementsFor } from '@/lib/site';
import { plural } from '@/lib/client/format';
import { getStatus, isConfigured, type StatusDay, type StatusLoad, type StatusMonitor, type StatusSnapshot } from '@/lib/hetrix';
import styles from './status.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Status usług',
    description: 'Stan serwerów wojtoteka.ovh: czy działają, ile zajmuje pamięć, jak wyglądały ostatnie 30 dni i kiedy były przerwy.',
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
    down: 'Offline',
    maintenance: 'Prace techniczne',
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

/** Zajęta pamięć RAM: pasek i wartość. Starszy odczyt (klucz bez dostępu do metryk v3) ma podaną godzinę. */
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
                {old && <span className={styles.loadNote}> (dane z {time(load.at)})</span>}
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
                        {monitor.uptime30 !== null ? `${percent(monitor.uptime30)} z ${monitor.days.length || DAYS} dni` : 'Brak danych'}
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
                                ? `Przerwy w ${broken} z ${monitor.days.length} dni.`
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
                <p className="muted">Nie było żadnych przerw.</p>
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
                <header className="page-head">
                    <h1 className="page-title">Status usług</h1>
                </header>
                {notices}
                <p className="notice notice-error">
                    <strong>Brak konfiguracji. </strong>
                    Dodaj HETRIX_KEY (klucz API v3) do pliku .env, a tu pojawi się stan serwerów.
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
                <AutoRefresh seconds={60} />
                <header className="page-head">
                    <h1 className="page-title">Status usług</h1>
                    <p className="lead">Nie udało się pobrać danych z monitoringu. Spróbuj za minutę.</p>
                </header>
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

    return (
        <div className="wrap">
            <AutoRefresh seconds={60} />

            <header className={`page-head ${styles.head}`} data-tone={summary?.tone}>
                <h1 className={`page-title ${styles.verdict}`}>
                    {summary && <span className={styles.mark} aria-hidden="true" />}
                    <span>{summary?.title ?? 'Status usług'}</span>
                </h1>
                <p className="lead">
                    {summary ? `${summary.line} ` : 'Nie ma jeszcze żadnych serwerów do pokazania. '}
                    Dane z {time(snapshot.fetchedAt / 1000)}.
                </p>
            </header>

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
                        <span className={styles.legendItem}><span className={styles.dayUp} aria-hidden="true" />bez przerw</span>
                        <span className={styles.legendItem}><span className={styles.dayDown} aria-hidden="true" />była przerwa</span>
                        {monitors.some(m => m.days.length > 0 && m.days.length < DAYS) && (
                            <span className={styles.legendItem}><span className={styles.dayNone} aria-hidden="true" />brak danych z tego dnia</span>
                        )}
                    </p>
                </section>
            )}

            <Incidents snapshot={snapshot} />
        </div>
    );
}
