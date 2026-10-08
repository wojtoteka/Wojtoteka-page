import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: RoyalCasino Bot',
    description: 'Polityka prywatności bota RoyalCasino na Discordzie: kto jest administratorem, jakie dane bot zapisuje, co widać w publicznym rankingu, na jakiej podstawie i jak poprosić o usunięcie danych.',
    alternates: { canonical: '/RoyalCasinoBot/polityka' }
};

const TOC = [
    { id: 's1', label: 'Administrator danych' },
    { id: 's2', label: 'Dane, które zbieramy' },
    { id: 's3', label: 'Jak wykorzystujemy Twoje dane' },
    { id: 's4', label: 'Publiczny ranking na stronie' },
    { id: 's5', label: 'Podstawa prawna przetwarzania' },
    { id: 's6', label: 'Odbiorcy danych' },
    { id: 's7', label: 'Przechowywanie i bezpieczeństwo danych' },
    { id: 's8', label: 'Twoje prawa' },
    { id: 's9', label: 'Kontakt' }
];

export default function Page() {
    return (
        <LegalPage
            title="Polityka prywatności"
            subject="RoyalCasino Bot"
            updated="8 października 2026"
            toc={TOC}
            note={
                <p>
                    Niniejsza Polityka Prywatności dotyczy bota Discord <strong>RoyalCasino</strong> oraz rankingu bota na stronie wojtoteka.ovh. Zobacz też: <Link href="/RoyalCasinoBot/regulamin">Regulamin</Link> i <Link href="/RoyalCasinoBot">stronę bota</Link>.
                </p>
            }
        >
            <h2 id="s1">1. Administrator danych</h2>
            <p>Administratorem Twoich danych osobowych w rozumieniu Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) jest:</p>
            <ul>
            <li><strong>Wojciech Szaliński</strong> (Wojtoteka)</li>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <h2 id="s2">2. Dane, które zbieramy</h2>
            <p>Korzystając z bota <strong>RoyalCasino</strong>, zapisujemy następujące informacje:</p>
            <ul>
            <li><strong>Discord User ID</strong> - do identyfikacji Twojego konta</li>
            <li><strong>Nazwa użytkownika, nazwa wyświetlana i identyfikator awatara</strong> z Discorda - odświeżane, gdy korzystasz z bota, żeby pokazać Cię w rankingu na stronie (patrz punkt 4). Nie zapisujemy pseudonimów serwerowych ani samych obrazków, tylko identyfikator, po którym Discord udostępnia awatar</li>
            <li><strong>Historia gier</strong> - rodzaj gry, stawka, wygrana, wynik, czas i ID serwera, na którym grasz</li>
            <li><strong>Statystyki</strong> - liczba gier, wygranych i przegranych, największa wygrana, łącznie postawiona kwota, poziom i XP</li>
            <li><strong>Saldo wirtualnej waluty i kredytów</strong>, cashback VIP oraz poziom VIP wynikający z postawionych kwot</li>
            <li><strong>Postęp osiągnięć i dziennych questów</strong> oraz daty ich ukończenia</li>
            <li><strong>Historia głosowań</strong> na top.gg, daty odbioru dziennych bonusów i długość serii</li>
            <li><strong>Polecenia</strong> - kto kogo zaprosił przez <code>/polecenie</code></li>
            <li><strong>Sklep motywów</strong> - kupione motywy karty profilu i motyw, którego używasz</li>
            <li><strong>Royal Jackpot i Crash Live</strong> - liczba kupionych biletów w danej rundzie i zakłady w rundach Crash Live</li>
            <li><strong>Dropy</strong> - które dropy odebrałeś, kiedy i na jaką kwotę</li>
            <li><strong>Ustawienia gracza</strong> - wybrany język, przyjmowanie pojedynków, przypomnienie o głosowaniu i to, czy widziałeś powitanie po pierwszej grze</li>
            <li><strong>Ustawienia serwera</strong> - kanał kasyna, kanał dropów i ogłoszeń, język serwera i włączenie pojedynków, ustawione przez administratora serwera, a także nazwa, ikona i liczba członków serwera oraz data dodania i usunięcia bota</li>
            <li><strong>Zgłoszenia</strong> - treść, którą wysyłasz przez <code>/zgłoszenie</code>, oraz ID zgłaszanego gracza, jeśli go wskażesz</li>
            <li><strong>Dane moderacyjne</strong> - blokady i zamrożenia konta (z powodem i czasem trwania), limity zakładów, notatki administratora, oznaczenie konta do obserwacji, korekty salda oraz dziennik działań administracyjnych</li>
            </ul>
            <p>Na serwerach, na których administrator włączył dropy, bot liczy aktywność: zauważa, że ktoś napisał wiadomość, i sprawdza wiek konta oraz to, jak długo autor jest na serwerze. Dzięki temu drop pojawia się tylko przy prawdziwej rozmowie kilku osób i nie da się go farmić. Te informacje są trzymane wyłącznie w pamięci przez około 10 minut i nie trafiają do bazy. <strong>Treści wiadomości bot nie odczytuje.</strong></p>
            <h2 id="s3">3. Jak wykorzystujemy Twoje dane</h2>
            <ul>
            <li>Zapewnienie działania gier kasynowych, jackpota, dropów i wirtualnej waluty</li>
            <li>Obliczanie i wyświetlanie statystyk, profili i tablic wyników - w Discordzie i na stronie wojtoteka.ovh</li>
            <li>Ogłaszanie wielkich wygranych i zwycięzców jackpota na kanale, który wskazał administrator serwera</li>
            <li>Wysyłanie powiadomień na DM (awanse, osiągnięcia, duże wygrane, przypomnienie o głosowaniu, jeśli je włączysz)</li>
            <li>Rozpatrywanie zgłoszeń błędów i nadużyć</li>
            <li>Zapobieganie nadużyciom i utrzymanie uczciwej rozgrywki</li>
            </ul>
            <p>Bot automatycznie oznacza nietypowe wyniki (na przykład bardzo wysoki zysk w stosunku do postawionych kwot albo wyjątkowo duże wygrane) i wysyła je do administratora do sprawdzenia. O blokadzie, korekcie salda czy innym działaniu decyduje zawsze człowiek. Nie podejmujemy wobec Ciebie decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, które wywoływałyby skutki prawne (art. 22 RODO). Wyniki gier losuje generator liczb losowych i dotyczą one wyłącznie wirtualnej waluty.</p>
            <h2 id="s4">4. Publiczny ranking na stronie</h2>
            <p>Na stronach <Link href="/RoyalCasinoBot">wojtoteka.ovh/RoyalCasinoBot</Link> i <Link href="/RoyalCasinoBot/ranking">/RoyalCasinoBot/ranking</Link> pokazujemy najlepszych graczy. Jeśli trafisz do rankingu, każdy odwiedzający zobaczy:</p>
            <ul>
            <li>Twoją nazwę wyświetlaną (albo nazwę użytkownika) i awatar z Discorda</li>
            <li>wartość, według której liczony jest ranking (saldo, poziom, łącznie postawiona kwota, największa wygrana albo liczbę gier), Twój poziom i poziom VIP</li>
            <li>duże wygrane z ostatnich 7 dni (gra, stawka i wygrana) oraz wygraną w Royal Jackpot</li>
            </ul>
            <p>Na stronie pokazujemy też serwery z największym obrotem: ich nazwę, ikonę, liczbę członków, graczy i gier. Konta zablokowane nie trafiają do rankingu. Awatary i ikony pobiera serwer strony, więc przeglądarka odwiedzającego nie łączy się przy tym z Discordem.</p>
            <p><strong>Nie chcesz być widoczny w rankingu na stronie?</strong> Napisz przez <code>/zgłoszenie</code> albo na adres podany niżej. Ukryjemy Twoje konto w rankingu na stronie, a gra w bocie działa dalej bez zmian.</p>
            <h2 id="s5">5. Podstawa prawna przetwarzania</h2>
            <p>Przetwarzanie Twoich danych w związku z korzystaniem z bota RoyalCasino odbywa się na podstawie:</p>
            <ul>
            <li><strong>Art. 6 ust. 1 lit. b RODO</strong> - przetwarzanie jest niezbędne do świadczenia usługi bota (prowadzenie salda, historii i statystyk gier, postępu i ustawień), z której korzystasz akceptując <a href="/RoyalCasinoBot/regulamin">Regulamin</a></li>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora polegający na prowadzeniu tablic wyników (także na stronie internetowej), ogłaszaniu wygranych, zapobieganiu nadużyciom, rozpatrywaniu zgłoszeń i zapewnieniu uczciwej rozgrywki</li>
            </ul>
            <h2 id="s6">6. Odbiorcy danych</h2>
            <ul>
            <li><strong>NIE sprzedajemy</strong> ani nie wymieniamy Twoich danych</li>
            <li><strong>Dostawca hostingu</strong> (Skillhost) - na jego serwerach działa bot, strona wojtoteka.ovh i wspólna baza danych. Ma dostęp do danych tylko w zakresie potrzebnym do utrzymania serwera</li>
            <li><strong>Discord</strong> - komendy i odpowiedzi bota przechodzą przez Discorda, który przetwarza je zgodnie z własną <a href="https://discord.com/privacy" target="_blank" rel="noopener">polityką prywatności</a></li>
            <li><strong>top.gg</strong> - gdy głosujesz na bota, top.gg przekazuje nam Twoje Discord User ID, żeby przyznać nagrodę. Serwis działa według własnej polityki prywatności</li>
            <li><strong>Inni użytkownicy i odwiedzający stronę</strong> - część danych (nazwa, awatar, saldo, poziom, statystyki, duże wygrane) jest widoczna w tablicach wyników, profilach, ogłoszeniach na serwerach i w rankingu na stronie</li>
            </ul>
            <h2 id="s7">7. Przechowywanie i bezpieczeństwo danych</h2>
            <ul>
            <li>Dane są przechowywane w zabezpieczonej bazie danych, do której dostęp ma tylko administrator, także przez chroniony hasłem panel administracyjny strony</li>
            <li><strong>NIE</strong> przechowujemy treści Twoich wiadomości. Wyjątkiem jest treść zgłoszeń, które sam wysyłasz przez <code>/zgłoszenie</code></li>
            <li>Dane konta, historia gier i statystyki są przechowywane tak długo, jak korzystasz z bota - w każdej chwili możesz poprosić o ich usunięcie. Usunięcie konta kasuje także zapisany nick i awatar</li>
            <li>Nazwa, ikona i dane serwera zostają po usunięciu bota z serwera razem ze statystykami gier rozegranych na tym serwerze; administrator serwera może poprosić o ich usunięcie</li>
            <li>Zgłoszenia przechowujemy przez czas potrzebny do ich rozpatrzenia, a dane moderacyjne tak długo, jak są potrzebne do zapobiegania nadużyciom</li>
            </ul>
            <div className="notice">
            <p><strong>Ważna informacja:</strong> RoyalCasino nie czyta ani nie przechowuje treści Twoich wiadomości. Przetwarzamy wyłącznie komendy i przyciski skierowane bezpośrednio do bota.</p>
            </div>
            <h2 id="s8">8. Twoje prawa</h2>
            <p>Zgodnie z RODO przysługują Ci następujące prawa:</p>
            <ul>
            <li><strong>Prawo dostępu i sprostowania danych (Art. 15, 16 RODO)</strong> - skontaktuj się z nami, aby sprawdzić lub poprawić swoje dane</li>
            <li><strong>Prawo do usunięcia danych (Art. 17 RODO)</strong> - skontaktuj się z administratorem, aby zażądać usunięcia</li>
            <li><strong>Prawo do ograniczenia przetwarzania (Art. 18 RODO)</strong> - możesz poprosić o wstrzymanie przetwarzania na czas wyjaśnienia sprawy</li>
            <li><strong>Prawo do przenoszenia danych (Art. 20 RODO)</strong> - na prośbę wyślemy Ci Twoje dane w popularnym formacie</li>
            <li><strong>Prawo do sprzeciwu (Art. 21 RODO)</strong> - wobec przetwarzania opartego na prawnie uzasadnionym interesie, w tym wobec pokazywania Cię w rankingu na stronie; napisz do nas, a rozpatrzymy sprzeciw</li>
            <li><strong>Rezygnacja z powiadomień DM</strong> - wyłącz je w ustawieniach bota</li>
            <li><strong>Prawo do wniesienia skargi:</strong> masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stanisława Moniuszki 1A, 00-014 Warszawa), jeśli uważasz, że przetwarzanie Twoich danych narusza przepisy RODO</li>
            </ul>
            <p>Na wnioski odpowiadamy bez zbędnej zwłoki, najpóźniej w ciągu miesiąca.</p>
            <h2 id="s9">9. Kontakt</h2>
            <p>W sprawie kwestii dotyczących prywatności skontaktuj się z nami:</p>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
        </LegalPage>
    );
}
