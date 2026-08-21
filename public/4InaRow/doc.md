# 4 IN A ROW

Klasyczna gra „Connect Four" w stylu fizycznej gry planszowej (ciemne tło,
niebieska plansza, czerwone i żółte pionki), zbudowana na silniku
[microStudio](https://microstudio.dev) (eksport HTML5, ekran 16:9).

## Jak grać

- Wybierz w menu, kto gra czerwonymi, a kto żółtymi: **Gracz**, **Bot Łatwy**
  lub **Bot Trudny** (możliwy też pojedynek bot vs bot - partie odpalają się
  wtedy automatycznie jedna po drugiej).
- Klikaj kolumnę, w którą chcesz wrzucić pionek. Podgląd („duch" pionka)
  pokazuje miejsce lądowania.
- Wygrywa ten, kto pierwszy ułoży cztery pionki w linii - poziomo, pionowo
  lub po skosie. Zwycięska czwórka zostaje podświetlona na złoto.
- **Cofnij ruch** - cofa ostatni ruch człowieka (jeden poziom, także po
  przegranej partii z botem).
- **SPACJA** - szybki restart partii z tymi samymi graczami.

## Tryby testowe (parametr w adresie)

- `index.html#autoplay` - pomija menu, startuje partię Gracz vs Gracz.
- `index.html#botduel` - pomija menu, startuje pojedynek Bot Trudny vs Bot Trudny.

## Struktura projektu

| Plik | Rola |
|---|---|
| `index.html` | cała gra: kod microScript (UI + logika) i boty w bloku `system.javascript` |
| `microengine.js`, `compiler.js`, `parser.js`, `processor.js`, `program.js`, `routine.js`, `runner.js`, `token.js`, `tokenizer.js`, `transpiler.js` | silnik microStudio - nie edytować |
| `fonts/` | fonty pixelowe BitCell i Squarewave |
| `icon*.png` | ikony/logo aplikacji (generowane skryptem, patrz niżej) |
| `manifest.json` | manifest PWA |
| `sprites/` | stare sprite'y - **nieużywane** (grafika rysowana jest wektorowo); można usunąć |

## Boty

Jedna klasa `NegamaxBot` (JavaScript, w `index.html`):
negamax z cięciami alfa-beta, tablicą transpozycji i iteracyjnym pogłębianiem.
Ruchy porządkowane: natychmiastowa wygrana → blok przeciwnika → od środka planszy.

| Poziom | Głębokość | Ocena pozycji |
|---|---|---|
| `easy` (Bot Łatwy) | maks. 4 | centrowanie + otwarte trójki |
| `hard` (Bot Trudny) | pełne pogłębianie (budżet 900 ms) | j.w. + heurystyka zugzwangu |

## Ikony

Ikony (`icon16/32/64/180/192/196/512/1024.png`) generuje skrypt PowerShell
`tools/make-icons.ps1` - rysuje logo w 1024 px (niebieska plansza z czerwoną,
zwycięską diagonalą i żółtymi pionkami) i skaluje do pozostałych rozmiarów.
