import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import styles from './royal.module.css';

export const metadata: Metadata = {
    title: 'RoyalCasino Bot',
    description: 'Bot na Discorda z 16 grami kasynowymi na wirtualną walutę: Blackjack, Poker, Ruletka, Slots, Crash i inne. Ekonomia, osiągnięcia, dzienne questy i rankingi.',
    alternates: { canonical: '/RoyalCasinoBot' }
};

const INVITE = 'https://discord.com/oauth2/authorize?client_id=1432001189150593155&permissions=412317194240&integration_type=0&scope=bot';
const VOTE = 'https://top.gg/bot/1432001189150593155/vote';
const TOPGG = 'https://top.gg/bot/1432001189150593155';

const FACTS = [
    { value: '16', label: 'gier kasynowych' },
    { value: '$5,000', label: 'na start' },
    { value: '$1,000', label: 'za głos co 12h' },
    { value: '14', label: 'osiągnięć' },
    { value: '3', label: 'questy dziennie' }
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

const QUESTS = [
    { task: 'Zagraj 7 gier', reward: '+$600 + XP' },
    { task: 'Wygraj 3 rundy Blackjacka', reward: '+$1,500 + XP' },
    { task: 'Postaw łącznie $20,000', reward: '+$1,800 + XP' },
    { task: 'Zagraj 5 rund Slotów', reward: '+$800 + XP' },
    { task: 'Wygraj 5 gier', reward: '+$1,000 + XP' },
    { task: 'Wygraj 3x Coinflip', reward: '+$600 + XP' }
];

const COMMANDS = [
    { group: 'Gry', list: GAMES.map(game => game.command) },
    { group: 'Ekonomia', list: ['/balance', '/profil', '/daily', '/kup-kredyty', '/sprzedaj-kredyty'] },
    { group: 'Rankingi i społeczność', list: ['/top', '/ranking', '/achievementy', '/questy', '/polecenie'] },
    { group: 'Inne', list: ['/pomoc', '/vote', '/zapros', '/ustawienia', '/ustawienia-serwera', '/zgłoszenie'] }
];

export default function RoyalCasinoPage() {
    return (
        <>
            <header className={`wrap ${styles.head}`}>
                <figure className={`v2-frame ${styles.logo}`}>
                    <img src="/RoyalCasinoBot/logo.png" alt="Logo RoyalCasino: korona nad trzema siódemkami" width={160} height={160} />
                </figure>
                <div className={styles.headText}>
                    <p className={styles.kicker}>Bot na Discorda</p>
                    <h1 className="page-title">RoyalCasino Bot</h1>
                    <p className="lead">
                        16 gier kasynowych na wirtualną walutę, ekonomia, osiągnięcia, dzienne questy i rankingi. Działa po polsku i po angielsku. Wyniki przychodzą w czytelnych embedach w
                        formacie RoyalCasino × Gra.
                    </p>
                    <div className={styles.cta}>
                        <a href={INVITE} className="btn btn-primary" target="_blank" rel="noopener">
                            <Icon name="bot" size={20} />
                            Dodaj do Discorda
                        </a>
                        <a href={VOTE} className="btn btn-ghost" target="_blank" rel="noopener">
                            Zagłosuj na top.gg
                            <Icon name="external" size={16} title="otwiera się w nowej karcie" />
                        </a>
                        <Link href="/kontakt" className="btn btn-ghost">
                            Kontakt
                        </Link>
                    </div>
                </div>
            </header>

            <div className="wrap">
                <dl className={styles.facts}>
                    {FACTS.map(fact => (
                        <div key={fact.label}>
                            <dt>{fact.label}</dt>
                            <dd>{fact.value}</dd>
                        </div>
                    ))}
                </dl>

                <p className={`notice ${styles.vote}`}>
                    <span>
                        Zagłosuj na RoyalCasino na top.gg i odbierz <strong>$1,000</strong>. Głosować możesz co 12 godzin, a nagrodę odbierasz komendą{' '}
                        <code>/vote</code> na Discordzie.
                    </span>
                    <a href={VOTE} className="btn btn-sm btn-ghost" target="_blank" rel="noopener">
                        Głosuj teraz
                    </a>
                </p>
            </div>

            <section className={`wrap ${styles.section}`} aria-labelledby="gry-tytul">
                <div className={styles.sectionHead}>
                    <h2 id="gry-tytul">Stół z grami</h2>
                    <p className="muted">16 gier. Każdą uruchamiasz komendą o tej samej nazwie.</p>
                </div>
                <ol role="list" className={styles.paytable}>
                    {GAMES.map(game => (
                        <li key={game.name} className={styles.game}>
                            <div className={styles.gameHead}>
                                <h3 className={styles.gameName}>{game.name}</h3>
                                <code className={styles.command}>{game.command}</code>
                            </div>
                            <p>{game.text}</p>
                            <p className={styles.gameMeta}>{game.meta.join('  ·  ')}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className={`wrap ${styles.section} ${styles.split}`} aria-labelledby="funkcje-tytul">
                <h2 id="funkcje-tytul">Co jeszcze potrafi bot</h2>
                <dl className={styles.features}>
                    {FEATURES.map(feature => (
                        <div key={feature.title}>
                            <dt>{feature.title}</dt>
                            <dd>{feature.text}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className={`wrap ${styles.section} ${styles.split}`} aria-labelledby="questy-tytul">
                <div>
                    <h2 id="questy-tytul">Przykładowe questy na jeden dzień</h2>
                    <p className="muted">Questy losują się codziennie. Swoje sprawdzisz przez /questy.</p>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Zadanie</th>
                                <th scope="col">Nagroda</th>
                            </tr>
                        </thead>
                        <tbody>
                            {QUESTS.map(quest => (
                                <tr key={quest.task}>
                                    <td>{quest.task}</td>
                                    <td className={styles.reward}>{quest.reward}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className={`wrap ${styles.section}`} aria-labelledby="komendy-tytul">
                <h2 id="komendy-tytul">Komendy</h2>
                <div className={styles.commands}>
                    {COMMANDS.map(group => (
                        <div key={group.group}>
                            <h3>{group.group}</h3>
                            <ul role="list">
                                {group.list.map(command => (
                                    <li key={command}>
                                        <code>{command}</code>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            <section className={`wrap ${styles.section} ${styles.docs}`} aria-labelledby="dokumenty-tytul">
                <h2 id="dokumenty-tytul">Dokumenty i pomoc</h2>
                <ul role="list" className={styles.docLinks}>
                    <li>
                        <Link href="/RoyalCasinoBot/regulamin">Regulamin</Link>
                    </li>
                    <li>
                        <Link href="/RoyalCasinoBot/polityka">Polityka prywatności</Link>
                    </li>
                    <li>
                        <a href={TOPGG} target="_blank" rel="noopener">
                            Strona bota na top.gg
                        </a>
                    </li>
                    <li>
                        <Link href="/kontakt">Kontakt</Link>
                    </li>
                </ul>
                <a href="https://panel.skillhost.pl/ref/wojtoteka" className={styles.host} target="_blank" rel="noopener">
                    Bot działa na serwerach
                    <img src="/RoyalCasinoBot/skillhost-color.svg" alt="Skillhost" width={96} height={24} />
                </a>
            </section>
        </>
    );
}
