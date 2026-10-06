import { Router, type Request, type Response } from 'express';
import { getServers, getStatus, isConfigured, sortMonitors, type StatusMonitor, type StatusSnapshot } from '@/lib/hetrix';
import {
    EVENT_TYPES,
    STATE_LABEL,
    concerns,
    getEvents,
    getStatusAnnouncements,
    latestEventId,
    matchesFilter,
    normName,
    statusEvents,
    type ApiAnnouncement,
    type EventFilter,
    type EventType,
    type StatusEvent
} from '@/lib/status-api';
import { limits, str } from '@/server/middleware';

// Publiczne API Status (dokumentacja: /api/status). Bez kluczy, tylko GET,
// z każdej domeny; limit 60 żądań na minutę z adresu IP (limits.statusApi).

export const statusApiRouter = Router();

statusApiRouter.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Last-Event-ID, Cache-Control');
    res.header('Access-Control-Expose-Headers', 'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Max-Age', '86400');
        res.status(204).send();
        return;
    }
    next();
});
statusApiRouter.use(limits.statusApi);

// ---------- Pomocnicze ----------

function error(res: Response, status: number, code: string, message: string, extra: Record<string, unknown> = {}): void {
    res.status(status).json({ error: code, message, ...extra });
}

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

/** Dane z monitoringu albo null, gdy HetrixTools nie jest skonfigurowany. Błąd połączenia przechodzi dalej. */
async function monitoring(): Promise<StatusSnapshot | null> {
    return isConfigured() ? getStatus() : null;
}

function monitoringDown(res: Response): void {
    error(res, 503, 'monitoring_unavailable', 'Monitoring chwilowo nie odpowiada. Spróbuj ponownie za minutę.');
}

/** Najwyższy poziom spośród ogłoszeń dotyczących serwera. */
function topLevel(announcements: ApiAnnouncement[]) {
    return announcements.reduce<ApiAnnouncement | null>((top, a) => (!top || a.severity > top.severity ? a : top), null)?.level ?? null;
}

function serverSummary(monitor: StatusMonitor, announcements: ApiAnnouncement[]) {
    const own = announcements.filter(a => concerns(a.servers, monitor.name));
    return {
        name: monitor.name,
        region: monitor.region,
        type: monitor.type,
        state: monitor.state,
        stateLabel: STATE_LABEL[monitor.state],
        since: iso(monitor.since),
        lastCheck: iso(monitor.lastCheck),
        uptime30: monitor.uptime30,
        loadPercent: monitor.load ? Math.round(monitor.load.percent * 10) / 10 : null,
        announcements: own.length,
        announcementLevel: topLevel(own)
    };
}

function loadJson(monitor: StatusMonitor) {
    if (!monitor.load) return null;
    return {
        percent: Math.round(monitor.load.percent * 10) / 10,
        ramUsed: Math.round(monitor.load.ramUsed),
        ramTotal: Math.round(monitor.load.ramTotal),
        measuredAt: iso(monitor.load.at)
    };
}

function overall(monitors: StatusMonitor[]): 'operational' | 'partial_outage' | 'major_outage' | 'maintenance' | 'unknown' {
    if (monitors.length === 0) return 'unknown';
    const down = monitors.filter(m => m.state === 'down').length;
    if (down === monitors.length) return 'major_outage';
    if (down > 0) return 'partial_outage';
    if (monitors.some(m => m.state === 'maintenance')) return 'maintenance';
    return 'operational';
}

function findMonitor(snapshot: StatusSnapshot, name: string): StatusMonitor | undefined {
    const wanted = normName(name);
    return snapshot.monitors.find(m => normName(m.name) === wanted);
}

function notFound(res: Response, name: string, names: string[]): void {
    error(res, 404, 'server_not_found', `Nie ma serwera „${name}”.`, { servers: names });
}

/**
 * Nazwa serwera z parametru ?server=. Nieznana nazwa daje 404 z listą serwerów,
 * żeby literówka w konfiguracji bota nie kończyła się ciszą. Gdy monitoring nie
 * odpowiada, nazwa przechodzi bez sprawdzania (ogłoszenia nadal działają).
 */
async function serverParam(req: Request, res: Response): Promise<string | null | false> {
    const raw = str(req.query.server).trim().substring(0, 100);
    if (!raw) return null;
    if (!isConfigured()) return raw;
    try {
        const { servers } = await getServers();
        const found = servers.find(s => normName(s.name) === normName(raw));
        if (found) return found.name;
        // Ogłoszenie może dotyczyć nazwy spoza monitoringu (np. po zmianie nazwy serwera).
        const { active, upcoming } = await getStatusAnnouncements();
        if ([...active, ...upcoming].some(a => a.servers.some(s => normName(s) === normName(raw)))) return raw;
        notFound(res, raw, servers.map(s => s.name));
        return false;
    } catch {
        return raw;
    }
}

function eventFilter(req: Request, server: string | null): EventFilter | string {
    const general = str(req.query.general).toLowerCase();
    let types: EventType[] | null = null;
    const raw = str(req.query.types).trim();
    if (raw) {
        types = [];
        for (const part of raw.split(',').map(t => t.trim()).filter(Boolean)) {
            // "announcement" albo "server" wybiera całą grupę zdarzeń.
            const matched = EVENT_TYPES.filter(t => t === part || t.startsWith(`${part}.`));
            if (matched.length === 0) return `Nieznany typ zdarzenia „${part}”. Dostępne: ${EVENT_TYPES.join(', ')}.`;
            types.push(...matched);
        }
    }
    return { server, includeGeneral: general !== '0' && general !== 'false', types };
}

function intParam(value: unknown, min: number, max: number, fallback: number | null): number | null {
    if (value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : NaN;
}

function cache(res: Response, seconds = 10): void {
    res.set('Cache-Control', `public, max-age=${seconds}`);
}

// ---------- Ogólny stan ----------

statusApiRouter.get('/', async (_req, res) => {
    try {
        const [{ active }, snapshot] = await Promise.all([getStatusAnnouncements(), monitoring().catch(() => undefined)]);
        const monitors = snapshot ? sortMonitors(snapshot.monitors) : [];
        cache(res);
        res.json({
            status: snapshot ? overall(monitors) : 'unknown',
            monitoring: snapshot ? (snapshot.stale ? 'stale' : 'ok') : snapshot === null ? 'not_configured' : 'unavailable',
            updatedAt: snapshot ? new Date(snapshot.fetchedAt).toISOString() : new Date().toISOString(),
            servers: monitors.map(m => serverSummary(m, active)),
            announcements: active,
            lastEventId: await latestEventId()
        });
    } catch (err) {
        console.error('API Status (/):', err);
        error(res, 500, 'server_error', 'Błąd serwera. Spróbuj ponownie za chwilę.');
    }
});

// ---------- Serwery ----------

statusApiRouter.get('/servers', async (_req, res) => {
    try {
        const snapshot = await monitoring();
        if (!snapshot) return void res.json({ servers: [] });
        const { active } = await getStatusAnnouncements();
        cache(res);
        res.json({ updatedAt: new Date(snapshot.fetchedAt).toISOString(), stale: snapshot.stale, servers: sortMonitors(snapshot.monitors).map(m => serverSummary(m, active)) });
    } catch {
        monitoringDown(res);
    }
});

type MonitorHandler = (req: Request, res: Response, monitor: StatusMonitor, snapshot: StatusSnapshot) => Promise<void> | void;

/** Wspólny początek tras /servers/:name: pobranie danych i 404 z listą nazw. */
function withMonitor(handler: MonitorHandler) {
    return async (req: Request, res: Response) => {
        const name = String(req.params.name ?? '');
        let snapshot: StatusSnapshot | null;
        try {
            snapshot = await monitoring();
        } catch {
            return monitoringDown(res);
        }
        if (!snapshot) return notFound(res, name, []);
        const monitor = findMonitor(snapshot, name);
        if (!monitor) return notFound(res, name, snapshot.monitors.map(m => m.name));
        try {
            cache(res);
            await handler(req, res, monitor, snapshot);
        } catch (err) {
            console.error('API Status (serwer):', err);
            error(res, 500, 'server_error', 'Błąd serwera. Spróbuj ponownie za chwilę.');
        }
    };
}

statusApiRouter.get(
    '/servers/:name',
    withMonitor(async (_req, res, monitor, snapshot) => {
        const { active, upcoming } = await getStatusAnnouncements();
        res.json({
            updatedAt: new Date(snapshot.fetchedAt).toISOString(),
            stale: snapshot.stale,
            server: {
                ...serverSummary(monitor, active),
                load: loadJson(monitor),
                days: monitor.days
            },
            announcements: active.filter(a => concerns(a.servers, monitor.name)),
            upcoming: upcoming.filter(a => concerns(a.servers, monitor.name)),
            incidents: snapshot.incidents
                .filter(i => i.monitor === monitor.name)
                .map(i => ({ id: i.id, start: iso(i.start), end: iso(i.end), duration: i.end ? i.end - i.start : null, ongoing: !i.end, maintenance: i.maintenance }))
        });
    })
);

statusApiRouter.get(
    '/servers/:name/uptime',
    withMonitor((_req, res, monitor) => {
        res.json({ server: monitor.name, uptime30: monitor.uptime30, days: monitor.days });
    })
);

statusApiRouter.get(
    '/servers/:name/load',
    withMonitor((_req, res, monitor) => {
        res.json({ server: monitor.name, load: loadJson(monitor) });
    })
);

// Mały znaczek SVG do README albo strony: nazwa serwera i jego stan.
const BADGE_COLORS: Record<string, string> = { up: '#23a55a', down: '#e5534b', maintenance: '#d29922', paused: '#8b949e' };

function escapeXml(text: string): string {
    return text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}

function badge(label: string, value: string, color: string): string {
    const width = (text: string) => Math.round(text.length * 6.6 + 14);
    const lw = width(label);
    const vw = width(value);
    const l = escapeXml(label);
    const v = escapeXml(value);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + vw}" height="20" role="img" aria-label="${l}: ${v}"><title>${l}: ${v}</title><clipPath id="r"><rect width="${lw + vw}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="${lw / 2}" y="14">${l}</text><text x="${lw + vw / 2}" y="14">${v}</text></g></svg>`;
}

statusApiRouter.get('/servers/:name/badge.svg', async (req, res) => {
    const name = String(req.params.name ?? '').substring(0, 60);
    let svg: string;
    try {
        const snapshot = await monitoring();
        const monitor = snapshot && findMonitor(snapshot, name);
        svg = monitor
            ? badge(monitor.name, STATE_LABEL[monitor.state].toLowerCase(), BADGE_COLORS[monitor.state])
            : badge(name || 'serwer', 'nie znaleziono', BADGE_COLORS.paused);
        if (!monitor) res.status(404);
    } catch {
        svg = badge(name || 'serwer', 'brak danych', BADGE_COLORS.paused);
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.type('image/svg+xml').send(svg);
});

// ---------- Ogłoszenia i przerwy ----------

statusApiRouter.get('/announcements', async (req, res) => {
    const server = await serverParam(req, res);
    if (server === false) return;
    const filter = eventFilter(req, server);
    if (typeof filter === 'string') return error(res, 400, 'invalid_parameter', filter);
    try {
        const { active, upcoming } = await getStatusAnnouncements();
        const pick = (list: ApiAnnouncement[]) => list.filter(a => concerns(a.servers, server, filter.includeGeneral));
        cache(res);
        res.json({ server, announcements: pick(active), upcoming: pick(upcoming) });
    } catch (err) {
        console.error('API Status (ogłoszenia):', err);
        error(res, 500, 'server_error', 'Błąd serwera. Spróbuj ponownie za chwilę.');
    }
});

statusApiRouter.get('/incidents', async (req, res) => {
    const server = await serverParam(req, res);
    if (server === false) return;
    try {
        const snapshot = await monitoring();
        const incidents = (snapshot?.incidents ?? [])
            .filter(i => !server || normName(i.monitor) === normName(server))
            .map(i => ({
                id: i.id,
                server: i.monitor,
                start: iso(i.start),
                end: iso(i.end),
                duration: i.end ? i.end - i.start : null,
                ongoing: !i.end,
                maintenance: i.maintenance
            }));
        cache(res);
        res.json({ server, incidents });
    } catch {
        monitoringDown(res);
    }
});

// ---------- Zdarzenia (polling) ----------

statusApiRouter.get('/events', async (req, res) => {
    const since = intParam(req.query.since, 0, Number.MAX_SAFE_INTEGER, null);
    const limit = intParam(req.query.limit, 1, 100, 50);
    if (Number.isNaN(since)) return error(res, 400, 'invalid_parameter', 'Parametr since musi być liczbą całkowitą (id ostatniego zdarzenia).');
    if (Number.isNaN(limit)) return error(res, 400, 'invalid_parameter', 'Parametr limit musi być liczbą od 1 do 100.');
    const server = await serverParam(req, res);
    if (server === false) return;
    const filter = eventFilter(req, server);
    if (typeof filter === 'string') return error(res, 400, 'invalid_parameter', filter);
    try {
        const result = await getEvents(since, limit!, filter);
        res.set('Cache-Control', 'no-store');
        res.json({ server, ...result });
    } catch (err) {
        console.error('API Status (zdarzenia):', err);
        error(res, 500, 'server_error', 'Błąd serwera. Spróbuj ponownie za chwilę.');
    }
});

// ---------- Zdarzenia na żywo (Server-Sent Events) ----------

const MAX_STREAMS_PER_IP = 3;
const MAX_STREAMS = 500;
const HEARTBEAT = 25_000;
const openStreams = new Map<string, number>();
let streamCount = 0;

function sseEvent(event: StatusEvent): string {
    return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

statusApiRouter.get('/stream', async (req, res) => {
    const server = await serverParam(req, res);
    if (server === false) return;
    const filter = eventFilter(req, server);
    if (typeof filter === 'string') return error(res, 400, 'invalid_parameter', filter);

    const ip = req.realIP || 'unknown';
    if ((openStreams.get(ip) ?? 0) >= MAX_STREAMS_PER_IP) {
        return error(res, 429, 'too_many_streams', `Z jednego adresu IP można mieć otwarte najwyżej ${MAX_STREAMS_PER_IP} strumienie naraz.`);
    }
    if (streamCount >= MAX_STREAMS) {
        res.set('Retry-After', '60');
        return error(res, 503, 'stream_capacity', 'Serwer ma teraz za dużo otwartych strumieni. Spróbuj za minutę albo użyj /events.');
    }

    openStreams.set(ip, (openStreams.get(ip) ?? 0) + 1);
    streamCount++;
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // nginx i inne proxy nie buforują odpowiedzi
        'X-Accel-Buffering': 'no'
    });
    res.write('retry: 10000\n\n');

    // Najpierw nasłuch, potem zaległe zdarzenia z bazy: nic nie ginie pomiędzy.
    let replaying = true;
    let sentUpTo = 0;
    const buffer: StatusEvent[] = [];
    const send = (event: StatusEvent) => {
        if (event.id <= sentUpTo) return;
        sentUpTo = event.id;
        res.write(sseEvent(event));
    };
    const onEvent = (event: StatusEvent) => {
        if (!matchesFilter(event, filter)) return;
        if (replaying) buffer.push(event);
        else send(event);
    };
    statusEvents.on('event', onEvent);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT);

    let closed = false;
    req.on('close', () => {
        closed = true;
        clearInterval(heartbeat);
        statusEvents.off('event', onEvent);
        streamCount--;
        const left = (openStreams.get(ip) ?? 1) - 1;
        if (left > 0) openStreams.set(ip, left);
        else openStreams.delete(ip);
    });

    try {
        // Po zerwaniu połączenia przeglądarka (EventSource) sama wysyła Last-Event-ID.
        const resume = intParam(req.get('last-event-id') ?? req.query.since, 0, Number.MAX_SAFE_INTEGER, null);
        if (resume !== null && !Number.isNaN(resume)) {
            const missed = await getEvents(resume, 100, filter);
            if (!closed) missed.events.forEach(send);
        }
        const lastId = await latestEventId();
        if (closed) return;
        res.write(`event: ready\ndata: ${JSON.stringify({ server, includeGeneral: filter.includeGeneral, types: filter.types ?? EVENT_TYPES, lastEventId: lastId })}\n\n`);
    } catch (err) {
        console.error('API Status (strumień):', err);
    } finally {
        replaying = false;
        if (!closed) buffer.forEach(send);
    }
});
