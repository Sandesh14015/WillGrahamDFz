# ForensiX — Digital Forensics Investigation Platform

A production-grade digital forensics platform for investigating compromised systems. Dark-themed web dashboard + CLI tool for managing cases, uploading evidence, running automated analysis, YARA scanning, timeline reconstruction, chain of custody tracking, and generating forensic reports.

![ForensiX Dashboard](https://img.shields.io/badge/ForensiX-Digital%20Forensics-00d4ff?style=for-the-badge&logo=shield&logoColor=white)

---

## Features

| Module | Description |
|---|---|
| **Case Management** | Create, track, and close investigation cases with priority/status |
| **Evidence Upload** | Upload any file type — SHA256/MD5/SHA1 hashes computed automatically |
| **Forensic Analysis** | Extract URLs, IPs, emails, domains from file content; PDF metadata, EXIF for images, email headers |
| **YARA Scanner** | 10 built-in detection rules + custom regex patterns — finds credentials, IOCs, keys, malware strings |
| **Timeline** | Chronological event log auto-populated as evidence is uploaded and analyzed |
| **Chain of Custody** | Immutable audit trail of every action taken on evidence |
| **Report Generator** | Downloadable HTML or JSON forensic investigation reports |
| **Global Search** | Full-text search across cases, evidence, and findings |
| **CLI Tool** | Full command-line interface — all features available from the terminal |

---

## Tech Stack

- **Runtime:** Node.js 24, TypeScript 5.9, pnpm workspaces
- **API:** Express 5 + Zod validation + OpenAPI spec (contract-first)
- **Frontend:** React + Vite, dark cyberpunk theme (Tailwind + shadcn/ui)
- **Database:** PostgreSQL + Drizzle ORM
- **File uploads:** multer (up to 100 MB per file)
- **Codegen:** Orval (React Query hooks + Zod schemas from OpenAPI)

---

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/forensix.git
cd forensix
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

Create a `.env` file in the root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/forensix
SESSION_SECRET=your-random-secret-here
```

### 4. Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 5. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
# Runs on port 8080, served under /api
```

### 6. Start the frontend

```bash
pnpm --filter @workspace/forensix run dev
# Runs on port 5173 (or next available)
```

Open `http://localhost:5173` in your browser.

---

## CLI Tool

Run forensic operations directly from the terminal:

```bash
# List all cases
pnpm --filter @workspace/scripts run forensix cases list

# Create a new case (interactive)
pnpm --filter @workspace/scripts run forensix cases new

# Create non-interactively
pnpm --filter @workspace/scripts run forensix cases new \
  --name "Breach Investigation" \
  --investigator "Jane Smith" \
  --priority critical

# Show a case and its evidence
pnpm --filter @workspace/scripts run forensix cases show 1

# Upload an evidence file
pnpm --filter @workspace/scripts run forensix upload 1 /path/to/malware.exe

# Run full forensic analysis
pnpm --filter @workspace/scripts run forensix analyze 3

# Run YARA pattern scan
pnpm --filter @workspace/scripts run forensix yara 3

# Run YARA with custom rules file (one regex per line)
pnpm --filter @workspace/scripts run forensix yara 3 --rules my-rules.txt

# Generate and save a forensic report
pnpm --filter @workspace/scripts run forensix report 1 --format html --out report.html

# Search across everything
pnpm --filter @workspace/scripts run forensix search "192.168.1.1"

# Platform statistics
pnpm --filter @workspace/scripts run forensix stats

# Output raw JSON (pipe into jq)
pnpm --filter @workspace/scripts run forensix cases list --json | jq .

# Point CLI at a remote server
FORENSIX_API=https://your-server.com/api pnpm --filter @workspace/scripts run forensix stats
```

---

## Project Structure

```
forensix/
├── artifacts/
│   ├── api-server/          # Express API (port 8080)
│   │   └── src/
│   │       ├── routes/      # cases, evidence, yara, search, reports, stats, timeline
│   │       └── lib/
│   │           └── forensics.ts   # hash, string extraction, YARA, metadata
│   └── forensix/            # React + Vite frontend
│       └── src/
│           └── pages/       # dashboard, cases, evidence, timeline, yara, reports, search
├── lib/
│   ├── db/                  # Drizzle ORM schema (6 tables)
│   └── api-spec/            # OpenAPI spec + codegen
│       └── openapi.yaml
└── scripts/
    └── src/
        └── forensix-cli.ts  # CLI tool
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `cases` | Investigation cases |
| `evidence` | Uploaded files with hashes |
| `analysis` | Forensic analysis results (strings, metadata) |
| `findings` | IOCs and threat indicators found in evidence |
| `timeline_events` | Chronological event log per case |
| `custody` | Chain of custody audit trail |

---

## Development Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Regenerate API hooks after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes
pnpm --filter @workspace/db run push
```

---

## How Forensic Reports Work

When investigating an exploited system:

1. **Collect artefacts** — logs, executables, memory dumps, emails, images from the compromised machine
2. **Upload** — each file gets SHA256/MD5/SHA1 hashes as proof of integrity
3. **Analyze** — ForensiX scans raw bytes for URLs, IPs, emails, domains; extracts PDF/EXIF/email metadata
4. **YARA scan** — 10 built-in rules detect hardcoded credentials, private keys, C2 URLs, shell commands, and more
5. **Timeline** — all events are timestamped automatically
6. **Report** — one click generates a complete HTML or JSON document: hashes, findings by severity, timeline, and full chain of custody

---

## License

MIT
