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

## Beta Deployment (Single Service)

The backend now serves frontend static files in production, so you can deploy one service for both UI and API.

Recommended settings:
- Build command: `npm ci ; npm run build`
- Start command: `npm run server:start`
- Environment:
  - `NODE_ENV=production`
  - `PORT` is provided by host (or set manually)
  - optional `CORS_ORIGIN` (comma-separated), defaults to `http://localhost:5173`

### Render Example

1. Push this repo to GitHub.
2. Create a new Render Web Service from the repo.
3. Set build command to `npm ci ; npm run build`.
4. Set start command to `npm run server:start`.
5. Add `NODE_ENV=production` env var.
6. Deploy and open the provided URL.

## Beta Release Checklist

1. `npm run build`
2. `npm run lint`
3. Smoke test:
   - login/register
   - start session
   - add work order expense
   - timer updates
   - sold flow updates financials
4. Tag release in git:

```bash
git add .
git commit -m "beta release v0.1.0"
git tag -a v0.1.0-beta.1 -m "Beta 1"
git push origin main --tags
```

5. Create GitHub Release from `v0.1.0-beta.1` with tester notes and known issues.
