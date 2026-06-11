# ForensiX — Digital Forensics Investigation Platform

A production-grade digital forensics platform for managing cases, uploading evidence, performing automated analysis, YARA pattern scanning, timeline reconstruction, chain of custody tracking, and generating investigation reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, served under `/api`)
- Frontend: React + Vite (dark cyberpunk theme, served at `/`)
- DB: PostgreSQL + Drizzle ORM (6 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- File uploads: multer → `artifacts/api-server/uploads/`

## Where things live

- `lib/db/src/schema/` — all 6 DB tables (cases, evidence, analysis, findings, timeline_events, custody)
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/forensics.ts` — hash computation, string extraction, PDF/EXIF/email metadata, built-in YARA rules
- `artifacts/forensix/src/pages/` — all frontend pages

## Architecture decisions

- Contract-first: OpenAPI spec drives codegen for React Query hooks and Zod validators
- File analysis happens synchronously on POST `/evidence/:id/analyze` — acceptable for demo; production would use a job queue
- Built-in YARA rules are regex-based (no native YARA binary required)
- Evidence files stored flat in `uploads/` dir with UUID filenames; original name preserved in DB
- All timestamps stored as UTC ISO strings in API responses

## Product

- **Cases** — Create and manage forensic investigation cases with priority/status tracking
- **Evidence** — Upload any file type; get cryptographic hashes (SHA256/MD5/SHA1) automatically
- **Analysis** — Automated forensic analysis: string extraction (URLs, IPs, emails, domains), PDF metadata, EXIF data for images, email header parsing
- **YARA Scanner** — 10 built-in pattern detection rules + custom regex rules against any evidence file
- **Timeline** — Chronological event log auto-populated as evidence is uploaded and analyzed
- **Chain of Custody** — Immutable audit trail of every action taken on evidence
- **Reports** — Generate HTML or JSON forensic investigation reports with configurable sections
- **Search** — Full-text search across cases, evidence, and findings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- Run `pnpm --filter @workspace/db run push` after any DB schema change
- The `cases.status` `'active'` value counts towards `activeCases` alongside `'open'` in the stats route
- File upload route uses `fetch()` + `FormData` directly (not the codegen hook) since multer handles multipart

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
