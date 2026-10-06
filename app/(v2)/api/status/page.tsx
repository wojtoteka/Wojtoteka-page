import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { DocsLayout, type TocItem } from '@/components/docs/DocsLayout';
import { getServers, isConfigured, sortMonitors } from '@/lib/hetrix';
import { StatusTester } from './StatusTester';
import styles from '../api.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMeta({
    title: 'API Status',
    description: 'Publiczne API stanu serwerów wojtoteka.ovh: ogłoszenia, zmiany stanu, dostępność z 30 dni i obciążenie. Bez kluczy, z powiadomieniami dla botów.',
    path: '/api/status',
    image: 'api'
});

const BASE = 'https://wojtoteka.ovh/api/v1/status';

const TOC: TocItem[] = [
    { id: 'start', label: 'Jak to działa' },
    { id: 'zasady', label: 'Adres i zasady' },
    { id: 'limity', label: 'Limity' },
    { id: 'serwery-nazwy', label: 'Nazwy serwerów' },
    { id: 'endpointy', label: 'Lista endpointów' },
    { id: 'stan', label: 'Stan ogólny' },
    { id: 'serwery', label: 'Serwery' },
    { id: 'ogloszenia', label: 'Ogłoszenia' },
    { id: 'przerwy', label: 'Przerwy' },
    { id: 'zdarzenia', label: 'Zdarzenia' },
    { id: 'polling', label: 'Sprawdzanie co chwilę' },
    { id: 'stream', label: 'Na żywo (SSE)' },
    { id: 'przyklady', label: 'Przykłady botów' },
    { id: 'znaczek', label: 'Znaczek SVG' },
    { id: 'bledy', label: 'Błędy' },
    { id: 'test', label: 'Test na żywo' },
    { id: 'faq', label: 'Pytania' }
];

const STATUS_EXAMPLE = `{
  "status": "operational",
  "monitoring": "ok",
  "updatedAt": "2026-10-06T12:00:00.000Z",
  "servers": [
    {
      "name": "IT-01",
      "region": "Włochy",
      "type": "heartbeat",
      "state": "up",
      "stateLabel": "Działa",
      "since": "2026-10-01T08:12:00.000Z",
      "lastCheck": "2026-10-06T11:59:30.000Z",
      "uptime30": 99.97,
      "loadPercent": 41.2,
      "announcements": 1,
      "announcementLevel": "warning"
    }
  ],
  "announcements": [ { "id": 12, "level": "warning", "...": "..." } ],
  "lastEventId": 341
}`;

const SERVER_EXAMPLE = `{
  "updatedAt": "2026-10-06T12:00:00.000Z",
  "stale": false,
  "server": {
    "name": "IT-01",
    "state": "up",
    "uptime30": 99.97,
    "load": {
      "percent": 41.2,
      "ramUsed": 1769209037,
      "ramTotal": 4294967296,
      "measuredAt": "2026-10-06T11:59:00.000Z"
    },
    "days": [
      { "date": "2026-09-07", "uptime": 100, "downtimes": 0 },
      { "date": "2026-09-08", "uptime": 99.31, "downtimes": 1 }
    ],
    "...": "pola jak w /servers"
  },
  "announcements": [],
  "upcoming": [],
  "incidents": [
    { "id": "a1b2", "start": "2026-09-08T03:10:00.000Z", "end": "2026-09-08T03:20:00.000Z",
      "duration": 600, "ongoing": false, "maintenance": false }
  ]
}`;

const ANNOUNCEMENT_EXAMPLE = `{
  "id": 12,
  "level": "warning",
  "levelLabel": "Ostrzeżenie",
  "severity": 2,
  "title": "Problemy u dostawcy",
  "message": "Dostawca usług ma awarię sieci. Możliwe przerwy.",
  "servers": ["IT-01"],
  "general": false,
  "startsAt": null,
  "endsAt": "2026-10-06T18:00:00.000Z",
  "createdAt": "2026-10-06T11:40:00.000Z",
  "updatedAt": "2026-10-06T11:52:00.000Z"
}`;

const EVENT_EXAMPLES = `// announcement.created: nowe ogłoszenie (albo zaplanowane właśnie się zaczęło)
{
  "id": 340,
  "type": "announcement.created",
  "at": "2026-10-06T11:40:02.000Z",
  "servers": ["IT-01"],
  "general": false,
  "announcement": { "id": 12, "level": "warning", "title": "Problemy u dostawcy", "...": "..." }
}

// announcement.updated: edycja; changes mówi, co się zmieniło
{
  "id": 341,
  "type": "announcement.updated",
  "at": "2026-10-06T11:52:10.000Z",
  "servers": ["IT-01"],
  "general": false,
  "announcement": { "id": 12, "level": "critical", "...": "..." },
  "changes": {
    "level": { "from": "warning", "to": "critical", "escalated": true },
    "message": { "from": "Możliwe przerwy.", "to": "Serwer jest niedostępny." }
  }
}

// announcement.resolved: ogłoszenie wyłączone, usunięte albo minął jego termin
{
  "id": 342,
  "type": "announcement.resolved",
  "at": "2026-10-06T13:05:00.000Z",
  "servers": ["IT-01"],
  "general": false,
  "reason": "disabled",
  "announcement": { "id": 12, "level": "critical", "title": "Problemy u dostawcy", "...": "..." }
}

// server.state_changed: zmiana stanu według monitoringu
{
  "id": 343,
  "type": "server.state_changed",
  "at": "2026-10-06T13:20:31.000Z",
  "servers": ["IT-01"],
  "general": false,
  "server": {
    "name": "IT-01", "region": "Włochy",
    "from": "up", "to": "down",
    "fromLabel": "Działa", "toLabel": "Offline",
    "since": "2026-10-06T13:19:58.000Z"
  }
}`;

const POLL_EXAMPLE = `# pierwsze zapytanie: ostatnie zdarzenia i lastId
curl "${BASE}/events?server=IT-01"

# każde kolejne: tylko to, co doszło po lastId
curl "${BASE}/events?server=IT-01&since=343"`;

const PYTHON_BOT = `# Bot bez bibliotek do Discorda: sprawdza zdarzenia co 20 s i wysyła je na webhook.
# pip install requests
import time
import requests

API = "${BASE}/events"
SERVER = "IT-01"                      # nazwa serwera z /api/status
WEBHOOK = "https://discord.com/api/webhooks/..."  # Ustawienia kanału > Integracje > Webhooki

COLORS = {"info": 0x60A5FA, "warning": 0xFACC15, "critical": 0xF87171}
since = None

def describe(event):
    if event["type"] == "server.state_changed":
        s = event["server"]
        return f"{s['name']}: {s['fromLabel']} → {s['toLabel']}", 0xF87171 if s["to"] == "down" else 0x23A55A
    a = event["announcement"]
    title = a.get("title") or "Ogłoszenie"
    if event["type"] == "announcement.created":
        return f"[{a['levelLabel']}] {title}\\n{a['message']}", COLORS[a["level"]]
    if event["type"] == "announcement.updated":
        level = event["changes"].get("level")
        note = f" (poziom: {level['from']} → {level['to']})" if level else ""
        return f"Zmiana{note}: {title}\\n{a['message']}", COLORS[a["level"]]
    return f"Zakończone: {title}", 0x23A55A

while True:
    try:
        params = {"server": SERVER}
        if since is not None:
            params["since"] = since
        r = requests.get(API, params=params, timeout=10)
        if r.status_code == 429:
            time.sleep(int(r.headers.get("Retry-After", 60)))
            continue
        data = r.json()
        # Przy pierwszym uruchomieniu tylko zapamiętaj pozycję, bez wysyłania starych zdarzeń.
        if since is not None:
            for event in data["events"]:
                text, color = describe(event)
                requests.post(WEBHOOK, json={"embeds": [{"description": text, "color": color}]}, timeout=10)
        since = data["lastId"]
    except requests.RequestException as error:
        print("Błąd połączenia:", error)
    time.sleep(20)`;

const NODE_BOT = `// Node.js 20+: to samo, z fetch. Uruchom: node bot.mjs
const API = '${BASE}/events';
const SERVER = 'IT-01';
const WEBHOOK = 'https://discord.com/api/webhooks/...';

let since = null;

async function tick() {
  const url = new URL(API);
  url.searchParams.set('server', SERVER);
  if (since !== null) url.searchParams.set('since', since);

  const response = await fetch(url);
  if (!response.ok) return console.warn('API Status:', response.status);
  const data = await response.json();

  if (since !== null) {
    for (const event of data.events) {
      const content = event.type === 'server.state_changed'
        ? \`\${event.server.name}: \${event.server.fromLabel} → \${event.server.toLabel}\`
        : \`\${event.type}: [\${event.announcement.levelLabel ?? ''}] \${event.announcement.title ?? ''}\\n\${event.announcement.message ?? ''}\`;
      await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    }
  }
  since = data.lastId;
}

setInterval(() => tick().catch(console.error), 20_000);
tick().catch(console.error);`;

const SSE_EXAMPLE = `// W przeglądarce (albo Node.js z paczką "eventsource").
const source = new EventSource('${BASE}/stream?server=IT-01');

source.addEventListener('ready', e => console.log('Połączono', JSON.parse(e.data)));

source.addEventListener('announcement.created', e => {
  const { announcement } = JSON.parse(e.data);
  console.log('Nowe ogłoszenie:', announcement.levelLabel, announcement.message);
});
source.addEventListener('announcement.updated', e => {
  const { announcement, changes } = JSON.parse(e.data);
  if (changes.level?.escalated) console.log('Poziom w górę:', changes.level.to);
});
source.addEventListener('announcement.resolved', e => console.log('Zakończone', JSON.parse(e.data)));
source.addEventListener('server.state_changed', e => {
  const { server } = JSON.parse(e.data);
  console.log(\`\${server.name}: \${server.from} → \${server.to}\`);
});
// Po zerwaniu EventSource łączy się sam i wysyła Last-Event-ID,
// więc zdarzenia z przerwy dochodzą automatycznie.`;

const SSE_RAW = `retry: 10000

event: ready
data: {"server":"IT-01","includeGeneral":true,"types":[...],"lastEventId":343}

id: 344
event: announcement.created
data: {"id":344,"type":"announcement.created","servers":["IT-01"],...}

: ping`;

/** Nazwy serwerów do dokumentacji; brak monitoringu nie psuje strony. */
async function serverNames(): Promise<string[]> {
    if (!isConfigured()) return [];
    try {
        return sortMonitors((await getServers()).servers).map(s => s.name);
    } catch {
        return [];
    }
}

function Endpoint({ path }: { path: string }) {
    return (
        <p className={styles.endpointLine}>
            <span className={styles.method}>GET</span>
            <code>{path}</code>
        </p>
    );
}

export default async function StatusApiDocsPage() {
    const servers = await serverNames();
    const example = servers[0] ?? 'IT-01';

    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">API Status</h1>
                <p className="lead">
                    Stan serwerów z <Link href="/status">/status</Link> w formacie JSON: ogłoszenia, zmiany stanu, dostępność z ostatnich 30 dni
                    i obciążenie. Bez kluczy i rejestracji. Ustaw bota na swój serwer, a dostaniesz powiadomienie, gdy pojawi się ogłoszenie albo
                    serwer przestanie działać.
                </p>
                <Endpoint path={BASE} />
            </header>

            <DocsLayout toc={TOC} tocLabel="Na tej stronie">
                <h2 id="start">Jak to działa</h2>
                <ol>
                    <li>Wybierasz serwer z listy niżej, na przykład <code>{example}</code>.</li>
                    <li>
                        Bot pyta co kilkanaście sekund o nowe zdarzenia (<a href="#polling"><code>/events</code></a>) albo trzyma otwarte połączenie
                        (<a href="#stream"><code>/stream</code></a>).
                    </li>
                    <li>
                        Gdy dodam ogłoszenie dla tego serwera (np. „problemy po stronie dostawcy usług”), zmienię jego treść lub poziom, zakończę je
                        albo monitoring wykryje awarię, bot dostaje zdarzenie i wysyła powiadomienie, gdzie chcesz.
                    </li>
                </ol>
                <p>
                    Ogłoszenie może dotyczyć konkretnych serwerów albo być <strong>ogólne</strong>, czyli dla wszystkich. Bot obserwujący{' '}
                    <code>{example}</code> dostaje oba rodzaje, chyba że doda <code>general=0</code>.
                </p>

                <h2 id="zasady">Adres i zasady</h2>
                <ul>
                    <li>Wszystkie endpointy zaczynają się od <code>{BASE}</code> i przyjmują tylko <code>GET</code>.</li>
                    <li>Bez klucza API, bez logowania, bez nagłówków. Działa z każdej domeny (CORS: <code>Access-Control-Allow-Origin: *</code>).</li>
                    <li>Odpowiedzi to JSON w UTF-8. Daty są w formacie ISO 8601 w UTC, czasy trwania w sekundach.</li>
                    <li>Dane z monitoringu odświeżają się co minutę, dzienna dostępność co 10 minut. Częstsze pytanie nie da nowszych danych.</li>
                    <li>
                        Pole <code>stale: true</code> znaczy, że monitoring chwilowo nie odpowiada i widzisz ostatnie zapisane dane.
                    </li>
                </ul>

                <h2 id="limity">Limity</h2>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Co jest liczone</th>
                                <th scope="col">Limit</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Żądania z jednego adresu IP (wszystkie endpointy razem)</td><td>60 na minutę</td></tr>
                            <tr><td>Otwarte strumienie <code>/stream</code> z jednego adresu IP</td><td>3 naraz</td></tr>
                            <tr><td>Historia zdarzeń w <code>/events</code></td><td>30 dni</td></tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    Po przekroczeniu limitu serwer zwraca <code>429</code>. Każda odpowiedź ma nagłówki <code>RateLimit-Remaining</code> (ile
                    zostało) i <code>RateLimit-Reset</code> (za ile sekund licznik się wyzeruje). Bot, który pyta co 15–30 sekund, mieści się z dużym zapasem.
                </p>

                <h2 id="serwery-nazwy">Nazwy serwerów</h2>
                <p>
                    Serwer wskazujesz jego nazwą. Wielkość liter nie ma znaczenia. Nieznana nazwa daje <code>404</code> z listą prawidłowych, żeby
                    literówka w konfiguracji bota nie kończyła się ciszą.
                </p>
                {servers.length > 0 ? (
                    <p>
                        Teraz w monitoringu:{' '}
                        {servers.map((name, i) => (
                            <span key={name}>
                                {i > 0 && ', '}
                                <code>{name}</code>
                            </span>
                        ))}
                        . Aktualna lista zawsze pod <code>/servers</code>.
                    </p>
                ) : (
                    <p>Aktualna lista jest pod <code>/servers</code>.</p>
                )}

                <h2 id="endpointy">Lista endpointów</h2>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Ścieżka</th>
                                <th scope="col">Co zwraca</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>/</code></td><td>Stan ogólny, serwery i aktywne ogłoszenia</td></tr>
                            <tr><td><code>/servers</code></td><td>Lista serwerów ze stanem i dostępnością</td></tr>
                            <tr><td><code>/servers/{'{name}'}</code></td><td>Jeden serwer: stan, obciążenie, 30 dni, ogłoszenia, przerwy</td></tr>
                            <tr><td><code>/servers/{'{name}'}/uptime</code></td><td>Dostępność z 30 dni, dzień po dniu</td></tr>
                            <tr><td><code>/servers/{'{name}'}/load</code></td><td>Obciążenie (zajęta pamięć RAM)</td></tr>
                            <tr><td><code>/servers/{'{name}'}/badge.svg</code></td><td>Znaczek SVG ze stanem</td></tr>
                            <tr><td><code>/announcements</code></td><td>Aktywne i zaplanowane ogłoszenia</td></tr>
                            <tr><td><code>/incidents</code></td><td>Ostatnie przerwy</td></tr>
                            <tr><td><code>/events</code></td><td>Zdarzenia od podanego id (do sprawdzania co chwilę)</td></tr>
                            <tr><td><code>/stream</code></td><td>Zdarzenia na żywo (Server-Sent Events)</td></tr>
                        </tbody>
                    </table>
                </div>

                <h2 id="stan">Stan ogólny</h2>
                <Endpoint path="/api/v1/status" />
                <p>Jedno zapytanie na pierwszy rzut oka: czy wszystko działa, lista serwerów i ogłoszenia.</p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Pole</th>
                                <th scope="col">Wartości</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>status</code></td>
                                <td>
                                    <code>operational</code> wszystko działa, <code>partial_outage</code> część serwerów offline, <code>major_outage</code>{' '}
                                    wszystkie offline, <code>maintenance</code> prace techniczne, <code>unknown</code> brak danych z monitoringu
                                </td>
                            </tr>
                            <tr>
                                <td><code>monitoring</code></td>
                                <td><code>ok</code>, <code>stale</code> (stare dane), <code>unavailable</code>, <code>not_configured</code></td>
                            </tr>
                            <tr><td><code>lastEventId</code></td><td>Id najnowszego zdarzenia, dobry punkt startu dla <code>/events</code></td></tr>
                        </tbody>
                    </table>
                </div>
                <p>Status liczy się tylko ze stanu serwerów. Ogłoszenia są obok, w <code>announcements</code>.</p>
                <CodeBlock label="Odpowiedź" code={STATUS_EXAMPLE} />

                <h2 id="serwery">Serwery</h2>
                <Endpoint path="/api/v1/status/servers" />
                <p>Każdy serwer na liście ma pola:</p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Pole</th>
                                <th scope="col">Co zawiera</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>name</code>, <code>region</code></td><td>Nazwa (np. <code>{example}</code>) i kraj serwera</td></tr>
                            <tr>
                                <td><code>state</code></td>
                                <td><code>up</code> działa, <code>down</code> offline, <code>maintenance</code> prace techniczne, <code>paused</code> wstrzymany</td>
                            </tr>
                            <tr><td><code>since</code></td><td>Od kiedy trwa obecny stan</td></tr>
                            <tr><td><code>lastCheck</code></td><td>Ostatni sygnał z serwera</td></tr>
                            <tr><td><code>uptime30</code></td><td>Dostępność z 30 dni w procentach albo <code>null</code></td></tr>
                            <tr><td><code>loadPercent</code></td><td>Zajęta pamięć RAM w procentach albo <code>null</code>, gdy serwer nie ma agenta</td></tr>
                            <tr>
                                <td><code>announcements</code>, <code>announcementLevel</code></td>
                                <td>Ile aktywnych ogłoszeń dotyczy serwera (razem z ogólnymi) i najwyższy ich poziom</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <Endpoint path="/api/v1/status/servers/{name}" />
                <p>
                    Wszystko o jednym serwerze: pola jak wyżej, <code>load</code> z bajtami pamięci, <code>days</code> z dostępnością z każdego z 30 dni,
                    ogłoszenia (<code>announcements</code> trwające, <code>upcoming</code> zaplanowane) i ostatnie przerwy.
                </p>
                <CodeBlock label="Odpowiedź" code={SERVER_EXAMPLE} />
                <p>Gdy potrzebujesz tylko części, są krótsze wersje:</p>
                <Endpoint path="/api/v1/status/servers/{name}/uptime" />
                <p>
                    <code>{'{ server, uptime30, days: [{ date, uptime, downtimes }] }'}</code>. Data <code>date</code> to dzień według czasu
                    polskiego (RRRR-MM-DD), od najstarszego. Nowy serwer może mieć mniej niż 30 dni.
                </p>
                <Endpoint path="/api/v1/status/servers/{name}/load" />
                <p>
                    <code>{'{ server, load: { percent, ramUsed, ramTotal, measuredAt } }'}</code>. Pamięć w bajtach. <code>load</code> jest{' '}
                    <code>null</code>, gdy serwer nie wysyła metryk.
                </p>

                <h2 id="ogloszenia">Ogłoszenia</h2>
                <Endpoint path="/api/v1/status/announcements?server={name}" />
                <p>
                    Zwraca <code>announcements</code> (widoczne teraz na /status) i <code>upcoming</code> (zaplanowane, np. prace techniczne z datą
                    początku). Bez <code>server</code> dostajesz wszystkie.
                </p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Parametr</th>
                                <th scope="col">Działanie</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>server</code></td><td>Tylko ogłoszenia dla tego serwera i ogólne</td></tr>
                            <tr><td><code>general=0</code></td><td>Bez ogłoszeń ogólnych, tylko przypisane do serwera</td></tr>
                        </tbody>
                    </table>
                </div>
                <p>Ogłoszenie wygląda tak:</p>
                <CodeBlock label="Ogłoszenie" code={ANNOUNCEMENT_EXAMPLE} />
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">level</th>
                                <th scope="col">severity</th>
                                <th scope="col">Znaczenie</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>info</code></td><td>1</td><td>Informacja, np. zaplanowane prace</td></tr>
                            <tr><td><code>warning</code></td><td>2</td><td>Ostrzeżenie, np. możliwe przerwy, problemy u dostawcy</td></tr>
                            <tr><td><code>critical</code></td><td>3</td><td>Ważne, np. serwer nie działa</td></tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    <code>servers</code> to lista serwerów, których dotyczy ogłoszenie. Pusta lista i <code>general: true</code> oznaczają ogłoszenie
                    ogólne. <code>title</code> bywa <code>null</code>, <code>message</code> jest zawsze.
                </p>

                <h2 id="przerwy">Przerwy</h2>
                <Endpoint path="/api/v1/status/incidents?server={name}" />
                <p>
                    Ostatnie przerwy wykryte przez monitoring, od najnowszej: <code>server</code>, <code>start</code>, <code>end</code> (<code>null</code>,
                    gdy trwa), <code>duration</code> w sekundach, <code>ongoing</code> i <code>maintenance</code> (zaplanowane prace).
                </p>

                <h2 id="zdarzenia">Zdarzenia</h2>
                <p>Zdarzenie to coś, o czym bot powinien powiadomić. Są cztery typy:</p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">type</th>
                                <th scope="col">Kiedy</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>announcement.created</code></td><td>Nowe ogłoszenie albo zaplanowane właśnie się zaczęło</td></tr>
                            <tr>
                                <td><code>announcement.updated</code></td>
                                <td>
                                    Zmiana treści, tytułu, poziomu, serwerów albo terminu. <code>changes</code> zawiera tylko zmienione pola w postaci{' '}
                                    <code>{'{ from, to }'}</code>; przy poziomie dochodzi <code>escalated</code> (<code>true</code>, gdy poziom wzrósł)
                                </td>
                            </tr>
                            <tr>
                                <td><code>announcement.resolved</code></td>
                                <td>
                                    Ogłoszenie zniknęło z /status. <code>reason</code>: <code>disabled</code> wyłączone, <code>ended</code> minął termin,{' '}
                                    <code>deleted</code> usunięte, <code>moved</code> przeniesione poza status
                                </td>
                            </tr>
                            <tr><td><code>server.state_changed</code></td><td>Monitoring wykrył zmianę stanu serwera (np. <code>up</code> → <code>down</code>)</td></tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    Każde zdarzenie ma <code>id</code> (rośnie z każdym zdarzeniem), <code>type</code>, <code>at</code>, <code>servers</code> i{' '}
                    <code>general</code>. Przy edycji, która zmienia listę serwerów, zdarzenie trafia do serwerów z obu wersji, więc bot usuniętego
                    serwera też się o tym dowie.
                </p>
                <CodeBlock label="Przykłady zdarzeń" code={EVENT_EXAMPLES} />
                <p>
                    Filtry działają tak samo w <code>/events</code> i <code>/stream</code>:
                </p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Parametr</th>
                                <th scope="col">Działanie</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>server</code></td><td>Tylko zdarzenia tego serwera i ogólne</td></tr>
                            <tr><td><code>general=0</code></td><td>Bez ogólnych ogłoszeń</td></tr>
                            <tr>
                                <td><code>types</code></td>
                                <td>
                                    Lista po przecinku, np. <code>announcement.created,server.state_changed</code>. Samo <code>announcement</code> albo{' '}
                                    <code>server</code> wybiera całą grupę
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h2 id="polling">Sprawdzanie co chwilę</h2>
                <Endpoint path="/api/v1/status/events?server={name}&since={id}" />
                <p>
                    Najprostszy sposób dla bota. Pierwsze zapytanie bez <code>since</code> zwraca ostatnie zdarzenia i <code>lastId</code>. Każde
                    kolejne wysyłasz z <code>since=lastId</code> i dostajesz tylko nowe, od najstarszego.
                </p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Pole odpowiedzi</th>
                                <th scope="col">Co znaczy</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>events</code></td><td>Zdarzenia (najwyżej <code>limit</code>, domyślnie 50, maks. 100)</td></tr>
                            <tr><td><code>lastId</code></td><td>Wyślij jako <code>since</code> w następnym zapytaniu. Zapisz go, żeby po restarcie bota nic nie zginęło</td></tr>
                            <tr><td><code>hasMore</code></td><td><code>true</code>: zapytaj od razu jeszcze raz, są kolejne zdarzenia</td></tr>
                        </tbody>
                    </table>
                </div>
                <CodeBlock label="Terminal" code={POLL_EXAMPLE} />

                <h2 id="stream">Na żywo (SSE)</h2>
                <Endpoint path="/api/v1/status/stream?server={name}" />
                <p>
                    Zamiast pytać co chwilę możesz trzymać otwarte połączenie <a href="https://developer.mozilla.org/docs/Web/API/Server-sent_events" target="_blank" rel="noreferrer">Server-Sent Events</a>.
                    Zdarzenie przychodzi w tej samej sekundzie, w której powstało. Nazwa zdarzenia SSE to jego <code>type</code>, a <code>id</code> to
                    jego id.
                </p>
                <ul>
                    <li>Na początku przychodzi <code>ready</code> z ustawionymi filtrami i <code>lastEventId</code>.</li>
                    <li>Co 25 sekund serwer wysyła komentarz <code>: ping</code>, żeby proxy nie zamknęło połączenia.</li>
                    <li>
                        Po zerwaniu połączenia wyślij nagłówek <code>Last-Event-ID</code> (EventSource robi to sam) albo parametr <code>since</code>,
                        a dostaniesz zdarzenia z przerwy (do 100).
                    </li>
                    <li>Z jednego adresu IP mogą być otwarte najwyżej 3 strumienie naraz.</li>
                </ul>
                <CodeBlock label="Tak wygląda strumień" code={SSE_RAW} />
                <CodeBlock label="JavaScript" code={SSE_EXAMPLE} />

                <h2 id="przyklady">Przykłady botów</h2>
                <p>
                    Oba wysyłają powiadomienia na <a href="https://support.discord.com/hc/pl/articles/228383668" target="_blank" rel="noreferrer">webhook
                    Discorda</a>, więc nie potrzebujesz konta bota. Zamień <code>IT-01</code> na swój serwer i wklej adres webhooka.
                </p>
                <h3>Python</h3>
                <CodeBlock label="Python" code={PYTHON_BOT} />
                <h3>Node.js</h3>
                <CodeBlock label="JavaScript" code={NODE_BOT} />

                <h2 id="znaczek">Znaczek SVG</h2>
                <Endpoint path="/api/v1/status/servers/{name}/badge.svg" />
                <p>Obrazek z nazwą i stanem serwera, do README albo na stronę. Odświeża się co minutę.</p>
                <CodeBlock label="Markdown" code={`![${example}](${BASE}/servers/${encodeURIComponent(example)}/badge.svg)`} />

                <h2 id="bledy">Błędy</h2>
                <p>
                    Błąd to JSON z polami <code>error</code> (stały kod do sprawdzania w kodzie) i <code>message</code> (opis po polsku).
                </p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Kod</th>
                                <th scope="col">error</th>
                                <th scope="col">Kiedy</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>400</code></td><td><code>invalid_parameter</code></td><td>Zły <code>since</code>, <code>limit</code> albo <code>types</code></td></tr>
                            <tr><td><code>404</code></td><td><code>server_not_found</code></td><td>Nie ma takiego serwera; pole <code>servers</code> zawiera prawidłowe nazwy</td></tr>
                            <tr><td><code>429</code></td><td><code>rate_limited</code></td><td>Ponad 60 żądań na minutę z adresu IP</td></tr>
                            <tr><td><code>429</code></td><td><code>too_many_streams</code></td><td>Więcej niż 3 otwarte strumienie z adresu IP</td></tr>
                            <tr><td><code>503</code></td><td><code>monitoring_unavailable</code></td><td>Monitoring nie odpowiada i nie ma zapisanych danych</td></tr>
                            <tr><td><code>500</code></td><td><code>server_error</code></td><td>Błąd po stronie serwera</td></tr>
                        </tbody>
                    </table>
                </div>

                <h2 id="test">Test na żywo</h2>
                <p>Wybierz endpoint i wyślij prawdziwe żądanie. Zapytania z testu liczą się do limitu jak każde inne.</p>
                <StatusTester servers={servers} />

                <h2 id="faq">Pytania</h2>
                <div className={styles.faq}>
                    <details>
                        <summary>Potrzebuję klucza API?</summary>
                        <p>Nie. API Status jest publiczne. Klucz jest potrzebny tylko do <Link href="/api">API formularza</Link>.</p>
                    </details>
                    <details>
                        <summary>Co wybrać: /events czy /stream?</summary>
                        <p>
                            <code>/events</code> co 15–30 sekund jest najprostsze i działa wszędzie, także w skryptach uruchamianych z crona.{' '}
                            <code>/stream</code> daje powiadomienie od razu, ale wymaga programu, który działa cały czas.
                        </p>
                    </details>
                    <details>
                        <summary>Bot się zrestartował. Stracę zdarzenia?</summary>
                        <p>
                            Nie, jeśli zapiszesz ostatnie <code>lastId</code> (albo id ostatniego zdarzenia ze strumienia) i po restarcie podasz je jako{' '}
                            <code>since</code>. Zdarzenia są trzymane 30 dni.
                        </p>
                    </details>
                    <details>
                        <summary>Jak szybko dowiem się o awarii serwera?</summary>
                        <p>
                            Stan z monitoringu odświeża się co minutę, a serwer porównuje go co 30 sekund, więc <code>server.state_changed</code>{' '}
                            pojawia się chwilę po tym, jak awarię wykryje monitoring. Ogłoszenia z panelu trafiają do API od razu po zapisaniu.
                        </p>
                    </details>
                    <details>
                        <summary>Dlaczego dostaję ogłoszenia, które nie dotyczą mojego serwera?</summary>
                        <p>
                            To ogłoszenia ogólne, dla wszystkich serwerów (<code>general: true</code>). Dodaj <code>general=0</code>, jeśli ich nie chcesz.
                        </p>
                    </details>
                </div>
            </DocsLayout>
        </div>
    );
}
