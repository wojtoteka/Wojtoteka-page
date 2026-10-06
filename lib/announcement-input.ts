/** Daty bez strefy: lokalny czas serwera, zgodny z NOW() w bazie. */
function parseDateTime(value: unknown): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
    const normalized = value.length === 16 ? `${value}:00` : value;
    const date = new Date(`${normalized}Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 19) !== normalized || Number(value.slice(0, 4)) < 1000) return null;
    return normalized.replace('T', ' ');
}

/** Nazwy serwerów z panelu (np. "IT-01"): bez duplikatów, przycięte, najwyżej 30. */
function serverNames(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const names: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string') continue;
        const name = item.trim().substring(0, 100);
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        names.push(name);
    }
    return names.slice(0, 30);
}

export function announcementInput(body: Record<string, unknown>): { ok: false; message: string } | { ok: true; params: (string | number | null)[] } {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const serverStatus = body.display_type === 'status';
    if (!title && !serverStatus) return { ok: false, message: 'Dodaj tytuł ogłoszenia.' };
    if (!message) return { ok: false, message: 'Dodaj treść ogłoszenia.' };
    if (!['info', 'warning', 'important'].includes(String(body.type))) return { ok: false, message: 'Nieprawidłowy typ ogłoszenia.' };
    if (!['banner', 'popup', 'status'].includes(String(body.display_type))) return { ok: false, message: 'Nieprawidłowy sposób wyświetlania.' };
    const pages = serverStatus ? ['status'] : Array.isArray(body.pages) ? body.pages.filter((p): p is string => typeof p === 'string' && p.length < 100) : [];
    if (pages.length === 0) return { ok: false, message: 'Zaznacz co najmniej jedną stronę.' };
    const startsAt = parseDateTime(body.starts_at);
    const endsAt = parseDateTime(body.ends_at);
    if (body.starts_at && !startsAt) return { ok: false, message: 'Podaj poprawną datę początku.' };
    if (body.ends_at && !endsAt) return { ok: false, message: 'Podaj poprawną datę końca.' };
    if (startsAt && endsAt && endsAt <= startsAt) return { ok: false, message: 'Data końca musi być późniejsza niż data początku.' };
    // Serwery dotyczą tylko ogłoszeń na /status; pusta lista to ogłoszenie ogólne.
    const servers = serverNames(serverStatus ? body.servers : []);
    if (JSON.stringify(servers).length > 1000) return { ok: false, message: 'Zaznaczono za dużo serwerów.' };
    return {
        ok: true,
        params: [title.substring(0, 255), message.substring(0, 2000), String(body.type), String(body.display_type),
            JSON.stringify(pages), body.is_active ? 1 : 0, parseInt(String(body.priority), 10) || 0, startsAt, endsAt, JSON.stringify(servers)]
    };
}
