/**
 * Krótki opis błędu do logów. console.error(error) przy DOMException (np. TimeoutError
 * z AbortSignal.timeout w fetch) wypisuje stos i ~25 stałych (ABORT_ERR, TIMEOUT_ERR...),
 * przez co w pm2 nie widać, skąd przyszedł. Tu zostaje jedna linia z nazwą i przyczyną.
 */
export function describeError(error: unknown): string {
    if (error instanceof Error || (typeof DOMException !== 'undefined' && error instanceof DOMException)) {
        const { name, message } = error as Error;
        if (name === 'TimeoutError') return 'przekroczony czas odpowiedzi';
        if (name === 'AbortError') return 'zapytanie przerwane';
        // fetch() owija błąd sieci (DNS, odrzucone połączenie) w TypeError z przyczyną w cause.
        const cause = (error as Error & { cause?: unknown }).cause;
        if (message === 'fetch failed' && cause) return `brak połączenia (${describeError(cause)})`;
        const code = (error as Error & { code?: string }).code;
        return `${name === 'Error' ? '' : `${name}: `}${message}${code && !message.includes(code) ? ` [${code}]` : ''}`;
    }
    return String(error);
}
