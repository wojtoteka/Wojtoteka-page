import type { Metadata } from 'next';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: wojtoteka.ovh',
    description: 'Polityka prywatności strony wojtoteka.ovh: jakie dane zbiera formularz kontaktowy, panel, skracacz linków i ranking gry.',
    alternates: { canonical: '/polityka-prywatnosci' }
};

const TOC = [
    { id: 's1', label: 'Administrator danych' },
    { id: 's2', label: 'Zakres tej polityki' },
    { id: 's3', label: 'Jakie dane zbieramy i w jakim celu' },
    { id: 's4', label: 'Podstawy prawne przetwarzania' },
    { id: 's5', label: 'Pliki cookies' },
    { id: 's6', label: 'Odbiorcy danych i podmioty zewnętrzne' },
    { id: 's7', label: 'Okres przechowywania danych' },
    { id: 's8', label: 'Twoje prawa zgodnie z RODO' },
    { id: 's9', label: 'Kontakt w sprawach prywatności' },
    { id: 's10', label: 'Zmiany w Polityce Prywatności' }
];

export default function Page() {
    return (
        <LegalPage subject="wojtoteka.ovh" updated="4 października 2026" toc={TOC}>
            <h2 id="s1">1. Administrator danych</h2>
            <p>Administratorem Twoich danych osobowych w rozumieniu Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) jest:</p>
            <ul>
            <li><strong>Wojciech Szaliński</strong> (Wojtoteka)</li>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <h2 id="s2">2. Zakres tej polityki</h2>
            <p>Niniejsza Polityka Prywatności dotyczy strony internetowej <strong>wojtoteka.ovh</strong> - formularza kontaktowego, panelu logowania, skracacza linków, udostępniania plików oraz pozostałych funkcji dostępnych bezpośrednio na stronie.</p>
            <p>Aplikacje mobilne i bot Discord dostępne pod marką Wojtoteka mają własne, osobne polityki prywatności, ponieważ przetwarzają inne dane w inny sposób:</p>
            <ul>
            <li><a href="/polityka-nightdrive">Polityka Prywatności - Night Drive</a></li>
            <li><a href="/polityka-fishingparty">Polityka Prywatności - Fishing Party</a></li>
            <li><a href="/RoyalCasinoBot/polityka">Polityka Prywatności - RoyalCasino Bot</a></li>
            </ul>
            <h2 id="s3">3. Jakie dane zbieramy i w jakim celu</h2>
            <p><strong>Formularz kontaktowy (/kontakt):</strong></p>
            <ul>
            <li>Imię/nazwa, adres email, temat i treść wiadomości - które sam(a) podajesz, aby otrzymać odpowiedź</li>
            <li>Adres IP oraz data wysłania - w celu ochrony przed spamem i nadużyciami (np. blokowanie adresów wysyłających masowe wiadomości)</li>
            <li>Wiadomość jest dodatkowo weryfikowana przez <strong>hCaptcha</strong>, zanim trafi na serwer (patrz sekcja 6)</li>
            </ul>
            <p><strong>Panel logowania (/panel, /admin):</strong></p>
            <ul>
            <li>Dotyczy wyłącznie osób posiadających konto administratora lub konto operatora skrzynki - nie zwykłych odwiedzających</li>
            <li>Podczas logowania zapisujemy adres IP i identyfikator przeglądarki (User-Agent) w ramach zabezpieczenia sesji przed przejęciem</li>
            <li>Sesja jest przechowywana w ciasteczku technicznym (patrz sekcja 5) i wygasa automatycznie po 30 minutach bezczynności</li>
            </ul>
            <p><strong>API formularza i panel skrzynki (/api, /panel):</strong></p>
            <ul>
            <li>Posiadacz konta: adres email, hasło (zapisane jako skrót, nie jawnym tekstem), nazwa klucza API i opcjonalny adres do powiadomień - aby prowadzić konto i dostarczać wiadomości</li>
            <li>Wiadomości wysłane przez formularz na stronie posiadacza konta (pola wybrane dla klucza, np. imię, email, telefon, temat, treść) oraz adres IP nadawcy. <strong>Administratorem tych danych jest właściciel strony, na której jest formularz</strong> - my przetwarzamy je w jego imieniu na podstawie umowy powierzenia zawartej w <a href="/regulamin">Regulaminie</a> (art. 28 RODO). Z prośbą o dostęp lub usunięcie zwróć się najpierw do właściciela tej strony</li>
            </ul>
            <p><strong>Ranking gry „Głębina” (/glebina):</strong></p>
            <ul>
            <li>Nick, który dobrowolnie wpisujesz przy zgłoszeniu wyniku do rankingu, oraz osiągnięty wynik</li>
            <li>Adres IP - wyłącznie w celu ograniczenia liczby zgłoszeń i utrudnienia zakładania wielu wpisów przez jedną osobę</li>
            <li>Ciasteczko przypisujące Twoją przeglądarkę do zgłoszonego nicku (patrz sekcja 5)</li>
            </ul>
            <p><strong>Skracacz linków (/url) i udostępnianie plików (/file):</strong></p>
            <ul>
            <li>Podany przez Ciebie adres URL lub przesłany plik wraz z datą utworzenia - bez powiązania z Twoją tożsamością</li>
            </ul>
            <p><strong>Statystyki odwiedzin:</strong></p>
            <ul>
            <li>Zliczamy wyłącznie sumaryczną liczbę odwiedzin poszczególnych podstron (np. „/gry - 120 odwiedzin dzisiaj”) - bez plików cookie śledzących ani powiązania z konkretną osobą</li>
            </ul>
            <p><strong>Ochrona przed nadużyciami (dotyczy każdego odwiedzającego):</strong></p>
            <ul>
            <li>W razie spamu, prób ataku lub innych nadużyć Twój adres IP może zostać czasowo lub trwale zablokowany</li>
            </ul>
            <h2 id="s4">4. Podstawy prawne przetwarzania</h2>
            <ul>
            <li><strong>Art. 6 ust. 1 lit. b RODO</strong> - przetwarzanie niezbędne do udzielenia odpowiedzi na Twoje zapytanie z formularza kontaktowego oraz do prowadzenia konta w panelu skrzynki zgodnie z <a href="/regulamin">Regulaminem</a></li>
            <li><strong>Art. 6 ust. 1 lit. a RODO (zgoda)</strong> - dobrowolne zgłoszenie nicku i wyniku do rankingu gry</li>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora: bezpieczeństwo sesji panelu logowania, ochrona przed spamem/nadużyciami i utrzymanie stabilności strony</li>
            </ul>
            <h2 id="s5">5. Pliki cookies</h2>
            <p>Strona wykorzystuje wyłącznie ciasteczka <strong>niezbędne do jej działania</strong> - nie używamy ciasteczek marketingowych, reklamowych ani narzędzi typu Google Analytics.</p>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr><th scope="col">Ciasteczko</th><th scope="col">Cel</th><th scope="col">Ważność</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>wt.session</code></td><td>Zaszyfrowana sesja zalogowanego administratora lub operatora panelu</td><td>Do wylogowania, najwyżej 30 min bezczynności</td></tr>
                        <tr><td><code>authjs.csrf-token</code>, <code>authjs.callback-url</code></td><td>Zabezpieczenie formularza logowania do panelu (przy HTTPS nazwy mają przedrostek <code>__Host-</code> lub <code>__Secure-</code>)</td><td>Do zamknięcia przeglądarki</td></tr>
                        <tr><td><code>wt.csrf</code></td><td>Ochrona formularzy (kontakt, skracacz linków, panel) przed wysłaniem ich z obcej strony</td><td>Do zamknięcia przeglądarki</td></tr>
                        <tr><td><code>glebina_owner</code></td><td>Przypisanie przeglądarki do zgłoszonego nicku w rankingu gry Głębina</td><td>14 dni</td></tr>
                    </tbody>
                </table>
            </div>
            <p>Ponieważ są to ciasteczka niezbędne do funkcjonowania konkretnych funkcji strony, zgodnie z Prawem telekomunikacyjnym nie wymagają one odrębnej zgody - informujemy o nich tutaj.</p>
            <h2 id="s6">6. Odbiorcy danych i podmioty zewnętrzne</h2>
            <p>W zależności od korzystanej funkcji, Twoje dane mogą być przetwarzane przez:</p>
            <ul>
            <li><strong>hCaptcha (Intuition Machines, Inc.)</strong> - weryfikacja antyspamowa formularza kontaktowego</li>
            <li><strong>Dostawca poczty SMTP</strong> - wyłącznie do przesłania Twojej wiadomości/powiadomienia email</li>
            <li><strong>ip-api.com</strong> - przybliżona lokalizacja adresu IP, wykorzystywana wyłącznie wewnętrznie przy alertach bezpieczeństwa o podejrzanych próbach logowania do panelu</li>
            <li><strong>HetrixTools</strong> - monitoring dostępności serwerów; strona /status pobiera z niego dane po stronie serwera, więc Twoja przeglądarka nie łączy się z HetrixTools</li>
            <li><strong>Dostawca hostingu</strong> - przechowywanie danych na serwerze, na którym działa strona</li>
            </ul>
            <p>Nie sprzedajemy Twoich danych ani nie udostępniamy ich w celach marketingowych.</p>
            <h2 id="s7">7. Okres przechowywania danych</h2>
            <ul>
            <li><strong>Wiadomości z formularza kontaktowego</strong> - do czasu ręcznego usunięcia przez administratora</li>
            <li><strong>Konto w panelu skrzynki i wiadomości z API</strong> - do usunięcia przez posiadacza konta albo do zamknięcia konta</li>
            <li><strong>Dane logowania do panelu</strong> - sesja wygasa automatycznie po 30 minutach bezczynności lub po wylogowaniu</li>
            <li><strong>Wpisy w rankingu Głębiny</strong> - przechowywane jest wyłącznie TOP 5 wyników; słabsze wpisy są automatycznie usuwane</li>
            <li><strong>Zablokowane adresy IP</strong> - zgodnie z ustalonym czasem blokady (blokady mogą być też stałe, w przypadku poważnych nadużyć)</li>
            <li><strong>Skrócone linki / udostępnione pliki</strong> - do wybranego przy tworzeniu terminu wygaśnięcia lub bezterminowo, jeśli nie wybrano terminu</li>
            </ul>
            <h2 id="s8">8. Twoje prawa zgodnie z RODO</h2>
            <p>Jako osoba, której dane dotyczą, masz prawo do:</p>
            <ul>
            <li><strong>Dostępu do danych (Art. 15 RODO)</strong> - możesz zapytać, jakie dane na Twój temat przetwarzamy</li>
            <li><strong>Sprostowania danych (Art. 16 RODO)</strong> - możesz poprosić o poprawienie nieprawidłowych danych</li>
            <li><strong>Usunięcia danych (Art. 17 RODO)</strong> - możesz poprosić o usunięcie swoich danych, np. wiadomości z formularza lub wpisu w rankingu</li>
            <li><strong>Ograniczenia przetwarzania (Art. 18 RODO)</strong></li>
            <li><strong>Sprzeciwu wobec przetwarzania (Art. 21 RODO)</strong>, w zakresie opartym na prawnie uzasadnionym interesie</li>
            <li><strong>Przenoszenia danych (Art. 20 RODO)</strong>, w zakresie danych podanych dobrowolnie (np. zgłoszenie do rankingu)</li>
            <li><strong>Wniesienia skargi</strong> do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stanisława Moniuszki 1A, 00-014 Warszawa), jeśli uważasz, że przetwarzanie Twoich danych narusza przepisy RODO</li>
            </ul>
            <p>Aby skorzystać z powyższych praw, napisz na adres podany w sekcji 9. Odpowiemy w ciągu 30 dni.</p>
            <h2 id="s9">9. Kontakt w sprawach prywatności</h2>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <h2 id="s10">10. Zmiany w Polityce Prywatności</h2>
            <p>Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności, np. w związku ze zmianą przepisów prawa lub nowymi funkcjami strony. O zmianach informujemy poprzez aktualizację daty na górze dokumentu. Zalecamy okresowe sprawdzanie tej strony.</p>
        </LegalPage>
    );
}
