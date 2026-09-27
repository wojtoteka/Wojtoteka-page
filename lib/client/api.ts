// Zapytania do API Expressa z przeglądarki. Dla zmian (POST/PUT/PATCH/DELETE)
// dokłada token CSRF; gdy token wygasł, pobiera nowy i ponawia raz.

let tokenPromise: Promise<string> | null = null;

export function getCsrfToken(force = false): Promise<string> {
    if (!tokenPromise || force) {
        tokenPromise = fetch('/api/csrf-token', { credentials: 'same-origin', cache: 'no-store' })
            .then(r => r.json())
            .then((data: { csrfToken?: string }) => data.csrfToken || '')
            .catch(() => {
                tokenPromise = null;
                return '';
            });
    }
    return tokenPromise;
}

export interface ApiResult<T> {
    ok: boolean;
    status: number;
    data: T & { message?: string };
}

export interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    json?: unknown;
    /** Po 401 przeglądarka przechodzi na tę stronę (np. logowanie panelu). */
    loginPath?: string;
}

export async function api<T = Record<string, unknown>>(url: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
    const method = options.method || 'GET';
    const mutating = method !== 'GET';

    const send = async (token: string) => {
        const headers: Record<string, string> = {};
        if (options.json !== undefined) headers['Content-Type'] = 'application/json';
        if (mutating) headers['X-CSRF-Token'] = token;
        return fetch(url, {
            method,
            headers,
            credentials: 'same-origin',
            cache: 'no-store',
            body: options.json !== undefined ? JSON.stringify(options.json) : undefined
        });
    };

    let response: Response;
    try {
        response = await send(mutating ? await getCsrfToken() : '');
        if (mutating && response.status === 403) {
            const peek = (await response.clone().json().catch(() => null)) as { message?: string } | null;
            if (/csrf/i.test(peek?.message || '')) response = await send(await getCsrfToken(true));
        }
    } catch {
        return { ok: false, status: 0, data: { message: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.' } as T & { message?: string } };
    }

    if (response.status === 401 && options.loginPath) {
        window.location.assign(`${options.loginPath}?wygasla=1`);
    }

    const data = (await response.json().catch(() => ({}))) as T & { message?: string };
    return { ok: response.ok, status: response.status, data };
}

/** Upload pliku z paskiem postępu (fetch nie raportuje postępu wysyłki). */
export async function uploadWithProgress(
    url: string,
    form: FormData,
    onProgress: (loaded: number, total: number) => void
): Promise<ApiResult<Record<string, unknown>>> {
    const token = await getCsrfToken();
    return new Promise(resolve => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', event => {
            if (event.lengthComputable) onProgress(event.loaded, event.total);
        });
        xhr.addEventListener('load', () => {
            let data: Record<string, unknown> = {};
            try {
                data = JSON.parse(xhr.responseText);
            } catch {
                data = { message: 'Serwer zwrócił niezrozumiałą odpowiedź.' };
            }
            resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
        });
        xhr.addEventListener('error', () => resolve({ ok: false, status: 0, data: { message: 'Połączenie przerwane podczas wysyłania.' } }));
        xhr.open('POST', url);
        xhr.setRequestHeader('X-CSRF-Token', token);
        xhr.send(form);
    });
}
