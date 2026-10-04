import type { Metadata } from 'next';
import Link from 'next/link';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { DocsLayout, type TocItem } from '@/components/docs/DocsLayout';
import { ApiTester } from './ApiTester';
import styles from './api.module.css';

export const metadata: Metadata = {
    title: 'API formularza kontaktowego',
    description: 'Wstaw formularz kontaktowy na swoją stronę. Wiadomości trafią do Twojego panelu na wojtoteka.ovh. Endpoint, pola, limity i przykłady.',
    alternates: { canonical: '/api' }
};

const ENDPOINT = 'https://wojtoteka.ovh/api/v1/contact';

const TOC: TocItem[] = [
    { id: 'start', label: 'Jak zacząć' },
    { id: 'endpoint', label: 'Adres endpointu' },
    { id: 'autoryzacja', label: 'Klucz API' },
    { id: 'pola', label: 'Pola formularza' },
    { id: 'odpowiedzi', label: 'Odpowiedzi serwera' },
    { id: 'przyklady', label: 'Przykłady kodu' },
    { id: 'cors', label: 'Inne domeny (CORS)' },
    { id: 'limity', label: 'Limity' },
    { id: 'test', label: 'Test na żywo' },
    { id: 'faq', label: 'Pytania' }
];

const HTML_EXAMPLE = `<form id="contactForm">
  <label>Imię <input name="name" required></label>
  <label>Email <input name="email" type="email" required></label>
  <label>Temat <input name="subject" required></label>
  <label>Wiadomość <textarea name="message" required></textarea></label>
  <button type="submit">Wyślij</button>
</form>
<p id="formStatus" role="status"></p>

<script>
document.getElementById('contactForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button');
  const status = document.getElementById('formStatus');

  button.disabled = true;
  try {
    const response = await fetch('${ENDPOINT}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'TWOJ_KLUCZ_API'
      },
      body: JSON.stringify({
        name: form.name.value,
        email: form.email.value,
        subject: form.subject.value,
        message: form.message.value
      })
    });
    const data = await response.json();
    status.textContent = data.message;
    if (response.ok) form.reset();
  } catch (error) {
    status.textContent = 'Brak połączenia. Spróbuj ponownie.';
  } finally {
    button.disabled = false;
  }
});
</script>`;

const CURL_EXAMPLE = `curl -X POST ${ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: TWOJ_KLUCZ_API" \\
  -d '{
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "subject": "Test API",
    "message": "To jest wiadomość testowa."
  }'`;

const PYTHON_EXAMPLE = `import requests

response = requests.post(
    "${ENDPOINT}",
    headers={"X-API-Key": "TWOJ_KLUCZ_API"},
    json={
        "name": "Jan Kowalski",
        "email": "jan@example.com",
        "subject": "Test z Pythona",
        "message": "Wiadomość wysłana z requests."
    },
)
print(response.status_code, response.json())`;

const NODE_EXAMPLE = `const response = await fetch('${ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'TWOJ_KLUCZ_API'
  },
  body: JSON.stringify({
    name: 'Jan Kowalski',
    email: 'jan@example.com',
    subject: 'Test z Node.js',
    message: 'Wiadomość wysłana z Node.js.'
  })
});
console.log(response.status, await response.json());`;

const PHP_EXAMPLE = `<?php
$ch = curl_init('${ENDPOINT}');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'X-API-Key: TWOJ_KLUCZ_API'
    ],
    CURLOPT_POSTFIELDS     => json_encode([
        'name'    => 'Jan Kowalski',
        'email'   => 'jan@example.com',
        'subject' => 'Test z PHP',
        'message' => 'Wiadomość wysłana z PHP.'
    ])
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP $status: $response";`;

export default function ApiDocsPage() {
    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">API formularza</h1>
                <p className="lead">
                    Wstaw formularz kontaktowy na swoją stronę bez własnego serwera. Wiadomości trafiają do Twojego panelu i, jeśli chcesz,
                    na Twój email.
                </p>
                <p className={styles.endpointLine}>
                    <span className={styles.method}>POST</span>
                    <code>{ENDPOINT}</code>
                </p>
            </header>

            <DocsLayout toc={TOC} tocLabel="Na tej stronie">
                <h2 id="start">Jak zacząć</h2>
                <p>Potrzebujesz tylko klucza API. Dostajesz go od administratora razem z kontem w panelu.</p>
                <ol>
                    <li>Administrator tworzy dla Ciebie klucz API i konto w panelu.</li>
                    <li>Dane do logowania (email i hasło) przychodzą mailem.</li>
                    <li>Wklejasz formularz na swoją stronę i wpisujesz w nim klucz.</li>
                    <li>
                        Wiadomości czytasz w <Link href="/panel">panelu skrzynki</Link>. Możesz też dostawać je mailem.
                    </li>
                </ol>
                <p>
                    Nie masz klucza? <Link href="/kontakt">Napisz przez formularz kontaktowy</Link>.
                </p>

                <h2 id="endpoint">Adres endpointu</h2>
                <p>
                    Wszystkie wiadomości wysyłasz metodą <code>POST</code> na jeden adres, z nagłówkiem <code>Content-Type: application/json</code>:
                </p>
                <CodeBlock label="Endpoint" code={ENDPOINT} />
                <p>
                    Przeglądarka przed właściwym żądaniem wyśle <code>OPTIONS</code> na ten sam adres (tzw. preflight). Serwer odpowiada na nie
                    automatycznie.
                </p>

                <h2 id="autoryzacja">Klucz API</h2>
                <p>
                    Każde żądanie musi mieć nagłówek <code>X-API-Key</code> z Twoim kluczem:
                </p>
                <CodeBlock label="Nagłówki" code={`Content-Type: application/json\nX-API-Key: twoj-klucz-api`} />
                <p>
                    Klucz będzie widoczny w kodzie Twojej strony. Przy formularzu kontaktowym to normalne, bo klucz pozwala tylko wysłać wiadomość
                    do Twojej skrzynki. Nie wrzucaj go jednak do publicznych repozytoriów, żeby nikt nie zaśmiecał Ci skrzynki.
                </p>

                <h2 id="pola">Pola formularza</h2>
                <p>
                    Administrator ustala, które pola zbiera Twój klucz. Każde włączone pole jest <strong>wymagane</strong>. Pola wyłączone serwer
                    pomija.
                </p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Pole</th>
                                <th scope="col">Co zawiera</th>
                                <th scope="col">Długość</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>name</code></td><td>Imię lub nick nadawcy</td><td>do 255 znaków</td></tr>
                            <tr><td><code>email</code></td><td>Adres email nadawcy (sprawdzany format)</td><td>do 255 znaków</td></tr>
                            <tr><td><code>phone</code></td><td>Numer telefonu</td><td>do 50 znaków</td></tr>
                            <tr><td><code>subject</code></td><td>Temat wiadomości</td><td>do 255 znaków</td></tr>
                            <tr><td><code>message</code></td><td>Treść wiadomości</td><td>do 5000 znaków</td></tr>
                        </tbody>
                    </table>
                </div>
                <p>Dłuższe wartości serwer przycina do limitu, zamiast odrzucać całą wiadomość.</p>

                <h2 id="odpowiedzi">Odpowiedzi serwera</h2>
                <p>
                    Odpowiedź to zawsze JSON z polem <code>message</code>. Możesz pokazać je użytkownikowi bez zmian.
                </p>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Kod</th>
                                <th scope="col">Kiedy</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><code>200</code></td><td>Wiadomość zapisana. W odpowiedzi jest też jej <code>id</code>.</td></tr>
                            <tr><td><code>400</code></td><td>Brakuje wymaganego pola albo email ma zły format.</td></tr>
                            <tr><td><code>401</code></td><td>Brak klucza, zły klucz albo klucz wyłączony.</td></tr>
                            <tr><td><code>403</code></td><td>Adres IP nadawcy jest zablokowany.</td></tr>
                            <tr><td><code>429</code></td><td>Przekroczony limit wiadomości (zobacz niżej).</td></tr>
                            <tr><td><code>500</code></td><td>Błąd po stronie serwera. Spróbuj ponownie później.</td></tr>
                        </tbody>
                    </table>
                </div>

                <h2 id="przyklady">Przykłady kodu</h2>
                <p>Zamień <code>TWOJ_KLUCZ_API</code> na swój klucz. Pola dopasuj do tych, które zbiera Twój klucz.</p>
                <h3>HTML i JavaScript (wklej na swoją stronę)</h3>
                <CodeBlock label="HTML" code={HTML_EXAMPLE} />
                <h3>cURL</h3>
                <CodeBlock label="Terminal" code={CURL_EXAMPLE} />
                <h3>Python (requests)</h3>
                <CodeBlock label="Python" code={PYTHON_EXAMPLE} />
                <h3>Node.js (fetch)</h3>
                <CodeBlock label="JavaScript" code={NODE_EXAMPLE} />
                <h3>PHP (cURL)</h3>
                <CodeBlock label="PHP" code={PHP_EXAMPLE} />

                <h2 id="cors">Inne domeny (CORS)</h2>
                <p>
                    Endpoint przyjmuje żądania z każdej domeny. Nie musisz niczego ustawiać: <code>fetch()</code> ze strony w przeglądarce działa od
                    razu. Serwer odsyła takie nagłówki:
                </p>
                <CodeBlock
                    label="Nagłówki odpowiedzi"
                    code={`Access-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: POST, OPTIONS\nAccess-Control-Allow-Headers: Content-Type, X-API-Key`}
                />

                <h2 id="limity">Limity</h2>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Co jest liczone</th>
                                <th scope="col">Limit</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Wiadomości z jednego adresu IP</td><td>30 na godzinę</td></tr>
                            <tr><td>Wiadomości na jeden klucz API, ze wszystkich adresów</td><td>100 na godzinę</td></tr>
                            <tr><td>Rozmiar treści żądania</td><td>1 MB</td></tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    Po przekroczeniu limitu serwer zwraca <code>429</code>. Nagłówki <code>RateLimit</code> w odpowiedzi mówią, kiedy limit się
                    odnowi.
                </p>

                <h2 id="test">Test na żywo</h2>
                <p>
                    Wklej klucz, wczytaj jego pola i wyślij prawdziwe żądanie. Wiadomość testowa pojawi się w Twoim panelu, więc potem możesz ją
                    usunąć.
                </p>
                <ApiTester />

                <h2 id="faq">Pytania</h2>
                <div className={styles.faq}>
                    <details>
                        <summary>Skąd wiem, które pola zbiera mój klucz?</summary>
                        <p>Wklej klucz w teście powyżej i kliknij „Wczytaj pola”. Ta sama informacja jest pod adresem <code>/api/v1/contact/config</code>.</p>
                    </details>
                    <details>
                        <summary>Czy jeden klucz może działać na kilku stronach?</summary>
                        <p>Tak. Endpoint przyjmuje żądania z każdej domeny, więc jeden klucz obsłuży dowolną liczbę stron.</p>
                    </details>
                    <details>
                        <summary>Ktoś zasypuje mój formularz spamem. Co zrobić?</summary>
                        <p>
                            W <Link href="/panel">panelu</Link> zablokujesz adres IP nadawcy. Blokada działa tylko dla Twojego klucza. Limit 30 wiadomości
                            na godzinę z jednego adresu działa niezależnie od tego.
                        </p>
                    </details>
                    <details>
                        <summary>Gdzie są zapisane wiadomości?</summary>
                        <p>W bazie danych serwisu. Widzisz je w panelu i tam też je usuwasz.</p>
                    </details>
                    <details>
                        <summary>Czy dostanę maila przy nowej wiadomości?</summary>
                        <p>Tak, jeśli administrator ustawił adres powiadomień dla Twojego klucza. Mail przychodzi przy każdej nowej wiadomości.</p>
                    </details>
                    <details>
                        <summary>Nie pamiętam hasła do panelu</summary>
                        <p>Na stronie logowania kliknij „Nie pamiętam hasła”. Na Twój email przyjdzie 6-cyfrowy kod, ważny 10 minut.</p>
                    </details>
                    <details>
                        <summary>Konto się zablokowało</summary>
                        <p>Po 5 nieudanych próbach logowania konto blokuje się na 15 minut. Możesz poczekać albo poprosić administratora o odblokowanie.</p>
                    </details>
                </div>
            </DocsLayout>
        </div>
    );
}
