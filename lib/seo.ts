import type { Metadata } from 'next';

export const SITE_URL = 'https://wojtoteka.ovh';
export const SITE_NAME = 'Wojtoteka';

/** Obrazki podglądu (1200 x 630) z public/img/og. Nowa nazwa pliku = Discord i Facebook pobiorą go od nowa. */
export type OgImage = 'home' | 'gry' | 'kontakt' | 'url' | 'royalcasinobot' | 'api' | 'status';

/**
 * Metadane podstrony: tytuł, opis, adres kanoniczny i podgląd przy wysyłaniu
 * linku (Discord, Messenger, X, Facebook). Next.js nie łączy openGraph z layoutu
 * z tym ze strony, więc każda strona dostaje komplet.
 */
export function pageMeta({
    title,
    description,
    path,
    image = 'home',
    absoluteTitle = false
}: {
    title: string;
    description: string;
    path: string;
    image?: OgImage;
    absoluteTitle?: boolean;
}): Metadata {
    const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
    const images = [{ url: `/img/og/${image}.png`, width: 1200, height: 630, alt: fullTitle }];
    return {
        title: absoluteTitle ? { absolute: title } : title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: 'website',
            locale: 'pl_PL',
            siteName: SITE_NAME,
            url: path,
            title: fullTitle,
            description,
            images
        },
        twitter: { card: 'summary_large_image', title: fullTitle, description, images }
    };
}
