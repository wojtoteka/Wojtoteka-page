// API Status: ogłoszenia serwerów i zdarzenia dla botów (/api/v1/status, dokumentacja na /api/status).
//
// Zdarzenia powstają w dwóch miejscach:
// - ogłoszenia: po każdej zmianie w panelu i co 30 s (ogłoszenia z datą „od/do” same
//   zaczynają się i kończą). Kolumna api_snapshot trzyma to, co ostatnio poszło do API,
//   więc porównanie wykrywa nowe ogłoszenie, edycję (z poziomem) i zakończenie;
// - serwery: co 30 s porównanie stanu z HetrixTools z ostatnim zapisanym (site_settings),
//   z tej samej pamięci podręcznej co /status, więc bez dodatkowych zapytań do HetrixTools.
// Zdarzenia leżą w bazie 30 dni (feed z ?since=) i idą na żywo do strumieni SSE.

import { EventEmitter } from 'node:events';
import { execute, select, selectOne } from '@/lib/db';
import { getServers, isConfigured, type StatusMonitor } from '@/lib/hetrix';

export type Level = 'info' | 'warning' | 'critical';
export type ServerState = StatusMonitor['state'];

/** Poziom w bazie (info/warning/important) i w API (info/warning/critical). */
const LEVELS: Record<string, Level> = { info: 'info', warning: 'warning', important: 'critical' };
export const SEVERITY: Record<Level, number> = { info: 1, warning: 2, critical: 3 };
export const LEVEL_LABEL: Record<Level, string> = { info: 'Informacja', warning: 'Ostrzeżenie', critical: 'Ważne' };
export const STATE_LABEL: Record<ServerState, string> = { up: 'Działa', down: 'Offline', maintenance: 'Prace techniczne', paused: 'Wstrzymany' };

export const EVENT_TYPES = ['announcement.created', 'announcement.updated', 'announcement.resolved', 'server.state_changed'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface ApiAnnouncement {
    id: number;
    level: Level;
    levelLabel: string;
    severity: number;
    title: string | null;
    message: string;
    /** Puste = ogłoszenie ogólne, dotyczy wszystkich serwerów. */
    servers: string[];
    general: boolean;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StatusEvent {
    id: number;
    type: EventType;
    at: string;
    servers: string[];
    general: boolean;
    [key: string]: unknown;
}

export const normName = (name: string) => name.trim().toLowerCase();

export function parseServers(raw: unknown): string[] {
    try {
        const value = JSON.parse(String(raw || '[]'));
        return Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : [];
    } catch {
        return [];
    }
}

/** Czy ogłoszenie albo zdarzenie dotyczy serwera. Ogólne dotyczą wszystkich, chyba że general=false. */
export function concerns(servers: string[], server: string | null, includeGeneral = true): boolean {
    if (!server) return true;
    if (servers.length === 0) return includeGeneral;
    const wanted = normName(server);
    return servers.some(s => normName(s) === wanted);
}

const iso = (value: Date | string | null): string | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

interface AnnouncementRow {
    id: number;
    title: string;
    message: string;
    type: string;
    servers: string;
    starts_at: Date | null;
    ends_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

function toApi(row: AnnouncementRow): ApiAnnouncement {
    const level = LEVELS[row.type] ?? 'info';
    const servers = parseServers(row.servers);
    return {
        id: row.id,
        level,
        levelLabel: LEVEL_LABEL[level],
        severity: SEVERITY[level],
        title: row.title || null,
        message: row.message,
        servers,
        general: servers.length === 0,
        startsAt: iso(row.starts_at),
        endsAt: iso(row.ends_at),
        createdAt: iso(row.created_at)!,
        updatedAt: iso(row.updated_at)!
    };
}

const COLUMNS = 'id, title, message, type, servers, starts_at, ends_at, created_at, updated_at';

/** Ogłoszenia serwerów widoczne teraz oraz zaplanowane (włączone, z datą „od” w przyszłości). */
export async function getStatusAnnouncements(): Promise<{ active: ApiAnnouncement[]; upcoming: ApiAnnouncement[] }> {
    const [active, upcoming] = await Promise.all([
        select<AnnouncementRow>(
            `SELECT ${COLUMNS} FROM announcements
             WHERE display_type = 'status' AND is_active = 1
               AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at > NOW())
             ORDER BY priority DESC, created_at DESC`
        ),
        select<AnnouncementRow>(
            `SELECT ${COLUMNS} FROM announcements
             WHERE display_type = 'status' AND is_active = 1 AND starts_at > NOW()
               AND (ends_at IS NULL OR ends_at > NOW())
             ORDER BY starts_at ASC`
        )
    ]);
    return { active: active.map(toApi), upcoming: upcoming.map(toApi) };
}

// ---------- Zdarzenia ----------

// Express i Next.js ładują moduły osobno; emiter w globalThis jest jeden na proces.
const globalForEvents = globalThis as typeof globalThis & { __wojtotekaStatusEvents?: EventEmitter };
export const statusEvents: EventEmitter =
    globalForEvents.__wojtotekaStatusEvents ?? (globalForEvents.__wojtotekaStatusEvents = new EventEmitter().setMaxListeners(0));

async function addEvent(type: EventType, servers: string[], data: Record<string, unknown>): Promise<void> {
    const result = await execute('INSERT INTO status_events (type, servers, payload) VALUES (?, ?, ?)', [
        type,
        JSON.stringify(servers),
        JSON.stringify(data)
    ]);
    const event: StatusEvent = { id: result.insertId, type, at: new Date().toISOString(), servers, general: servers.length === 0, ...data };
    statusEvents.emit('event', event);
}

interface EventRow {
    id: number;
    type: EventType;
    servers: string;
    payload: string;
    created_at: Date;
}

function rowToEvent(row: EventRow): StatusEvent {
    const servers = parseServers(row.servers);
    let data: Record<string, unknown> = {};
    try {
        data = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
        // uszkodzony wpis: zostaje samo zdarzenie bez szczegółów
    }
    return { id: Number(row.id), type: row.type, at: iso(row.created_at)!, servers, general: servers.length === 0, ...data };
}

export interface EventFilter {
    server: string | null;
    includeGeneral: boolean;
    types: EventType[] | null;
}

export function matchesFilter(event: StatusEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) return false;
    return concerns(event.servers, filter.server, filter.includeGeneral);
}

const SCAN = 500;

/**
 * Zdarzenia po identyfikatorze `since` (bez since: najnowsze). lastId to ostatni przejrzany
 * wpis, także odrzucony przez filtr, więc kolejne zapytanie z since=lastId nie zwraca powtórek.
 */
export async function getEvents(since: number | null, limit: number, filter: EventFilter) {
    if (since === null) {
        const rows = await select<EventRow>('SELECT * FROM status_events ORDER BY id DESC LIMIT ?', [SCAN]);
        const events = rows.map(rowToEvent).filter(e => matchesFilter(e, filter)).slice(0, limit).reverse();
        return { events, lastId: rows.length ? Number(rows[0].id) : await latestEventId(), hasMore: false };
    }
    const rows = await select<EventRow>('SELECT * FROM status_events WHERE id > ? ORDER BY id ASC LIMIT ?', [since, SCAN]);
    const events: StatusEvent[] = [];
    let lastId = since;
    let full = false;
    for (const row of rows) {
        const event = rowToEvent(row);
        if (matchesFilter(event, filter)) {
            if (events.length === limit) {
                full = true;
                break;
            }
            events.push(event);
        }
        lastId = event.id;
    }
    return { events, lastId, hasMore: full || rows.length === SCAN };
}

export async function latestEventId(): Promise<number> {
    return Number((await selectOne<{ id: number | null }>('SELECT MAX(id) AS id FROM status_events'))?.id ?? 0);
}

export function deleteOldEvents(): Promise<unknown> {
    return execute('DELETE FROM status_events WHERE created_at < NOW() - INTERVAL 30 DAY');
}

// ---------- Synchronizacja ogłoszeń ----------

interface Snapshot {
    title: string | null;
    message: string;
    level: Level;
    servers: string[];
    startsAt: string | null;
    endsAt: string | null;
}

interface SyncRow extends AnnouncementRow {
    is_active: number;
    display_type: string;
    visible: number;
    expired: number;
    api_published: number;
    api_snapshot: string | null;
}

function snapshotOf(a: ApiAnnouncement): Snapshot {
    return { title: a.title, message: a.message, level: a.level, servers: a.servers, startsAt: a.startsAt, endsAt: a.endsAt };
}

function parseSnapshot(raw: string | null): Snapshot | null {
    try {
        return raw ? (JSON.parse(raw) as Snapshot) : null;
    } catch {
        return null;
    }
}

/** Co się zmieniło między wersjami; zmiana poziomu ma też kierunek (escalated). */
function diff(before: Snapshot, after: Snapshot): Record<string, unknown> {
    const changes: Record<string, unknown> = {};
    for (const key of ['title', 'message', 'startsAt', 'endsAt'] as const) {
        if (before[key] !== after[key]) changes[key] = { from: before[key], to: after[key] };
    }
    if (before.level !== after.level) {
        changes.level = { from: before.level, to: after.level, escalated: SEVERITY[after.level] > SEVERITY[before.level] };
    }
    if (JSON.stringify(before.servers) !== JSON.stringify(after.servers)) {
        changes.servers = {
            from: before.servers,
            to: after.servers,
            added: after.servers.filter(s => !before.servers.some(b => normName(b) === normName(s))),
            removed: before.servers.filter(s => !after.servers.some(a => normName(a) === normName(s)))
        };
    }
    return changes;
}

/** Zdarzenie zakończenia: serwery z ostatniej opublikowanej wersji, żeby trafiło do tych samych botów. */
function resolvedEvent(id: number, snapshot: Snapshot | null, reason: 'disabled' | 'ended' | 'deleted' | 'moved') {
    const servers = snapshot?.servers ?? [];
    return addEvent('announcement.resolved', servers, {
        reason,
        announcement: snapshot ? { id, ...snapshot, levelLabel: LEVEL_LABEL[snapshot.level], severity: SEVERITY[snapshot.level] } : { id }
    });
}

async function runSync(): Promise<void> {
    const rows = await select<SyncRow>(
        `SELECT ${COLUMNS}, is_active, display_type, api_published, api_snapshot,
                (display_type = 'status' AND is_active = 1
                 AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at > NOW())) AS visible,
                (ends_at IS NOT NULL AND ends_at <= NOW()) AS expired
         FROM announcements WHERE display_type = 'status' OR api_published = 1`
    );
    for (const row of rows) {
        const stored = parseSnapshot(row.api_snapshot);
        if (row.visible && !row.api_published) {
            const announcement = toApi(row);
            await addEvent('announcement.created', announcement.servers, { announcement });
            await execute('UPDATE announcements SET api_published = 1, api_snapshot = ? WHERE id = ?', [JSON.stringify(snapshotOf(announcement)), row.id]);
        } else if (!row.visible && row.api_published) {
            const reason = row.display_type !== 'status' ? 'moved' : !row.is_active ? 'disabled' : 'ended';
            await resolvedEvent(row.id, stored, reason);
            await execute('UPDATE announcements SET api_published = 0, api_snapshot = NULL WHERE id = ?', [row.id]);
        } else if (row.visible && row.api_published) {
            const announcement = toApi(row);
            const current = snapshotOf(announcement);
            const changes = stored ? diff(stored, current) : {};
            if (stored && Object.keys(changes).length === 0) continue;
            // Zdarzenie idzie do serwerów z obu wersji: bot usuniętego serwera też dowie się o zmianie.
            // Gdy któraś wersja była ogólna, zdarzenie też jest ogólne.
            const before = stored?.servers ?? current.servers;
            const servers = before.length === 0 || current.servers.length === 0 ? [] : [...new Set([...before, ...current.servers])];
            await addEvent('announcement.updated', servers, { announcement, changes });
            await execute('UPDATE announcements SET api_snapshot = ? WHERE id = ?', [JSON.stringify(current), row.id]);
        }
    }
}

let syncChain: Promise<void> = Promise.resolve();

/** Wysyła zdarzenia o zmianach ogłoszeń. Wywołania idą po kolei, żeby nie zdublować zdarzeń. */
export function syncAnnouncements(): Promise<void> {
    syncChain = syncChain.then(runSync).catch(error => console.error('API Status (ogłoszenia):', error));
    return syncChain;
}

/** Przed usunięciem ogłoszenia: boty dostają zdarzenie zakończenia, jeśli było widoczne. */
export function announcementDeleted(id: number): Promise<void> {
    syncChain = syncChain
        .then(async () => {
            const row = await selectOne<{ api_published: number; api_snapshot: string | null }>(
                'SELECT api_published, api_snapshot FROM announcements WHERE id = ?',
                [id]
            );
            if (row?.api_published) await resolvedEvent(id, parseSnapshot(row.api_snapshot), 'deleted');
        })
        .catch(error => console.error('API Status (usunięcie):', error));
    return syncChain;
}

// ---------- Zmiany stanu serwerów ----------

const STATE_KEY = 'status_server_states';

async function runServerCheck(): Promise<void> {
    if (!isConfigured()) return;
    const { servers, stale } = await getServers();
    // Stare dane z pamięci (HetrixTools nie odpowiada) nie są podstawą do ogłaszania zmian.
    if (stale) return;
    const row = await selectOne<{ value: string }>('SELECT `value` FROM site_settings WHERE `key` = ?', [STATE_KEY]);
    let previous: Record<string, { state: ServerState; name: string }> | null = null;
    try {
        previous = row ? JSON.parse(row.value) : null;
    } catch {
        previous = null;
    }

    const next: Record<string, { state: ServerState; name: string }> = {};
    let changed = !previous;
    for (const server of servers) {
        next[server.id] = { state: server.state, name: server.name };
        const before = previous?.[server.id];
        if (!previous) continue;
        if (!before || before.state !== server.state || before.name !== server.name) changed = true;
        if (before && before.state !== server.state) {
            await addEvent('server.state_changed', [server.name], {
                server: {
                    name: server.name,
                    region: server.region,
                    from: before.state,
                    to: server.state,
                    fromLabel: STATE_LABEL[before.state],
                    toLabel: STATE_LABEL[server.state],
                    since: new Date(server.since * 1000).toISOString()
                }
            });
        }
    }
    if (previous && Object.keys(previous).some(id => !next[id])) changed = true;
    if (changed) {
        await execute('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [
            STATE_KEY,
            JSON.stringify(next)
        ]);
    }
}

let serverCheck: Promise<void> | null = null;

/** Co 30 s z server/index.ts: ogłoszenia z harmonogramu i zmiany stanu serwerów. */
export async function statusTick(): Promise<void> {
    await syncAnnouncements();
    serverCheck ??= runServerCheck()
        .catch(error => console.error('API Status (serwery):', (error as Error).message))
        .finally(() => {
            serverCheck = null;
        });
    await serverCheck;
}
