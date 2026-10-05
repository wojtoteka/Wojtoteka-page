// Strona dla adresów zablokowanych na całą stronę. Musi być samowystarczalna:
// zablokowany adres nie pobierze żadnego pliku z serwera (poza /img/), więc
// style są w środku, a jedyna grafika to logo z /img/. Odwzorowuje motyw v2
// (zob. components/v2/v2.css i app/(v2-system)), bez webfontów i JS-a.

export function blockedPage(): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dostęp zablokowany | Wojtoteka</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0B0A09">
<link rel="icon" href="/img/logo.png" type="image/png">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#0b0a09;--chalk:#efe9df;--ash:#8b867e;--volt:#f4d33c;--ember:#ff5b1f;
  --graphite:color-mix(in oklab,var(--chalk) 5%,var(--ink));
  --line:color-mix(in oklab,var(--chalk) 12%,var(--ink));
  --line-strong:color-mix(in oklab,var(--chalk) 30%,var(--ink));
  --font-display:'Arial Black',Impact,sans-serif;
  --font-body:ui-monospace,'Cascadia Code',Consolas,'SF Mono',monospace;
}
html,body{min-height:100%}
body{
  position:relative;isolation:isolate;display:flex;flex-direction:column;min-height:100svh;
  background:var(--ink);color:var(--chalk);font:0.9375rem/1.65 var(--font-body);
}
body::before{
  content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;
  background-image:linear-gradient(to right,rgb(239 233 223/0.05) 1px,transparent 1px),linear-gradient(to bottom,rgb(239 233 223/0.05) 1px,transparent 1px);
  background-size:88px 88px;background-position:-1px -1px;
  -webkit-mask-image:radial-gradient(ellipse 120% 90% at 50% 0%,#000 25%,transparent 80%);
  mask-image:radial-gradient(ellipse 120% 90% at 50% 0%,#000 25%,transparent 80%);
}
body::after{
  content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(640px circle at 72% 18%,rgb(255 91 31/0.14),transparent 62%),radial-gradient(900px circle at 10% 110%,rgb(244 211 60/0.05),transparent 60%);
}
::selection{background:var(--ember);color:var(--ink)}
a{color:inherit}
.wrap{width:min(100% - 2 * clamp(16px,3.5vw,48px),1440px);margin-inline:auto}
header.bar{display:flex;align-items:center;gap:12px;height:72px}
header.bar img{width:32px;height:32px;outline:1px solid var(--line-strong);outline-offset:3px}
header.bar .wordmark{font-family:var(--font-display);font-stretch:125%;font-weight:900;font-size:1.125rem;line-height:1;text-transform:uppercase}
main{flex:1 0 auto;display:grid;gap:24px;padding-block:clamp(16px,3vw,40px) clamp(40px,6vw,80px)}
.label{font-size:0.75rem;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:var(--ash)}
.label b{color:var(--volt);font-weight:500}
.code{
  position:relative;overflow:hidden;font-family:var(--font-display);font-stretch:125%;font-weight:900;
  font-size:clamp(8rem,34vw,32rem);line-height:0.8;letter-spacing:-0.05em;margin-left:-0.04em;
  color:transparent;-webkit-text-stroke:max(2px,0.008em) color-mix(in oklab,var(--chalk) 55%,var(--ink));
  user-select:none;
}
.copy{display:grid;gap:18px;max-width:52ch}
.title{font-family:var(--font-display);font-stretch:125%;font-weight:900;letter-spacing:-0.01em;font-size:clamp(2.25rem,4.5vw,4.5rem);line-height:1;text-transform:uppercase}
.text{color:var(--ash)}
.text:first-of-type{color:var(--chalk)}
a.link{text-decoration-line:underline;text-decoration-color:var(--line-strong);text-underline-offset:0.22em}
a.link:hover{text-decoration-color:var(--volt)}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.btn{
  position:relative;overflow:hidden;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;
  min-height:52px;padding:0 24px;font-family:var(--font-body);font-size:0.8125rem;font-weight:700;
  letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;white-space:nowrap;
}
.btn-primary{background:var(--volt);color:var(--ink)}
.btn-ghost{border:1px solid var(--line-strong);color:var(--chalk)}
.btn-ghost:hover{color:var(--ink);border-color:var(--chalk);background:var(--chalk)}
footer.foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;padding-block:20px 28px;border-top:1px solid var(--line);font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--ash)}
:focus-visible{outline:3px solid var(--volt);outline-offset:3px}
</style>
</head>
<body>
<header class="bar wrap">
<img src="/img/logo.png" alt="">
<span class="wordmark">Wojtoteka</span>
</header>
<main class="wrap">
<p class="label"><b>[ERR 403]</b> Dostęp zablokowany</p>
<p class="code" aria-hidden="true">403</p>
<div class="copy">
<h1 class="title">Dostęp zablokowany</h1>
<p class="text">Twój adres IP został zablokowany przez administratora, więc ta strona się nie otworzy.</p>
<p class="text">Jeśli to pomyłka, napisz na <a class="link" href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>. Podaj swój adres IP oraz przybliżoną datę i godzinę. Sprawdzimy sprawę i w razie potrzeby zdejmiemy blokadę.</p>
<div class="actions">
<a class="btn btn-primary" href="mailto:kontakt@wojtoteka.ovh">Napisz do nas</a>
</div>
</div>
</main>
<footer class="foot wrap">
<p>&copy; Wojtoteka 2024-${year}</p>
<a class="link" href="mailto:kontakt@wojtoteka.ovh">kontakt@wojtoteka.ovh</a>
</footer>
</body>
</html>`;
}
