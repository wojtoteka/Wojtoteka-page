import { getDiscordProfile, imageSource } from '@/lib/discord';

// /discord/status: aktualny profil z Lanyarda, zawsze świeży (bez cache).
// /discord/<obrazek>: awatar, baner, dekoracja, odznaki i okładki pobierane
// przez serwer strony. Listę dozwolonych ścieżek trzyma imageSource().

export const dynamic = 'force-dynamic';

const YEAR = 365 * 86400;

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;

    if (path.length === 1 && path[0] === 'status') {
        const profile = await getDiscordProfile();
        return Response.json(
            { profile },
            { status: profile ? 200 : 502, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }
        );
    }

    const found = imageSource(path);
    if (!found) return new Response('Nie ma takiego obrazka.', { status: 404 });

    try {
        const response = await fetch(found.url, { next: { revalidate: Math.min(found.maxAge, 86400) }, signal: AbortSignal.timeout(5000) });
        const type = response.headers.get('content-type') || '';
        if (!response.ok || !type.startsWith('image/')) return new Response('Obrazek niedostępny.', { status: 502 });

        return new Response(await response.arrayBuffer(), {
            headers: {
                'Content-Type': type,
                'Cache-Control': `public, max-age=${found.maxAge}${found.maxAge >= YEAR ? ', immutable' : ''}`,
                'X-Content-Type-Options': 'nosniff'
            }
        });
    } catch {
        return new Response('Obrazek niedostępny.', { status: 502 });
    }
}
