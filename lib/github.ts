// Liczby z profilu github.com/Wojtoteka: repozytoria, języki i kalendarz kontrybucji.
// Pobierane po stronie serwera, Next.js trzyma odpowiedź godzinę (revalidate),
// więc to najwyżej kilka zapytań na godzinę bez względu na ruch. Darmowe API
// GitHuba bez klucza pozwala na 60 zapytań na godzinę.
// Kalendarz nie ma publicznego API, więc jest czytany z tej samej strony HTML,
// z której GitHub rysuje go na profilu. Gdy GitHub nie odpowie albo zmieni
// HTML, zostają liczby z SNAPSHOT (stan z 4 października 2026).

const USER = 'Wojtoteka';
const REVALIDATE = 3600;
const TIMEOUT = 4000;

export interface ContributionDay {
    date: string;
    /** 0-4, ten sam poziom koloru co na GitHubie. */
    level: number;
    count: number;
}

export interface GithubStats {
    repos: number;
    since: number;
    /** Języki według liczby repozytoriów, od najczęstszego. */
    languages: { name: string; repos: number }[];
    contributions: number;
    activeDays: number;
    bestDay: { date: string; count: number } | null;
    longestStreak: number;
    /** Ostatni rok, dzień po dniu, od najstarszego. Pusty, gdy kalendarz się nie wczytał. */
    days: ContributionDay[];
}

const SNAPSHOT: GithubStats = {
    repos: 20,
    since: 2023,
    languages: [
        { name: 'TypeScript', repos: 6 },
        { name: 'JavaScript', repos: 6 },
        { name: 'Kotlin', repos: 2 },
        { name: 'HTML', repos: 2 },
        { name: 'GDScript', repos: 1 },
        { name: 'CSS', repos: 1 },
        { name: 'Python', repos: 1 }
    ],
    contributions: 766,
    activeDays: 54,
    bestDay: { date: '2026-08-09', count: 63 },
    longestStreak: 36,
    days: []
};

async function get(url: string, accept: string): Promise<Response> {
    const response = await fetch(url, {
        headers: { Accept: accept, 'User-Agent': 'wojtoteka.ovh' },
        next: { revalidate: REVALIDATE },
        signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!response.ok) throw new Error(`GitHub ${response.status}: ${url}`);
    return response;
}

interface ApiUser {
    public_repos: number;
    created_at: string;
}

interface ApiRepo {
    language: string | null;
    fork: boolean;
}

async function loadProfile(): Promise<Pick<GithubStats, 'repos' | 'since' | 'languages'>> {
    const [user, repos] = await Promise.all([
        get(`https://api.github.com/users/${USER}`, 'application/vnd.github+json').then(r => r.json() as Promise<ApiUser>),
        get(`https://api.github.com/users/${USER}/repos?per_page=100`, 'application/vnd.github+json').then(r => r.json() as Promise<ApiRepo[]>)
    ]);

    const counts = new Map<string, number>();
    for (const repo of repos) {
        if (repo.fork || !repo.language) continue;
        counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
    }
    const languages = [...counts].map(([name, n]) => ({ name, repos: n })).sort((a, b) => b.repos - a.repos);

    return { repos: user.public_repos, since: new Date(user.created_at).getUTCFullYear(), languages };
}

// Każdy dzień to <td data-date data-level id>, a liczba jest w <tool-tip for="id">,
// np. "9 contributions on August 2nd." albo "No contributions on October 5th.".
async function loadCalendar(): Promise<Pick<GithubStats, 'contributions' | 'activeDays' | 'bestDay' | 'longestStreak' | 'days'>> {
    const html = await (await get(`https://github.com/users/${USER}/contributions`, 'text/html')).text();

    const counts = new Map<string, number>();
    for (const match of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>\s*(No|\d+) contributions?/g)) {
        counts.set(match[1], match[2] === 'No' ? 0 : Number(match[2]));
    }

    const days: ContributionDay[] = [];
    for (const match of html.matchAll(/<td\b[^>]*\bdata-date="[^"]+"[^>]*>/g)) {
        const tag = match[0];
        const date = /data-date="([^"]+)"/.exec(tag)?.[1];
        const level = Number(/data-level="(\d)"/.exec(tag)?.[1] ?? 0);
        const id = /\bid="([^"]+)"/.exec(tag)?.[1];
        if (date) days.push({ date, level, count: (id && counts.get(id)) || 0 });
    }
    if (days.length < 300) throw new Error('GitHub: nie udało się odczytać kalendarza');
    days.sort((a, b) => a.date.localeCompare(b.date));

    let contributions = 0;
    let activeDays = 0;
    let bestDay: GithubStats['bestDay'] = null;
    let streak = 0;
    let longestStreak = 0;
    for (const day of days) {
        contributions += day.count;
        if (day.count > 0) {
            activeDays++;
            streak++;
            longestStreak = Math.max(longestStreak, streak);
            if (!bestDay || day.count > bestDay.count) bestDay = { date: day.date, count: day.count };
        } else {
            streak = 0;
        }
    }

    return { contributions, activeDays, bestDay, longestStreak, days };
}

export async function getGithubStats(): Promise<GithubStats> {
    const [profile, calendar] = await Promise.allSettled([loadProfile(), loadCalendar()]);
    if (profile.status === 'rejected') console.error('[GitHub] profil:', profile.reason);
    if (calendar.status === 'rejected') console.error('[GitHub] kalendarz:', calendar.reason);

    return {
        ...SNAPSHOT,
        ...(profile.status === 'fulfilled' ? profile.value : {}),
        ...(calendar.status === 'fulfilled' ? calendar.value : {})
    };
}
