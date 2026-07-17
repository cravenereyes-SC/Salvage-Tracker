## SC Salvage Companion v0.1.0-beta.1

**Release date:** 2026-07-17  
**Channel:** Beta

This beta is now web-release ready for single-service deployment while continuing to validate profile, session, and work-order gameplay loops.

### What Is New In This Beta Refresh

- Web release hardening: frontend static serving no longer depends strictly on `NODE_ENV=production` when `dist/` exists.
- Added one-command beta validation pipeline: `npm run beta:web:check`.
- Added automated web smoke test script: `scripts/verify-web-release.mjs`.
- Added deploy/runtime templates:
	- `render.yaml`
	- `.env.example`
- Package version aligned to beta line: `0.1.0-beta.1`.

### Core Feature Coverage

- Authentication and registration
- Profile setup and profile details management
- Owned ships add/remove and primary ship selection
- Financial update flow
- Session start/view/close
- Work Orders expense creation with HH:MM:SS processing time selectors
- Active Work Orders list in tracker with timer and Sold action
- Sold popup with sold amount and quantity (SCU)
- Active/Completed work order counts in active session summaries

### Beta Validation

Run this command before publishing:

```bash
npm run beta:web:check
```

It executes:

- `npm run build`
- `npm run lint`
- automated smoke test for `/` and `/api/health`

### Deployment Notes (Single Service)

- Build command: `npm ci ; npm run build`
- Start command: `npm run server:start`
- Required environment: `NODE_ENV=production`
- Recommended:
	- `OPEN_BROWSER=0`
	- `CORS_ORIGIN=<your-web-origin>`

### Known Risks / Limitations

- Persistent data currently uses local JSON storage in `server/data/users.json`.
- Concurrent multi-user writes are not hardened for production scale.
- Some historical test data may exist in local datastore.
- Occasional duplicate-key console warnings may appear with very fast repeated test actions.

### Tester Focus Areas

1. Register/login reliability and role/ship persistence.
2. Session lifecycle: start, add expenses, view, close.
3. Work Orders lifecycle: add -> timer progression -> sold -> financial impact.
4. Active session summary correctness for active/completed work order counts.
5. Desktop/mobile layout consistency.
6. Hosted web deployment boot + route fallback behavior.

### Feedback

Submit feedback using the in-app header link:

- https://forms.gle/ULnCiDUguMU5gi226

When reporting issues, include:

- Environment (browser, OS)
- Repro steps
- Expected behavior
- Actual behavior
- Screenshots or video (if possible)
- Console/network errors (if present)
