import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Regulamin: wojtoteka.ovh',
    description: 'Regulamin strony wojtoteka.ovh: zasady korzystania ze skracacza linków, API formularza kontaktowego, panelu skrzynki i pozostałych usług.',
    alternates: { canonical: '/regulamin' }
};

const TOC = [
    { id: 's1', label: 'Postanowienia ogólne' },
    { id: 's2', label: 'Usługi' },
    { id: 's3', label: 'Wymagania techniczne' },
    { id: 's4', label: 'Zasady korzystania' },
    { id: 's5', label: 'Skracacz linków i pliki' },
    { id: 's6', label: 'API formularza i panel skrzynki' },
    { id: 's7', label: 'Powierzenie przetwarzania danych' },
    { id: 's8', label: 'Ranking gry Głębina' },
    { id: 's9', label: 'Odpowiedzialność' },
    { id: 's10', label: 'Reklamacje' },
    { id: 's11', label: 'Zmiany regulaminu' },
    { id: 's12', label: 'Postanowienia końcowe' }
];

export default function Page() {
    return (
        <LegalPage
            title="Regulamin"
            subject="wojtoteka.ovh"
            updated="4 października 2026"
            toc={TOC}
            note={
                <p>
                    Zobacz też: <Link href="/polityka-prywatnosci">Polityka prywatności</Link>. Bot RoyalCasino ma osobny <Link href="/RoyalCasinoBot/regulamin">regulamin</Link>.
                </p>
            }
        >
            <h2 id="s1">1. Postanowienia ogólne</h2>
            <p>Niniejszy Regulamin określa zasady korzystania ze strony <strong>wojtoteka.ovh</strong> i usług dostępnych na niej drogą elektroniczną. Jest to regulamin w rozumieniu art. 8 ustawy z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną.</p>
            <p>Usługodawcą jest:</p>
            <ul>
            <li><strong>Wojciech Szaliński</strong> (Wojtoteka)</li>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
            <p>Wszystkie usługi są <strong>bezpłatne</strong>. Korzystając ze strony, akceptujesz ten Regulamin.</p>
            <h2 id="s2">2. Usługi</h2>
            <p>Na stronie udostępniamy:</p>
            <ul>
            <li>przeglądanie treści strony, w tym opisów gier, aplikacji i strony statusu usług</li>
            <li>formularz kontaktowy (<a href="/kontakt">/kontakt</a>)</li>
            <li>skracacz linków (<a href="/url">/url</a>) i pobieranie udostępnionych plików</li>
            <li>API formularza kontaktowego wraz z kontem w panelu skrzynki (<a href="/api">/api</a>, <a href="/panel">/panel</a>)</li>
            <li>ranking gry przeglądarkowej Głębina</li>
            <li>pobieranie aplikacji udostępnianych na stronie</li>
            </ul>
            <p>Bot RoyalCasino oraz aplikacje mobilne mają własne regulaminy lub polityki prywatności, które mają pierwszeństwo przed tym Regulaminem w zakresie tych usług.</p>
            <h2 id="s3">3. Wymagania techniczne</h2>
            <ul>
            <li>Urządzenie z dostępem do internetu i aktualną przeglądarką z włączonym JavaScriptem</li>
            <li>Przeglądarka przyjmująca ciasteczka niezbędne do działania formularzy i panelu (opisane w <Link href="/polityka-prywatnosci">polityce prywatności</Link>)</li>
            <li>Do konta w panelu skrzynki potrzebny jest aktywny adres email</li>
            </ul>
            <h2 id="s4">4. Zasady korzystania</h2>
            <div className="notice notice-error">
            <p><strong>Zabronione jest w szczególności:</strong></p>
            <ul>
            <li>dostarczanie treści o charakterze bezprawnym, w tym naruszających prawa autorskie lub dobra osobiste innych osób</li>
            <li>wysyłanie spamu i masowych wiadomości przez formularz kontaktowy lub API</li>
            <li>próby przełamania zabezpieczeń, ataki na serwer i obchodzenie limitów zapytań</li>
            <li>podszywanie się pod inne osoby lub usługodawcę</li>
            </ul>
            </div>
            <p>W razie naruszenia Regulaminu możemy zablokować adres IP, wyłączyć klucz API, usunąć konto, link lub wpis, bez wcześniejszego uprzedzenia.</p>
            <h2 id="s5">5. Skracacz linków i pliki</h2>
            <ul>
            <li>Nie wolno skracać linków prowadzących do złośliwego oprogramowania, phishingu, oszustw ani innych treści niezgodnych z prawem</li>
            <li>Skrócony link działa do wybranego terminu wygaśnięcia albo bezterminowo, jeśli termin nie został wybrany</li>
            <li>Możemy usunąć każdy link, który narusza Regulamin lub zostanie nam zgłoszony jako szkodliwy</li>
            <li>Nie odpowiadamy za treść stron, do których prowadzą skrócone linki</li>
            <li>Pliki na stronie udostępnia wyłącznie administrator. Treść niezgodną z prawem możesz zgłosić przez <Link href="/kontakt">formularz kontaktowy</Link></li>
            </ul>
            <h2 id="s6">6. API formularza i panel skrzynki</h2>
            <ul>
            <li>Konto w panelu i klucz API zakłada administrator na prośbę wysłaną przez <Link href="/kontakt">formularz kontaktowy</Link>. Nie ma obowiązku założenia konta każdej osobie, która o nie poprosi</li>
            <li>Dbasz o poufność hasła do panelu. Klucz API pozwala tylko wysyłać wiadomości do Twojej skrzynki, ale nie publikuj go w publicznych repozytoriach</li>
            <li>Obowiązują limity opisane w <Link href="/api">dokumentacji API</Link></li>
            <li>Formularz z kluczem API możesz umieścić tylko na stronie, za której treść odpowiadasz, i musisz poinformować jej użytkowników o przetwarzaniu ich danych</li>
            <li>Możesz w każdej chwili zrezygnować z konta, pisząc do nas. Wiadomości ze skrzynki usuwamy wtedy razem z kontem</li>
            <li>Usługodawca może wyłączyć usługę API, uprzedzając posiadaczy kont mailem co najmniej 14 dni wcześniej, chyba że wymaga tego bezpieczeństwo serwisu</li>
            </ul>
            <h2 id="s7">7. Powierzenie przetwarzania danych</h2>
            <p>Wiadomości wysłane przez formularz na Twojej stronie zawierają dane jej użytkowników (np. imię, email, telefon, treść wiadomości i adres IP). W stosunku do tych danych <strong>Ty jesteś administratorem</strong>, a usługodawca przetwarza je w Twoim imieniu. Ta część Regulaminu stanowi umowę powierzenia przetwarzania danych w rozumieniu art. 28 RODO:</p>
            <ul>
            <li>dane są przetwarzane wyłącznie w celu zapisania wiadomości, pokazania ich w panelu, wysłania powiadomienia email i ochrony przed spamem</li>
            <li>dostęp do danych ma tylko usługodawca, który zachowuje je w tajemnicy</li>
            <li>usługodawca stosuje środki bezpieczeństwa opisane w art. 32 RODO, w tym szyfrowane połączenie i zabezpieczony dostęp do panelu</li>
            <li>zgadzasz się na korzystanie z dostawcy hostingu i dostawcy poczty SMTP jako dalszych podmiotów przetwarzających</li>
            <li>usługodawca pomaga Ci w realizacji praw osób, których dane dotyczą, i niezwłocznie informuje o naruszeniu ochrony danych</li>
            <li>po zakończeniu korzystania z usługi dane są usuwane</li>
            </ul>
            <h2 id="s8">8. Ranking gry Głębina</h2>
            <p>Nick zgłaszany do rankingu nie może być obraźliwy, wulgarny ani podszywać się pod inną osobę. Takie wpisy oraz wyniki uzyskane nieuczciwie usuwamy.</p>
            <h2 id="s9">9. Odpowiedzialność</h2>
            <ul>
            <li>Dokładamy starań, żeby strona działała bez przerw, ale nie gwarantujemy jej ciągłej dostępności. Przerwy techniczne mogą wystąpić bez uprzedzenia</li>
            <li>Nie odpowiadamy za skutki korzystania ze strony niezgodnie z Regulaminem</li>
            <li>Ograniczenia odpowiedzialności obowiązują w granicach dopuszczalnych przez prawo i nie wyłączają praw, które przysługują konsumentom na mocy przepisów bezwzględnie obowiązujących</li>
            </ul>
            <h2 id="s10">10. Reklamacje</h2>
            <p>Reklamacje dotyczące usług zgłaszasz na adres <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a> lub przez <a href="/kontakt">formularz kontaktowy</a>. Opisz problem i podaj adres do odpowiedzi. Odpowiadamy w ciągu <strong>14 dni</strong> od otrzymania reklamacji.</p>
            <h2 id="s11">11. Zmiany regulaminu</h2>
            <p>Możemy zmienić Regulamin, np. przy nowych funkcjach strony lub zmianie przepisów. Datę zmiany pokazujemy na górze dokumentu. Posiadaczy kont w panelu informujemy o istotnych zmianach mailem co najmniej 14 dni przed ich wejściem w życie.</p>
            <h2 id="s12">12. Postanowienia końcowe</h2>
            <p>Regulamin podlega prawu <strong>Rzeczypospolitej Polskiej</strong>. Konsument może skorzystać z pozasądowych sposobów rozwiązywania sporów, np. z pomocy miejskiego lub powiatowego rzecznika konsumentów.</p>
        </LegalPage>
    );
}
