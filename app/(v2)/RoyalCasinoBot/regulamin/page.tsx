import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Regulamin: RoyalCasino Bot',
    description: 'Regulamin bota RoyalCasino na Discordzie: wirtualna waluta, zasady korzystania i zabronione działania.',
    alternates: { canonical: '/RoyalCasinoBot/regulamin' }
};

const TOC = [
    { id: 's1', label: 'Akceptacja regulaminu' },
    { id: 's2', label: 'Opis usługi' },
    { id: 's3', label: 'Obowiązki użytkownika' },
    { id: 's4', label: 'Wirtualna waluta' },
    { id: 's5', label: 'Zabronione działania' },
    { id: 's6', label: 'Zastrzeżenia' },
    { id: 's7', label: 'Wypowiedzenie' },
    { id: 's8', label: 'Ograniczenie odpowiedzialności' },
    { id: 's9', label: 'Zmiany w regulaminie' },
    { id: 's10', label: 'Prawo właściwe' },
    { id: 's11', label: 'Zgłoszenia i reklamacje' }
];

export default function Page() {
    return (
        <LegalPage
            title="Regulamin"
            subject="RoyalCasino Bot"
            updated="8 października 2026"
            toc={TOC}
            note={
                <p>
                    Niniejszy Regulamin dotyczy bota Discord <strong>RoyalCasino</strong>. Zobacz też: <Link href="/RoyalCasinoBot/polityka">Polityka prywatności</Link> i <Link href="/RoyalCasinoBot">stronę bota</Link>.
                </p>
            }
        >
            <h2 id="s1">1. Akceptacja regulaminu</h2>
            <p>Korzystając z bota <strong>RoyalCasino</strong>, akceptujesz niniejszy Regulamin. Jeśli nie zgadzasz się z jego postanowieniami, natychmiast zaprzestań korzystania z bota.</p>
            <p>Bota prowadzi <strong>Wojciech Szaliński</strong> (Wojtoteka), kontakt: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>. Korzystanie z bota jest bezpłatne.</p>
            <h2 id="s2">2. Opis usługi</h2>
            <p>RoyalCasino to bot Discord oferujący wirtualne gry kasynowe (Blackjack, Poker, Ruletka, Sloty, Crash, Crash Live, Coinflip, Kości, Wojna, Hi-Lo, Miny, Zdrapka, Koło Fortuny, Keno, Plinko, Limbo, Pojedynek) z fikcyjną walutą. Bot zawiera system questów, głosowania, ekonomii z poziomami VIP i cashbackiem, codzienną loterię Royal Jackpot, dropy na serwerach, sklep z motywami profilu, osiągnięcia oraz rankingi - w Discordzie i na stronie <Link href="/RoyalCasinoBot/ranking">wojtoteka.ovh/RoyalCasinoBot/ranking</Link>. Cała waluta, bilety, motywy i inne przedmioty są <strong>wirtualne i nie mają żadnej wartości pieniężnej w świecie rzeczywistym</strong>.</p>
            <div className="notice">
            <p><strong>Ważne:</strong> RoyalCasino jest usługą rozrywkową. Wirtualna waluta nie może być wymieniana na prawdziwe pieniądze, towary ani usługi.</p>
            </div>
            <h2 id="s3">3. Obowiązki użytkownika</h2>
            <ul>
            <li>Musisz mieć ukończone <strong>13 lat</strong> (wymóg Regulaminu Discorda)</li>
            <li><strong>NIE</strong> próbuj wykorzystywać, hakować ani nadużywać funkcjonalności bota</li>
            <li><strong>NIE</strong> używaj automatycznych narzędzi, botów ani skryptów do interakcji z RoyalCasino</li>
            <li><strong>NIE</strong> nękaj innych użytkowników ani właściciela bota</li>
            </ul>
            <h2 id="s4">4. Wirtualna waluta</h2>
            <ul>
            <li>Cała waluta jest <strong>fikcyjna</strong> i nie może być wymieniona na prawdziwe pieniądze</li>
            <li>Zastrzegamy sobie prawo do korekty sald w celu naprawy błędów lub exploitów</li>
            <li>Waluty <strong>nie da się kupić</strong> za prawdziwe pieniądze i nie da się jej wypłacić. Bot nie oferuje nagród rzeczowych ani pieniężnych</li>
            <li>Waluta może zostać zresetowana podczas dużych aktualizacji (z wcześniejszym powiadomieniem)</li>
            <li>Bilety Royal Jackpot, cashback VIP, dropy i motywy profilu są częścią tej samej wirtualnej ekonomii i podlegają tym samym zasadom</li>
            </ul>
            <h3>Rankingi</h3>
            <p>Najlepsi gracze trafiają do rankingów w Discordzie i na stronie wojtoteka.ovh, gdzie widać ich nazwę z Discorda, awatar i wyniki. Szczegóły opisuje <Link href="/RoyalCasinoBot/polityka">Polityka prywatności</Link>. Jeśli nie chcesz być widoczny w rankingu na stronie, napisz przez <code>/zgłoszenie</code> - ukryjemy Twoje konto bez wpływu na grę.</p>
            <h2 id="s5">5. Zabronione działania</h2>
            <div className="notice notice-error">
            <p><strong>Następujące działania są surowo zabronione:</strong></p>
            <ul>
            <li>Wykorzystywanie błędów (exploitów) lub nieuczciwa rozgrywka</li>
            <li>Udostępnianie konta lub posiadanie wielu kont w celu uzyskania przewagi</li>
            <li>Sprzedawanie lub kupowanie wirtualnej waluty, kont i przedmiotów za prawdziwe pieniądze, także poza botem</li>
            <li>Ustawianie wyników pojedynków i przekazywanie waluty między kontami przez celowe przegrane</li>
            <li>Sztuczne nabijanie aktywności na serwerze (np. pisanie przez kilka kont albo boty), żeby wywołać dropy, oraz odbieranie dropów lub kupowanie biletów jackpota z wielu kont</li>
            <li>Spamowanie komend lub nadużywanie funkcji bota</li>
            <li>Łamanie <a href="https://discord.com/terms" target="_blank" rel="noopener">Regulaminu Discorda</a> lub Wytycznych Społeczności</li>
            </ul>
            </div>
            <h2 id="s6">6. Zastrzeżenia</h2>
            <ul>
            <li>RoyalCasino jest dostarczany w stanie <strong>„TAK JAK JEST”</strong> bez żadnych gwarancji</li>
            <li><strong>NIE</strong> ponosimy odpowiedzialności za utratę wirtualnej waluty z powodu błędów lub przestojów</li>
            <li>Gry wykorzystują generator liczb losowych - wyniki nie są gwarantowane</li>
            </ul>
            <h2 id="s7">7. Wypowiedzenie</h2>
            <p>Zastrzegamy sobie prawo do:</p>
            <ul>
            <li>Zbanowania użytkowników łamiących niniejszy Regulamin, na czas określony albo na stałe</li>
            <li>Łagodniejszych środków na czas wyjaśnienia sprawy: zamrożenia konta (bez możliwości gry), limitu wysokości zakładów albo korekty salda</li>
            <li>Wyłączenia dropów na serwerze, na którym dochodzi do nadużyć</li>
            <li>Zawieszenia lub wyłączenia bota w dowolnym momencie bez uprzedzenia</li>
            <li>Modyfikacji funkcji, wartości walut lub mechanik gier</li>
            </ul>
            <h2 id="s8">8. Ograniczenie odpowiedzialności</h2>
            <p>RoyalCasino to darmowa usługa rozrywkowa. Nie ponosimy odpowiedzialności za szkody wynikające z korzystania z bota lub jego niedostępności, w granicach dopuszczalnych przez prawo. Postanowienie to nie wyłącza praw, które przysługują konsumentom na mocy przepisów bezwzględnie obowiązujących.</p>
            <h2 id="s9">9. Zmiany w regulaminie</h2>
            <p>Możemy zaktualizować niniejszy Regulamin, np. przy nowych grach lub zmianie przepisów. Datę zmiany pokazujemy na górze dokumentu. Dalsze korzystanie z bota oznacza akceptację zaktualizowanego Regulaminu.</p>
            <h2 id="s10">10. Prawo właściwe</h2>
            <p>Niniejszy Regulamin podlega prawu <strong>Rzeczypospolitej Polskiej</strong>.</p>
            <h2 id="s11">11. Zgłoszenia i reklamacje</h2>
            <p>Błędy, nadużycia innych graczy i reklamacje zgłosisz komendą <code>/zgłoszenie</code> albo:</p>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <p>Opisz problem i podaj swoją nazwę na Discordzie. Odpowiadamy w ciągu <strong>14 dni</strong>.</p>
        </LegalPage>
    );
}
