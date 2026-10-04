import type { Metadata } from 'next';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: Fishing Party',
    description: 'Polityka prywatności gry Fishing Party na Androida: gra działa lokalnie i nie wysyła danych.',
    alternates: { canonical: '/polityka-fishingparty' }
};

const TOC = [
    { id: 's1', label: 'Administrator danych' },
    { id: 's2', label: 'Informacje ogólne o aplikacji' },
    { id: 's3', label: 'Jakie dane są zbierane?' },
    { id: 's4', label: 'Podstawa prawna i cel przetwarzania' },
    { id: 's5', label: 'Sposób i miejsce przechowywania danych' },
    { id: 's6', label: 'Okres przechowywania danych' },
    { id: 's7', label: 'Twoje prawa zgodnie z RODO' },
    { id: 's8', label: 'Brak przekazywania danych osobom trzecim' },
    { id: 's9', label: 'Brak działania online i funkcji społecznościowych' },
    { id: 's10', label: 'Pliki cookies i localStorage' },
    { id: 's11', label: 'Ochrona danych dzieci' },
    { id: 's12', label: 'Brak monetyzacji, reklam i płatności' },
    { id: 's13', label: 'Bezpieczeństwo danych' },
    { id: 's14', label: 'Kontakt w sprawach prywatności' },
    { id: 's15', label: 'Zmiany w Polityce Prywatności' },
    { id: 's16', label: 'Przepisy prawa' },
    { id: 's17', label: 'Podsumowanie' }
];

export default function Page() {
    return (
        <LegalPage subject="Fishing Party" updated="4 października 2026" toc={TOC}>
            <h2 id="s1">1. Administrator danych</h2>
            <p>Administratorem Twoich danych osobowych w rozumieniu Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) jest:</p>
            <ul>
            <li><strong>Wojciech Szaliński</strong> (Wojtoteka)</li>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <h2 id="s2">2. Informacje ogólne o aplikacji</h2>
            <p>Aplikacja <strong>Fishing Party</strong> to darmowa gra mobilna dostępna w sklepie Google Play Store. Gra została zaprojektowana z myślą o maksymalnej ochronie prywatności użytkownika i działa w oparciu o technologię webową (HTML5/JavaScript).</p>
            <div className="notice">
            <p><strong>Kluczowa informacja:</strong> Aplikacja Fishing Party działa w 100% lokalnie na Twoim urządzeniu. Nie zbieramy, nie przesyłamy i nie przechowujemy żadnych danych na naszych serwerach.</p>
            </div>
            <h2 id="s3">3. Jakie dane są zbierane?</h2>
            <p>Aplikacja może przechowywać wyłącznie następujące dane statystyczne gry w pamięci lokalnej Twojego urządzenia (localStorage):</p>
            <ul>
            <li><strong>Najlepszy wynik (Highscore)</strong> - najwyższy osiągnięty przez Ciebie wynik punktowy</li>
            <li><strong>Aktualny poziom</strong> - ostatnio osiągnięty poziom trudności</li>
            <li><strong>Łączna liczba złowionych ryb</strong> - suma wszystkich złowionych ryb podczas sesji gry</li>
            </ul>
            <p><strong>Nie zbieramy:</strong></p>
            <ul>
            <li>Danych osobowych (imię, nazwisko, PESEL)</li>
            <li>Adresów email</li>
            <li>Numerów telefonu</li>
            <li>Informacji o lokalizacji GPS</li>
            <li>Danych o urządzeniu</li>
            <li>Adresów IP</li>
            <li>Danych analitycznych</li>
            <li>Informacji o zachowaniu użytkownika</li>
            </ul>
            <h2 id="s4">4. Podstawa prawna i cel przetwarzania</h2>
            <p>Zapisywanie statystyk gry odbywa się na podstawie:</p>
            <ul>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora, jakim jest zapewnienie prawidłowego działania funkcjonalności gry (możliwość śledzenia postępów przez gracza).</li>
            </ul>
            <p><strong>Cel przetwarzania:</strong></p>
            <p>Jedynym celem zapisywania danych jest umożliwienie Ci:</p>
            <ul>
            <li>Śledzenia własnych postępów w grze</li>
            <li>Pobicia własnego rekordu punktowego</li>
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
            <li>Do momentu <strong>odinstalowania aplikacji</strong> z urządzenia</li>
            <li>Do momentu <strong>wyczyszczenia danych aplikacji</strong> w ustawieniach systemu Android</li>
            <li>Do momentu <strong>ręcznego usunięcia</strong> danych przez użytkownika</li>
            </ul>
            <h2 id="s7">7. Twoje prawa zgodnie z RODO</h2>
            <p>Jako użytkownik aplikacji przysługują Ci następujące prawa:</p>
            <ul>
            <li><strong>Prawo dostępu do danych (Art. 15 RODO):</strong> Możesz w każdej chwili sprawdzić swoje statystyki bezpośrednio w grze</li>
            <li><strong>Prawo do usunięcia danych / prawo do bycia zapomnianym (Art. 17 RODO):</strong> Możesz usunąć wszystkie zapisane dane poprzez wyczyszczenie danych aplikacji w ustawieniach systemu Android</li>
            <li><strong>Prawo do sprzeciwu (Art. 21 RODO):</strong> Możesz w dowolnym momencie zaprzestać korzystania z aplikacji</li>
            <li><strong>Prawo do przenoszenia danych (Art. 20 RODO):</strong> Dane są zapisane lokalnie na Twoim urządzeniu, więc masz do nich pełny dostęp</li>
            <li><strong>Prawo do wniesienia skargi:</strong> Masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stanisława Moniuszki 1A, 00-014 Warszawa), jeśli uważasz, że przetwarzanie Twoich danych narusza przepisy RODO</li>
            </ul>
            <h2 id="s8">8. Brak przekazywania danych osobom trzecim</h2>
            <p>Twoje dane <strong>NIE SĄ i NIE BĘDĄ</strong> przekazywane jakimkolwiek osobom trzecim, ponieważ:</p>
            <ul>
            <li>Aplikacja nie posiada połączenia z internetem podczas rozgrywki</li>
            <li>Brak jakiejkolwiek integracji z serwisami zewnętrznymi</li>
            <li>Nie współpracujemy z firmami analitycznymi (np. Google Analytics)</li>
            <li>Nie współpracujemy z sieciami reklamowymi</li>
            <li>Nie ma żadnych trackerów ani narzędzi śledzących</li>
            </ul>
            <h2 id="s9">9. Brak działania online i funkcji społecznościowych</h2>
            <p>Aplikacja Fishing Party:</p>
            <ul>
            <li>Nie wymaga rejestracji ani logowania</li>
            <li>Nie posiada trybu multiplayer</li>
            <li>Nie ma globalnych tabel wyników (leaderboards)</li>
            <li>Nie posiada funkcji udostępniania w social media</li>
            <li>Nie umożliwia komunikacji między użytkownikami</li>
            </ul>
            <p><strong>Uwaga:</strong> Użytkownicy mogą samodzielnie wykonywać zrzuty ekranu swoich wyników i udostępniać je prywatnie. Jest to funkcjonalność systemu Android, na którą administrator nie ma wpływu.</p>
            <h2 id="s10">10. Pliki cookies i localStorage</h2>
            <p>Aplikacja <strong>NIE UŻYWA plików cookies</strong>.</p>
            <p>Wykorzystujemy wyłącznie mechanizm <strong>localStorage</strong>, który:</p>
            <ul>
            <li>Jest przechowywany lokalnie na Twoim urządzeniu</li>
            <li>Nie jest wysyłany do żadnych serwerów</li>
            <li>Służy wyłącznie do zapisywania statystyk gry</li>
            <li>Możesz go wyczyścić w każdej chwili przez ustawienia systemu Android</li>
            </ul>
            <h2 id="s11">11. Ochrona danych dzieci</h2>
            <p>Aplikacja Fishing Party jest odpowiednia dla wszystkich grup wiekowych, w tym dla dzieci. Ponieważ:</p>
            <ul>
            <li>Nie zbieramy żadnych danych osobowych</li>
            <li>Aplikacja działa w pełni offline</li>
            <li>Brak funkcji społecznościowych i komunikacji między graczami</li>
            <li>Brak reklam i płatności w grze</li>
            </ul>
            <p>Rodzice mogą bez obaw pozwolić dzieciom na korzystanie z aplikacji.</p>
            <h2 id="s12">12. Brak monetyzacji, reklam i płatności</h2>
            <p>Aplikacja Fishing Party jest <strong>w 100% darmowa</strong> i:</p>
            <ul>
            <li>Nie zawiera reklam</li>
            <li>Nie ma płatności w grze (in-app purchases)</li>
            <li>Nie ma subskrypcji</li>
            <li>Nie zbiera danych do celów marketingowych</li>
            </ul>
            <p>W chwili obecnej nie planujemy wprowadzania żadnych form monetyzacji.</p>
            <h2 id="s13">13. Bezpieczeństwo danych</h2>
            <p>Ponieważ wszystkie dane są przechowywane wyłącznie lokalnie na Twoim urządzeniu:</p>
            <ul>
            <li>Bezpieczeństwo danych zależy od zabezpieczeń Twojego urządzenia mobilnego</li>
            <li>Zalecamy korzystanie z aktualnej wersji systemu Android</li>
            <li>Zalecamy zabezpieczenie urządzenia hasłem/PIN-em/odciskiem palca</li>
            <li>Administrator nie ponosi odpowiedzialności za utratę danych spowodowaną uszkodzeniem, zgubieniem lub kradzieżą urządzenia</li>
            </ul>
            <h2 id="s14">14. Kontakt w sprawach prywatności</h2>
            <p>W razie jakichkolwiek pytań dotyczących polityki prywatności lub działania aplikacji:</p>
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
            <p>O wszelkich istotnych zmianach poinformujemy poprzez aktualizację daty na górze dokumentu. Zalecamy okresowe sprawdzanie tej strony.</p>
            <h2 id="s16">16. Przepisy prawa</h2>
            <p>Niniejsza Polityka Prywatności została przygotowana zgodnie z:</p>
            <ul>
            <li><strong>RODO</strong> - Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679</li>
            <li><strong>Ustawa o ochronie danych osobowych</strong> z dnia 10 maja 2018 r.</li>
            <li><strong>Ustawa o świadczeniu usług drogą elektroniczną</strong> z dnia 18 lipca 2002 r.</li>
            </ul>
            <h2 id="s17">17. Podsumowanie</h2>
            <div className="notice">
            <p><strong>Fishing Party to gra offline, która szanuje Twoją prywatność:</strong></p>
            <ul>
            <li>Żadne dane nie opuszczają Twojego urządzenia</li>
            <li>Brak połączenia z internetem podczas rozgrywki</li>
            <li>Brak cookies i trackerów</li>
            <li>Brak reklam i płatności</li>
            <li>100% kontroli nad swoimi danymi</li>
            <li>Możliwość usunięcia danych w każdej chwili</li>
            </ul>
            </div>
        </LegalPage>
    );
}
