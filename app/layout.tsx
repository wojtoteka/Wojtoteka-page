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
    description: 'Gry w przeglądarce, aplikacje na Androida, bot na Discorda i kilka narzędzi. Strona Wojtoteka z Wrocławia.',
    authors: [{ name: 'Wojtoteka', url: 'https://wojtoteka.ovh/' }],
    icons: { icon: '/img/logo.png', apple: '/img/logo.png' },
    openGraph: {
        type: 'website',
        locale: 'pl_PL',
        siteName: 'Wojtoteka',
        images: [{ url: '/img/og.png', width: 1200, height: 630, alt: 'Wojtoteka' }]
    },
    twitter: { card: 'summary_large_image' }
};

export const viewport: Viewport = {
    themeColor: '#14161a',
    colorScheme: 'dark'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pl" className={`${shoulders.variable} ${schibsted.variable}`}>
            <body>
                {/* Filtr "tuszu" dla obrysów .ink-frame: lekko faluje prostą linię. */}
                <svg className="svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
                    <filter id="ink-wobble" x="-5%" y="-5%" width="110%" height="110%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" />
                        <feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </svg>
                {children}
            </body>
        </html>
    );
}
