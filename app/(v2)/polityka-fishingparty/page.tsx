import type { Metadata } from 'next';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: Fishing Party',
    description: 'Polityka prywatności gry Fishing Party na Androida: gra działa offline, postęp zapisuje zaszyfrowany na telefonie i nie wysyła żadnych danych.',
    alternates: { canonical: '/polityka-fishingparty' }
};

const TOC = [
    { id: 's1', label: 'Administrator danych' },
    { id: 's2', label: 'Informacje ogólne o aplikacji' },
    { id: 's3', label: 'Jakie dane są zapisywane?' },
    { id: 's4', label: 'Uprawnienia aplikacji' },
    { id: 's5', label: 'Podstawa prawna i cel przetwarzania' },
    { id: 's6', label: 'Sposób i miejsce przechowywania danych' },
    { id: 's7', label: 'Okres przechowywania danych' },
    { id: 's8', label: 'Twoje prawa zgodnie z RODO' },
    { id: 's9', label: 'Brak przekazywania danych osobom trzecim' },
    { id: 's10', label: 'Brak działania online i ranking' },
    { id: 's11', label: 'Pliki cookies i śledzenie' },
    { id: 's12', label: 'Ochrona danych dzieci' },
    { id: 's13', label: 'Brak reklam i płatności' },
    { id: 's14', label: 'Bezpieczeństwo danych' },
    { id: 's15', label: 'Kontakt w sprawach prywatności' },
    { id: 's16', label: 'Zmiany w Polityce Prywatności' },
    { id: 's17', label: 'Przepisy prawa' },
    { id: 's18', label: 'Podsumowanie' }
];

export default function Page() {
    return (
        <LegalPage subject="Fishing Party" updated="10 października 2026" toc={TOC}>
            <h2 id="s1">1. Administrator danych</h2>
            <p>Administratorem Twoich danych osobowych w rozumieniu Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) jest:</p>
            <ul>
            <li><strong>Wojciech Szaliński</strong> (Wojtoteka)</li>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <h2 id="s2">2. Informacje ogólne o aplikacji</h2>
            <p>Aplikacja <strong>Fishing Party</strong> to darmowa gra zręcznościowa na Androida, dostępna w sklepie Google Play. Od wersji 2.0 jest to natywna aplikacja na Androida (wcześniejsze wersje działały w oparciu o technologię webową HTML5/JavaScript).</p>
            <div className="notice">
            <p><strong>Kluczowa informacja:</strong> Fishing Party działa w 100% lokalnie na Twoim urządzeniu. Aplikacja nie ma uprawnienia do korzystania z internetu, więc nie może niczego wysłać. Nie zbieramy, nie przesyłamy i nie przechowujemy żadnych danych na naszych serwerach.</p>
            </div>
            <h2 id="s3">3. Jakie dane są zapisywane?</h2>
            <p>Aby zapamiętać Twoje postępy, gra zapisuje w pamięci Twojego urządzenia wyłącznie dane dotyczące rozgrywki i ustawień:</p>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr><th scope="col">Rodzaj danych</th><th scope="col">Przykłady</th><th scope="col">Cel</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Postęp w grze</td><td>Odblokowane poziomy, najlepszy wynik i gwiazdki z każdego poziomu, liczba złowionych ryb, monety zdobyte w grze</td><td>Kontynuowanie gry i bicie własnych rekordów</td></tr>
                        <tr><td>Przedmioty i osiągnięcia</td><td>Kupione za monety z gry łodzie, żagle, załoga i wzmocnienia, wybrany wygląd łodzi, zdobyte i odebrane osiągnięcia</td><td>Działanie sklepu i osiągnięć</td></tr>
                        <tr><td>Nagroda dnia i passa</td><td>Dni, w których ukończono poziom, długość passy, zdobyte trofea, wykorzystane naprawy passy</td><td>Codzienne nagrody, passa i przypomnienia</td></tr>
                        <tr><td>Statystyki rozgrywki</td><td>Łączny czas gry, liczba wygranych poziomów, najwyższe combo, ostatnie ukończone przejazdy (numer poziomu, wynik, czas, liczba ryb, data) – najwyżej 50 ostatnich</td><td>Ekran statystyk, osiągnięcia oraz sprawdzanie, czy wynik jest możliwy do uzyskania</td></tr>
                        <tr><td>Ochrona zapisu</td><td>Licznik wykrytych prób zmodyfikowania pliku zapisu</td><td>Uczciwe wyniki (ochrona przed oszukiwaniem)</td></tr>
                        <tr><td>Ustawienia</td><td>Muzyka, dźwięki, wibracje, przypomnienia i godzina pierwszego przypomnienia, ekran zawsze włączony, język gry, ukończenie samouczka</td><td>Zapamiętanie Twoich preferencji</td></tr>
                    </tbody>
                </table>
            </div>
            <p>Przy aktualizacji ze starszej wersji gry aplikacja jednorazowo odczytuje zapisany lokalnie przez poprzednią wersję najlepszy wynik i liczbę złowionych ryb, przelicza je na monety w nowej wersji, a stare dane usuwa.</p>
            <p><strong>Nie zbieramy:</strong></p>
            <ul>
            <li>Danych osobowych (imię, nazwisko, PESEL)</li>
            <li>Adresów email ani numerów telefonu</li>
            <li>Informacji o lokalizacji</li>
            <li>Identyfikatorów urządzenia ani identyfikatorów reklamowych</li>
            <li>Adresów IP</li>
            <li>Kontaktów, zdjęć, plików ani innych danych z Twojego telefonu</li>
            <li>Danych analitycznych i informacji o zachowaniu użytkownika</li>
            </ul>
            <p>Gra nie wymaga zakładania konta i nie prosi o żadne dane identyfikujące.</p>
            <h2 id="s4">4. Uprawnienia aplikacji</h2>
            <p>Aplikacja korzysta wyłącznie z trzech uprawnień systemu Android:</p>
            <ul>
            <li><strong>Wibracje</strong> – krótkie wibracje podczas rozgrywki (np. po trafieniu przez przeciwnika). Możesz je wyłączyć w ustawieniach gry.</li>
            <li><strong>Powiadomienia</strong> – lokalne przypomnienia o passie: najwyżej 3 dziennie i tylko wtedy, gdy danego dnia nie ukończono jeszcze poziomu. Na Androidzie 13 i nowszym system pyta o zgodę. Przypomnienia możesz wyłączyć w ustawieniach gry lub systemu. Powiadomienia są planowane przez sam telefon – nie są wysyłane z żadnego serwera.</li>
            <li><strong>Uruchamianie po starcie systemu</strong> – po ponownym uruchomieniu telefonu lub aktualizacji gry aplikacja odtwarza harmonogram przypomnień. Nie wykonuje przy tym żadnych innych działań.</li>
            </ul>
            <p>Aplikacja <strong>nie ma</strong> uprawnienia dostępu do internetu, lokalizacji, aparatu, mikrofonu, kontaktów ani plików.</p>
            <h2 id="s5">5. Podstawa prawna i cel przetwarzania</h2>
            <p>Zapisywanie postępu i ustawień gry odbywa się na podstawie:</p>
            <ul>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> – prawnie uzasadniony interes administratora, jakim jest zapewnienie prawidłowego działania funkcji gry (zapamiętanie postępów i ustawień gracza).</li>
            </ul>
            <p><strong>Cel przetwarzania:</strong></p>
            <p>Jedynym celem zapisywania danych jest umożliwienie Ci:</p>
            <ul>
            <li>Kontynuowania gry od miejsca, w którym ją przerwano</li>
            <li>Śledzenia własnych postępów, rekordów, osiągnięć i passy</li>
            <li>Korzystania z przedmiotów zdobytych w grze</li>
            <li>Zachowania ustawień bez konieczności rejestracji lub logowania</li>
            </ul>
            <p>Ponieważ dane nigdy nie opuszczają Twojego urządzenia, administrator nie ma do nich dostępu i nie może ich przeglądać, analizować ani łączyć z Twoją osobą.</p>
            <h2 id="s6">6. Sposób i miejsce przechowywania danych</h2>
            <p>Postęp gry jest zapisywany w <strong>prywatnym katalogu aplikacji</strong> na Twoim urządzeniu, do którego inne aplikacje nie mają dostępu. Plik zapisu jest <strong>zaszyfrowany (AES-256-GCM)</strong> kluczem przechowywanym w systemowym magazynie kluczy Android Keystore. Wybrany język gry przechowuje system Android (ustawienie języka aplikacji) lub – na starszych wersjach Androida – prywatne ustawienia aplikacji.</p>
            <ul>
            <li>Dane nigdy nie opuszczają Twojego urządzenia</li>
            <li>Nie mamy dostępu do Twoich wyników ani ustawień</li>
            <li>Zapis gry jest wyłączony z kopii zapasowej Google i z przenoszenia danych na nowy telefon – zaszyfrowany zapis działa tylko na urządzeniu, na którym powstał</li>
            <li>Aplikacja działa w pełni offline</li>
            </ul>
            <h2 id="s7">7. Okres przechowywania danych</h2>
            <p>Dane gry pozostają na Twoim urządzeniu:</p>
            <ul>
            <li>Do momentu <strong>odinstalowania aplikacji</strong> z urządzenia</li>
            <li>Do momentu <strong>wyczyszczenia danych aplikacji</strong> w ustawieniach systemu Android</li>
            </ul>
            <p>Lista ostatnich przejazdów jest ograniczona do 50 pozycji – starsze wpisy są automatycznie usuwane.</p>
            <h2 id="s8">8. Twoje prawa zgodnie z RODO</h2>
            <p>Jako użytkownik aplikacji przysługują Ci następujące prawa:</p>
            <ul>
            <li><strong>Prawo dostępu do danych (Art. 15 RODO):</strong> Swoje postępy, osiągnięcia i statystyki możesz w każdej chwili sprawdzić bezpośrednio w grze (Mapa, Odznaki, Ustawienia → Statystyki)</li>
            <li><strong>Prawo do usunięcia danych / prawo do bycia zapomnianym (Art. 17 RODO):</strong> Możesz usunąć wszystkie zapisane dane, czyszcząc dane aplikacji w ustawieniach systemu Android lub odinstalowując grę</li>
            <li><strong>Prawo do sprzeciwu (Art. 21 RODO):</strong> Możesz w dowolnym momencie zaprzestać korzystania z aplikacji, a przypomnienia i wibracje wyłączyć w ustawieniach</li>
            <li><strong>Prawo do wniesienia skargi:</strong> Masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stanisława Moniuszki 1A, 00-014 Warszawa), jeśli uważasz, że przetwarzanie Twoich danych narusza przepisy RODO</li>
            </ul>
            <h2 id="s9">9. Brak przekazywania danych osobom trzecim</h2>
            <p>Twoje dane <strong>NIE SĄ i NIE BĘDĄ</strong> przekazywane jakimkolwiek osobom trzecim, ponieważ:</p>
            <ul>
            <li>Aplikacja nie ma dostępu do internetu</li>
            <li>Nie zawiera bibliotek analitycznych (np. Google Analytics, Firebase)</li>
            <li>Nie zawiera sieci reklamowych</li>
            <li>Nie ma żadnych trackerów ani narzędzi śledzących</li>
            </ul>
            <p><strong>Google Play:</strong> Aplikację pobierasz i aktualizujesz przez sklep Google Play, który działa według własnej polityki prywatności Google. Jeśli w ustawieniach telefonu zgodzisz się na udostępnianie Google danych o użytkowaniu i diagnostyce, Google może przekazywać deweloperom zbiorcze, anonimowe statystyki (np. liczbę instalacji lub raporty o awariach aplikacji). Nie pozwalają one zidentyfikować konkretnego gracza.</p>
            <h2 id="s10">10. Brak działania online i ranking</h2>
            <p>Aplikacja Fishing Party:</p>
            <ul>
            <li>Nie wymaga rejestracji ani logowania</li>
            <li>Nie posiada trybu multiplayer</li>
            <li>Nie posiada funkcji udostępniania w social media</li>
            <li>Nie umożliwia komunikacji między użytkownikami</li>
            </ul>
            <p><strong>Ranking:</strong> W grze widoczny jest ekran rankingu oznaczony jako „SOON” (wkrótce). Obecnie ranking online <strong>nie działa</strong> i żadne wyniki nie są nigdzie wysyłane. Jeśli w przyszłości zostanie uruchomiony, niniejsza Polityka Prywatności zostanie zaktualizowana <strong>przed</strong> jego udostępnieniem i dokładnie opisze, jakie dane będą przesyłane, w jakim celu i jak długo będą przechowywane.</p>
            <p><strong>Uwaga:</strong> Użytkownicy mogą samodzielnie wykonywać zrzuty ekranu swoich wyników i udostępniać je prywatnie. Jest to funkcjonalność systemu Android, na którą administrator nie ma wpływu.</p>
            <h2 id="s11">11. Pliki cookies i śledzenie</h2>
            <p>Aplikacja <strong>NIE UŻYWA plików cookies</strong>, identyfikatorów reklamowych ani żadnych technologii śledzących. Jedyne zapisywane dane to opisany w punkcie 3 zapis gry i ustawień, który:</p>
            <ul>
            <li>Jest przechowywany lokalnie i zaszyfrowany na Twoim urządzeniu</li>
            <li>Nie jest wysyłany do żadnych serwerów</li>
            <li>Służy wyłącznie do działania gry</li>
            <li>Możesz go usunąć w każdej chwili przez ustawienia systemu Android</li>
            </ul>
            <h2 id="s12">12. Ochrona danych dzieci</h2>
            <p>Aplikacja Fishing Party jest odpowiednia dla wszystkich grup wiekowych, w tym dla dzieci, ponieważ:</p>
            <ul>
            <li>Nie zbieramy żadnych danych osobowych</li>
            <li>Aplikacja działa w pełni offline</li>
            <li>Brak funkcji społecznościowych i komunikacji między graczami</li>
            <li>Brak reklam i płatności w grze</li>
            </ul>
            <p>Rodzice mogą bez obaw pozwolić dzieciom na korzystanie z aplikacji.</p>
            <h2 id="s13">13. Brak reklam i płatności</h2>
            <p>Aplikacja Fishing Party jest <strong>w 100% darmowa</strong> i:</p>
            <ul>
            <li>Nie zawiera reklam</li>
            <li>Nie ma płatności za prawdziwe pieniądze (in-app purchases) ani subskrypcji</li>
            <li>Nie zbiera danych do celów marketingowych</li>
            </ul>
            <p>Monety w grze zdobywa się wyłącznie za łowienie ryb, ukończone poziomy, osiągnięcia i nagrody dnia. Nie można ich kupić ani wymienić na prawdziwe pieniądze. Jeśli kiedykolwiek pojawią się reklamy lub płatności, polityka zostanie wcześniej zaktualizowana.</p>
            <h2 id="s14">14. Bezpieczeństwo danych</h2>
            <p>Ponieważ wszystkie dane są przechowywane wyłącznie lokalnie na Twoim urządzeniu:</p>
            <ul>
            <li>Zapis gry jest zaszyfrowany, a próby jego modyfikacji są wykrywane</li>
            <li>Bezpieczeństwo danych zależy również od zabezpieczeń Twojego urządzenia mobilnego</li>
            <li>Zalecamy korzystanie z aktualnej wersji systemu Android i zabezpieczenie urządzenia hasłem, PIN-em lub odciskiem palca</li>
            <li>Zapis nie jest objęty kopią zapasową, dlatego postęp zostanie utracony po odinstalowaniu gry, wyczyszczeniu jej danych, zmianie telefonu albo uszkodzeniu, zgubieniu lub kradzieży urządzenia – administrator nie ma możliwości jego odtworzenia</li>
            </ul>
            <h2 id="s15">15. Kontakt w sprawach prywatności</h2>
            <p>W razie jakichkolwiek pytań dotyczących polityki prywatności lub działania aplikacji:</p>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <p>Odpowiemy na Twoje zapytanie w ciągu 30 dni, zgodnie z wymogami RODO.</p>
            <h2 id="s16">16. Zmiany w Polityce Prywatności</h2>
            <p>Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności w celu dostosowania jej do:</p>
            <ul>
            <li>Zmieniających się przepisów prawa</li>
            <li>Nowych funkcjonalności aplikacji (np. rankingu online)</li>
            <li>Najlepszych praktyk w zakresie ochrony prywatności</li>
            </ul>
            <p>O wszelkich istotnych zmianach poinformujemy poprzez aktualizację daty na górze dokumentu. Zalecamy okresowe sprawdzanie tej strony.</p>
            <h2 id="s17">17. Przepisy prawa</h2>
            <p>Niniejsza Polityka Prywatności została przygotowana zgodnie z:</p>
            <ul>
            <li><strong>RODO</strong> – Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679</li>
            <li><strong>Ustawa o ochronie danych osobowych</strong> z dnia 10 maja 2018 r.</li>
            <li><strong>Ustawa o świadczeniu usług drogą elektroniczną</strong> z dnia 18 lipca 2002 r.</li>
            </ul>
            <h2 id="s18">18. Podsumowanie</h2>
            <div className="notice">
            <p><strong>Fishing Party to gra offline, która szanuje Twoją prywatność:</strong></p>
            <ul>
            <li>Brak dostępu do internetu – żadne dane nie opuszczają Twojego urządzenia</li>
            <li>Zapis gry jest zaszyfrowany i przechowywany tylko na telefonie</li>
            <li>Brak kont, cookies, analityki i trackerów</li>
            <li>Brak reklam i płatności</li>
            <li>Powiadomienia i wibracje możesz wyłączyć w ustawieniach</li>
            <li>Możliwość usunięcia wszystkich danych w każdej chwili</li>
            </ul>
            </div>
        </LegalPage>
    );
}
