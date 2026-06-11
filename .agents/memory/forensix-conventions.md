---
name: ForensiX conventions
description: Key decisions and sharp edges for the ForensiX codebase
---

## File upload
`POST /api/cases/:caseId/evidence` uses multer multipart. Frontend must call `fetch()` with `FormData` directly — do NOT use the Orval-generated hook (it sends JSON). The OpenAPI spec intentionally has no request body for this route to avoid TS2308 type collisions with `File`/`Blob`.

**Why:** multer reads the multipart stream before Express body parsers; the codegen hook would serialize to JSON and bypass multer entirely.

**How to apply:** Any component uploading evidence must use `fetch('/api/cases/${id}/evidence', { method: 'POST', body: formData })`.

## React Query hooks — queryKey required
All generated query hooks require `queryKey` inside the `query` option object (strict Orval config). Omitting it causes TS2741. Always pass a `queryKey` even for simple `{ enabled: bool }` cases.

## DB schema tables
Six tables: `cases`, `evidence`, `analysis`, `findings`, `timeline_events`, `custody`. All in `lib/db/src/schema/`. Run `pnpm --filter @workspace/db run push` after schema changes.

## API analysis flow
`POST /evidence/:id/analyze` is synchronous — it runs hash computation, string extraction, PDF/EXIF/email parsing, inserts findings, and logs timeline + custody all in one request. Acceptable for demo; production should use a job queue.

## Built-in YARA rules
10 regex-based pattern detection rules in `artifacts/api-server/src/lib/forensics.ts` (`BUILTIN_YARA_RULES` array). No native YARA binary. Custom rules are plain regex, one per line (lines starting with `#` are ignored).
