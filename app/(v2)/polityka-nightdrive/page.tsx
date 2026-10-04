import type { Metadata } from 'next';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: Night Drive',
    description: 'Polityka prywatności gry Night Drive na Androida: dane lokalne, ranking online i reklamy Google AdMob.',
    alternates: { canonical: '/polityka-nightdrive' }
};

const TOC = [
    { id: 's1', label: 'Administrator danych' },
    { id: 's2', label: 'Informacje ogólne o aplikacji' },
    { id: 's3', label: 'Jakie dane są zbierane?' },
    { id: 's4', label: 'Podstawa prawna i cel przetwarzania' },
    { id: 's5', label: 'Sposób i miejsce przechowywania danych' },
    { id: 's6', label: 'Okres przechowywania danych' },
    { id: 's7', label: 'Twoje prawa zgodnie z RODO' },
    { id: 's8', label: 'Przekazywanie danych osobom trzecim' },
    { id: 's9', label: 'Globalny ranking i funkcje społecznościowe' },
    { id: 's10', label: 'Pliki cookies i localStorage' },
    { id: 's11', label: 'Ochrona danych dzieci' },
    { id: 's12', label: 'Monetyzacja, reklamy i płatności' },
    { id: 's13', label: 'Bezpieczeństwo danych' },
    { id: 's14', label: 'Kontakt w sprawach prywatności' },
    { id: 's15', label: 'Zmiany w Polityce Prywatności' },
    { id: 's16', label: 'Przepisy prawa' },
    { id: 's17', label: 'Podsumowanie' }
];

export default function Page() {
    return (
        <LegalPage subject="Night Drive" updated="4 października 2026" toc={TOC}>
            <h2 id="s1">1. Administrator danych</h2>
            <p>Administratorem Twoich danych osobowych w rozumieniu Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych (RODO) jest:</p>
            <ul>
            <li><strong>Wojciech Szaliński</strong> (Wojtoteka)</li>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <h2 id="s2">2. Informacje ogólne o aplikacji</h2>
            <p>Aplikacja <strong>NightDrive</strong> to darmowa gra mobilna dostępna w sklepie Google Play Store. Rozgrywka i Twoje statystyki działają w pełni <strong>lokalnie na urządzeniu</strong> - połączenie z internetem jest wykorzystywane wyłącznie do opcjonalnego globalnego rankingu wyników (sekcja 9) oraz do wyświetlania reklam (sekcja 12).</p>
            <div className="notice">
            <p><strong>Kluczowa informacja:</strong> Twoje statystyki gry (rekordy, monety) nigdy nie opuszczają urządzenia. Jedyne dane wysyłane poza urządzenie to: nick i wynik przy dobrowolnym zgłoszeniu do rankingu online oraz standardowe dane techniczne wymagane do wyświetlenia reklamy przez Google AdMob.</p>
            </div>
            <h2 id="s3">3. Jakie dane są zbierane?</h2>
            <p>Aplikacja przechowuje lokalnie na Twoim urządzeniu (localStorage) następujące dane statystyczne gry:</p>
            <ul>
            <li><strong>Najlepszy wynik (Highscore)</strong> - najwyższy osiągnięty przez Ciebie wynik w punktach</li>
            <li><strong>Czas gry</strong> - najdłuższy czas przetrwania w grze</li>
            <li><strong>Łączna liczba zebranych monet</strong> - suma wszystkich monet zebranych podczas wszystkich sesji gry</li>
            </ul>
            <p>Jeśli dobrowolnie zgłosisz wynik do globalnego rankingu (sekcja 9), na nasz serwer wysyłany jest wyłącznie <strong>podany przez Ciebie nick i osiągnięty wynik</strong>. Dodatkowo, w związku z wyświetlaniem reklam (sekcja 12), Google AdMob może przetwarzać identyfikator reklamowy urządzenia, adres IP i podstawowe dane techniczne urządzenia.</p>
            <p><strong>Nie zbieramy:</strong></p>
            <ul>
            <li>Danych osobowych (imię, nazwisko, PESEL)</li>
            <li>Adresów email</li>
            <li>Numerów telefonu</li>
            <li>Informacji o lokalizacji GPS</li>
            <li>Własnych narzędzi analitycznych ani trackerów śledzenia zachowań</li>
            </ul>
            <h2 id="s4">4. Podstawa prawna i cel przetwarzania</h2>
            <p>Zapisywanie statystyk gry odbywa się na podstawie:</p>
            <ul>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora, jakim jest zapewnienie prawidłowego działania funkcjonalności gry (możliwość śledzenia postępów i osiągnięć)</li>
            </ul>
            <p><strong>Cel przetwarzania:</strong></p>
            <p>Jedynym celem zapisywania danych jest umożliwienie Ci:</p>
            <ul>
            <li>Śledzenia własnych postępów w grze</li>
            <li>Pobicia własnego rekordu</li>
            <li>Zachowania statystyk bez konieczności rejestracji lub logowania</li>
            </ul>
            <h2 id="s5">5. Sposób i miejsce przechowywania danych</h2>
            <p>Wszystkie dane są przechowywane wyłącznie w mechanizmie <strong>localStorage</strong> Twojej przeglądarki/aplikacji na urządzeniu mobilnym. Oznacza to, że:</p>
            <ul>
            <li>Dane nigdy nie opuszczają Twojego urządzenia</li>
            <li>Nie mamy dostępu do Twoich wyników</li>
            <li>Nie wysyłamy żadnych informacji na zewnętrzne serwery</li>
            <li>Dane są całkowicie pod Twoją kontrolą</li>
            <li>Aplikacja działa w pełni offline</li>
            </ul>
            <h2 id="s6">6. Okres przechowywania danych</h2>
            <p>Dane przechowywane w localStorage pozostają na Twoim urządzeniu:</p>
            <ul>
            <li>Do momentu <strong>ręcznego usunięcia</strong> przez Ciebie (opcja "Reset Wyników" w menu gry)</li>
            <li>Do momentu <strong>odinstalowania aplikacji</strong> z urządzenia</li>
            <li>Do momentu <strong>wyczyszczenia danych aplikacji</strong> w ustawieniach systemu Android</li>
            </ul>
            <h2 id="s7">7. Twoje prawa zgodnie z RODO</h2>
            <p>Jako użytkownik aplikacji przysługują Ci następujące prawa:</p>
            <ul>
            <li><strong>Prawo dostępu do danych (Art. 15 RODO):</strong> Możesz w każdej chwili sprawdzić swoje statystyki w menu gry</li>
            <li><strong>Prawo do usunięcia danych / prawo do bycia zapomnianym (Art. 17 RODO):</strong> Możesz usunąć wszystkie zapisane statystyki poprzez opcję "Reset Wyników" w menu głównym gry lub odinstalowanie aplikacji</li>
            <li><strong>Prawo do sprzeciwu (Art. 21 RODO):</strong> Możesz w dowolnym momencie zaprzestać korzystania z aplikacji</li>
            <li><strong>Prawo do przenoszenia danych (Art. 20 RODO):</strong> Dane są zapisane lokalnie na Twoim urządzeniu, więc masz do nich pełny dostęp</li>
            <li><strong>Prawo do wniesienia skargi:</strong> Masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stanisława Moniuszki 1A, 00-014 Warszawa), jeśli uważasz, że przetwarzanie Twoich danych narusza przepisy RODO</li>
            </ul>
            <h2 id="s8">8. Przekazywanie danych osobom trzecim</h2>
            <p>Nie sprzedajemy Twoich danych i nie udostępniamy ich w celach marketingowych innych firm niż wymienione poniżej. Dane przekazujemy wyłącznie:</p>
            <ul>
            <li><strong>Google AdMob</strong> - w celu wyświetlania reklam w aplikacji (identyfikator reklamowy, dane techniczne urządzenia, adres IP) - patrz sekcja 12</li>
            <li><strong>Serwer rankingu NightDrive</strong> (infrastruktura własna, wojtoteka.ovh) - wyłącznie nick i wynik, jeśli dobrowolnie zgłosisz wynik do globalnego rankingu - patrz sekcja 9</li>
            </ul>
            <p>Nie współpracujemy z żadnymi innymi firmami analitycznymi ani sieciami reklamowymi poza wymienionymi powyżej.</p>
            <h2 id="s9">9. Globalny ranking i funkcje społecznościowe</h2>
            <p>Aplikacja NightDrive:</p>
            <ul>
            <li>Nie wymaga rejestracji ani logowania</li>
            <li>Nie posiada trybu multiplayer</li>
            <li>Nie posiada funkcji udostępniania w social media</li>
            <li>Nie umożliwia bezpośredniej komunikacji między użytkownikami</li>
            </ul>
            <p>Aplikacja posiada natomiast <strong>opcjonalny, globalny ranking wyników (Top 10)</strong>. Po zakończonej rozgrywce, jeśli Twój wynik kwalifikuje się do rankingu, możesz dobrowolnie podać dowolny nick i zgłosić wynik - wysyłamy wtedy na nasz serwer wyłącznie ten nick i wynik. Zgłoszenie jest w pełni opcjonalne; jeśli z niego nie skorzystasz, żadne dane nie opuszczają urządzenia w związku z tą funkcją.</p>
            <p><strong>Uwaga:</strong> Użytkownicy mogą samodzielnie wykonywać zrzuty ekranu (screenshoty) swoich wyników i udostępniać je prywatnie. Jest to funkcjonalność systemu Android, na którą nie mamy wpływu i za którą nie ponosimy odpowiedzialności.</p>
            <h2 id="s10">10. Pliki cookies i localStorage</h2>
            <p>Aplikacja <strong>NIE UŻYWA plików cookies</strong>.</p>
            <p>Wykorzystujemy wyłącznie mechanizm <strong>localStorage</strong>, który:</p>
            <ul>
            <li>Jest przechowywany lokalnie na Twoim urządzeniu</li>
            <li>Nie jest wysyłany do żadnych serwerów</li>
            <li>Służy wyłącznie do zapisywania statystyk gry</li>
            <li>Możesz go wyczyścić w każdej chwili</li>
            </ul>
            <h2 id="s11">11. Ochrona danych dzieci</h2>
            <p>Aplikacja NightDrive nie jest kierowana wyłącznie do dzieci i świadomie nie zbiera danych osobowych ani nie posiada funkcji komunikacji między użytkownikami. Aplikacja wyświetla jednak reklamy dostarczane przez Google AdMob (sekcja 12) - rodzice/opiekunowie dzieci korzystających z aplikacji powinni mieć tego świadomość i, w razie potrzeby, skorzystać z systemowych narzędzi kontroli rodzicielskiej Google Play.</p>
            <p>Nie kierujemy świadomie żadnych treści reklamowych do dzieci poniżej wieku określonego przepisami RODO/COPPA i nie zbieramy świadomie danych osobowych dzieci.</p>
            <h2 id="s12">12. Monetyzacja, reklamy i płatności</h2>
            <p>Aplikacja NightDrive jest <strong>bezpłatna do pobrania</strong> i nie posiada płatności w grze (in-app purchases) ani subskrypcji. Aby utrzymać rozwój aplikacji, wyświetlamy reklamy dostarczane przez sieć reklamową <strong>Google AdMob</strong> (Google Ireland Limited):</p>
            <ul>
            <li><strong>Reklama pełnoekranowa (interstitial)</strong> - może pojawić się po zakończonej rozgrywce</li>
            <li><strong>Reklama z nagrodą (rewarded)</strong> - dobrowolna, obejrzenie jej podwaja monety zebrane w danej rozgrywce; nic nie dzieje się bez Twojej wyraźnej zgody na obejrzenie</li>
            </ul>
            <p>Aby wyświetlać reklamy, Google i jego partnerzy reklamowi mogą przetwarzać na Twoim urządzeniu:</p>
            <ul>
            <li>Identyfikator reklamowy urządzenia (Advertising ID)</li>
            <li>Przybliżone dane o urządzeniu i aplikacji (model, wersja systemu, kraj)</li>
            <li>Adres IP - wykorzystywany do przybliżonej lokalizacji i pomiaru skuteczności reklam</li>
            </ul>
            <p>Dane te są przetwarzane przez Google zgodnie z jego własną polityką prywatności: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>, a informacje o wykorzystaniu danych przez partnerów Google znajdziesz na <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">policies.google.com/technologies/partner-sites</a>.</p>
            <p>Przy pierwszym uruchomieniu aplikacji (dla użytkowników z Europejskiego Obszaru Gospodarczego i Wielkiej Brytanii) wyświetlany jest formularz zgody zgodny z RODO (Google User Messaging Platform), w którym decydujesz, na jakie przetwarzanie danych do celów reklamowych się zgadzasz. Swoją decyzję możesz zmienić w dowolnym momencie w aplikacji: <strong>Ustawienia &gt; Prywatność reklam</strong>.</p>
            <h2 id="s13">13. Bezpieczeństwo danych</h2>
            <p>Ponieważ wszystkie dane są przechowywane wyłącznie lokalnie na Twoim urządzeniu:</p>
            <ul>
            <li>Bezpieczeństwo danych zależy od zabezpieczeń Twojego urządzenia mobilnego</li>
            <li>Zalecamy korzystanie z aktualnej wersji systemu Android</li>
            <li>Zalecamy zabezpieczenie urządzenia hasłem/PIN-em/odciskiem palca</li>
            <li>Administrator nie ponosi odpowiedzialności za utratę danych spowodowaną uszkodzeniem, zgubieniem lub kradzieżą urządzenia</li>
            </ul>
            <h2 id="s14">14. Kontakt w sprawach prywatności</h2>
            <p>W razie jakichkolwiek pytań dotyczących:</p>
            <ul>
            <li>Polityki Prywatności</li>
            <li>Ochrony danych osobowych</li>
            <li>Korzystania z przysługujących Ci praw</li>
            <li>Działania aplikacji</li>
            </ul>
            <p><strong>Skontaktuj się z nami:</strong></p>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <p>Odpowiemy na Twoje zapytanie w ciągu 30 dni, zgodnie z wymogami RODO.</p>
            <h2 id="s15">15. Zmiany w Polityce Prywatności</h2>
            <p>Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności w celu dostosowania jej do:</p>
            <ul>
            <li>Zmieniających się przepisów prawa</li>
            <li>Nowych funkcjonalności aplikacji</li>
            <li>Najlepszych praktyk w zakresie ochrony prywatności</li>
            </ul>
            <p>O wszelkich istotnych zmianach poinformujemy poprzez:</p>
            <ul>
            <li>Aktualizację daty na górze dokumentu</li>
            </ul>
            <p>Zalecamy okresowe sprawdzanie tej strony w celu zapoznania się z ewentualnymi aktualizacjami.</p>
            <h2 id="s16">16. Przepisy prawa</h2>
            <p>Niniejsza Polityka Prywatności została przygotowana zgodnie z:</p>
            <ul>
            <li><strong>RODO</strong> - Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679</li>
            <li><strong>Ustawa o ochronie danych osobowych</strong> z dnia 10 maja 2018 r.</li>
            <li><strong>Ustawa o świadczeniu usług drogą elektroniczną</strong> z dnia 18 lipca 2002 r.</li>
            </ul>
            <h2 id="s17">17. Podsumowanie</h2>
            <div className="notice">
            <p><strong>NightDrive szanuje Twoją prywatność:</strong></p>
            <ul>
            <li>Statystyki gry nigdy nie opuszczają Twojego urządzenia</li>
            <li>Ranking online i reklamy są jedynymi funkcjami wymagającymi internetu</li>
            <li>Brak własnych trackerów i narzędzi analitycznych</li>
            <li>Brak płatności i subskrypcji w aplikacji</li>
            <li>Pełna kontrola nad zgodą na reklamy (Ustawienia &gt; Prywatność reklam)</li>
            <li>Możliwość usunięcia lokalnych danych w każdej chwili</li>
            </ul>
            </div>
        </LegalPage>
    );
}
