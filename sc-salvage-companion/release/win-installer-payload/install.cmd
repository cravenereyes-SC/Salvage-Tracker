@echo off
setlocal
set "APP_DIR=%LOCALAPPDATA%\SCSalvageCompanion"
if not exist "%APP_DIR%" mkdir "%APP_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path "%~dp0payload.zip" -DestinationPath "%APP_DIR%" -Force"
if ERRORLEVEL 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath("Desktop"); $shortcut = $ws.CreateShortcut((Join-Path $desktop "SC Salvage Companion.lnk")); $shortcut.TargetPath = Join-Path $env:LOCALAPPDATA "SCSalvageCompanion\SCSalvageCompanion.exe"; $shortcut.WorkingDirectory = Join-Path $env:LOCALAPPDATA "SCSalvageCompanion"; $shortcut.Description = "Launch SC Salvage Companion"; $shortcut.Save()"

start "" "%APP_DIR%\SCSalvageCompanion.exe"
exit /b 0
