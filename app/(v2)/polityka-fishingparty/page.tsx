import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: Fishing Party',
    description: 'Polityka prywatności gry Fishing Party na Androida: gra działa offline, a opcjonalne konto online i ranking top 100 zapisują na serwerze nick, hasło (zaszyfrowane), opcjonalnie e-mail i postęp w grze.',
    alternates: { canonical: '/polityka-fishingparty' }
};

const TOC = [
    { id: 's1', label: 'Administrator danych' },
    { id: 's2', label: 'Informacje ogólne o aplikacji' },
    { id: 's3', label: 'Dane zapisywane na telefonie' },
    { id: 's4', label: 'Konto online i ranking – jakie dane?' },
    { id: 's5', label: 'Uprawnienia aplikacji' },
    { id: 's6', label: 'Cele i podstawy prawne' },
    { id: 's7', label: 'Ochrona przed oszustwami' },
    { id: 's8', label: 'Gdzie i jak przechowujemy dane' },
    { id: 's9', label: 'Okres przechowywania danych' },
    { id: 's10', label: 'Odbiorcy danych' },
    { id: 's11', label: 'Twoje prawa zgodnie z RODO' },
    { id: 's12', label: 'Usunięcie konta' },
    { id: 's13', label: 'Pliki cookies i śledzenie' },
    { id: 's14', label: 'Dzieci' },
    { id: 's15', label: 'Brak reklam i płatności' },
    { id: 's16', label: 'Bezpieczeństwo danych' },
    { id: 's17', label: 'Kontakt w sprawach prywatności' },
    { id: 's18', label: 'Zmiany w Polityce Prywatności' },
    { id: 's19', label: 'Przepisy prawa' },
    { id: 's20', label: 'Podsumowanie' }
];

export default function Page() {
    return (
        <LegalPage
            subject="Fishing Party"
            updated="11 października 2026"
            toc={TOC}
            note={
                <p>
                    Zasady korzystania z konta online i rankingu opisuje <Link href="/regulamin-fishingparty">Regulamin Fishing Party</Link>.
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
            <h2 id="s2">2. Informacje ogólne o aplikacji</h2>
            <p>Aplikacja <strong>Fishing Party</strong> to darmowa gra zręcznościowa na Androida, dostępna w sklepie Google Play. Od wersji 2.0 jest to natywna aplikacja na Androida.</p>
            <div className="notice">
            <p><strong>Kluczowa informacja:</strong> Gra działa w pełni offline i bez konta – wtedy wszystkie dane zostają wyłącznie na Twoim telefonie. Od wersji <strong>2.1</strong> możesz <strong>dobrowolnie</strong> założyć konto online, żeby brać udział w rankingu top 100 i synchronizować postęp między urządzeniami. Tylko wtedy aplikacja wysyła dane na nasz serwer <strong>fp.wojtoteka.ovh</strong>, opisane w punkcie 4.</p>
            </div>
            <h2 id="s3">3. Dane zapisywane na telefonie</h2>
            <p>Aby zapamiętać Twoje postępy, gra zapisuje w pamięci Twojego urządzenia dane dotyczące rozgrywki i ustawień:</p>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr><th scope="col">Rodzaj danych</th><th scope="col">Przykłady</th><th scope="col">Cel</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Postęp w grze</td><td>Odblokowane poziomy, najlepszy wynik i gwiazdki z każdego poziomu, liczba złowionych ryb, monety zdobyte w grze</td><td>Kontynuowanie gry i bicie własnych rekordów</td></tr>
                        <tr><td>Przedmioty i osiągnięcia</td><td>Kupione za monety z gry łodzie, żagle, załoga i wzmocnienia, wybrany wygląd łodzi, zdobyte i odebrane osiągnięcia</td><td>Działanie sklepu i osiągnięć</td></tr>
                        <tr><td>Nagroda dnia i passa</td><td>Dni, w których ukończono poziom, długość passy, zdobyte trofea, wykorzystane naprawy passy</td><td>Codzienne nagrody, passa i przypomnienia</td></tr>
                        <tr><td>Statystyki rozgrywki</td><td>Łączny czas gry, liczba wygranych poziomów, najwyższe combo, ostatnie ukończone przejazdy (numer poziomu, wynik, czas, liczba ryb, trafienia, combo, data) – najwyżej 50 ostatnich</td><td>Ekran statystyk, osiągnięcia oraz sprawdzanie, czy wynik jest możliwy do uzyskania</td></tr>
                        <tr><td>Ochrona zapisu</td><td>Licznik wykrytych prób zmodyfikowania pliku zapisu lub wyników</td><td>Uczciwe wyniki (ochrona przed oszukiwaniem)</td></tr>
                        <tr><td>Ustawienia</td><td>Muzyka, dźwięki, wibracje, przypomnienia i godzina pierwszego przypomnienia, ekran zawsze włączony, język gry, ukończenie samouczka</td><td>Zapamiętanie Twoich preferencji</td></tr>
                        <tr><td>Sesja konta (tylko z kontem online)</td><td>Token logowania, nick, e-mail konta, losowy identyfikator instalacji, informacja, co zostało już wysłane na serwer</td><td>Pozostanie zalogowanym i synchronizacja bez ponownego wpisywania hasła</td></tr>
                    </tbody>
                </table>
            </div>
            <p>Hasło do konta nie jest zapisywane na telefonie. Przy aktualizacji ze starszej wersji gry aplikacja jednorazowo odczytuje zapisany lokalnie przez poprzednią wersję najlepszy wynik i liczbę złowionych ryb, przelicza je na monety, a stare dane usuwa.</p>
            <h2 id="s4">4. Konto online i ranking – jakie dane?</h2>
            <p>Konto online jest <strong>dobrowolne</strong>. Zakładając je, akceptujesz <Link href="/regulamin-fishingparty">Regulamin Fishing Party</Link> i niniejszą Politykę. Dostępne są dwa rodzaje kont:</p>
            <ul>
            <li><strong>Konto „nick + hasło”</strong> (tryb rankingowy) – podajesz tylko nick i hasło. Po ponownej instalacji gry wpisujesz te same dane i postęp wraca. <strong>Hasła nie da się zresetować</strong>, bo nie znamy żadnego Twojego adresu kontaktowego.</li>
            <li><strong>Konto e-mail</strong> – podajesz adres e-mail, nick i hasło. Adres potwierdzasz kodem z wiadomości e-mail; tym samym sposobem możesz ustawić nowe hasło. E-mail możesz też później dodać do konta „nick + hasło”.</li>
            </ul>
            <p>Gdy masz konto, na serwerze przetwarzamy:</p>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr><th scope="col">Rodzaj danych</th><th scope="col">Szczegóły</th><th scope="col">Cel</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Dane konta</td><td>Nick, hasło w postaci skrótu kryptograficznego (scrypt – nikt, także administrator, nie zna Twojego hasła), opcjonalnie adres e-mail, data założenia konta, data ostatniej aktywności, wersja i data akceptacji regulaminu i polityki</td><td>Prowadzenie konta i logowanie</td></tr>
                        <tr><td>Kody e-mail</td><td>Jednorazowe 6-cyfrowe kody (w bazie tylko ich skrót), ważne 15 minut</td><td>Potwierdzenie adresu e-mail i ustawienie nowego hasła</td></tr>
                        <tr><td>Postęp w grze</td><td>Kopia zapisu gry opisanego w punkcie 3 (bez sesji konta), najlepszy wynik z każdego poziomu, trofea za passę, punkty rankingowe</td><td>Synchronizacja i przywracanie postępu na innym urządzeniu, ranking</td></tr>
                        <tr><td>Przejazdy</td><td>Dla każdego ukończonego poziomu: numer poziomu, wynik, czas, liczba ryb, trafienia, combo, liczba etapów, data</td><td>Weryfikacja wyników i ranking</td></tr>
                        <tr><td>Sygnały uczciwej gry</td><td>Licznik wykrytych w grze zmian zapisu lub wyników, informacja o wykryciu edycji pamięci gry, o nieczytelnym zapisie i o wersji testowej aplikacji, zdarzenia wykryte przez serwer (np. wynik niemożliwy na danym poziomie)</td><td>Ochrona rankingu przed oszustwami (punkt 7)</td></tr>
                        <tr><td>Sesje</td><td>Skrót tokenu logowania, losowy identyfikator instalacji gry, daty użycia</td><td>Utrzymanie zalogowania, rozpoznanie, z którego urządzenia pochodzi zapis</td></tr>
                        <tr><td>Adres IP</td><td>Przetwarzany przy każdym połączeniu z serwerem; limity zapytań działają na skrócie IP z solą, przechowywanym tylko w pamięci serwera. Adresu IP nie zapisujemy w bazie danych konta</td><td>Działanie połączenia, ochrona przed nadużyciami (np. zgadywaniem haseł)</td></tr>
                    </tbody>
                </table>
            </div>
            <p><strong>Widoczność w rankingu:</strong> inni gracze z kontem widzą w rankingu top 100 Twój <strong>nick</strong>, <strong>punkty rankingowe</strong>, <strong>pozycję</strong> i <strong>najwyższy ukończony poziom</strong>. Adres e-mail nigdy nie jest pokazywany innym. Nie używaj w nicku imienia i nazwiska ani innych danych, które pozwalają Cię zidentyfikować.</p>
            <p><strong>Nie zbieramy:</strong> imienia i nazwiska, numeru telefonu, lokalizacji, kontaktów, zdjęć ani plików z telefonu, identyfikatorów reklamowych, danych analitycznych o zachowaniu w aplikacji.</p>
            <h2 id="s5">5. Uprawnienia aplikacji</h2>
            <p>Aplikacja korzysta z następujących uprawnień systemu Android:</p>
            <ul>
            <li><strong>Internet i stan sieci</strong> – wyłącznie dla konta online i rankingu: połączenie z serwerem fp.wojtoteka.ovh oraz sprawdzenie, czy telefon ma internet (bez internetu ekrany konta i rankingu proszą o połączenie, a niewysłane wyniki czekają na powrót sieci). Bez konta aplikacja nie łączy się z naszym serwerem.</li>
            <li><strong>Wibracje</strong> – krótkie wibracje podczas rozgrywki. Możesz je wyłączyć w ustawieniach gry.</li>
            <li><strong>Powiadomienia</strong> – lokalne przypomnienia o passie: najwyżej 3 dziennie i tylko wtedy, gdy danego dnia nie ukończono jeszcze poziomu. Na Androidzie 13 i nowszym system pyta o zgodę. Powiadomienia są planowane przez sam telefon – nie są wysyłane z serwera.</li>
            <li><strong>Uruchamianie po starcie systemu</strong> – po ponownym uruchomieniu telefonu lub aktualizacji gry aplikacja odtwarza harmonogram przypomnień.</li>
            </ul>
            <p>Aplikacja <strong>nie ma</strong> dostępu do lokalizacji, aparatu, mikrofonu, kontaktów ani plików.</p>
            <h2 id="s6">6. Cele i podstawy prawne</h2>
            <ul>
            <li><strong>Zapis postępu i ustawień na telefonie</strong> – art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: prawidłowe działanie gry). Administrator nie ma dostępu do tych danych, dopóki nie założysz konta.</li>
            <li><strong>Prowadzenie konta, synchronizacja postępu, ranking, wysyłka kodów e-mail</strong> – art. 6 ust. 1 lit. b RODO (wykonanie umowy o świadczenie usługi drogą elektroniczną, zawartej przez akceptację Regulaminu Fishing Party).</li>
            <li><strong>Ochrona rankingu przed oszustwami i bezpieczeństwo serwera</strong> (weryfikacja wyników, sygnały uczciwej gry, limity zapytań) – art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: uczciwy ranking dla wszystkich graczy i ochrona kont).</li>
            <li><strong>Obsługa zgłoszeń i ewentualnych roszczeń</strong> – art. 6 ust. 1 lit. f RODO.</li>
            </ul>
            <p>Podanie danych jest dobrowolne, ale bez nicku i hasła nie da się założyć konta, a bez adresu e-mail – odzyskać hasła.</p>
            <h2 id="s7">7. Ochrona przed oszustwami</h2>
            <p>Poziomy w grze są generowane identycznie u wszystkich graczy, więc serwer zna ich parametry (liczbę ryb, etapów, minimalny czas, maksymalny możliwy wynik). Każdy przesłany przejazd jest automatycznie sprawdzany. Wynik niemożliwy do uzyskania jest odrzucany, a podejrzane sygnały są zapisywane. Gdy jest ich dużo, konto jest automatycznie <strong>ukrywane w rankingu</strong> – gra informuje o tym gracza. Ostateczną decyzję (przywrócenie, blokada) podejmuje administrator po sprawdzeniu historii przejazdów. Ukrycie w rankingu nie usuwa konta ani postępu. Jeśli uważasz, że to pomyłka, napisz na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a> – masz prawo do wyjaśnienia i zakwestionowania decyzji.</p>
            <h2 id="s8">8. Gdzie i jak przechowujemy dane</h2>
            <ul>
            <li><strong>Telefon:</strong> zapis gry i sesja konta są w prywatnym katalogu aplikacji, zaszyfrowane (AES-256-GCM) kluczem z systemowego magazynu Android Keystore. Są wyłączone z kopii zapasowej Google.</li>
            <li><strong>Serwer:</strong> dane konta są przechowywane w bazie danych MySQL na serwerze administratora, dostępnym pod adresem fp.wojtoteka.ovh. Połączenie z aplikacją jest szyfrowane (HTTPS), a każde żądanie jest dodatkowo podpisane.</li>
            <li>Dostęp do bazy ma wyłącznie administrator.</li>
            </ul>
            <h2 id="s9">9. Okres przechowywania danych</h2>
            <ul>
            <li><strong>Dane na telefonie</strong> – do odinstalowania aplikacji lub wyczyszczenia jej danych.</li>
            <li><strong>Konto, postęp, przejazdy i sygnały uczciwej gry</strong> – do usunięcia konta (przez Ciebie w grze albo na Twoją prośbę).</li>
            <li><strong>Sesje logowania</strong> – wygasają po 365 dniach bez użycia, a także po wylogowaniu lub zmianie hasła.</li>
            <li><strong>Kody e-mail i niedokończone rejestracje</strong> – 15 minut.</li>
            <li><strong>Skróty adresów IP używane do limitów zapytań</strong> – tylko w pamięci serwera, najwyżej godzinę.</li>
            </ul>
            <h2 id="s10">10. Odbiorcy danych</h2>
            <p>Nie sprzedajemy ani nie udostępniamy Twoich danych w celach marketingowych. Dane mogą trafiać wyłącznie do:</p>
            <ul>
            <li><strong>dostawcy serwera (hostingu)</strong> i <strong>dostawcy poczty e-mail (SMTP)</strong>, przez którego wysyłamy kody – tylko w zakresie niezbędnym do działania usługi, jako podmioty przetwarzające dane na zlecenie administratora;</li>
            <li><strong>innych graczy</strong> – wyłącznie nick, punkty, pozycja i najwyższy poziom w rankingu;</li>
            <li><strong>organów publicznych</strong> – gdy wymagają tego przepisy prawa.</li>
            </ul>
            <p>Aplikacja nie zawiera bibliotek analitycznych (np. Google Analytics, Firebase), sieci reklamowych ani trackerów.</p>
            <p><strong>Google Play:</strong> Aplikację pobierasz przez sklep Google Play, który działa według własnej polityki prywatności Google. Jeśli w ustawieniach telefonu zgodzisz się na udostępnianie Google danych diagnostycznych, deweloper może otrzymać zbiorcze, anonimowe statystyki (np. liczbę instalacji, raporty awarii).</p>
            <h2 id="s11">11. Twoje prawa zgodnie z RODO</h2>
            <ul>
            <li><strong>Dostęp do danych (art. 15):</strong> postęp, statystyki i dane konta widzisz w grze (Mapa, Odznaki, Ustawienia, Konto). Pełną kopię danych z serwera wyślemy na prośbę z adresu e-mail konta lub po potwierdzeniu, że konto należy do Ciebie.</li>
            <li><strong>Sprostowanie (art. 16):</strong> hasło i e-mail zmienisz w grze; zmianę nicku zrobimy na prośbę.</li>
            <li><strong>Usunięcie (art. 17):</strong> patrz punkt 12.</li>
            <li><strong>Ograniczenie przetwarzania (art. 18)</strong> i <strong>przenoszenie danych (art. 20):</strong> na prośbę wyślemy Twoje dane w formacie JSON.</li>
            <li><strong>Sprzeciw (art. 21):</strong> wobec przetwarzania na podstawie prawnie uzasadnionego interesu – możesz też w każdej chwili przestać korzystać z konta i je usunąć.</li>
            <li><strong>Skarga do organu nadzorczego:</strong> Prezes Urzędu Ochrony Danych Osobowych, ul. Stanisława Moniuszki 1A, 00-014 Warszawa.</li>
            </ul>
            <p>Ponieważ konto „nick + hasło” nie ma adresu e-mail, przy prośbach dotyczących takiego konta możemy poprosić o potwierdzenie, że należy ono do Ciebie (np. przez zalogowanie się w grze).</p>
            <h2 id="s12">12. Usunięcie konta</h2>
            <p>Konto usuniesz w dowolnej chwili w grze: <strong>KONTO → USUŃ KONTO</strong> (wymaga hasła). Usuwane są natychmiast i trwale: dane konta, wyniki w rankingu, przejazdy, sygnały uczciwej gry, sesje i kopia zapisu gry na serwerze. Postęp na Twoim telefonie zostaje.</p>
            <p>Jeśli nie masz już dostępu do gry, napisz na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a> (najlepiej z adresu e-mail konta) lub przez <a href="/kontakt">formularz kontaktowy</a>, podając nick – usuniemy konto w ciągu 30 dni.</p>
            <h2 id="s13">13. Pliki cookies i śledzenie</h2>
            <p>Aplikacja <strong>nie używa plików cookies</strong>, identyfikatorów reklamowych ani technologii śledzących. Losowy identyfikator instalacji służy wyłącznie do synchronizacji zapisu Twojego konta i nie jest łączony z innymi danymi o urządzeniu.</p>
            <h2 id="s14">14. Dzieci</h2>
            <p>Gra bez konta jest odpowiednia dla wszystkich grup wiekowych – nie zbiera żadnych danych osobowych. Konto online mogą zakładać osoby, które ukończyły <strong>16 lat</strong>. Osoba młodsza może założyć konto wyłącznie za zgodą rodzica lub opiekuna prawnego. Rodzic może w każdej chwili poprosić o usunięcie konta dziecka (punkt 12). Zalecamy, aby dzieci korzystały z konta „nick + hasło” bez adresu e-mail i nie używały w nicku prawdziwych danych.</p>
            <h2 id="s15">15. Brak reklam i płatności</h2>
            <p>Aplikacja Fishing Party jest <strong>w 100% darmowa</strong>, nie zawiera reklam ani płatności za prawdziwe pieniądze. Monety w grze zdobywa się wyłącznie w rozgrywce i nie można ich kupić ani wymienić na pieniądze. Jeśli kiedykolwiek pojawią się reklamy lub płatności, polityka zostanie wcześniej zaktualizowana.</p>
            <h2 id="s16">16. Bezpieczeństwo danych</h2>
            <ul>
            <li>Połączenie z serwerem jest szyfrowane (HTTPS), a każde żądanie podpisane i ważne tylko raz.</li>
            <li>Hasła przechowujemy jako skróty scrypt z losową solą; tokeny logowania i kody e-mail – wyłącznie jako skróty.</li>
            <li>Po kilku błędnych hasłach konto jest czasowo blokowane; liczba prób rejestracji, logowania i wysyłki e-maili jest ograniczona.</li>
            <li>Zmiana lub reset hasła wylogowuje pozostałe urządzenia.</li>
            <li>Zapis gry na telefonie jest zaszyfrowany, a próby jego modyfikacji są wykrywane.</li>
            <li>Używaj hasła, którego nie używasz w innych serwisach. Do konta „nick + hasło” nie da się odzyskać dostępu po zapomnieniu hasła.</li>
            </ul>
            <p>W razie naruszenia ochrony danych, które może powodować ryzyko dla Twoich praw, poinformujemy o tym Prezesa UODO, a w razie wysokiego ryzyka – także Ciebie (jeśli konto ma adres e-mail).</p>
            <h2 id="s17">17. Kontakt w sprawach prywatności</h2>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <p>Odpowiemy na Twoje zapytanie w ciągu 30 dni, zgodnie z wymogami RODO.</p>
            <h2 id="s18">18. Zmiany w Polityce Prywatności</h2>
            <p>Polityka może się zmieniać wraz z przepisami prawa i nowymi funkcjami aplikacji. O istotnych zmianach dotyczących konta online poinformujemy w aplikacji – gra może poprosić o ponowną akceptację. Data ostatniej aktualizacji jest podana na górze dokumentu.</p>
            <h2 id="s19">19. Przepisy prawa</h2>
            <ul>
            <li><strong>RODO</strong> – Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679</li>
            <li><strong>Ustawa o ochronie danych osobowych</strong> z dnia 10 maja 2018 r.</li>
            <li><strong>Ustawa o świadczeniu usług drogą elektroniczną</strong> z dnia 18 lipca 2002 r.</li>
            <li><strong>Prawo komunikacji elektronicznej</strong> z dnia 12 lipca 2024 r.</li>
            </ul>
            <h2 id="s20">20. Podsumowanie</h2>
            <div className="notice">
            <ul>
            <li>Bez konta gra działa offline i nic nie wysyła – dane są zaszyfrowane na telefonie</li>
            <li>Konto online jest dobrowolne: nick + hasło albo e-mail + nick + hasło</li>
            <li>Na serwerze: dane konta, kopia postępu, przejazdy i sygnały uczciwej gry – do usunięcia konta</li>
            <li>W rankingu inni widzą tylko nick, punkty, pozycję i poziom</li>
            <li>Konto usuniesz w grze jednym przyciskiem</li>
            <li>Brak reklam, płatności, cookies, analityki i trackerów</li>
            </ul>
            </div>
        </LegalPage>
    );
}
