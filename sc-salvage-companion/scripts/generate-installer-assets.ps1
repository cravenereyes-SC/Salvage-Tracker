$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDir = Join-Path $PSScriptRoot 'installer-assets'
$heroPath = Join-Path $projectRoot 'src/assets/hero.png'
$iconPngPath = Join-Path $assetDir 'icon-256.png'
$iconIcoPath = Join-Path $assetDir 'app-icon.ico'
$wizardBmpPath = Join-Path $assetDir 'wizard.bmp'
$headerBmpPath = Join-Path $assetDir 'header.bmp'

$null = New-Item -ItemType Directory -Path $assetDir -Force

function New-PngBackedIco {
  param(
    [string]$PngPath,
    [string]$IcoPath
  )

  $pngBytes = [System.IO.File]::ReadAllBytes($PngPath)
  $stream = [System.IO.File]::Create($IcoPath)
  $writer = New-Object System.IO.BinaryWriter($stream)

  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]1)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$pngBytes.Length)
    $writer.Write([UInt32]22)
    $writer.Write($pngBytes)
    $writer.Flush()
  }
  finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

$hero = [System.Drawing.Image]::FromFile($heroPath)
try {
  $bgMain = [System.Drawing.Color]::FromArgb(6, 19, 28)
  $bgSecondary = [System.Drawing.Color]::FromArgb(11, 33, 49)
  $textColor = [System.Drawing.Color]::FromArgb(214, 233, 243)
  $accent = [System.Drawing.Color]::FromArgb(255, 176, 61)

  $iconBmp = New-Object System.Drawing.Bitmap 256, 256
  $iconGraphics = [System.Drawing.Graphics]::FromImage($iconBmp)
  try {
    $iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $iconGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $iconRect = New-Object System.Drawing.Rectangle 0, 0, 256, 256
    $iconGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($iconRect, $bgMain, $bgSecondary, 45)
    $iconGraphics.FillRectangle($iconGrad, $iconRect)
    $iconGrad.Dispose()

    $iconOverlay = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 122, 181, 211))
    $iconGraphics.FillEllipse($iconOverlay, -20, 122, 210, 150)
    $iconOverlay.Dispose()

    $scale = [Math]::Min(180.0 / $hero.Width, 180.0 / $hero.Height)
    $drawWidth = [int]($hero.Width * $scale)
    $drawHeight = [int]($hero.Height * $scale)
    $drawX = [int]((256 - $drawWidth) / 2)
    $drawY = [int](22 + (180 - $drawHeight) / 2)
    $iconGraphics.DrawImage($hero, $drawX, $drawY, $drawWidth, $drawHeight)

    $titleFont = New-Object System.Drawing.Font('Segoe UI Black', 24, [System.Drawing.FontStyle]::Bold)
    $titleBrush = New-Object System.Drawing.SolidBrush($accent)
    $iconGraphics.DrawString('SC', $titleFont, $titleBrush, 16, 194)
    $titleFont.Dispose()
    $titleBrush.Dispose()
  }
  finally {
    $iconGraphics.Dispose()
  }

  $iconBmp.Save($iconPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $iconBmp.Dispose()
  New-PngBackedIco -PngPath $iconPngPath -IcoPath $iconIcoPath

  $wizardBmp = New-Object System.Drawing.Bitmap 164, 314
  $wizardGraphics = [System.Drawing.Graphics]::FromImage($wizardBmp)
  try {
    $wizardGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $wizardGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $wizardRect = New-Object System.Drawing.Rectangle 0, 0, 164, 314
    $wizardGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($wizardRect, $bgMain, $bgSecondary, 90)
    $wizardGraphics.FillRectangle($wizardGrad, $wizardRect)
    $wizardGrad.Dispose()

    $accentBrush = New-Object System.Drawing.SolidBrush($accent)
    $wizardGraphics.FillRectangle($accentBrush, 0, 0, 164, 8)

    $haloBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 122, 181, 211))
    $wizardGraphics.FillEllipse($haloBrush, -56, 196, 260, 180)
    $haloBrush.Dispose()

    $heroScale = [Math]::Min(110.0 / $hero.Width, 118.0 / $hero.Height)
    $heroW = [int]($hero.Width * $heroScale)
    $heroH = [int]($hero.Height * $heroScale)
    $heroX = [int]((164 - $heroW) / 2)
    $heroY = 38
    $wizardGraphics.DrawImage($hero, $heroX, $heroY, $heroW, $heroH)

    $displayFont = New-Object System.Drawing.Font('Segoe UI Semibold', 11, [System.Drawing.FontStyle]::Bold)
    $monoFont = New-Object System.Drawing.Font('Consolas', 8, [System.Drawing.FontStyle]::Regular)
    $textBrush = New-Object System.Drawing.SolidBrush($textColor)

    $wizardGraphics.DrawString('SC SALVAGE', $displayFont, $accentBrush, 24, 178)
    $wizardGraphics.DrawString('COMPANION', $displayFont, $accentBrush, 24, 195)
    $wizardGraphics.DrawString('Industrial Ops Suite', $monoFont, $textBrush, 24, 220)
    $wizardGraphics.DrawString('Installer', $monoFont, $textBrush, 24, 236)

    $displayFont.Dispose()
    $monoFont.Dispose()
    $textBrush.Dispose()
    $accentBrush.Dispose()
  }
  finally {
    $wizardGraphics.Dispose()
  }

  $wizardBmp.Save($wizardBmpPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $wizardBmp.Dispose()

  $headerBmp = New-Object System.Drawing.Bitmap 150, 57
  $headerGraphics = [System.Drawing.Graphics]::FromImage($headerBmp)
  try {
    $headerGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $headerGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $headerRect = New-Object System.Drawing.Rectangle 0, 0, 150, 57
    $headerGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($headerRect, $bgMain, $bgSecondary, 0)
    $headerGraphics.FillRectangle($headerGrad, $headerRect)
    $headerGrad.Dispose()

    $headerAccent = New-Object System.Drawing.SolidBrush($accent)
    $headerGraphics.FillRectangle($headerAccent, 0, 0, 150, 4)

    $headerFont = New-Object System.Drawing.Font('Segoe UI Semibold', 9, [System.Drawing.FontStyle]::Bold)
    $headerMono = New-Object System.Drawing.Font('Consolas', 7, [System.Drawing.FontStyle]::Regular)
    $headerText = New-Object System.Drawing.SolidBrush($textColor)

    $headerGraphics.DrawString('SC Salvage Companion', $headerFont, $headerText, 8, 10)
    $headerGraphics.DrawString('Deployment Installer', $headerMono, $headerAccent, 8, 30)

    $headerFont.Dispose()
    $headerMono.Dispose()
    $headerText.Dispose()
    $headerAccent.Dispose()
  }
  finally {
    $headerGraphics.Dispose()
  }

  $headerBmp.Save($headerBmpPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $headerBmp.Dispose()
}
finally {
  $hero.Dispose()
}

Write-Host "Generated installer assets in $assetDir"
