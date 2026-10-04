import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, Schibsted_Grotesk } from 'next/font/google';
import './globals.css';

const shoulders = Big_Shoulders({
    subsets: ['latin', 'latin-ext'],
    axes: ['opsz'],
    variable: '--font-shoulders',
    display: 'swap',
    // Next.js nie ma gotowych metryk zastępczych dla tego kroju.
    adjustFontFallback: false
});

const schibsted = Schibsted_Grotesk({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-schibsted',
    display: 'swap'
});

export const metadata: Metadata = {
    metadataBase: new URL('https://wojtoteka.ovh'),
    title: {
        default: 'Wojtoteka',
        template: '%s | Wojtoteka'
    },
    description: 'Wojtoteka: strony internetowe, gry w przeglądarce, boty na Discorda i projekty na GitHubie.',
    authors: [{ name: 'Wojtoteka', url: 'https://wojtoteka.ovh/' }],
    icons: { icon: '/img/logo.png', apple: '/img/logo.png' },
    openGraph: {
        type: 'website',
        locale: 'pl_PL',
        siteName: 'Wojtoteka',
        images: [{ url: '/img/og/home.png', width: 1200, height: 630, alt: 'Wojtoteka' }]
    },
    twitter: { card: 'summary_large_image', images: ['/img/og/home.png'] }
};

export const viewport: Viewport = {
    themeColor: '#0b0a09',
    colorScheme: 'dark'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pl" data-scroll-behavior="smooth" className={`${shoulders.variable} ${schibsted.variable}`}>
            <body>
                {children}
            </body>
        </html>
    );
}
