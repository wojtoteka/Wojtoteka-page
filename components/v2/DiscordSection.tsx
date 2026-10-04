import { getDiscordProfile } from '@/lib/discord';
import { PROFILES } from '@/lib/profile';
import { DiscordLive } from './DiscordLive';
import styles from './Discord.module.css';

/**
 * Profil Discord na żywo: status, to, co teraz gram albo czego słucham, i odznaki.
 * Serwer wstawia świeże dane od razu, a DiscordLive dopytuje o zmiany,
 * dopóki sekcja jest na ekranie.
 */
export async function DiscordSection({ label }: { label: string }) {
    const profile = await getDiscordProfile();

    return (
        <section className={`wrap ${styles.section}`} aria-labelledby="discord-title">
            <div className={styles.head} data-reveal>
                <p className="v2-label">
                    <b>{label}</b> Discord
                </p>
                <h2 id="discord-title" className={styles.h2}>
                    Teraz <span className="v2-outline">na Discordzie</span>
                </h2>
                <a href={PROFILES.discord} className="btn btn-ghost btn-sm" target="_blank" rel="noopener">
                    Napisz na Discordzie <span className="v2-arrow" aria-hidden="true">↗</span>
                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                </a>
            </div>

            <div data-reveal>
                <DiscordLive initial={profile} href={PROFILES.discord} />
            </div>
        </section>
    );
}
