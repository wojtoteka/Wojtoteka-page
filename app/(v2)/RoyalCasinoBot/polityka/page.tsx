import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Polityka prywatności: RoyalCasino Bot',
    description: 'Polityka prywatności bota RoyalCasino na Discordzie: jakie dane bot zapisuje, na jakiej podstawie i jak poprosić o ich usunięcie.',
    alternates: { canonical: '/RoyalCasinoBot/polityka' }
};

const TOC = [
    { id: 's1', label: 'Dane, które zbieramy' },
    { id: 's2', label: 'Jak wykorzystujemy Twoje dane' },
    { id: 's3', label: 'Podstawa prawna przetwarzania' },
    { id: 's4', label: 'Przechowywanie i bezpieczeństwo danych' },
    { id: 's5', label: 'Udostępnianie danych' },
    { id: 's6', label: 'Twoje prawa' },
    { id: 's7', label: 'Kontakt' }
];

export default function Page() {
    return (
        <LegalPage
            title="Polityka prywatności"
            subject="RoyalCasino Bot"
            updated="20 lipca 2026"
            toc={TOC}
            note={
                <p>
                    Niniejsza Polityka Prywatności dotyczy bota Discord <strong>RoyalCasino</strong>. Zobacz też: <Link href="/RoyalCasinoBot/regulamin">Regulamin</Link> i <Link href="/RoyalCasinoBot">stronę bota</Link>.
                </p>
            }
        >
            <h2 id="s1">1. Dane, które zbieramy</h2>
            <p>Korzystając z bota <strong>RoyalCasino</strong>, zbieramy następujące informacje:</p>
            <ul>
            <li><strong>Discord User ID</strong> - do identyfikacji Twojego konta</li>
            <li><strong>ID serwera (Guild ID)</strong> - serwer, na którym używane są komendy</li>
            <li><strong>Statystyki gier</strong> - wygrane, przegrane, liczba rozegranych gier</li>
            <li><strong>Saldo wirtualnej waluty</strong> oraz historia transakcji</li>
            <li><strong>Postęp osiągnięć</strong> i daty ich odblokowania</li>
            <li><strong>Postęp dziennych questów</strong> i historia ich ukończenia</li>
            <li><strong>Historia głosowań</strong> (liczba głosów, data ostatniego głosu)</li>
            <li><strong>Daty odbioru dziennych bonusów</strong></li>
            </ul>
            <h2 id="s2">2. Jak wykorzystujemy Twoje dane</h2>
            <ul>
            <li>Zapewnienie funkcjonalności gier kasynowych i śledzenie wirtualnej waluty</li>
            <li>Obliczanie i wyświetlanie statystyk użytkowników oraz tablic wyników</li>
            <li>Wysyłanie powiadomień na DM (awanse, osiągnięcia, duże wygrane)</li>
            <li>Zapobieganie nadużyciom i utrzymanie uczciwej rozgrywki</li>
            </ul>
            <h2 id="s3">3. Podstawa prawna przetwarzania</h2>
            <p>Przetwarzanie Twoich danych w związku z korzystaniem z bota RoyalCasino odbywa się na podstawie:</p>
            <ul>
            <li><strong>Art. 6 ust. 1 lit. b RODO</strong> - przetwarzanie jest niezbędne do świadczenia usługi bota (prowadzenie salda, statystyk gier i postępu), z której korzystasz akceptując <a href="/RoyalCasinoBot/regulamin">Regulamin</a></li>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora polegający na zapobieganiu nadużyciom, zapewnieniu uczciwej rozgrywki oraz prowadzeniu tablic wyników</li>
            </ul>
            <h2 id="s4">4. Przechowywanie i bezpieczeństwo danych</h2>
            <ul>
            <li>Dane są przechowywane w bezpiecznej bazie danych</li>
            <li><strong>NIE</strong> przechowujemy wiadomości, treści wiadomości ani danych osobowych poza ID Discorda</li>
            <li>Dane są przechowywane tak długo, jak korzystasz z bota - w każdej chwili możesz poprosić o ich usunięcie</li>
            </ul>
            <div className="notice">
            <p><strong>Ważna informacja:</strong> RoyalCasino nie czyta ani nie przechowuje treści Twoich wiadomości. Przetwarzamy wyłącznie komendy skierowane bezpośrednio do bota.</p>
            </div>
            <h2 id="s5">5. Udostępnianie danych</h2>
            <ul>
            <li><strong>NIE sprzedajemy</strong>, nie wymieniamy ani nie udostępniamy Twoich danych osobom trzecim</li>
            <li>Niektóre dane mogą być widoczne dla innych użytkowników przez tablice wyników i publiczne statystyki</li>
            </ul>
            <h2 id="s6">6. Twoje prawa</h2>
            <p>Zgodnie z RODO przysługują Ci następujące prawa:</p>
            <ul>
            <li><strong>Prawo dostępu i sprostowania danych (Art. 15, 16 RODO)</strong> - skontaktuj się z nami, aby sprawdzić lub poprawić swoje dane</li>
            <li><strong>Prawo do usunięcia danych (Art. 17 RODO)</strong> - skontaktuj się z właścicielem bota, aby zażądać usunięcia</li>
            <li><strong>Prawo do sprzeciwu (Art. 21 RODO)</strong> - wystarczy przestać korzystać z bota</li>
            <li><strong>Rezygnacja z powiadomień DM</strong> - wyłącz je w ustawieniach bota</li>
            <li><strong>Prawo do wniesienia skargi:</strong> masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stanisława Moniuszki 1A, 00-014 Warszawa), jeśli uważasz, że przetwarzanie Twoich danych narusza przepisy RODO</li>
            </ul>
            <h2 id="s7">7. Kontakt</h2>
            <p>W sprawie kwestii dotyczących prywatności skontaktuj się z nami:</p>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
        </LegalPage>
    );
}
