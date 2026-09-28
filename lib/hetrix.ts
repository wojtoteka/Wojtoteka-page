// Dane do strony /status z HetrixTools API v3 (https://docs.hetrixtools.com/api/v3/).
// Klucz zostaje na serwerze: przeglądarka odwiedzającego nie łączy się z HetrixTools.
//
// Limity (sprawdzone w nagłówkach odpowiedzi i w dokumentacji):
// - v3: 20 zapytań na minutę na konto, licznik zeruje się co pełną minutę;
//   bez limitu miesięcznego.
// - v1: 2000 zapytań na miesiąc na darmowym planie (reset 1. dnia miesiąca).
// Każda odpowiedź leży więc w pamięci procesu: lista monitorów i RAM minutę,
// raport dzienny 10 minut, lista przerw 5 minut. Przy dwóch serwerach to
// ok. 5 zapytań v3 na minutę, niezależnie od liczby odwiedzających.
// Gdy API nie odpowiada, strona pokazuje ostatnie dane.

const API = 'https://api.hetrixtools.com/v3/';
const API_V1 = 'https://api.hetrixtools.com/v1/';
const TIMEZONE = 'Europe/Warsaw';
const DAYS = 30;

type UptimeStatus = 'up' | 'down';
type MonitorStatus = 'active' | 'paused' | 'disabled' | 'maint' | 'maint_dnd';

interface ApiMonitor {
    id: string;
    name: string;
    type: string;
    category: string | null;
    uptime_status: UptimeStatus;
    monitor_status: MonitorStatus;
    uptime: string;
    last_check: number;
    last_status_change: number;
    public_report: boolean;
    has_agent?: boolean;
}

interface ApiMetrics {
    memory: { ram_size: number };
    stats: { timestamp: number; ram: number | null }[];
}

interface ApiV1Stats {
    status?: string;
    error_message?: string;
    RAM?: number; // KB
    Stats?: { Minute: number; RAM: number }[];
}

interface ApiStatusPage {
    id: string;
    monitors: string[];
    announcement_type: 'none' | 'positive' | 'info' | 'warning' | 'critical';
    announcement_title: string;
    announcement_body: string;
}

interface ApiReport {
    data: Record<string, { uptime: { percentage: number; downtimes: number } }>;
    summary: { uptime: { percentage: number; downtimes: number } };
}

interface ApiDowntime {
    id: string;
    start: number;
    end: number | null;
    maintenance: boolean;
}

export interface StatusDay {
    date: string; // RRRR-MM-DD w czasie polskim
    uptime: number;
    downtimes: number;
}

/** Zajęty RAM według agenta na serwerze. */
export interface StatusLoad {
    ramUsed: number; // bajty
    ramTotal: number; // bajty
    percent: number;
    at: number; // unix, czas pomiaru
}

export interface StatusMonitor {
    id: string;
    name: string;
    type: string;
    region: string | null;
    state: 'up' | 'down' | 'maintenance' | 'paused';
    lastCheck: number;
    since: number;
    uptime30: number | null;
    days: StatusDay[];
    load: StatusLoad | null;
}

export interface StatusIncident {
    id: string;
    monitor: string;
    start: number;
    end: number | null;
    maintenance: boolean;
}

export interface StatusSnapshot {
    monitors: StatusMonitor[];
    incidents: StatusIncident[];
    announcement: { tone: 'positive' | 'info' | 'warning' | 'critical'; title: string; body: string } | null;
    fetchedAt: number;
    stale: boolean;
}

export class HetrixError extends Error {
    constructor(message: string, readonly status = 0) {
        super(message);
    }
}

// ---------- Pamięć podręczna ----------

interface Entry {
    at: number;
    value?: unknown;
    pending?: Promise<unknown>;
    failedAt?: number;
}

const store = new Map<string, Entry>();

// Po błędzie (np. 429) kolejna próba dopiero po tym czasie, żeby odświeżenia
// strony nie zużywały limitu zapytań.
const RETRY_AFTER = 30_000;

/** Zwraca świeżą wartość albo ładuje nową; jedno ładowanie naraz na klucz. Przy błędzie oddaje starą. */
async function cached<T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>,
    retryMs = RETRY_AFTER
): Promise<{ value: T; stale: boolean; at: number }> {
    const entry = store.get(key);
    const hasValue = !!entry && 'value' in entry;
    if (hasValue && Date.now() - entry.at < ttlMs) {
        return { value: entry.value as T, stale: false, at: entry.at };
    }
    if (entry?.failedAt && Date.now() - entry.failedAt < retryMs) {
        if (hasValue) return { value: entry.value as T, stale: true, at: entry.at };
        throw new HetrixError('Monitoring chwilowo nie odpowiada');
    }

    const pending = (entry?.pending as Promise<T> | undefined) ?? load();
    store.set(key, { ...entry, at: entry?.at ?? 0, pending });
    try {
        const value = await pending;
        const at = Date.now();
        store.set(key, { at, value });
        return { value, stale: false, at };
    } catch (error) {
        store.set(key, { ...store.get(key)!, pending: undefined, failedAt: Date.now() });
        console.error(`HetrixTools (${key}):`, (error as Error).message);
        if (hasValue) return { value: entry.value as T, stale: true, at: entry.at };
        throw error;
    }
}

// ---------- Zapytania ----------

function apiKey(): string | null {
    return (process.env.HETRIX_KEY || '').trim() || null;
}

/** ID strony statusu z adresu raportu (…/r/<id>/) albo wprost z HETRIX_STATUS_PAGE. */
function statusPageId(): string | null {
    const raw = (process.env.HETRIX_STATUS_PAGE || process.env.HETRIX_REPORT_URL || '').trim();
    return raw.match(/[a-f0-9]{32}/i)?.[0].toLowerCase() ?? null;
}

export function isConfigured(): boolean {
    return apiKey() !== null;
}

async function request<T>(path: string): Promise<T> {
    const response = await fetch(API + path, {
        headers: { Authorization: `Bearer ${apiKey()}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string; error_message?: string } | null;
        throw new HetrixError(`${response.status} ${body?.message ?? body?.error_message ?? response.statusText}`, response.status);
    }
    return (await response.json()) as T;
}

/** Przesunięcie strefy Europe/Warsaw w formacie API: "+02:00" latem, "+01:00" zimą. */
function warsawOffset(): string {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, timeZoneName: 'longOffset' })
        .formatToParts(new Date())
        .find(part => part.type === 'timeZoneName')?.value;
    const match = name?.match(/GMT([+-]\d{2}:\d{2})/);
    return match ? match[1] : '+00:00';
}

const regionNames = new Intl.DisplayNames(['pl'], { type: 'region' });

/** Kategoria monitora to kod kraju serwera (PL, IT); inne kategorie zostają bez zmian. */
function regionName(category: string | null): string | null {
    const code = category?.trim();
    if (!code) return null;
    if (/^[A-Z]{2}$/.test(code)) {
        try {
            return regionNames.of(code) ?? code;
        } catch {
            return code;
        }
    }
    return code;
}

function stateOf(monitor: ApiMonitor): StatusMonitor['state'] {
    if (monitor.monitor_status === 'maint' || monitor.monitor_status === 'maint_dnd') return 'maintenance';
    if (monitor.monitor_status !== 'active') return 'paused';
    return monitor.uptime_status === 'down' ? 'down' : 'up';
}

// ---------- Obciążenie (RAM) ----------
// Najpierw v3 (świeże co minutę). Klucz bez uprawnienia "v3 GET Server Agent Metrics"
// dostaje 403; wtedy dane idą ze starszego v1 "Server Stats". Odstęp między
// odczytami rośnie z liczbą serwerów, żeby zmieścić się w 1800 z 2000 zapytań
// miesięcznie (zapas na restarty): 2 serwery co godzinę, 3 co 75 min, 5 co ok. 2 godz.
// Po 403 jedna wspólna próba v3 co 10 minut sprawdza przywrócenie uprawnienia.
// Brak uprawnienia jest logowany raz na proces, zamiast osobno dla serwerów.

const V1_MONTHLY_BUDGET = 1800;
const MONTH_MS = 31 * 24 * 60 * 60_000;
const V3_RECHECK = 10 * 60_000;

function v1Interval(servers: number): number {
    return Math.max(60 * 60_000, Math.ceil((MONTH_MS * servers) / V1_MONTHLY_BUDGET / 60_000) * 60_000);
}
let v3DeniedAt: number | null = null;
let v3Allowed = false;
let v3PermissionCheck: Promise<void> | null = null;
let v3DenialLogged = false;

function newest<T>(items: T[], time: (item: T) => number): T | undefined {
    return items.reduce<T | undefined>((best, item) => (!best || time(item) > time(best) ? item : best), undefined);
}

function toLoad(total: number, percent: number | null | undefined, at: number): StatusLoad | null {
    if (!total || percent === null || percent === undefined) return null;
    return { ramTotal: total, ramUsed: (total * percent) / 100, percent, at };
}

async function loadV3(id: string): Promise<StatusLoad | null> {
    let metrics: ApiMetrics;
    try {
        metrics = await request<ApiMetrics>(`uptime-monitors/${id}/server-agent/metrics`);
    } catch (error) {
        if (!(error instanceof HetrixError && error.status === 403)) throw error;
        v3DeniedAt = Date.now();
        v3Allowed = false;
        if (!v3DenialLogged) {
            v3DenialLogged = true;
            console.warn('HetrixTools: brak uprawnienia v3 GET Server Agent Metrics (403). RAM będzie pobierany przez API v1, jeśli klucz ma do niego dostęp. Ponowne sprawdzenie v3 za 10 minut.');
        }
        // Spodziewany brak opcjonalnego uprawnienia: nie loguj błędu per monitor
        // ani nie zwracaj starego odczytu v3 zamiast przejść na v1.
        return null;
    }
    v3Allowed = true;
    v3DeniedAt = null;
    const last = newest(metrics.stats ?? [], s => s.timestamp);
    return last ? toLoad(metrics.memory?.ram_size, last.ram, last.timestamp) : null;
}

async function loadV1(id: string): Promise<StatusLoad | null> {
    // Klucz w adresie to format v1; adres nie trafia do logów.
    const response = await fetch(`${API_V1}${apiKey()}/server/stats/${id}/`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const body = (await response.json().catch(() => null)) as ApiV1Stats | null;
    if (!response.ok || !body || body.status === 'ERROR') throw new HetrixError(`v1 ${response.status} ${body?.error_message ?? ''}`.trim(), response.status);
    const last = newest(body.Stats ?? [], s => s.Minute);
    return last && body.RAM ? toLoad(body.RAM * 1024, last.RAM, last.Minute) : null;
}

async function getLoad(id: string, servers: number): Promise<StatusLoad | null> {
    if (v3DeniedAt === null || Date.now() - v3DeniedAt >= V3_RECHECK) {
        try {
            // Przy nieznanych/odrzuconych uprawnieniach pozostali odwiedzający
            // i monitory czekają na tę samą próbę, zamiast wysyłać serię 403.
            if (!v3Allowed) {
                v3PermissionCheck ??= cached(`load3:${id}`, 60_000, () => loadV3(id))
                    .then(() => {})
                    .finally(() => { v3PermissionCheck = null; });
                await v3PermissionCheck;
            }
            if (v3Allowed) {
                const result = await cached(`load3:${id}`, 60_000, () => loadV3(id));
                if (v3Allowed) return result.value;
            }
        } catch {
            if (v3DeniedAt === null) return null;
        }
    }
    try {
        const interval = v1Interval(servers);
        return (await cached(`load1:${id}`, interval, () => loadV1(id), interval)).value;
    } catch {
        return null;
    }
}

export async function getStatus(): Promise<StatusSnapshot> {
    if (!isConfigured()) throw new HetrixError('Brak klucza HETRIX_KEY');
    const pageId = statusPageId();

    const [monitorsRes, pageRes] = await Promise.all([
        cached('monitors', 60_000, () => request<{ monitors: ApiMonitor[] }>('uptime-monitors?per_page=200').then(r => r.monitors)),
        pageId
            ? cached('status-page', 60_000, () =>
                  request<{ status_pages: ApiStatusPage[] }>('status-pages?per_page=100').then(r => r.status_pages.find(p => p.id === pageId) ?? null)
              )
            : Promise.resolve({ value: null, stale: false, at: Date.now() })
    ]);

    // Kolejność i wybór jak na stronie statusu w HetrixTools; bez niej monitory z publicznym raportem.
    const all = monitorsRes.value;
    const page = pageRes.value;
    const chosen = page
        ? page.monitors.map(id => all.find(m => m.id === id)).filter((m): m is ApiMonitor => !!m)
        : all.filter(m => m.public_report);

    const agents = chosen.filter(m => m.has_agent).length;
    const offset = warsawOffset();
    const details = await Promise.all(
        chosen.map(async monitor => {
            const [report, downtimes, load] = await Promise.all([
                cached(`report:${monitor.id}`, 10 * 60_000, () =>
                    request<ApiReport>(`uptime-monitors/${monitor.id}/report?days=${DAYS}&timezone=${encodeURIComponent(offset)}`)
                ).catch(() => null),
                cached(`downtimes:${monitor.id}`, 5 * 60_000, () =>
                    request<{ downtimes: ApiDowntime[] }>(`uptime-monitors/${monitor.id}/downtimes?per_page=10`).then(r => r.downtimes)
                ).catch(() => null),
                monitor.has_agent ? getLoad(monitor.id, agents) : Promise.resolve(null)
            ]);
            return { monitor, report, downtimes, load };
        })
    );

    const monitors: StatusMonitor[] = details.map(({ monitor, report, load }) => ({
        id: monitor.id,
        name: monitor.name,
        type: monitor.type,
        region: regionName(monitor.category),
        state: stateOf(monitor),
        lastCheck: monitor.last_check,
        since: monitor.last_status_change,
        uptime30: report ? report.value.summary.uptime.percentage : null,
        days: report
            ? Object.entries(report.value.data)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, day]) => ({ date, uptime: day.uptime.percentage, downtimes: day.uptime.downtimes }))
            : [],
        load
    }));

    const incidents: StatusIncident[] = details
        .flatMap(({ monitor, downtimes }) =>
            (downtimes?.value ?? []).map(d => ({ id: d.id, monitor: monitor.name, start: d.start, end: d.end || null, maintenance: d.maintenance }))
        )
        .sort((a, b) => b.start - a.start)
        .slice(0, 8);

    const announcement =
        page && page.announcement_type !== 'none' && (page.announcement_title || page.announcement_body)
            ? { tone: page.announcement_type, title: page.announcement_title, body: page.announcement_body }
            : null;

    const stale = monitorsRes.stale || pageRes.stale || details.some(d => d.report?.stale || d.downtimes?.stale);

    return { monitors, incidents, announcement, fetchedAt: monitorsRes.at, stale };
}
