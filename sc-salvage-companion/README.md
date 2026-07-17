# SC Salvage Companion

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Lint](https://img.shields.io/badge/lint-passing-brightgreen)
![Beta](https://img.shields.io/badge/release-v0.1.0--beta.1-blue)
![Status](https://img.shields.io/badge/status-beta-orange)

Star Citizen salvage/mining companion app with:
- user auth and profile
- financial tracking
- session tracker
- per-session active work orders with timers and sold flow

## Local Development

Run frontend + backend together:

```bash
npm install
npm run dev:full
```

Frontend: `http://localhost:5173`
Backend API: `http://localhost:8787`

## Production Build

```bash
npm run build
```

## Windows EXE Build

Build both the installer EXE and app launcher EXE:

```bash
npm run build:windows
```

Prerequisite for installer build:
- Install NSIS (makensis): https://nsis.sourceforge.io/Download

Generated artifacts:
- `release/SCSalvageCompanion-Setup.exe` - installer EXE that installs the app and creates a desktop shortcut.
- `release/win-app/SCSalvageCompanion.exe` - standalone launcher EXE for the app runtime.
- `release/win-app/SCSalvageCompanion-Uninstall.exe` - standalone uninstaller EXE for the installed app.

Install behavior:
- Installs to `%LOCALAPPDATA%\\SCSalvageCompanion`
- Creates desktop shortcut: `SC Salvage Companion.lnk`
- Creates Start Menu folder: `SC Salvage Companion`
- Creates Start Menu shortcuts for launch and uninstall
- Launches the app after install

Installer branding customization:
- Update `scripts/windows-installer.nsi` to adjust title/body fonts and palette used on the branded setup page.
- Theme colors currently mirror app variables from `src/index.css` (`--page-bg`, `--text`, `--brand`).
- Branded setup assets are in `scripts/installer-assets/`:
  - `app-icon.ico` (installer/window icon)
  - `wizard.bmp` (welcome/finish side image)
  - `header.bmp` (header image)
- Regenerate branded assets anytime with `npm run build:windows:assets`.

## Beta Deployment (Single Service)

The backend now serves frontend static files in production, so you can deploy one service for both UI and API.

Release validation command:

```bash
npm run beta:web:check
```

This command runs:
- `npm run build`
- `npm run lint`
- automated smoke test against `/` and `/api/health`

Recommended settings:
- Build command: `npm ci ; npm run build`
- Start command: `npm run server:start`
- Environment:
  - `NODE_ENV=production`
  - `PORT` is provided by host (or set manually)
  - optional `CORS_ORIGIN` (comma-separated), defaults to `http://localhost:5173`
  - `OPEN_BROWSER=0`

Deployment artifacts included in repo:
- `render.yaml` (Render service blueprint)
- `.env.example` (runtime environment template)

### Render Example

1. Push this repo to GitHub.
2. Create a new Render Web Service from the repo.
3. Set build command to `npm ci ; npm run build`.
4. Set start command to `npm run server:start`.
5. Add `NODE_ENV=production` env var.
6. Deploy and open the provided URL.

## Beta Release Checklist

1. `npm run beta:web:check`
2. Manual smoke test:
   - login/register
   - start session
   - add work order expense
   - timer updates
   - sold flow updates financials
3. Tag release in git:

```bash
git add .
git commit -m "beta release v0.1.0"
git tag -a v0.1.0-beta.1 -m "Beta 1"
git push origin main --tags
```

4. Create GitHub Release from `v0.1.0-beta.1` with tester notes and known issues.
