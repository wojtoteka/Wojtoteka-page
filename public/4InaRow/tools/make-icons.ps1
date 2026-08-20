# Generuje ikony gry "4 In a Row" w plaskim stylu klasycznej gry planszowej:
# niebieska plansza, kremowe gniazda, czerwona zwycieska diagonala + zolte pionki.
# Rysuje 1024x1024, zapisuje icon1024.png i skaluje do pozostalych rozmiarow.
# Uruchomienie:  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$size = 1024

$CREAM     = [System.Drawing.Color]::FromArgb(255,32,34,43)   # ciemne "przeswity" gniazd
$BLUE_TOP  = [System.Drawing.Color]::FromArgb(255,47,106,216)
$BLUE_BOT  = [System.Drawing.Color]::FromArgb(255,33,84,184)
$BLUE_DARK = [System.Drawing.Color]::FromArgb(255,28,74,166)
$RED       = [System.Drawing.Color]::FromArgb(255,232,64,47)
$RED_RIM   = [System.Drawing.Color]::FromArgb(255,181,39,28)
$YEL       = [System.Drawing.Color]::FromArgb(255,255,201,51)
$YEL_RIM   = [System.Drawing.Color]::FromArgb(255,217,155,16)

function Draw-Hole([System.Drawing.Graphics]$g,[single]$x,[single]$y){
  $r = 84
  $b = New-Object System.Drawing.SolidBrush($CREAM)
  $g.FillEllipse($b, $x-$r, $y-$r, 2*$r, 2*$r)
  $b.Dispose()
  $pen = New-Object System.Drawing.Pen($BLUE_DARK, 10)
  $g.DrawEllipse($pen, $x-$r, $y-$r, 2*$r, 2*$r)
  $pen.Dispose()
}

function Draw-Disc([System.Drawing.Graphics]$g,[single]$x,[single]$y,[string]$piece){
  $r = 88
  if ($piece -eq "x"){ $main = $RED; $rim = $RED_RIM } else { $main = $YEL; $rim = $YEL_RIM }
  $b = New-Object System.Drawing.SolidBrush($main)
  $g.FillEllipse($b, $x-$r, $y-$r, 2*$r, 2*$r)
  $b.Dispose()
  # obwodka
  $pen = New-Object System.Drawing.Pen($rim, 12)
  $g.DrawEllipse($pen, $x-$r+6, $y-$r+6, 2*($r-6), 2*($r-6))
  $pen.Dispose()
  # wewnetrzny wcisniety ring (jak w prawdziwym zetonie)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120,$rim.R,$rim.G,$rim.B), 7)
  $ir = $r*0.58
  $g.DrawEllipse($pen, $x-$ir, $y-$ir, 2*$ir, 2*$ir)
  $pen.Dispose()
  # blysk
  $sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140,255,255,255))
  $g.FillEllipse($sb, $x-$r*0.55, $y-$r*0.62, $r*0.42, $r*0.32)
  $sb.Dispose()
}

$bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# tlo: niebieska plansza (delikatne cieniowanie plastiku, pion)
$bgRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $BLUE_TOP, $BLUE_BOT, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$g.FillRectangle($bgBrush, $bgRect)
$bgBrush.Dispose()

# siatka 4x4: srodki komorek
$cell = 208
$origin = 200
function CellX([int]$c){ return $origin + $c*$cell }
function CellY([int]$r){ return $origin + $r*$cell }

# puste gniazda
for ($r = 0; $r -lt 4; $r++){
  for ($c = 0; $c -lt 4; $c++){
    Draw-Hole $g (CellX $c) (CellY $r)
  }
}

# pionki: czerwona wygrana diagonala + zolte tlo partii
$discs = @(
  @{r=0; c=3; p="x"},
  @{r=1; c=2; p="x"}, @{r=1; c=3; p="o"},
  @{r=2; c=1; p="x"}, @{r=2; c=2; p="o"}, @{r=2; c=3; p="x"},
  @{r=3; c=0; p="x"}, @{r=3; c=1; p="o"}, @{r=3; c=2; p="o"}, @{r=3; c=3; p="o"}
)
foreach ($d in $discs){
  Draw-Disc $g (CellX $d.c) (CellY $d.r) $d.p
}

# biale pierscienie na zwycieskiej czworce
$diag = @( @{r=3;c=0}, @{r=2;c=1}, @{r=1;c=2}, @{r=0;c=3} )
foreach ($d in $diag){
  $x = CellX $d.c
  $y = CellY $d.r
  foreach ($ring in @( @{a=70; w=34; r=103}, @{a=255; w=14; r=99} )){
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($ring.a,255,255,255), $ring.w)
    $g.DrawEllipse($pen, $x-$ring.r, $y-$ring.r, 2*$ring.r, 2*$ring.r)
    $pen.Dispose()
  }
}

$g.Dispose()
$bmp.Save((Join-Path $root "icon1024.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# skalowanie do pozostalych rozmiarow
foreach ($s in 512,196,192,180,64,32,16){
  $out = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gg = [System.Drawing.Graphics]::FromImage($out)
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $gg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $destRect = New-Object System.Drawing.Rectangle(0, 0, $s, $s)
  $gg.DrawImage($bmp, $destRect, 0, 0, $size, $size, [System.Drawing.GraphicsUnit]::Pixel)
  $gg.Dispose()
  $out.Save((Join-Path $root "icon$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
}

$bmp.Dispose()
Write-Host "OK: wygenerowano icon1024/512/196/192/180/64/32/16.png w $root"
