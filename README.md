# Wojtoteka - strona

Backend i frontend serwisu **wojtoteka.ovh**: formularz kontaktowy, panel administratora,
panel skrzynki dla klientów API, publiczne API dla wiadomości, skracacz linków z filtrem
bezpieczeństwa, hosting plików, strona statusu i kilkanaście gier przeglądarkowych.
TypeScript, Next.js (App Router) jako warstwa widoku, Express jako serwer, Auth.js do logowania, MariaDB.

---

## Co to robi

**Formularz kontaktowy.** Wiadomości lądują w bazie, a na skrzynkę idzie powiadomienie SMTP.
Przed zapisem: hCaptcha, limit 5 wiadomości na godzinę z IP, token CSRF i sprawdzenie blokady IP.

**Panel administratora (`/admin`).** Wiadomości z eksportem CSV, klucze API, konta panelu,
blokady IP (formularz albo cała strona, na czas lub na stałe), ogłoszenia na wybranych
podstronach, krótkie linki, pliki, linki na stronie głównej, wysyłka maili, tryb konserwacji
i statystyki odwiedzin.

**Panel skrzynki (`/panel`).** Właściciel klucza API czyta swoje wiadomości, blokuje adresy
i zmienia hasło. Reset hasła kodem z maila.

**Publiczne API.** `POST /api/v1/contact` z nagłówkiem `X-API-Key`. Pola, limity i przykłady
są na stronie `/api`, razem z testerem na żywo.

**Skracacz linków.** `/url/:code` z konfigurowalnym filtrem: wymóg HTTPS, czarna lista domen,
słowa kluczowe, wyjątki i log zablokowanych prób. Polityka siedzi w
[`s_url/security-config.ts`](s_url/security-config.ts) i [`s_url/blocked-domains.ts`](s_url/blocked-domains.ts).

**Hosting plików.** `/file/:code`, upload przez panel (do 100 MB), pobieranie albo podgląd.

**Gry.** Statyczne gry HTML5 w `public/` (Night Drive, GloomCraft, Fishing Party, Rope Climber,
Ostatni Oddech, Błystka, Trybka, 4 in a Row), opisane na `/gry`. Ranking Głębiny ma własny
anty-cheat (`/api/glebina/*`).

---

## Stos

| Warstwa | Technologia |
|---|---|
| Język | TypeScript |
| Widok | Next.js 16 (App Router), React 19, CSS Modules |
| Serwer | Express 5 (custom server Next.js) |
| Logowanie | Auth.js v5 (`next-auth`), sesja JWT w ciasteczku `wt.session` |
| Baza | MariaDB / MySQL (`mysql2`) |
| Bezpieczeństwo | Helmet (CSP), CSRF, `express-rate-limit`, hCaptcha, blokady IP |
| Poczta | Nodemailer |
| Pliki | Multer |

## Układ

```
server/                Express: nagłówki, blokady, konserwacja, limity, trasy API
  index.ts             start serwera, spina Express z Next.js
  auth.ts              odczyt i przedłużanie sesji Auth.js, powiązanie z IP i przeglądarką
  middleware.ts        limity, CSRF, sprawdzanie pochodzenia żądania
  routes/              public.ts, admin.ts, panel.ts, resources.ts
auth.ts                konfiguracja Auth.js (logowanie admina i konta panelu)
app/                   strony Next.js
  (site)/              strona główna, gry, kontakt, API, skracacz, status, polityki
  (system)/            budowa, wkrótce, niedostępne
  admin/, panel/       panele (logowanie + widoki chronione sesją)
components/            komponenty React i ich style (*.module.css)
lib/                   baza, modele, mailer, bezpieczeństwo, skracacz, pliki, gry
s_url/                 polityka skracacza linków
public/                gry HTML5, grafiki, RoyalCasinoBot, eksperymenty
```

## Logowanie

Auth.js obsługuje dwa rodzaje kont przez dostawców `credentials`: `admin` (login i hasło)
oraz `panel` (email i hasło). Zachowane są zabezpieczenia z poprzedniej wersji:

- blokada konta po 5 nieudanych próbach na 15 minut i alert mailem,
- limit nieudanych prób z jednego IP,
- sesja wygasa po 30 minutach bez aktywności,
- sesja przestaje działać, gdy zmieni się IP albo przeglądarka.

Stare sesje (`sessionId`) po aktualizacji przestają działać, więc trzeba zalogować się ponownie.

## Uruchomienie

```bash
cp .env.example .env   # baza, SMTP, hCaptcha, AUTH_SECRET
npm install
npm run dev            # tryb deweloperski, domyślnie http://localhost:7000
npm run build          # build Next.js
npm start              # produkcyjnie (po npm run build)
npm run typecheck      # kontrola typów
```

Build używa webpacka, bo Turbopack nie działa na dyskach exFAT. Plik
`scripts/exfat-readlink.cjs` poprawia też błąd `readlink` na takich dyskach.

## Uwagi

Repozytorium jest wycinkiem działającego serwisu: kod i lekkie assety. Poza gitem zostają
`.env` z hasłami, katalog `uploads/` z plikami użytkowników, zrzuty bazy oraz ciężkie binaria
(instalatory, muzyka, wideo), które serwer trzyma na dysku i wydaje pod tymi samymi adresami.

## Licencja

Kod udostępniony do wglądu w celach portfolio.
