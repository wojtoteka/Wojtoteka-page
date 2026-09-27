import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { BioLinkRow } from '@/components/home/BioLinkRow';
import { HeroWordmark } from '@/components/home/HeroWordmark';
import { GAMES, WEB_GAMES } from '@/lib/games';
import { DEFAULT_TAGLINE, getActiveBioLinks, getSettings } from '@/lib/site';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: { absolute: 'Wojtoteka: gry, narzędzia i kontakt' },
    description: 'Gry w przeglądarce, aplikacje na Androida, bot na Discorda i kilka narzędzi. Wszystkie linki Wojtoteka w jednym miejscu.',
    alternates: { canonical: '/' }
};

const NAME = 'Wojtoteka';

// Na półce lądują gry z poziomymi grafikami: dobrze wyglądają obok siebie.
const SHELF = ['night-drive', 'gloomcraft', 'fishing-party', 'rope-climber', '4-in-a-row']
    .map(slug => GAMES.find(game => game.slug === slug))
    .filter(game => game !== undefined);

export default async function HomePage() {
    const [settings, links] = await Promise.all([getSettings(), getActiveBioLinks()]);
    const tagline = settings.tagline?.trim() || DEFAULT_TAGLINE;

    return (
        <>
            <section className={styles.hero} aria-labelledby="hero-title">
                <div className={`wrap ${styles.heroInner}`}>
                    <figure className={`ink-frame ${styles.duck}`}>
                        <img src="/img/glogo.gif" alt="Maskotka Wojtoteka: animowana żółta kaczka" width={220} height={220} />
                    </figure>

                    <HeroWordmark id="hero-title" text={NAME} />

                    <div className={styles.meta}>
                        <p className={styles.tagline}>{tagline}</p>
                        <p className={styles.what}>Gry w przeglądarce, aplikacje na Androida i bot na Discorda. Poniżej wszystko, co warto kliknąć.</p>
                    </div>
                </div>
            </section>

            {links.length > 0 && (
                <section className={`wrap ${styles.links}`} aria-labelledby="links-title">
                    <h2 id="links-title" className="sr-only">
                        Linki
                    </h2>
                    <ul role="list" className={styles.linkList}>
                        {links.map(link => (
                            <li key={link.id}>
                                <BioLinkRow link={link} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className={styles.shelf} aria-labelledby="shelf-title">
                <div className={`wrap ${styles.shelfHead}`}>
                    <h2 id="shelf-title">Na półce</h2>
                    <p className="muted">
                        {GAMES.length} gier, z czego {WEB_GAMES} uruchomisz w przeglądarce bez instalacji.
                    </p>
                    <Link href="/gry" className="btn btn-ghost">
                        Wszystkie gry
                    </Link>
                </div>

                <ul role="list" className={styles.shelfRow}>
                    {SHELF.map(game => (
                        <li key={game.slug} style={{ '--tilt': `${game.tilt}deg`, '--ink-color': game.frame } as CSSProperties}>
                            <Link href={`/gry#${game.slug}`} className={styles.cartridge}>
                                <span className={`ink-frame ${styles.cover}`}>
                                    <img
                                        src={game.art.src}
                                        alt=""
                                        width={game.art.width}
                                        height={game.art.height}
                                        loading="lazy"
                                        className={game.art.pixel ? 'pixelated' : undefined}
                                        style={game.art.focus ? ({ '--focus': game.art.focus } as CSSProperties) : undefined}
                                    />
                                </span>
                                <span className={styles.caption}>{game.title}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}
