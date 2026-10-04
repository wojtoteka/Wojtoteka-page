import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/docs/LegalPage';

export const metadata: Metadata = {
    title: 'Regulamin: RoyalCasino Bot',
    description: 'Regulamin bota RoyalCasino na Discordzie: wirtualna waluta, zasady korzystania i zabronione działania.',
    alternates: { canonical: '/RoyalCasinoBot/regulamin' }
};

const TOC = [
    { id: 's1', label: 'Akceptacja regulaminu' },
    { id: 's2', label: 'Opis usługi' },
    { id: 's3', label: 'Obowiązki użytkownika' },
    { id: 's4', label: 'Wirtualna waluta' },
    { id: 's5', label: 'Zabronione działania' },
    { id: 's6', label: 'Zastrzeżenia' },
    { id: 's7', label: 'Wypowiedzenie' },
    { id: 's8', label: 'Ograniczenie odpowiedzialności' },
    { id: 's9', label: 'Zmiany w regulaminie' },
    { id: 's10', label: 'Prawo właściwe' },
    { id: 's11', label: 'Kontakt' }
];

export default function Page() {
    return (
        <LegalPage
            title="Regulamin"
            subject="RoyalCasino Bot"
            updated="20 lipca 2026"
            toc={TOC}
            note={
                <p>
                    Niniejszy Regulamin dotyczy bota Discord <strong>RoyalCasino</strong>. Zobacz też: <Link href="/RoyalCasinoBot/polityka">Polityka prywatności</Link> i <Link href="/RoyalCasinoBot">stronę bota</Link>.
                </p>
            }
        >
            <h2 id="s1">1. Akceptacja regulaminu</h2>
            <p>Korzystając z bota <strong>RoyalCasino</strong>, akceptujesz niniejszy Regulamin. Jeśli nie zgadzasz się z jego postanowieniami, natychmiast zaprzestań korzystania z bota.</p>
            <h2 id="s2">2. Opis usługi</h2>
            <p>RoyalCasino to bot Discord oferujący wirtualne gry kasynowe (Blackjack, Poker, Ruletka, Slots, Crash, Coinflip, Dice, War, HiLo, Miny, Zdrapka, Koło Fortuny, Keno, Plinko, Limbo, Pojedynek) z fikcyjną walutą. Bot zawiera system questów, głosowania, ekonomii i osiągnięć. Cała waluta i przedmioty są <strong>wirtualne i nie mają żadnej wartości pieniężnej w świecie rzeczywistym</strong>.</p>
            <div className="notice">
            <p><strong>Ważne:</strong> RoyalCasino jest usługą rozrywkową. Wirtualna waluta nie może być wymieniana na prawdziwe pieniądze, towary ani usługi.</p>
            </div>
            <h2 id="s3">3. Obowiązki użytkownika</h2>
            <ul>
            <li>Musisz mieć ukończone <strong>13 lat</strong> (wymóg Regulaminu Discorda)</li>
            <li><strong>NIE</strong> próbuj wykorzystywać, hakować ani nadużywać funkcjonalności bota</li>
            <li><strong>NIE</strong> używaj automatycznych narzędzi, botów ani skryptów do interakcji z RoyalCasino</li>
            <li><strong>NIE</strong> nękaj innych użytkowników ani właściciela bota</li>
            </ul>
            <h2 id="s4">4. Wirtualna waluta</h2>
            <ul>
            <li>Cała waluta jest <strong>fikcyjna</strong> i nie może być wymieniona na prawdziwe pieniądze</li>
            <li>Zastrzegamy sobie prawo do korekty sald w celu naprawy błędów lub exploitów</li>
            <li>Waluta może zostać zresetowana podczas dużych aktualizacji (z wcześniejszym powiadomieniem)</li>
            </ul>
            <h2 id="s5">5. Zabronione działania</h2>
            <div className="notice notice-error">
            <p><strong>Następujące działania są surowo zabronione:</strong></p>
            <ul>
            <li>Wykorzystywanie błędów (exploitów) lub nieuczciwa rozgrywka</li>
            <li>Udostępnianie konta lub posiadanie wielu kont w celu uzyskania przewagi</li>
            <li>Spamowanie komend lub nadużywanie funkcji bota</li>
            <li>Łamanie <a href="https://discord.com/terms" target="_blank">Regulaminu Discorda</a> lub Wytycznych Społeczności</li>
            </ul>
            </div>
            <h2 id="s6">6. Zastrzeżenia</h2>
            <ul>
            <li>RoyalCasino jest dostarczany w stanie <strong>„TAK JAK JEST”</strong> bez żadnych gwarancji</li>
            <li><strong>NIE</strong> ponosimy odpowiedzialności za utratę wirtualnej waluty z powodu błędów lub przestojów</li>
            <li>Gry wykorzystują generator liczb losowych - wyniki nie są gwarantowane</li>
            </ul>
            <h2 id="s7">7. Wypowiedzenie</h2>
            <p>Zastrzegamy sobie prawo do:</p>
            <ul>
            <li>Zbanowania użytkowników łamiących niniejszy Regulamin</li>
            <li>Zawieszenia lub wyłączenia bota w dowolnym momencie bez uprzedzenia</li>
            <li>Modyfikacji funkcji, wartości walut lub mechanik gier</li>
            </ul>
            <h2 id="s8">8. Ograniczenie odpowiedzialności</h2>
            <p>RoyalCasino to darmowa usługa rozrywkowa. Nie ponosimy odpowiedzialności za jakiekolwiek szkody wynikające z korzystania z bota lub jego niedostępności.</p>
            <h2 id="s9">9. Zmiany w regulaminie</h2>
            <p>Możemy zaktualizować niniejszy Regulamin w dowolnym momencie. Dalsze korzystanie z bota oznacza akceptację zaktualizowanego Regulaminu.</p>
            <h2 id="s10">10. Prawo właściwe</h2>
            <p>Niniejszy Regulamin podlega prawu <strong>Rzeczypospolitej Polskiej</strong>.</p>
            <h2 id="s11">11. Kontakt</h2>
            <p>W przypadku pytań lub zgłaszania naruszeń skontaktuj się z nami:</p>
            <ul>
            <li>Email: <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a></li>
            <li>Formularz kontaktowy: <a href="/kontakt">wojtoteka.ovh/kontakt</a></li>
            </ul>
        </LegalPage>
    );
}
