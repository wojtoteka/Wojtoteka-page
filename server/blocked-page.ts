// Strona dla adresów zablokowanych na całą stronę. Musi być samowystarczalna:
// zablokowany adres nie pobierze żadnego pliku z serwera (poza /img/), więc
// style są w środku, a jedyna grafika to logo z /img/.

export function blockedPage(): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dostęp zablokowany | Wojtoteka</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#14161A">
<link rel="icon" href="/img/logo.png" type="image/png">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%;background:#14161A;color:#EEEAE2}
body{font:17px/1.6 "Segoe UI",Helvetica,Arial,sans-serif;display:flex;align-items:center;min-height:100vh;padding:48px 16px}
main{max-width:620px;margin:0 auto}
img{width:88px;height:88px;border-radius:22px;border:3px solid #EEEAE2;transform:rotate(-4deg);margin-bottom:28px}
h1{font:900 clamp(48px,12vw,96px)/0.9 Impact,"Arial Narrow Bold","Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.01em;margin-bottom:20px}
p{color:#9EA1AA;max-width:60ch}
p+p{margin-top:12px}
a{color:#EEEAE2;text-underline-offset:3px}
a:focus-visible{outline:3px solid #F2CF5B;outline-offset:3px}
footer{margin-top:40px;font-size:14px;color:#9EA1AA}
</style>
</head>
<body>
<main>
<img src="/img/logo.png" alt="Logo Wojtoteka: żółta kaczka">
<h1>Dostęp zablokowany</h1>
<p>Twój adres IP został zablokowany przez administratora, więc ta strona się nie otworzy.</p>
<p>Jeśli to pomyłka, napisz na <a href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>. Podaj swój adres IP oraz przybliżoną datę i godzinę. Sprawdzimy sprawę i w razie potrzeby zdejmiemy blokadę.</p>
<footer>&copy; Wojtoteka 2024-${year}</footer>
</main>
</body>
</html>`;
}
