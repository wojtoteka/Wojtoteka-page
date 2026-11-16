/*
  Szum w dzienniku od botów, który tylko straszy.

  Next.js przy każdym takim zapytaniu wypisuje pełny stos błędu, choć serwer
  odpowiada zwykłym 404/400 i nic się nie psuje:
  - POST z nieznanym nagłówkiem Next-Action („Failed to find Server Action",
    „Server Reference ID did not match the expected format") - skanery szukające
    dziur w akcjach serwera albo karta otwarta sprzed aktualizacji,
  - śmieciowy nagłówek Next-Router-State-Tree („router state header ... could
    not be parsed") - też wyłącznie boty, przeglądarka wysyła poprawny.

  Wyciszamy tylko te komunikaty, każdy inny idzie dalej jak zawsze. Raz na
  godzinę pada jedna linijka z liczbą wyciszonych (jeśli jakieś były).
*/

const NOISE = [
    'failed-to-find-server-action',
    'Failed to find Server Action',
    'The Server Reference ID did not match the expected format',
    'The router state header was sent but could not be parsed',
];

function text(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message;
    return '';
}

export function isBotNoise(args: unknown[]): boolean {
    return args.some(arg => {
        const message = text(arg);
        return message !== '' && NOISE.some(needle => message.includes(needle));
    });
}

let installed = false;
let silenced = 0;

export function installQuietLogs(): void {
    if (installed) return;
    installed = true;

    for (const level of ['warn', 'error'] as const) {
        const original = console[level].bind(console);
        console[level] = (...args: unknown[]) => {
            if (isBotNoise(args)) {
                silenced++;
                return;
            }
            original(...args);
        };
    }

    setInterval(() => {
        if (silenced === 0) return;
        console.info(`[BOTY] wyciszono ${silenced} śmieciowych zapytań do Next.js (nieznane akcje serwera, zły stan routera)`);
        silenced = 0;
    }, 60 * 60 * 1000).unref();
}
