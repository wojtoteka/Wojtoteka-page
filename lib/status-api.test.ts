import assert from 'node:assert/strict';
import test from 'node:test';
import { pool } from './db';
import { announcementDeleted, concerns, statusEvents, syncAnnouncements, type StatusEvent } from './status-api';

test('ogłoszenie dotyczy swoich serwerów; ogólne wszystkich, chyba że general=0', () => {
    assert.equal(concerns(['IT-01'], 'it-01'), true);
    assert.equal(concerns(['IT-01'], 'PL-01'), false);
    assert.equal(concerns([], 'PL-01'), true);
    assert.equal(concerns([], 'PL-01', false), false);
    assert.equal(concerns(['IT-01'], null), true);
});

test('zdarzenia: dodanie, podniesienie poziomu, zmiana serwerów, wyłączenie i usunięcie', async t => {
    const now = new Date('2026-10-06T12:00:00Z');
    const row = {
        id: 7, title: 'Problemy u dostawcy', message: 'Możliwe przerwy.', type: 'warning', servers: '["IT-01"]',
        starts_at: null, ends_at: null, created_at: now, updated_at: now,
        is_active: 1, display_type: 'status', visible: 1, expired: 0, api_published: 0, api_snapshot: null as string | null
    };
    let nextId = 1;
    const events: StatusEvent[] = [];
    const onEvent = (event: StatusEvent) => events.push(event);
    statusEvents.on('event', onEvent);
    t.after(() => statusEvents.off('event', onEvent));

    // Udawana baza: zapytania z lib/status-api.ts rozpoznane po treści SQL.
    t.mock.method(pool, 'query', async (sql: string, params: unknown[] = []) => {
        if (sql.startsWith('INSERT INTO status_events')) return [{ insertId: nextId++ }];
        if (sql.includes('FROM announcements WHERE display_type')) return [[{ ...row }]];
        if (sql.startsWith('UPDATE announcements SET api_published = 1')) {
            Object.assign(row, { api_published: 1, api_snapshot: params[0] });
        } else if (sql.startsWith('UPDATE announcements SET api_published = 0')) {
            Object.assign(row, { api_published: 0, api_snapshot: null });
        } else if (sql.startsWith('UPDATE announcements SET api_snapshot')) {
            row.api_snapshot = params[0] as string;
        } else if (sql.startsWith('SELECT api_published')) {
            return [[{ api_published: row.api_published, api_snapshot: row.api_snapshot }]];
        }
        return [{ affectedRows: 1 }];
    });

    await syncAnnouncements();
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'announcement.created');
    assert.deepEqual(events[0].servers, ['IT-01']);

    // Bez zmian: brak zdarzeń przy kolejnym przebiegu.
    await syncAnnouncements();
    assert.equal(events.length, 1);

    row.type = 'important';
    row.message = 'Serwer nie działa.';
    await syncAnnouncements();
    const updated = events[1] as StatusEvent & { changes: Record<string, { from: unknown; to: unknown; escalated?: boolean }> };
    assert.equal(updated.type, 'announcement.updated');
    assert.deepEqual(updated.changes.level, { from: 'warning', to: 'critical', escalated: true });
    assert.deepEqual(updated.changes.message, { from: 'Możliwe przerwy.', to: 'Serwer nie działa.' });

    // Przeniesienie na inny serwer: zdarzenie idzie do obu.
    row.servers = '["PL-01"]';
    await syncAnnouncements();
    assert.deepEqual(events[2].servers, ['IT-01', 'PL-01']);

    // Zmiana na ogólne: zdarzenie ogólne.
    row.servers = '[]';
    await syncAnnouncements();
    assert.equal(events[3].general, true);

    row.is_active = 0;
    row.visible = 0;
    await syncAnnouncements();
    assert.equal(events[4].type, 'announcement.resolved');
    assert.equal(events[4].reason, 'disabled');

    // Usunięcie nieopublikowanego ogłoszenia nie wysyła drugiego zakończenia.
    await announcementDeleted(7);
    assert.equal(events.length, 5);

    row.is_active = 1;
    row.visible = 1;
    await syncAnnouncements();
    assert.equal(events[5].type, 'announcement.created');
    await announcementDeleted(7);
    assert.equal(events[6].type, 'announcement.resolved');
    assert.equal(events[6].reason, 'deleted');
    assert.deepEqual(events.map(e => e.id), [1, 2, 3, 4, 5, 6, 7]);
});
