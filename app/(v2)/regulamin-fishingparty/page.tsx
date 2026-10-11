import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Regulamin: Fishing Party',
    description: 'Regulamin gry Fishing Party na Androida: konto online (nick + hasło lub e-mail), ranking top 100, zasady uczciwej gry, synchronizacja postępu i usuwanie konta.',
    alternates: { canonical: '/regulamin-fishingparty' }
};

const TOC = [
    { id: 's1', label: 'Postanowienia ogólne' },
    { id: 's2', label: 'Definicje' },
    { id: 's3', label: 'Wymagania techniczne' },
    { id: 's4', label: 'Konto online' },
    { id: 's5', label: 'Hasło i bezpieczeństwo konta' },
    { id: 's6', label: 'Ranking' },
    { id: 's7', label: 'Zasady uczciwej gry' },
    { id: 's8', label: 'Synchronizacja postępu' },
    { id: 's9', label: 'Nick' },
    { id: 's10', label: 'Wirtualne przedmioty' },
    { id: 's11', label: 'Ukrycie, blokada i usunięcie konta' },
    { id: 's12', label: 'Odpowiedzialność' },
    { id: 's13', label: 'Reklamacje' },
    { id: 's14', label: 'Dane osobowe' },
    { id: 's15', label: 'Zmiany regulaminu' },
    { id: 's16', label: 'Postanowienia końcowe' }
];

export default function Page() {
    return (
        <LegalPage
            title="Regulamin"
            subject="Fishing Party"
            updated="11 października 2026"
            toc={TOC}
            note={
                <p>
                    Niniejszy Regulamin dotyczy gry <strong>Fishing Party</strong> na Androida, konta online i rankingu. Zobacz też: <Link href="/polityka-fishingparty">Polityka prywatności Fishing Party</Link>.
                </p>
            }
        >
            <h2 id="s1">1. Postanowienia ogólne</h2>
            <p>Niniejszy Regulamin określa zasady korzystania z gry <strong>Fishing Party</strong> na system Android oraz z usług online gry: konta gracza, synchronizacji postępu i rankingu. Jest to regulamin w rozumieniu art. 8 ustawy z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną.</p>
            <p>Usługodawcą jest <strong>Wojciech Szaliński</strong> (Wojtoteka), kontakt: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>, <a href="/kontakt">formularz kontaktowy</a>.</p>
            <p>Gra i wszystkie usługi online są <strong>bezpłatne</strong>. Z gry można korzystać bez konta – wtedy z Regulaminu stosuje się tylko punkty 10, 12 i 16. Założenie konta online oznacza akceptację całego Regulaminu oraz <Link href="/polityka-fishingparty">Polityki prywatności</Link> i zawarcie umowy o świadczenie usług drogą elektroniczną na czas nieokreślony.</p>
            <h2 id="s2">2. Definicje</h2>
            <ul>
            <li><strong>Gra</strong> – aplikacja Fishing Party na Androida.</li>
            <li><strong>Gracz</strong> – osoba korzystająca z Gry.</li>
            <li><strong>Konto</strong> – konto online Gracza na serwerze fp.wojtoteka.ovh: „nick + hasło” albo konto e-mail.</li>
            <li><strong>Ranking</strong> – lista 100 Graczy z największą liczbą punktów rankingowych, widoczna w Grze dla Graczy z Kontem.</li>
            <li><strong>Punkty rankingowe</strong> – suma najlepszych zweryfikowanych wyników z każdego poziomu oraz trofeów za passę.</li>
            <li><strong>Przejazd</strong> – jedno ukończenie poziomu Gry.</li>
            </ul>
            <h2 id="s3">3. Wymagania techniczne</h2>
            <ul>
            <li>Telefon lub tablet z systemem Android 8.0 lub nowszym i aktualną wersją Gry.</li>
            <li>Do korzystania z Konta i Rankingu – dostęp do internetu. Bez internetu Gra działa normalnie, a niewysłane Przejazdy są przesyłane po odzyskaniu połączenia.</li>
            <li>Do konta e-mail – dostęp do skrzynki pocztowej, na którą przychodzą kody.</li>
            </ul>
            <p>Usługodawca może wymagać aktualizacji Gry do nowszej wersji, aby dalej korzystać z usług online.</p>
            <h2 id="s4">4. Konto online</h2>
            <ul>
            <li>Konto zakładasz w Grze: w zakładce <strong>RANKING</strong> (nick + hasło) albo <strong>KONTO</strong> (nick + hasło lub e-mail + nick + hasło). Przed założeniem Konta musisz zaakceptować Regulamin i Politykę prywatności.</li>
            <li><strong>Konto „nick + hasło”</strong> nie wymaga adresu e-mail. Logowanie tym samym nickiem i hasłem na nowym urządzeniu lub po ponownej instalacji Gry przywraca postęp i miejsce w Rankingu.</li>
            <li><strong>Konto e-mail</strong> wymaga potwierdzenia adresu 6-cyfrowym kodem wysłanym w wiadomości e-mail. Umożliwia ustawienie nowego hasła. Adres e-mail można też dodać później do konta „nick + hasło”.</li>
            <li>Konto mogą zakładać osoby, które ukończyły <strong>16 lat</strong>. Osoba młodsza może założyć Konto tylko za zgodą rodzica lub opiekuna prawnego.</li>
            <li>Konto jest osobiste. Nie wolno go sprzedawać, udostępniać ani przejmować kont innych Graczy.</li>
            <li>Jeden Gracz może mieć jedno Konto biorące udział w Rankingu. Zakładanie wielu kont w celu manipulowania Rankingiem jest zabronione.</li>
            </ul>
            <h2 id="s5">5. Hasło i bezpieczeństwo konta</h2>
            <ul>
            <li>Hasło musi mieć co najmniej 8 znaków. Nie używaj hasła z innych serwisów i nikomu go nie podawaj.</li>
            <li><strong>Hasła do konta „nick + hasło” nie da się zresetować ani odzyskać</strong>. Utrata hasła oznacza utratę dostępu do Konta – usługodawca nie może go przywrócić, ponieważ nie ma sposobu, by potwierdzić, że Konto należy do Ciebie. Możesz temu zapobiec, dodając do Konta adres e-mail.</li>
            <li>Po kilku nieudanych próbach logowania Konto jest czasowo blokowane. Liczba prób rejestracji, logowania i wysyłki kodów jest ograniczona.</li>
            <li>Jeśli podejrzewasz, że ktoś zna Twoje hasło, zmień je w Grze (KONTO → ZMIEŃ HASŁO) – pozostałe urządzenia zostaną wylogowane.</li>
            </ul>
            <h2 id="s6">6. Ranking</h2>
            <ul>
            <li>W Rankingu liczą się wyłącznie Przejazdy przesłane z Gry i zweryfikowane przez serwer. Każdy poziom liczy się raz – z najlepszym wynikiem.</li>
            <li>Przy założeniu Konta Gra jednorazowo przesyła najlepsze wyniki zdobyte wcześniej na danym urządzeniu; są one sprawdzane z limitami poziomów.</li>
            <li>Przy równej liczbie punktów wyżej jest Gracz, który osiągnął ten wynik wcześniej.</li>
            <li>W Rankingu widoczne są: nick, punkty rankingowe, pozycja i najwyższy ukończony poziom.</li>
            <li>Ranking ma charakter wyłącznie rozrywkowy. Za miejsce w Rankingu <strong>nie przysługują żadne nagrody</strong>.</li>
            <li>Usługodawca może przeliczyć Ranking lub skorygować punkty w razie błędu Gry, błędu serwera albo wykrycia nieuczciwej gry.</li>
            </ul>
            <h2 id="s7">7. Zasady uczciwej gry</h2>
            <p>Zabronione jest w szczególności:</p>
            <ul>
            <li>modyfikowanie Gry, jej plików, zapisu lub pamięci (np. edytorami pamięci, zmodyfikowanymi wersjami aplikacji),</li>
            <li>używanie botów, makr, skryptów i innych narzędzi grających za Gracza,</li>
            <li>wysyłanie do serwera danych spreparowanych poza Grą, omijanie zabezpieczeń lub limitów serwera,</li>
            <li>wykorzystywanie błędów Gry lub serwera do zdobywania punktów – znaleziony błąd zgłoś na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>,</li>
            <li>zakłócanie działania serwera, w tym masowe wysyłanie zapytań.</li>
            </ul>
            <p>Serwer automatycznie sprawdza każdy Przejazd (wynik, czas, liczbę ryb, kolejność poziomów) i odnotowuje podejrzane sygnały, także te wykryte przez samą Grę. Wynik niemożliwy do uzyskania nie jest liczony.</p>
            <h2 id="s8">8. Synchronizacja postępu</h2>
            <ul>
            <li>Gdy jesteś zalogowany, Gra przesyła na serwer ukończone Przejazdy oraz kopię zapisu postępu. Po zalogowaniu na innym urządzeniu postęp jest przywracany.</li>
            <li>Jeśli postęp zmienił się na dwóch urządzeniach jednocześnie, Gra zapyta, który zachować. Drugi zostanie zastąpiony.</li>
            <li>Usługodawca dokłada starań, aby kopia postępu była bezpieczna, ale nie gwarantuje nieprzerwanej dostępności serwera ani tego, że kopia nie ulegnie utracie (np. w wyniku awarii).</li>
            <li>Po wylogowaniu postęp zostaje na urządzeniu, ale przestaje być synchronizowany.</li>
            </ul>
            <h2 id="s9">9. Nick</h2>
            <ul>
            <li>Nick ma od 3 do 16 znaków (litery, cyfry, spacja oraz znaki _ . -) i musi być unikalny.</li>
            <li>Nick nie może być wulgarny, obraźliwy, nawoływać do nienawiści, podszywać się pod inne osoby, administrację lub usługodawcę, ani zawierać reklam, adresów stron czy danych osobowych (np. imienia i nazwiska, numeru telefonu).</li>
            <li>Usługodawca może zmienić nick naruszający te zasady lub ukryć Konto w Rankingu do czasu jego zmiany.</li>
            </ul>
            <h2 id="s10">10. Wirtualne przedmioty</h2>
            <p>Monety, łodzie, żagle, załoga, wzmocnienia, trofea, gwiazdki i punkty rankingowe są <strong>wirtualne</strong> i nie mają wartości pieniężnej. Nie można ich kupić za prawdziwe pieniądze, wypłacić, sprzedać ani przekazać innemu Graczowi. Usługodawca może korygować ich ilość w razie błędu Gry lub nieuczciwej gry.</p>
            <h2 id="s11">11. Ukrycie, blokada i usunięcie konta</h2>
            <ul>
            <li><strong>Ukrycie w Rankingu</strong> – gdy serwer wykryje wiele podejrzanych sygnałów, Konto jest automatycznie ukrywane w Rankingu. Gracz widzi o tym informację w Grze, a Konto i postęp działają dalej. Administrator sprawdza historię Przejazdów i przywraca Konto do Rankingu albo podtrzymuje decyzję.</li>
            <li><strong>Blokada</strong> – za rażące lub powtarzające się naruszenia Regulaminu usługodawca może zablokować logowanie na Konto lub je usunąć. Możesz odwołać się od decyzji, pisząc na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>.</li>
            <li><strong>Usunięcie przez Gracza</strong> – możesz w każdej chwili usunąć Konto w Grze (KONTO → USUŃ KONTO) albo poprosić o to e-mailem. Usunięcie Konta jest równoznaczne z rozwiązaniem umowy i trwale kasuje dane Konta, wyniki w Rankingu i kopię postępu z serwera. Postęp na urządzeniu zostaje.</li>
            <li>Usługodawca może zakończyć świadczenie usług online (np. wyłączyć Ranking), informując o tym w Grze lub na stronie z co najmniej 30-dniowym wyprzedzeniem. Gra będzie nadal działać offline.</li>
            </ul>
            <h2 id="s12">12. Odpowiedzialność</h2>
            <ul>
            <li>Gra i usługi online są udostępniane bezpłatnie, w stanie „takim, jaki jest”. Usługodawca dokłada starań, aby działały poprawnie, ale nie gwarantuje ich nieprzerwanej dostępności – mogą wystąpić przerwy techniczne, awarie lub prace serwisowe.</li>
            <li>Usługodawca nie odpowiada za utratę dostępu do Konta wynikającą z zapomnienia hasła do konta „nick + hasło” ani z udostępnienia hasła osobom trzecim.</li>
            <li>Postanowienia Regulaminu nie wyłączają ani nie ograniczają uprawnień przysługujących konsumentom na podstawie bezwzględnie obowiązujących przepisów prawa.</li>
            </ul>
            <h2 id="s13">13. Reklamacje</h2>
            <p>Reklamacje dotyczące Gry, Konta lub Rankingu (np. błędnie naliczone punkty, niesłuszne ukrycie Konta) zgłaszaj na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a> lub przez <a href="/kontakt">formularz kontaktowy</a>, podając nick i opis problemu. Odpowiemy w ciągu <strong>14 dni</strong> od otrzymania zgłoszenia. Konsument może też skorzystać z pozasądowych sposobów rozwiązywania sporów, np. pomocy miejskiego lub powiatowego rzecznika konsumentów.</p>
            <h2 id="s14">14. Dane osobowe</h2>
            <p>Zasady przetwarzania danych osobowych, w tym zakres danych, okres ich przechowywania i Twoje prawa, opisuje <Link href="/polityka-fishingparty">Polityka prywatności Fishing Party</Link>.</p>
            <h2 id="s15">15. Zmiany regulaminu</h2>
            <p>Usługodawca może zmienić Regulamin z ważnych przyczyn, w szczególności zmiany przepisów prawa, wprowadzenia nowych funkcji Gry lub konieczności zapewnienia bezpieczeństwa i uczciwości Rankingu. O zmianach poinformujemy w Grze lub na tej stronie co najmniej 14 dni przed ich wejściem w życie. Gra może poprosić o ponowną akceptację. Jeśli nie akceptujesz zmian, możesz usunąć Konto.</p>
            <h2 id="s16">16. Postanowienia końcowe</h2>
            <ul>
            <li>W sprawach nieuregulowanych w Regulaminie stosuje się przepisy prawa polskiego, w szczególności Kodeksu cywilnego i ustawy o świadczeniu usług drogą elektroniczną.</li>
            <li>Regulamin jest dostępny bezpłatnie pod adresem <a href="/regulamin-fishingparty">wojtoteka.ovh/regulamin-fishingparty</a> oraz z poziomu Gry (Ustawienia → Dokumenty) i można go zapisać lub wydrukować.</li>
            <li>Regulamin obowiązuje od 11 października 2026 r.</li>
            </ul>
        </LegalPage>
    );
}
