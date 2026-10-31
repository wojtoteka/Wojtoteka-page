import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, pageMeta } from '@/lib/seo';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { DiscordSection } from '@/components/v2/DiscordSection';
import { GithubActivity } from '@/components/v2/GithubActivity';
import { LinkRows } from '@/components/v2/LinkRows';
import { Marquee } from '@/components/v2/Marquee';
import { Scramble } from '@/components/v2/Scramble';
import { Shelf } from '@/components/v2/Shelf';
import { SplitText } from '@/components/v2/SplitText';
import { WordReveal } from '@/components/v2/WordReveal';
import { FISHING_PARTY_PLAY, GAMES } from '@/lib/games';
import { PROJECTS, PROFILES, STACK, repoUrl } from '@/lib/profile';
import { DEFAULT_TAGLINE, getActiveBioLinks, getSettings } from '@/lib/site';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMeta({
    title: 'Wojtoteka: strony internetowe, gry i boty na Discorda',
    description: 'Strony internetowe od wyglądu po serwer i bazę danych, gry w przeglądarce, bot RoyalCasino na Discorda i projekty z GitHuba. Zobacz, co robię, i napisz do mnie.',
    path: '/',
    image: 'home',
    absoluteTitle: true,
});

const ABOUT =
    'Cześć, jestem Wojtek i na co dzień zajmuję się stronami internetowymi. Robię je od wyglądu aż po serwer i bazę danych.';

// Technologie w dwóch pasach, które jadą w przeciwne strony.
const STACK_A = STACK.slice(0, 7);
const STACK_B = STACK.slice(7);

const pad = (n: number) => String(n).padStart(2, '0');

// Nowa gra na Androida: co w niej jest i trzy zrzuty z telefonu.
const FISHING_FEATURES = [
    '1000 poziomów w 40 światach i bestia na końcu każdego',
    'Kreator poziomów: zbuduj planszę i wyślij ją znajomym',
    'Poziom dnia, poziom tygodnia i ranking top 100',
    'Za darmo, bez reklam i bez mikropłatności'
];

const FISHING_SHOTS = [
    { src: '/img/gry/fishing-party-2/rozgrywka.webp', alt: 'Fishing Party 2.0: łódka płynie kanałem, brama właśnie się otworzyła' },
    { src: '/img/gry/fishing-party-2/kreator.webp', alt: 'Fishing Party 2.0: kreator poziomów z brzegami, skałami i rybami' },
    { src: '/img/gry/fishing-party-2/bestie.webp', alt: 'Fishing Party 2.0: starcie z bestią na końcu świata' }
];

// Dane dla wyszukiwarek: kim jestem i jaka to strona (schema.org, JSON-LD).
const JSON_LD = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            inLanguage: 'pl-PL',
            publisher: { '@id': `${SITE_URL}/#person` }
        },
        {
            '@type': 'Person',
            '@id': `${SITE_URL}/#person`,
            name: 'Wojtek',
            alternateName: SITE_NAME,
            url: SITE_URL,
            image: `${SITE_URL}/img/logo.png`,
            jobTitle: 'Full-stack developer',
            knowsAbout: STACK.map(item => item.name),
            sameAs: [PROFILES.github, PROFILES.discord, PROFILES.googlePlay]
        }
    ]
}).replace(/</g, '\\u003c');

export default async function HomePage() {
    const [settings, links] = await Promise.all([getSettings(), getActiveBioLinks()]);
    const tagline = settings.tagline?.trim() || DEFAULT_TAGLINE;

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />

            {/* ---------- Napis ---------- */}
            <section className={styles.hero} aria-labelledby="hero-title">
                <div className={`wrap ${styles.heroInner}`}>
                    <p className={`v2-label ${styles.heroLabel}`}>
                        <b>[01]</b>
                        <Scramble text="Strona główna" delay={300} />
                    </p>

                    <h1 id="hero-title" className={styles.word} aria-label="Wojtoteka" data-sweep style={{ '--first': 5, '--last': 8 } as CSSProperties}>
                        <SplitText text="WOJTO" />
                        <span className={styles.secondLine}>
                            <SplitText text="TEKA" start={5} className={`v2-outline ${styles.fill}`} />
                            <figure className={`v2-frame ${styles.duck}`}>
                                <img src="/img/glogo.gif" alt="Maskotka Wojtoteka: animowana żółta kaczka" width={220} height={220} />
                            </figure>
                        </span>
                    </h1>

                    <div className={styles.meta}>
                        <p className={styles.tagline}>
                            <span className={styles.prompt} aria-hidden="true">&gt;</span>
                            <Scramble text={tagline} delay={1100} duration={900} />
                            <span className={styles.caret} aria-hidden="true" />
                        </p>
                        <p className={styles.what}>Na co dzień zajmuję się stronami internetowymi. Tu znajdziesz moje projekty i kontakt do mnie.</p>
                    </div>

                    <a href="#o-mnie" className={styles.scroll}>
                        <span className={styles.scrollLine} aria-hidden="true" />
                        Przewiń
                    </a>
                </div>
            </section>

            {/* ---------- Kilka zdań i liczby ---------- */}
            <section id="o-mnie" className={`wrap ${styles.about}`} aria-label="O mnie">
                <p className="v2-label">
                    <b>[02]</b> O mnie
                </p>
                <WordReveal text={ABOUT} className={styles.aboutText} />
                <dl className={styles.stats} data-reveal>
                    <div>
                        <dt>Stack</dt>
                        <dd>
                            <Scramble text={pad(STACK.length)} trigger="view" duration={900} />
                        </dd>
                    </div>
                    <div>
                        <dt>Wybrane projekty</dt>
                        <dd>
                            <Scramble text={pad(PROJECTS.length)} trigger="view" duration={900} />
                        </dd>
                    </div>
                    <div>
                        <dt>Gry</dt>
                        <dd>
                            <Scramble text={pad(GAMES.length)} trigger="view" duration={900} />
                        </dd>
                    </div>
                    <div>
                        <dt>Online od</dt>
                        <dd>
                            <Scramble text="2024" trigger="view" duration={900} />
                        </dd>
                    </div>
                </dl>
                <p className={styles.aboutNote} data-reveal>
                    Nowe technologie najchętniej sprawdzam w praktyce, na własnych projektach. Po drodze powstało też kilka gier i bot na Discorda.
                </p>
            </section>

            {/* ---------- Nowa gra: Fishing Party 2.0 ---------- */}
            {/* WYŁĄCZONE: Google jeszcze nie zweryfikowało aplikacji, link do Google Play nie działa.
                Aby przywrócić, usuń tę linię komentarza i linię z zamknięciem komentarza poniżej.
            <section id="fishing-party" className={styles.promo} aria-labelledby="promo-title">
                <div className={`wrap ${styles.promoInner}`}>
                    <div className={styles.promoHead} data-reveal>
                        <p className="v2-label">
                            <b>[03]</b> Nowość na Androida
                        </p>
                        <h2 id="promo-title" className={styles.h2}>
                            Fishing <span className="v2-outline">Party 2.0</span>
                        </h2>
                    </div>

                    <figure className={`v2-frame ${styles.promoBanner}`} data-reveal>
                        <img
                            src="/img/gry/fishing-party-2/baner.webp"
                            alt="Fishing Party: rybak w czerwonej łódce, ryby, rekin i ośmiornica. Hasło: łów ryby, twórz poziomy"
                            width={1024}
                            height={500}
                            loading="lazy"
                            className="pixelated"
                        />
                    </figure>

                    <div className={styles.promoCopy} data-reveal>
                        <p className={styles.promoLead}>
                            Pixelartowa gra o łowieniu ryb sterowana jednym palcem. Wskakujesz do łódki, łowisz ryby, żeby otworzyć bramę, i uciekasz przed piraniami, ośmiornicami i rekinami.
                        </p>
                        <ul role="list" className={styles.promoList}>
                            {FISHING_FEATURES.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                        <div className={styles.promoActions}>
                            <a href={FISHING_PARTY_PLAY} className="btn btn-primary" target="_blank" rel="noopener">
                                Pobierz z Google Play <span className="v2-arrow" aria-hidden="true">↗</span>
                                <span className="sr-only"> (otwiera się w nowej karcie)</span>
                            </a>
                            <Link href="/gry#fishing-party-2" className="btn btn-ghost">
                                Wszystkie gry <span className="v2-arrow" aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>

                    <ul role="list" className={styles.promoShots}>
                        {FISHING_SHOTS.map((shot, i) => (
                            <li key={shot.src} className={`v2-frame ${styles.promoShot}`} style={{ '--i': i } as CSSProperties} data-reveal>
                                <img src={shot.src} alt={shot.alt} width={405} height={810} loading="lazy" />
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
            KONIEC WYŁĄCZONEJ SEKCJI Fishing Party 2.0 */}

            {/* ---------- Technologie ---------- */}
            <section className={styles.stack} aria-labelledby="stack-title">
                <div className="wrap">
                    <p className="v2-label" id="stack-title">
                        <b>[04]</b> Rzeczy, których używam
                    </p>
                </div>
                <ul role="list" className="sr-only">
                    {STACK.map(item => (
                        <li key={item.icon}>{item.name}</li>
                    ))}
                </ul>
                <div className={styles.stackBands} aria-hidden="true">
                    <Marquee time={30} gap={36} pauseOnHover>
                        {STACK_A.map(item => (
                            <span key={item.icon} className={styles.stackItem}>
                                <img src={`/img/stack/${item.icon}.svg`} alt="" width={48} height={48} className={styles.stackIcon} />
                                {item.name}
                                <i>/</i>
                            </span>
                        ))}
                    </Marquee>
                    <Marquee time={26} gap={36} reverse pauseOnHover>
                        {STACK_B.map(item => (
                            <span key={item.icon} className={`${styles.stackItem} ${styles.stackOutline}`}>
                                <img src={`/img/stack/${item.icon}.svg`} alt="" width={48} height={48} className={styles.stackIcon} />
                                {item.name}
                                <i>/</i>
                            </span>
                        ))}
                    </Marquee>
                </div>
            </section>

            {/* ---------- Linki ---------- */}
            {links.length > 0 && (
                <section id="linki" className={`wrap ${styles.links}`} aria-labelledby="links-title">
                    <div className={styles.linksHead} data-reveal>
                        <p className="v2-label">
                            <b>[05]</b> Linki
                        </p>
                        <h2 id="links-title" className={styles.h2}>
                            Wszystko <span className="v2-outline">w jednym</span> miejscu
                        </h2>
                    </div>
                    <div data-reveal>
                        <LinkRows links={links} />
                    </div>
                </section>
            )}

            {/* ---------- Projekty z GitHuba ---------- */}
            <section className={`wrap ${styles.projects}`} aria-labelledby="projects-title">
                <div className={styles.projectsHead} data-reveal>
                    <p className="v2-label">
                        <b>[06]</b> Wybrane projekty
                    </p>
                    <h2 id="projects-title" className={styles.h2}>
                        Kod <span className="v2-outline">na GitHubie</span>
                    </h2>
                    <a href={PROFILES.github} className="btn btn-ghost btn-sm" target="_blank" rel="noopener">
                        Profil GitHub <span className="v2-arrow" aria-hidden="true">↗</span>
                        <span className="sr-only"> (otwiera się w nowej karcie)</span>
                    </a>
                </div>
                <ol role="list" className={styles.projectList}>
                    {PROJECTS.map((project, i) => (
                        <li key={project.repo} className={styles.project} style={{ '--i': i } as CSSProperties} data-reveal>
                            <span className={styles.projectNum}>{pad(i + 1)}</span>
                            <a href={repoUrl(project.repo)} className={styles.projectLink} target="_blank" rel="noopener">
                                <span className={styles.projectName}>{project.name}</span>
                                <span className={styles.projectRepo}>
                                    github.com/Wojtoteka/{project.repo}
                                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                                </span>
                                <span className={styles.projectArrow} aria-hidden="true">
                                    ↗
                                </span>
                            </a>
                            <p className={styles.projectAbout}>{project.about}</p>
                            <p className={styles.projectMeta}>
                                {project.tech.map(tech => (
                                    <span key={tech} className={styles.projectTech}>
                                        {tech}
                                    </span>
                                ))}
                                {project.page &&
                                    (project.page.href.startsWith('/') ? (
                                        <Link href={project.page.href} className={styles.projectPage}>
                                            {project.page.label} →
                                        </Link>
                                    ) : (
                                        <a href={project.page.href} className={styles.projectPage}>
                                            {project.page.label} ↗
                                        </a>
                                    ))}
                            </p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ---------- Rok na GitHubie ---------- */}
            <GithubActivity label="[07]" />

            {/* ---------- Discord na żywo ---------- */}
            <DiscordSection label="[08]" />

            {/* ---------- Półka z grami ---------- */}
            <section className={styles.shelf} aria-labelledby="shelf-title">
                <Shelf
                    head={
                        <div className={`wrap ${styles.shelfHead}`}>
                            <p className="v2-label">
                                <b>[09]</b> Na półce
                            </p>
                            <h2 id="shelf-title" className={styles.h2}>
                                Gry
                            </h2>
                            <Link href="/gry" className="btn btn-ghost btn-sm">
                                Wszystkie gry <span className="v2-arrow" aria-hidden="true">→</span>
                            </Link>
                        </div>
                    }
                >
                    {GAMES.map((game, i) => (
                        <Link
                            key={game.slug}
                            href={`/gry#${game.slug}`}
                            className={styles.cart}
                            data-tall={game.shot.height > game.shot.width || undefined}
                            style={{ '--frame': game.frame, '--tilt': `${game.tilt}deg` } as CSSProperties}
                        >
                            <span className={styles.cartTop}>
                                <span>
                                    {pad(i + 1)} / {pad(GAMES.length)}
                                </span>
                                <span>
                                    {game.isNew && <b className={styles.cartNew}>Nowość</b>}
                                    {game.platform === 'web' ? 'Przeglądarka' : 'Android'}
                                </span>
                            </span>
                            <span className={`v2-frame ${styles.cover}`}>
                                <img src={game.shot.src} alt="" width={game.shot.width} height={game.shot.height} loading="lazy" />
                            </span>
                            <span className={styles.cartTitle}>{game.title}</span>
                        </Link>
                    ))}
                </Shelf>
            </section>

            {/* ---------- Kontakt ---------- */}
            <section className={styles.contact} aria-label="Kontakt">
                <div className="wrap">
                    <p className="v2-label">
                        <b>[10]</b> Kontakt
                    </p>
                </div>
                <Link href="/kontakt" className={styles.contactLink} aria-label="Napisz do mnie: przejdź do formularza kontaktowego">
                    <Marquee time={14} gap={40}>
                        <span className={styles.contactWord}>
                            Napisz do mnie <span className={styles.contactStar}>//</span>
                        </span>
                    </Marquee>
                </Link>
                <div className={`wrap ${styles.contactFoot}`}>
                    <p>Masz pomysł na stronę albo pytanie? Odpowiem na adres, który podasz.</p>
                    <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>
                </div>
            </section>
        </>
    );
}
