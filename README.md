# Wojtoteka - strona

Backend i frontend serwisu **wojtoteka.ovh**: formularz kontaktowy, panel administracyjny,
publiczne API dla wiadomości, skracacz linków z filtrem bezpieczeństwa, hosting plików,
strona statusu i kilkanaście gier przeglądarkowych. Node.js + Express, MariaDB, ~98 tras HTTP
w jednym, wyraźnie podzielonym serwerze.

---

## Co to robi

**Formularz kontaktowy.** Wiadomości lądują w bazie, a na skrzynkę idzie powiadomienie SMTP.
Przed zapisem: hCaptcha, rate limit i sprawdzenie, czy IP nie jest zbanowane - osobno
dla całej strony i osobno dla konkretnego klucza API.

**Panel administratora.** Wiadomości z eksportem, konta podrzędne z własnymi uprawnieniami
i resetem hasła, bany IP, ogłoszenia na stronie, ustawienia serwisu, statystyki odsłon
z czyszczeniem ruchu botów, wysyłka maili i zarządzanie plikami.

**Publiczne API.** Klucze API (`/api/v1/contact`) pozwalają zewnętrznym projektom wysyłać
wiadomości do tej samej skrzynki - z własnymi statystykami, limitami i banami per klucz.

**Skracacz linków.** `/url/:code` z konfigurowalnym filtrem: wymóg HTTPS, czarna lista domen,
słowa kluczowe w domenie, lista wyjątków i log zablokowanych prób z IP. Cała polityka siedzi
w [`s_url/security-config.js`](s_url/security-config.js), więc da się ją przykręcić lub
poluzować bez ruszania kodu.

**Hosting plików.** `/file/:code` - upload przez panel (limit 100 MB, tyle ile przepuszcza
proxy Cloudflare), pobieranie po kodzie, kasowanie razem z plikiem na dysku.

**Bio-links.** Lista linków z licznikiem kliknięć i możliwością wyzerowania.

**Strona statusu.** `/status` wisi na HetrixTools i pokazuje dostępność usług.

**Ranking do gry.** `/api/glebina/token` + `/api/glebina/score` - wyniki podpisywane tokenem,
żeby nie dało się wysłać dowolnej liczby.

**Frontend.** Strona główna, kontakt, polityki prywatności (osobne dla Night Drive
i Fishing Party), oraz `/gry` - kilkanaście gier HTML5 serwowanych z `public/`
(GloomCraft, Fishing Party, Night Drive, Rope Climber, Głębina, 4 InaRow, Dance, Błystka).

---

## Stos

| Warstwa | Technologia |
|---|---|
| Serwer | Node.js + Express 4 |
| Baza | MariaDB / MySQL (`mysql2`) |
| Sesje | `express-session`, hasła przez `bcryptjs` |
| Bezpieczeństwo | Helmet, CSRF, `express-rate-limit`, hCaptcha, bany IP |
| Poczta | Nodemailer |
| Pliki | Multer |
| Widoki | EJS + statyczny HTML |

## Układ

```
server.js              trasy, middleware, sesje, limity (~98 endpointów)
config/
  database.js          pula połączeń MariaDB
  emailNotifier.js     powiadomienia SMTP
models/
  Admin.js             konto administratora
  SubAccount.js        konta podrzędne panelu
  Message.js           wiadomości z formularza + bany IP
  ApiKey.js            klucze publicznego API
  ApiMessage.js        wiadomości przychodzące przez API
s_url/
  security-config.js   polityka skracacza linków
  blocked-domains.js   czarna lista domen i słów kluczowych
public/                frontend: strony, panele, gry HTML5, assety
```

## Uruchomienie

```bash
cp .env.example .env   # baza, SMTP, hCaptcha, SESSION_SECRET
npm install
npm run dev            # nodemon, domyślnie http://localhost:7000
npm start              # produkcyjnie
```

## Uwagi

Repozytorium jest wycinkiem działającego serwisu - kod i lekkie assety. Poza gitem zostają:
`.env` z hasłami, katalog `uploads/` z plikami użytkowników, zrzuty bazy oraz ciężkie binaria
(instalatory, muzyka, wideo), które serwer trzyma na dysku i wydaje pod tymi samymi adresami.

## Licencja

Kod udostępniony do wglądu w celach portfolio.
