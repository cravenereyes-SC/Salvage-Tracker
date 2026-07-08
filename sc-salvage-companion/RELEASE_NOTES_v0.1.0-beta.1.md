# SC Salvage Companion - v0.1.0-beta.1

Release date: 2026-07-08
Release type: Beta

## Highlights

- Session tracker with sortable expense table and per-row remove actions.
- Work Orders flow with active timers and sold workflow.
- Per-session active work order ownership and summary counts.
- Header profile polish with role/ship controls and financial summary card.
- Role is now editable via dropdown with persistence.

## Included Features

- Authentication and registration
- Profile setup and profile details management
- Owned ships add/remove and primary ship selection
- Financial update flow
- Session start/view/close
- Work Orders expense creation with HH:MM:SS processing time selectors
- Active Work Orders list in tracker with timer and Sold action
- Sold popup with amount and quantity (SCU)
- Active/Completed work order counts in active session summaries

## Beta Scope

This beta is intended for functional testing of core profile/session/work-order flows and UI behavior.

## Known Risks / Limitations

- Persistent data currently uses local JSON storage in server/data/users.json.
- Concurrent multi-user writes are not hardened for production scale.
- Some historical test data may exist in local datastore.
- Occasional duplicate-key console warnings may appear with very fast repeated test actions.

## Tester Focus Areas

1. Register/login reliability and role/ship persistence.
2. Session lifecycle: start, add expenses, view, close.
3. Work Orders lifecycle: add -> timer progression -> sold -> financial impact.
4. Active session summary correctness for active/completed work order counts.
5. Desktop/mobile layout consistency.

## Upgrade / Deploy Notes

- Build: npm run build
- Lint: npm run lint
- Start backend: npm run server:start
- For single-service deployment set NODE_ENV=production so server also serves dist/.

## Feedback Template

Please include:

- Environment (browser, OS)
- Repro steps
- Expected behavior
- Actual behavior
- Screenshots or video (if possible)
- Console/network errors (if present)
