import assert from 'node:assert/strict';
import test from 'node:test';
import { getStatus } from './hetrix';

test('HetrixTools: wspólne sprawdzanie uprawnień, fallback i powrót do v3', async t => {
    const env = { key: process.env.HETRIX_KEY, page: process.env.HETRIX_STATUS_PAGE, report: process.env.HETRIX_REPORT_URL };
    process.env.HETRIX_KEY = 'test-key';
    delete process.env.HETRIX_STATUS_PAGE;
    delete process.env.HETRIX_REPORT_URL;
    t.after(() => {
        for (const [key, value] of Object.entries({ HETRIX_KEY: env.key, HETRIX_STATUS_PAGE: env.page, HETRIX_REPORT_URL: env.report })) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    let now = Date.UTC(2026, 8, 28, 12);
    let metricsStatus = 403;
    let v1Available = true;
    const calls = { v3: 0, v1: 0 };
    const warnings: unknown[][] = [];
    const errors: unknown[][] = [];
    const monitors = ['one', 'two', 'three'].map(id => ({
        id, name: id, type: 'heartbeat', category: 'PL', uptime_status: 'up', monitor_status: 'active',
        uptime: '100', last_check: now / 1000, last_status_change: now / 1000, public_report: true, has_agent: true
    }));
    t.mock.method(Date, 'now', () => now);
    t.mock.method(console, 'warn', (...args: unknown[]) => warnings.push(args));
    t.mock.method(console, 'error', (...args: unknown[]) => errors.push(args));
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
        const url = new URL(String(input));
        // Wymuś nakładanie się zapytań od kilku odwiedzających i monitorów.
        await new Promise<void>(resolve => setImmediate(resolve));
        if (url.pathname.endsWith('/server-agent/metrics')) {
            calls.v3++;
            return metricsStatus === 200
                ? Response.json({ memory: { ram_size: 1024 }, stats: [{ timestamp: now / 1000, ram: 60 }] })
                : Response.json({ message: 'api key not allowed to perform this action' }, { status: metricsStatus });
        }
        if (url.pathname.startsWith('/v1/')) {
            calls.v1++;
            return v1Available
                ? Response.json({ RAM: 1, Stats: [{ Minute: now / 1000, RAM: 25 }] })
                : Response.json({ status: 'ERROR', error_message: 'unavailable' }, { status: 503 });
        }
        if (url.pathname === '/v3/uptime-monitors') return Response.json({ monitors });
        if (url.pathname.endsWith('/report')) return Response.json({ data: {}, summary: { uptime: { percentage: 100, downtimes: 0 } } });
        if (url.pathname.endsWith('/downtimes')) return Response.json({ downtimes: [] });
        throw new Error(`Unexpected test endpoint: ${url.pathname}`);
    });

    await t.test('wiele równoczesnych wejść: jedna próba v3 i jedno ostrzeżenie', async () => {
        const snapshots = await Promise.all(Array.from({ length: 10 }, () => getStatus()));
        assert.deepEqual(calls, { v3: 1, v1: 3 });
        assert.equal(warnings.length, 1);
        assert.equal(errors.length, 0);
        for (const snapshot of snapshots) {
            assert.equal(snapshot.stale, false);
            assert.deepEqual(snapshot.monitors.map(m => [m.state, m.load?.percent]), [['up', 25], ['up', 25], ['up', 25]]);
        }
    });

    await t.test('przed upływem 10 minut nie ponawia odrzuconych zapytań', async () => {
        now += 10 * 60_000 - 1;
        await getStatus();
        assert.deepEqual(calls, { v3: 1, v1: 3 });
    });

    await t.test('po 10 minutach jedna ponowna próba, bez powielania ostrzeżenia', async () => {
        now++;
        await Promise.all(Array.from({ length: 5 }, () => getStatus()));
        assert.deepEqual(calls, { v3: 2, v1: 3 });
        assert.equal(warnings.length, 1);
        assert.equal(errors.length, 0);
    });

    await t.test('przywrócone uprawnienia automatycznie włączają świeży RAM v3', async () => {
        now += 10 * 60_000;
        metricsStatus = 200;
        const snapshots = await Promise.all(Array.from({ length: 5 }, () => getStatus()));
        assert.deepEqual(calls, { v3: 5, v1: 3 });
        assert.ok(snapshots.every(s => s.monitors.every(m => m.load?.percent === 60)));
    });

    await t.test('chwilowa awaria v3 zachowuje ostatni odczyt', async () => {
        now += 60_000;
        metricsStatus = 503;
        const snapshot = await getStatus();
        assert.ok(snapshot.monitors.every(m => m.load?.percent === 60));
        assert.equal(errors.length, 3);
        const count = calls.v3;
        await getStatus();
        assert.equal(calls.v3, count);
    });

    await t.test('odebranie uprawnienia przełącza na v1 także po udanym odczycie v3', async () => {
        now += 60_000;
        metricsStatus = 403;
        const snapshot = await getStatus();
        assert.ok(snapshot.monitors.every(m => m.load?.percent === 25));
        assert.equal(warnings.length, 1);
        assert.equal(errors.length, 3);
        const count = calls.v3;
        now += 60_000;
        await getStatus();
        assert.equal(calls.v3, count);
    });

    await t.test('awaria odczytu zapasowego nie psuje statusu; brak RAM dla nowego serwera', async () => {
        now += 2 * 60 * 60_000;
        v1Available = false;
        monitors.push({ ...monitors[0], id: 'four', name: 'four' });
        const snapshot = await getStatus();
        assert.ok(snapshot.monitors.every(m => m.state === 'up'));
        assert.equal(snapshot.monitors.find(m => m.id === 'four')?.load, null);
        assert.equal(snapshot.monitors[0].load?.percent, 25);
        const count = calls.v1;
        now += 60_000;
        await getStatus();
        assert.equal(calls.v1, count);
    });
});
