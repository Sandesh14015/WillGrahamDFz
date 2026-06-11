# TODO (ForensiX Backend + API hardening)

## Step 1 — Backend bug fix
- [x] Remove invalid `await db.upsert ? null : null;` in `artifacts/api-server/src/routes/evidence.ts`

## Step 2 — Frontend hardening (no blank screen)
- [ ] Patch `/api/stats` route to always return fallback JSON when DB is unavailable
- [ ] Patch dashboard boot to never throw (defensive error handling)


## Step 3 — Verify
- [ ] Run API server with provided `DATABASE_URL` and confirm `GET /api/stats` works and returns valid JSON
- [ ] Run frontend and confirm no blank black flash; page shows error banner or skeleton instead


