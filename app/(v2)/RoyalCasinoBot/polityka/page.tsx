import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: RoyalCasino Bot',
    description: 'Polityka prywatności bota RoyalCasino na Discordzie: kto jest administratorem, jakie dane bot zapisuje, na jakiej podstawie i jak poprosić o ich usunięcie.',
    alternates: { canonical: '/RoyalCasinoBot/polityka' }
};

const TOC = [
    { id: 's1', label: 'Administrator danych' },
    { id: 's2', label: 'Dane, które zbieramy' },
    { id: 's3', label: 'Jak wykorzystujemy Twoje dane' },
    { id: 's4', label: 'Podstawa prawna przetwarzania' },
    { id: 's5', label: 'Odbiorcy danych' },
    { id: 's6', label: 'Przechowywanie i bezpieczeństwo danych' },
    { id: 's7', label: 'Twoje prawa' },
    { id: 's8', label: 'Kontakt' }
];

export default function Page() {
    return (
        <LegalPage
            title="Polityka prywatności"
            subject="RoyalCasino Bot"
            updated="4 października 2026"
            toc={TOC}
            note={
                <p>
                    Niniejsza Polityka Prywatności dotyczy bota Discord <strong>RoyalCasino</strong>. Zobacz też: <Link href="/RoyalCasinoBot/regulamin">Regulamin</Link> i <Link href="/RoyalCasinoBot">stronę bota</Link>.
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
            <p>Korzystając z bota <strong>RoyalCasino</strong>, zbieramy następujące informacje:</p>
            <ul>
            <li><strong>Discord User ID</strong> - do identyfikacji Twojego konta</li>
            <li><strong>ID serwera (Guild ID)</strong> - serwer, na którym używane są komendy</li>
            <li><strong>Statystyki gier</strong> - wygrane, przegrane, liczba rozegranych gier, poziom i XP</li>
            <li><strong>Saldo wirtualnej waluty i kredytów</strong> oraz historia transakcji</li>
            <li><strong>Postęp osiągnięć</strong> i daty ich odblokowania</li>
            <li><strong>Postęp dziennych questów</strong> i historia ich ukończenia</li>
            <li><strong>Historia głosowań</strong> (liczba głosów, data ostatniego głosu)</li>
            <li><strong>Daty odbioru dziennych bonusów</strong> i długość serii</li>
            <li><strong>Polecenia</strong> - kto kogo zaprosił przez <code>/polecenie</code></li>
            <li><strong>Ustawienia gracza</strong> - wybrany język, przyjmowanie pojedynków i powiadomień na DM</li>
            <li><strong>Ustawienia serwera</strong> - kanał kasyna i włączenie pojedynków, ustawione przez administratora serwera</li>
            <li><strong>Zgłoszenia</strong> - treść, którą wysyłasz przez <code>/zgłoszenie</code>, oraz ID zgłaszanego gracza, jeśli go wskażesz</li>
            </ul>
            <h2 id="s3">3. Jak wykorzystujemy Twoje dane</h2>
            <ul>
            <li>Zapewnienie funkcjonalności gier kasynowych i śledzenie wirtualnej waluty</li>
            <li>Obliczanie i wyświetlanie statystyk użytkowników oraz tablic wyników</li>
            <li>Wysyłanie powiadomień na DM (awanse, osiągnięcia, duże wygrane)</li>
            <li>Rozpatrywanie zgłoszeń błędów i nadużyć</li>
            <li>Zapobieganie nadużyciom i utrzymanie uczciwej rozgrywki</li>
            </ul>
            <p>Nie podejmujemy wobec Ciebie decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, które wywoływałyby skutki prawne (art. 22 RODO). Wyniki gier losuje generator liczb losowych i dotyczą one wyłącznie wirtualnej waluty.</p>
            <h2 id="s4">4. Podstawa prawna przetwarzania</h2>
            <p>Przetwarzanie Twoich danych w związku z korzystaniem z bota RoyalCasino odbywa się na podstawie:</p>
            <ul>
            <li><strong>Art. 6 ust. 1 lit. b RODO</strong> - przetwarzanie jest niezbędne do świadczenia usługi bota (prowadzenie salda, statystyk gier, postępu i ustawień), z której korzystasz akceptując <a href="/RoyalCasinoBot/regulamin">Regulamin</a></li>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora polegający na zapobieganiu nadużyciom, rozpatrywaniu zgłoszeń, zapewnieniu uczciwej rozgrywki oraz prowadzeniu tablic wyników</li>
            </ul>
            <h2 id="s5">5. Odbiorcy danych</h2>
            <ul>
            <li><strong>NIE sprzedajemy</strong> ani nie wymieniamy Twoich danych</li>
            <li><strong>Dostawca hostingu</strong> (Skillhost) - na jego serwerach działa bot i jego baza danych. Ma dostęp do danych tylko w zakresie potrzebnym do utrzymania serwera</li>
            <li><strong>Discord</strong> - komendy i odpowiedzi bota przechodzą przez Discorda, który przetwarza je zgodnie z własną <a href="https://discord.com/privacy" target="_blank" rel="noopener">polityką prywatności</a></li>
            <li><strong>top.gg</strong> - gdy głosujesz na bota, top.gg przekazuje nam Twoje Discord User ID, żeby przyznać nagrodę. Serwis działa według własnej polityki prywatności</li>
            <li><strong>Inni użytkownicy</strong> - część danych (saldo, poziom, statystyki) jest widoczna w tablicach wyników, profilach i publicznych statystykach</li>
            </ul>
            <h2 id="s6">6. Przechowywanie i bezpieczeństwo danych</h2>
            <ul>
            <li>Dane są przechowywane w zabezpieczonej bazie danych, do której dostęp ma tylko administrator</li>
            <li><strong>NIE</strong> przechowujemy treści Twoich wiadomości ani danych osobowych poza ID Discorda. Wyjątkiem jest treść zgłoszeń, które sam wysyłasz przez <code>/zgłoszenie</code></li>
            <li>Dane konta są przechowywane tak długo, jak korzystasz z bota - w każdej chwili możesz poprosić o ich usunięcie</li>
            <li>Zgłoszenia przechowujemy przez czas potrzebny do ich rozpatrzenia</li>
            </ul>
            <div className="notice">
            <p><strong>Ważna informacja:</strong> RoyalCasino nie czyta ani nie przechowuje treści Twoich wiadomości. Przetwarzamy wyłącznie komendy skierowane bezpośrednio do bota.</p>
            </div>
            <h2 id="s7">7. Twoje prawa</h2>
            <p>Zgodnie z RODO przysługują Ci następujące prawa:</p>
            <ul>
            <li><strong>Prawo dostępu i sprostowania danych (Art. 15, 16 RODO)</strong> - skontaktuj się z nami, aby sprawdzić lub poprawić swoje dane</li>
            <li><strong>Prawo do usunięcia danych (Art. 17 RODO)</strong> - skontaktuj się z administratorem, aby zażądać usunięcia</li>
            <li><strong>Prawo do ograniczenia przetwarzania (Art. 18 RODO)</strong> - możesz poprosić o wstrzymanie przetwarzania na czas wyjaśnienia sprawy</li>
            <li><strong>Prawo do przenoszenia danych (Art. 20 RODO)</strong> - na prośbę wyślemy Ci Twoje dane w popularnym formacie</li>
            <li><strong>Prawo do sprzeciwu (Art. 21 RODO)</strong> - wobec przetwarzania opartego na prawnie uzasadnionym interesie; napisz do nas, a rozpatrzymy sprzeciw</li>
            <li><strong>Rezygnacja z powiadomień DM</strong> - wyłącz je w ustawieniach bota</li>
            <li><strong>Prawo do wniesienia skargi:</strong> masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stanisława Moniuszki 1A, 00-014 Warszawa), jeśli uważasz, że przetwarzanie Twoich danych narusza przepisy RODO</li>
            </ul>
            <p>Na wnioski odpowiadamy bez zbędnej zwłoki, najpóźniej w ciągu miesiąca.</p>
            <h2 id="s8">8. Kontakt</h2>
            <p>W sprawie kwestii dotyczących prywatności skontaktuj się z nami:</p>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
        </LegalPage>
    );
}
