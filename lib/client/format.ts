const timeFmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** "dziś 14:05", "wczoraj 09:12", "3 dni temu", potem zwykła data. */
export function formatDate(value: string | Date | null | undefined): string {
    const date = toDate(value);
    if (!date) return 'brak daty';
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
    if (days === 0) return `dziś ${timeFmt.format(date)}`;
    if (days === 1) return `wczoraj ${timeFmt.format(date)}`;
    if (days > 1 && days < 7) return `${days} dni temu`;
    return dateFmt.format(date);
}

export function formatFullDate(value: string | Date | null | undefined): string {
    const date = toDate(value);
    return date ? fullFmt.format(date) : 'brak daty';
}

/** Ile zostało do wygaśnięcia: "za 12 min", "za 5 godz.", "za 3 dni". */
export function formatExpiry(value: string | Date | null | undefined): string {
    const date = toDate(value);
    if (!date) return 'bez terminu';
    const ms = date.getTime() - Date.now();
    if (ms <= 0) return 'wygasło';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (minutes < 60) return `wygasa za ${minutes} min`;
    if (hours < 24) return `wygasa za ${hours} godz.`;
    if (days < 7) return `wygasa za ${days} ${days === 1 ? 'dzień' : 'dni'}`;
    return `wygasa ${dateFmt.format(date)}`;
}

export function isExpired(value: string | Date | null | undefined): boolean {
    const date = toDate(value);
    return !!date && date.getTime() < Date.now();
}

export function formatFileSize(bytes: number | string | null | undefined): string {
    const value = Number(bytes);
    if (!value) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
    return `${parseFloat((value / 1024 ** i).toFixed(1))} ${units[i]}`.replace('.', ',');
}

/** Polska odmiana: 1 wiadomość, 2 wiadomości, 5 wiadomości. */
export function plural(n: number, one: string, few: string, many: string): string {
    if (n === 1) return one;
    const lastTwo = n % 100;
    const last = n % 10;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
    return many;
}

/** Wartość dla <input type="datetime-local"> w czasie lokalnym. */
export function toDateTimeLocal(value: string | Date | null | undefined): string {
    const date = toDate(value);
    if (!date) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
