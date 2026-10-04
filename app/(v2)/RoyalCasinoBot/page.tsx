import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Marquee } from '@/components/v2/Marquee';
import { Scramble } from '@/components/v2/Scramble';
import { SplitText } from '@/components/v2/SplitText';
import { TypeCycle } from '@/components/v2/TypeCycle';
import { WordReveal } from '@/components/v2/WordReveal';
import styles from './royal.module.css';

export const metadata: Metadata = pageMeta({
    title: 'RoyalCasino Bot',
    description: 'Bot na Discorda z 16 grami kasynowymi na wirtualną walutę: Blackjack, Poker, Ruletka, Slots, Crash i inne. Ekonomia, osiągnięcia, dzienne questy i rankingi.',
    path: '/RoyalCasinoBot',
    image: 'royalcasinobot',
});

const INVITE = 'https://discord.com/oauth2/authorize?client_id=1432001189150593155&permissions=412317194240&integration_type=0&scope=bot';
const VOTE = 'https://top.gg/bot/1432001189150593155/vote';
const TOPGG = 'https://top.gg/bot/1432001189150593155';

const ABOUT =
    'RoyalCasino to kasyno na Twoim serwerze Discord. Grasz na wirtualną walutę, zbierasz osiągnięcia i walczysz o miejsce w rankingu.';

const FACTS = [
    { value: '16', label: 'Gier kasynowych' },
    { value: '$5,000', label: 'Na start' },
    { value: '$1,000', label: 'Za głos co 12h' },
    { value: '14', label: 'Osiągnięć' },
    { value: '3', label: 'Questy dziennie' }
];

const GAMES = [
    { name: 'Blackjack', command: '/blackjack', text: 'Klasyczny Blackjack z interaktywnymi przyciskami. Hit, Stand lub Double Down: dobierz karty i pokonaj krupiera.', meta: ['Min: $100', 'Wygrana: 2x', 'Blackjack: 2.5x', 'Double Down'] },
    { name: 'Poker', command: '/poker', text: "Texas Hold'em przeciwko krupierowi. Preflop, flop, turn, river: pokaż swoje umiejętności.", meta: ['Min: $500', 'Zaawansowana'] },
    { name: 'Ruletka', command: '/ruletka', text: 'Europejska ruletka z wieloma opcjami zakładów: kolor, liczba, parzyste, tuziny, kolumny i więcej.', meta: ['Min: $100', 'Wypłata: do 35x'] },
    { name: 'Slots', command: '/slots', text: 'Jednoręki bandyta na kredyty z kombinacjami symboli i Jackpotem. Trafiaj wisienki i wygrywaj wielkie nagrody.', meta: ['Kredyty: 1-20', 'Max: 100x', 'Jackpot'] },
    { name: 'Crash', command: '/crash', text: 'Gra mnożnikowa. Obserwuj rosnący mnożnik i wypłać w dobrym momencie, zanim wykres spadnie.', meta: ['Min: $100', 'Rosnący mnożnik'] },
    { name: 'Coinflip', command: '/coinflip', text: 'Prosta gra: wybierz orła lub reszkę i czekaj na wynik rzutu monetą.', meta: ['Min: $50', 'Wygrana: 2x'] },
    { name: 'Dice', command: '/dice', text: 'Zgadnij wynik rzutu kostką (1-6). Trafisz? Wygrywasz 5x stawki.', meta: ['Min: $50', 'Wygrana: 5x'] },
    { name: 'War', command: '/war', text: 'Wojna karciana: wyższa karta wygrywa. Przy remisie wchodzi runda wojny z wypłatą 3x.', meta: ['Min: $100', 'Wojna: 3x'] },
    { name: 'HiLo', command: '/hilo', text: 'Interaktywna gra Higher/Lower. Mnożnik rośnie z każdą rundą. Ile wytrzymasz?', meta: ['Min: $100', 'Rosnący mnożnik'] },
    { name: 'Miny', command: '/miny', text: 'Saper na planszy 5×4. Ustawiasz od 1 do 15 min, odkrywasz bezpieczne kafelki i wypłacasz przed trafieniem w minę.', meta: ['Min: $100', '1-15 min', 'Rosnący mnożnik'] },
    { name: 'Zdrapka', command: '/zdrapka', text: 'Zdrap trzy pola. Trzy takie same symbole wygrywają, a trzy siódemki to Jackpot.', meta: ['Min: $100', 'Wygrana: do 25x', 'Jackpot'] },
    { name: 'Koło Fortuny', command: '/kolo', text: 'Zakręć kołem i patrz, gdzie się zatrzyma. Mnożnik od 0.5x aż do 10x.', meta: ['Min: $100', 'Mnożnik: do 10x'] },
    { name: 'Keno', command: '/keno', text: 'Wybierz od 1 do 10 liczb (1-80), a bot losuje 20. Im więcej trafień, tym większa wygrana.', meta: ['Min: $100', 'Wygrana: do 500x'] },
    { name: 'Plinko', command: '/plinko', text: 'Upuść piłkę przez 8 rzędów kołków. Krawędzie płacą nawet 20×. Wynik od razu, z animacją spadającej piłki.', meta: ['Min: $100', '8 rzędów', 'Mnożnik: do 20x'] },
    { name: 'Limbo', command: '/limbo', text: 'Ustaw cel od 1.1× do 100×. Wygrywasz, gdy wylosowany mnożnik osiągnie Twój cel. Wypłata to stawka × cel.', meta: ['Min: $100', 'Cel: 1.1x-100x'] },
    { name: 'Pojedynek', command: '/pojedynek', text: 'PvP 50/50 z innym graczem, wyzwanie z przyciskami Przyjmij i Odrzuć. Pula to 2× stawki, bez prowizji.', meta: ['Min: $100', 'PvP 50/50', 'Pula: 2x'] }
];

// Komendy, które po kolei wypisują się pod napisem.
const COMMAND_WORDS = GAMES.map(game => game.command);

// Gry w dwóch pasach, które jadą w przeciwne strony.
const BAND_A = GAMES.slice(0, 8);
const BAND_B = GAMES.slice(8);

const FEATURES = [
    { title: 'Ekonomia', text: 'Start z $5,000. Dzienny bonus $500 plus $100 za każdy dzień serii, najwięcej przy 7 dniach. Kredyty do Slotów kupujesz po $100 i sprzedajesz po $80.' },
    { title: 'Rankingi', text: 'Top graczy według pieniędzy, poziomu, liczby gier, wygranych i serii. Sprawdzisz je przez /top i /ranking.' },
    { title: 'Osiągnięcia', text: '14 osiągnięć do odblokowania, od Pierwszej Gry po Milionera i High Rollera.' },
    { title: 'Poziomy i XP', text: '+10 XP za każdą grę, +5 XP za wygraną. Awansujesz przez poziomy i odblokowujesz odznaki.' },
    { title: 'Polecenia', text: 'Zaproś znajomego przez /polecenie. Obie strony dostają +$2,000.' },
    { title: 'Powiadomienia na DM', text: 'Bot sam pisze przy osiągnięciach, awansach i dużych wygranych.' },
    { title: 'Dzienne questy', text: '3 losowe zadania dziennie z nagrodą w gotówce i XP. Reset codziennie o 00:00 czasu warszawskiego.' },
    { title: 'Głosowanie', text: 'Głosuj co 12h na top.gg i odbieraj $1,000 nagrody przez /vote.' },
    { title: 'Polski i angielski', text: 'Każdy gracz sam wybiera język bota w /ustawienia. Tam też wyłączysz przyjmowanie pojedynków.' },
    { title: 'Ustawienia serwera', text: 'Administrator wskazuje kanał kasyna i włącza albo wyłącza pojedynki przez /ustawienia-serwera.' },
    { title: 'Zgłoszenia', text: 'Błąd albo nadużycie innego gracza wyślesz prosto do właściciela bota przez /zgłoszenie.' }
];

// Każdy quest daje też XP, więc w tabeli zostaje sama kwota.
const QUESTS = [
    { task: 'Zagraj 7 gier', cash: '$600' },
    { task: 'Wygraj 3 rundy Blackjacka', cash: '$1,500' },
    { task: 'Postaw łącznie $20,000', cash: '$1,800' },
    { task: 'Zagraj 5 rund Slotów', cash: '$800' },
    { task: 'Wygraj 5 gier', cash: '$1,000' },
    { task: 'Wygraj 3x Coinflip', cash: '$600' }
];

const COMMANDS = [
    { group: 'Gry', list: GAMES.map(game => game.command) },
    { group: 'Ekonomia', list: ['/balance', '/profil', '/daily', '/kup-kredyty', '/sprzedaj-kredyty'] },
    { group: 'Rankingi i społeczność', list: ['/top', '/ranking', '/achievementy', '/questy', '/polecenie'] },
    { group: 'Inne', list: ['/pomoc', '/vote', '/zapros', '/ustawienia', '/ustawienia-serwera', '/zgłoszenie'] }
];

const DOCS = [
    { label: 'Regulamin', href: '/RoyalCasinoBot/regulamin' },
    { label: 'Polityka prywatności', href: '/RoyalCasinoBot/polityka' },
    { label: 'Strona bota na top.gg', href: TOPGG },
    { label: 'Kontakt', href: '/kontakt' }
];

const pad = (n: number) => String(n).padStart(2, '0');

function NewTab() {
    return <span className="sr-only"> (otwiera się w nowej karcie)</span>;
}

export default function RoyalCasinoPage() {
    return (
        <>
            {/* ---------- Napis ---------- */}
            <section className={styles.hero} aria-labelledby="royal-title">
                <div className={`wrap ${styles.heroInner}`}>
                    <p className={`v2-label ${styles.heroLabel}`}>
                        <b>[01]</b>
                        <Scramble text="Bot na Discorda" delay={300} />
                    </p>

                    <h1 id="royal-title" className={styles.word} aria-label="RoyalCasino Bot" data-sweep style={{ '--first': 5, '--last': 10 } as CSSProperties}>
                        <SplitText text="ROYAL" />
                        <span className={styles.secondLine}>
                            <SplitText text="CASINO" start={5} className={`v2-outline ${styles.fill}`} />
                            <figure className={`v2-frame ${styles.logo}`}>
                                <img src="/RoyalCasinoBot/logo.png" alt="Logo RoyalCasino: korona nad trzema siódemkami" width={220} height={220} />
                            </figure>
                        </span>
                    </h1>

                    <div className={styles.meta}>
                        <p className={styles.tagline}>
                            <span className={styles.prompt} aria-hidden="true">&gt;</span>
                            <TypeCycle words={COMMAND_WORDS} label="Każdą grę uruchamiasz komendą, na przykład /blackjack." />
                            <span className={styles.caret} aria-hidden="true" />
                        </p>
                        <p className={styles.what}>16 gier kasynowych na wirtualną walutę. Bot działa po polsku i po angielsku.</p>
                        <div className={styles.cta}>
                            <a href={INVITE} className="btn btn-primary" target="_blank" rel="noopener">
                                <Icon name="bot" size={20} />
                                Dodaj do Discorda
                                <NewTab />
                            </a>
                            <a href={VOTE} className="btn btn-ghost" target="_blank" rel="noopener">
                                Zagłosuj na top.gg <span className="v2-arrow" aria-hidden="true">↗</span>
                                <NewTab />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------- Kilka zdań i liczby ---------- */}
            <section className={`wrap ${styles.about}`} aria-label="O bocie">
                <p className="v2-label">
                    <b>[02]</b> W skrócie
                </p>
                <WordReveal text={ABOUT} className={styles.aboutText} />
                <dl className={styles.stats} data-reveal>
                    {FACTS.map(fact => (
                        <div key={fact.label}>
                            <dt>{fact.label}</dt>
                            <dd>
                                <Scramble text={fact.value} trigger="view" duration={900} />
                            </dd>
                        </div>
                    ))}
                </dl>
                <div className={styles.vote} data-reveal>
                    <p>
                        Zagłosuj na top.gg i odbierz <strong>$1,000</strong>. Głosujesz co 12 godzin, a nagrodę odbierasz komendą <code>/vote</code>.
                    </p>
                    <a href={VOTE} className="btn btn-ghost btn-sm" target="_blank" rel="noopener">
                        Głosuj teraz <span className="v2-arrow" aria-hidden="true">↗</span>
                        <NewTab />
                    </a>
                </div>
            </section>

            {/* ---------- Gry w pasach ---------- */}
            <section className={styles.bands} aria-label="Nazwy gier">
                <div className={styles.bandsInner} aria-hidden="true">
                    <Marquee time={34} gap={36} pauseOnHover>
                        {BAND_A.map(game => (
                            <span key={game.command} className={styles.bandItem}>
                                {game.name}
                                <i>/</i>
                            </span>
                        ))}
                    </Marquee>
                    <Marquee time={30} gap={36} reverse pauseOnHover>
                        {BAND_B.map(game => (
                            <span key={game.command} className={`${styles.bandItem} ${styles.bandOutline}`}>
                                {game.name}
                                <i>/</i>
                            </span>
                        ))}
                    </Marquee>
                </div>
            </section>

            {/* ---------- Stół z grami ---------- */}
            <section className={`wrap ${styles.games}`} aria-labelledby="gry-tytul">
                <div className={styles.gamesHead} data-reveal>
                    <p className="v2-label">
                        <b>[03]</b> Stół z grami
                    </p>
                    <h2 id="gry-tytul" className={styles.h2}>
                        16 <span className="v2-outline">gier</span>
                    </h2>
                    <p className={styles.headNote}>Każdą grę uruchamiasz komendą o tej samej nazwie.</p>
                </div>
                <ol role="list" className={styles.gameList}>
                    {GAMES.map((game, i) => (
                        <li key={game.command} className={styles.game} data-reveal>
                            <span className={styles.gameNum}>{pad(i + 1)}</span>
                            <div className={styles.gameHead}>
                                <h3 className={styles.gameName}>{game.name}</h3>
                                <code className={styles.command}>{game.command}</code>
                            </div>
                            <p className={styles.gameText}>{game.text}</p>
                            <p className={styles.gameMeta}>
                                {game.meta.map(item => (
                                    <span key={item}>{item}</span>
                                ))}
                            </p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ---------- Funkcje ---------- */}
            <section className={`wrap ${styles.features}`} aria-labelledby="funkcje-tytul">
                <div className={styles.featuresHead}>
                    <p className="v2-label">
                        <b>[04]</b> Poza grami
                    </p>
                    <h2 id="funkcje-tytul" className={styles.h2}>
                        Co jeszcze <span className="v2-outline">potrafi</span>
                    </h2>
                </div>
                <dl className={styles.featureList}>
                    {FEATURES.map(feature => (
                        <div key={feature.title} data-reveal>
                            <dt>{feature.title}</dt>
                            <dd>{feature.text}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* ---------- Questy ---------- */}
            <section className={`wrap ${styles.quests}`} aria-labelledby="questy-tytul">
                <div className={styles.questsHead} data-reveal>
                    <p className="v2-label">
                        <b>[05]</b> Questy
                    </p>
                    <h2 id="questy-tytul" className={styles.h3}>
                        Przykładowy dzień
                    </h2>
                    <p className={styles.headNote}>Questy losują się codziennie. Swoje sprawdzisz przez /questy. Każdy daje też XP.</p>
                </div>
                <table className={styles.questTable} data-reveal>
                    <thead className="sr-only">
                        <tr>
                            <th scope="col">Zadanie</th>
                            <th scope="col">Nagroda</th>
                        </tr>
                    </thead>
                    <tbody>
                        {QUESTS.map(quest => (
                            <tr key={quest.task}>
                                <td>{quest.task}</td>
                                <td className={styles.reward}>
                                    +{quest.cash} <small>+ XP</small>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* ---------- Komendy ---------- */}
            <section className={`wrap ${styles.commands}`} aria-labelledby="komendy-tytul">
                <p className="v2-label">
                    <b>[06]</b> Ściąga
                </p>
                <h2 id="komendy-tytul" className={styles.h2}>
                    Komendy
                </h2>
                <div className={styles.commandGroups}>
                    {COMMANDS.map(group => (
                        <div key={group.group} className={styles.commandGroup} data-reveal>
                            <h3>{group.group}</h3>
                            <ul role="list">
                                {group.list.map(command => (
                                    <li key={command}>
                                        <code>
                                            <b>/</b>
                                            {command.slice(1)}
                                        </code>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---------- Dokumenty ---------- */}
            <section className={`wrap ${styles.docs}`} aria-labelledby="dokumenty-tytul">
                <p className="v2-label" id="dokumenty-tytul">
                    <b>[07]</b> Dokumenty i pomoc
                </p>
                <ul role="list" className={styles.docList} data-reveal>
                    {DOCS.map(doc => (
                        <li key={doc.href}>
                            {doc.href.startsWith('/') ? (
                                <Link href={doc.href} className={styles.docLink}>
                                    {doc.label}
                                    <span aria-hidden="true">→</span>
                                </Link>
                            ) : (
                                <a href={doc.href} className={styles.docLink} target="_blank" rel="noopener">
                                    {doc.label}
                                    <span aria-hidden="true">↗</span>
                                    <NewTab />
                                </a>
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            {/* ---------- Dodaj bota ---------- */}
            <section className={styles.invite} aria-label="Dodaj bota">
                <div className="wrap">
                    <p className="v2-label">
                        <b>[08]</b> Na Twój serwer
                    </p>
                </div>
                <a href={INVITE} className={styles.inviteLink} target="_blank" rel="noopener" aria-label="Dodaj RoyalCasino do Discorda (otwiera się w nowej karcie)">
                    <Marquee time={14} gap={40}>
                        <span className={styles.inviteWord}>
                            Dodaj do Discorda <span className={styles.inviteStar}>//</span>
                        </span>
                    </Marquee>
                </a>
                <div className={`wrap ${styles.inviteFoot}`}>
                    <p>Bota dodasz na serwer, na którym masz uprawnienia do zarządzania serwerem.</p>
                    <a href="https://panel.skillhost.pl/ref/wojtoteka" className={styles.host} target="_blank" rel="noopener">
                        Bot działa na serwerach
                        <img src="/RoyalCasinoBot/skillhost-color.svg" alt="Skillhost" width={96} height={24} />
                        <NewTab />
                    </a>
                </div>
            </section>
        </>
    );
}
