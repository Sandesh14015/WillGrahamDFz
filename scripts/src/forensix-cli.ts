#!/usr/bin/env node
/**
 * ForensiX CLI — command-line interface for the ForensiX Investigation Platform
 * Usage: npx tsx scripts/src/forensix-cli.ts <command> [options]
 */
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import readline from "readline";

const API_BASE = process.env.FORENSIX_API ?? "http://localhost:80/api";

// ── helpers ─────────────────────────────────────────────────────────────────

function cyan(s: string) { return chalk.cyan(s); }
function dim(s: string) { return chalk.dim(s); }
function bold(s: string) { return chalk.bold(s); }
function red(s: string) { return chalk.red(s); }
function green(s: string) { return chalk.green(s); }
function yellow(s: string) { return chalk.yellow(s); }
function magenta(s: string) { return chalk.magenta(s); }

function banner() {
  console.log(chalk.cyan(`
  ███████╗ ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗██╗  ██╗
  ██╔════╝██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║╚██╗██╔╝
  █████╗  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║ ╚███╔╝ 
  ██╔══╝  ██║   ██║██╔══██╗██╔══╝  ██║╚██╗██║╚════██║██║ ██╔██╗ 
  ██║     ╚██████╔╝██║  ██║███████╗██║ ╚████║███████║██║██╔╝ ██╗
  ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝╚═╝  ╚═╝`));
  console.log(dim("  Digital Forensics Investigation CLI\n"));
}

async function api(method: string, endpoint: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json() as unknown;
  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? res.statusText;
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return data;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function severityColor(s: string): string {
  switch (s) {
    case "critical": return chalk.red.bold(s.toUpperCase());
    case "high":     return chalk.red(s.toUpperCase());
    case "medium":   return chalk.yellow(s.toUpperCase());
    case "low":      return chalk.cyan(s.toUpperCase());
    default:         return chalk.dim(s.toUpperCase());
  }
}

function priorityColor(s: string): string {
  switch (s) {
    case "critical": return chalk.red.bold(s);
    case "high":     return chalk.red(s);
    case "medium":   return chalk.yellow(s);
    case "low":      return chalk.cyan(s);
    default:         return chalk.dim(s);
  }
}

function statusColor(s: string): string {
  switch (s) {
    case "active": return chalk.green(s);
    case "open":   return chalk.blue(s);
    case "closed": return chalk.dim(s);
    default:       return chalk.dim(s);
  }
}

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, answer => { rl.close(); resolve(answer); }));
}

function spin(msg: string): { stop: (done?: string) => void } {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${chalk.cyan(frames[i++ % frames.length])} ${msg}`);
  }, 80);
  return {
    stop: (done?: string) => {
      clearInterval(id);
      process.stdout.write(`\r${done ? chalk.green("✔") + " " + done : ""}\n`);
    },
  };
}

// ── types ────────────────────────────────────────────────────────────────────

interface Case { id: number; caseNumber: string; name: string; status: string; priority?: string; investigator: string; evidenceCount: number; createdAt: string; description?: string; }
interface Evidence { id: number; originalName: string; mimeType: string; fileSize: number; sha256: string; md5: string; sha1: string; analysisStatus: string; uploadedAt: string; }
interface Finding { id: number; severity: string; description: string; indicatorType: string; value: string; }
interface YaraMatch { ruleName: string; description: string; matchedStrings: string[]; severity: string; }

// ── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("forensix")
  .description("ForensiX Digital Forensics Investigation CLI")
  .version("1.0.0")
  .option("--json", "output raw JSON")
  .hook("preAction", () => {
    if (!program.opts().json) banner();
  });

// ── cases ────────────────────────────────────────────────────────────────────

const cases = program.command("cases").description("Manage investigation cases");

cases
  .command("list")
  .description("List all cases")
  .action(async () => {
    const s = spin("Fetching cases...");
    try {
      const data = await api("GET", "/cases") as Case[];
      s.stop("Cases loaded");
      if (program.opts().json) { console.log(JSON.stringify(data, null, 2)); return; }
      if (data.length === 0) { console.log(dim("  No cases found. Run: forensix cases new")); return; }
      console.log(`\n${bold("  ACTIVE INVESTIGATIONS")}\n`);
      for (const c of data) {
        console.log(
          `  ${cyan(c.caseNumber.padEnd(22))} ${statusColor(c.status).padEnd(10)}` +
          ` ${priorityColor(c.priority ?? "—").padEnd(12)} ${bold(c.name)}`
        );
        console.log(
          `  ${dim("  ".padEnd(22))} ${dim(`${c.evidenceCount} evidence  •  ${c.investigator}  •  ${c.createdAt.substring(0, 10)}`)}`
        );
      }
      console.log(`\n  ${dim(`${data.length} case(s) total`)}`);
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

cases
  .command("new")
  .description("Create a new investigation case (interactive)")
  .option("--name <name>", "case name")
  .option("--investigator <name>", "lead investigator")
  .option("--priority <p>", "priority: low|medium|high|critical", "medium")
  .option("--description <desc>", "description")
  .action(async (opts) => {
    console.log(`${cyan("  // NEW INVESTIGATION")}\n`);
    const name = opts.name ?? await ask("  Case name: ");
    const investigator = opts.investigator ?? await ask("  Lead investigator: ");
    const description = opts.description ?? await ask("  Description (optional): ");
    const priority = opts.priority;

    const s = spin("Creating case...");
    try {
      const c = await api("POST", "/cases", { name, investigator, description: description || undefined, priority }) as Case;
      s.stop(`Case created: ${c.caseNumber}`);
      console.log(`\n  ${bold("Case created successfully")}`);
      console.log(`  ${dim("Number:")} ${cyan(c.caseNumber)}`);
      console.log(`  ${dim("ID:")}     ${c.id}`);
      console.log(`  ${dim("Name:")}   ${bold(c.name)}`);
      console.log(`\n  ${dim(`Upload evidence: forensix upload ${c.id} <file>`)}`);
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

cases
  .command("show <caseId>")
  .description("Show case details and evidence list")
  .action(async (caseId: string) => {
    const s = spin("Loading case...");
    try {
      const [c, evidence] = await Promise.all([
        api("GET", `/cases/${caseId}`) as Promise<Case>,
        api("GET", `/cases/${caseId}/evidence`) as Promise<Evidence[]>,
      ]);
      s.stop("Case loaded");
      if (program.opts().json) { console.log(JSON.stringify({ case: c, evidence }, null, 2)); return; }

      console.log(`\n  ${cyan(c.caseNumber)}  ${statusColor(c.status)}  ${c.priority ? priorityColor(c.priority) : ""}`);
      console.log(`  ${bold(c.name)}`);
      if (c.description) console.log(`\n  ${dim(c.description)}`);
      console.log(`\n  ${dim("Investigator:")} ${c.investigator}`);
      console.log(`  ${dim("Created:")}      ${c.createdAt.substring(0, 19).replace("T", " ")} UTC`);
      console.log(`\n  ${bold("EVIDENCE")} (${evidence.length})`);
      if (evidence.length === 0) {
        console.log(`  ${dim("  No files. Run: forensix upload " + caseId + " <path>")}`);
      } else {
        for (const e of evidence) {
          const status = e.analysisStatus === "complete" ? green("✔ analyzed") : e.analysisStatus === "analyzing" ? yellow("⠙ analyzing") : dim("○ pending");
          console.log(`  ${dim(String(e.id).padStart(4, " "))}  ${e.originalName.padEnd(36)} ${status.padEnd(15)} ${dim(formatBytes(e.fileSize))}`);
        }
      }
      console.log();
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

// ── evidence ─────────────────────────────────────────────────────────────────

program
  .command("upload <caseId> <filePath>")
  .description("Upload an evidence file to a case")
  .action(async (caseId: string, filePath: string) => {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      console.error(red(`  ✖ File not found: ${resolved}`)); process.exit(1);
    }

    const s = spin(`Uploading ${path.basename(resolved)}...`);
    try {
      const formData = new FormData();
      const blob = new Blob([fs.readFileSync(resolved)]);
      formData.append("file", blob, path.basename(resolved));

      const res = await fetch(`${API_BASE}/cases/${caseId}/evidence`, { method: "POST", body: formData });
      const ev = await res.json() as Evidence;
      if (!res.ok) throw new Error((ev as unknown as { error: string }).error ?? res.statusText);

      s.stop(`Uploaded: ${ev.originalName}`);
      console.log(`\n  ${bold("Evidence registered")}`);
      console.log(`  ${dim("ID:")}     ${cyan(String(ev.id))}`);
      console.log(`  ${dim("File:")}   ${ev.originalName}`);
      console.log(`  ${dim("Size:")}   ${formatBytes(ev.fileSize)}`);
      console.log(`  ${dim("SHA256:")} ${cyan(ev.sha256)}`);
      console.log(`  ${dim("MD5:")}    ${ev.md5}`);
      console.log(`\n  ${dim(`Run analysis: forensix analyze ${ev.id}`)}`);
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

program
  .command("analyze <evidenceId>")
  .description("Run forensic analysis on an evidence file")
  .action(async (evidenceId: string) => {
    const s = spin("Running forensic analysis...");
    try {
      const result = await api("POST", `/evidence/${evidenceId}/analyze`) as {
        status: string;
        fileMetadata: Record<string, unknown>;
        strings: { urls: string[]; ipAddresses: string[]; emailAddresses: string[]; domains: string[] };
        findings: Finding[];
        documentMeta?: Record<string, unknown>;
        imageMeta?: Record<string, unknown>;
        emailMeta?: Record<string, unknown>;
      };
      s.stop("Analysis complete");
      if (program.opts().json) { console.log(JSON.stringify(result, null, 2)); return; }

      const m = result.fileMetadata ?? {};
      console.log(`\n  ${bold("FORENSIC ANALYSIS REPORT")}\n`);
      console.log(`  ${dim("SHA256:")} ${cyan(String(m.sha256 ?? "—"))}`);
      console.log(`  ${dim("MD5:")}    ${String(m.md5 ?? "—")}`);
      console.log(`  ${dim("Size:")}   ${formatBytes(Number(m.size ?? 0))}`);
      console.log(`  ${dim("Type:")}   ${String(m.mimeType ?? "—")}`);

      const st = result.strings;
      console.log(`\n  ${bold("EXTRACTED INDICATORS")}`);
      console.log(`  ${cyan("URLs:")}           ${st?.urls?.length ?? 0}`);
      console.log(`  ${cyan("IP Addresses:")}   ${st?.ipAddresses?.length ?? 0}`);
      console.log(`  ${cyan("Email Addresses:")} ${st?.emailAddresses?.length ?? 0}`);
      console.log(`  ${cyan("Domains:")}        ${st?.domains?.length ?? 0}`);

      if (st?.urls?.length) {
        console.log(`\n  ${bold("URLS FOUND")}`);
        st.urls.slice(0, 5).forEach(u => console.log(`  ${dim("•")} ${yellow(u)}`));
        if (st.urls.length > 5) console.log(`  ${dim(`  … and ${st.urls.length - 5} more`)}`);
      }
      if (st?.ipAddresses?.length) {
        console.log(`\n  ${bold("IP ADDRESSES")}`);
        st.ipAddresses.slice(0, 10).forEach(ip => console.log(`  ${dim("•")} ${yellow(ip)}`));
      }

      if (result.documentMeta) {
        console.log(`\n  ${bold("PDF METADATA")}`);
        Object.entries(result.documentMeta).filter(([, v]) => v != null)
          .forEach(([k, v]) => console.log(`  ${dim(k + ":")} ${String(v)}`));
      }
      if (result.imageMeta) {
        console.log(`\n  ${bold("EXIF DATA")}`);
        Object.entries(result.imageMeta).filter(([, v]) => v != null)
          .forEach(([k, v]) => console.log(`  ${dim(k + ":")} ${String(v)}`));
      }

      console.log(`\n  ${bold("FINDINGS")} (${result.findings.length})`);
      if (result.findings.length === 0) {
        console.log(`  ${green("  ✔ No threats detected")}`);
      } else {
        for (const f of result.findings) {
          console.log(`  ${severityColor(f.severity).padEnd(10)} ${f.indicatorType.padEnd(14)} ${f.description}`);
          console.log(`  ${dim("             " + f.value.substring(0, 70))}`);
        }
      }
      console.log();
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

// ── YARA ──────────────────────────────────────────────────────────────────────

program
  .command("yara <evidenceId>")
  .description("Run YARA pattern scan on an evidence file")
  .option("--rules <file>", "path to a file with custom regex rules (one per line)")
  .action(async (evidenceId: string, opts: { rules?: string }) => {
    let customRules: string | undefined;
    if (opts.rules) {
      if (!fs.existsSync(opts.rules)) {
        console.error(red(`  ✖ Rules file not found: ${opts.rules}`)); process.exit(1);
      }
      customRules = fs.readFileSync(opts.rules, "utf8");
    }

    const s = spin("Scanning with YARA rules...");
    try {
      const result = await api("POST", "/yara/scan", {
        evidenceId: parseInt(evidenceId),
        useBuiltinRules: true,
        rules: customRules,
      }) as { matches: YaraMatch[]; rulesUsed: number; scannedAt: string };
      s.stop("Scan complete");
      if (program.opts().json) { console.log(JSON.stringify(result, null, 2)); return; }

      console.log(`\n  ${bold("YARA SCAN RESULTS")}`);
      console.log(`  ${dim("Rules applied:")} ${result.rulesUsed}   ${dim("Scanned at:")} ${result.scannedAt.substring(0, 19).replace("T", " ")}`);
      console.log();

      if (result.matches.length === 0) {
        console.log(`  ${green("  ✔ CLEAN — No patterns matched")}\n`);
      } else {
        console.log(`  ${red(`  ⚠ ${result.matches.length} RULE(S) MATCHED`)}\n`);
        for (const m of result.matches) {
          console.log(`  ${severityColor(m.severity).padEnd(12)} ${bold(m.ruleName)}`);
          console.log(`  ${dim("             " + m.description)}`);
          m.matchedStrings.slice(0, 3).forEach(s => console.log(`  ${dim("             >")} ${yellow(s.substring(0, 80))}`));
          console.log();
        }
      }
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

// ── report ───────────────────────────────────────────────────────────────────

program
  .command("report <caseId>")
  .description("Generate a forensic report and save to disk")
  .option("--format <fmt>", "html or json", "html")
  .option("--out <path>", "output file path (default: forensix-report-<id>.<fmt>)")
  .option("--no-timeline", "exclude timeline")
  .option("--no-findings", "exclude findings")
  .option("--no-custody", "exclude chain of custody")
  .action(async (caseId: string, opts: { format: string; out?: string; timeline: boolean; findings: boolean; custody: boolean }) => {
    const s = spin("Generating forensic report...");
    try {
      const result = await api("POST", `/cases/${caseId}/report`, {
        format: opts.format,
        includeTimeline: opts.timeline,
        includeFindings: opts.findings,
        includeCustody: opts.custody,
        includeHashes: true,
      }) as { title: string; generatedAt: string; content: string; format: string };
      s.stop("Report generated");

      const outPath = opts.out ?? `forensix-report-${caseId}.${result.format}`;
      fs.writeFileSync(outPath, result.content, "utf8");

      console.log(`\n  ${bold("REPORT SAVED")}`);
      console.log(`  ${dim("Title:")}     ${result.title}`);
      console.log(`  ${dim("Format:")}    ${result.format.toUpperCase()}`);
      console.log(`  ${dim("File:")}      ${green(outPath)}`);
      console.log(`  ${dim("Generated:")} ${result.generatedAt.substring(0, 19).replace("T", " ")} UTC`);
      console.log(`  ${dim("Size:")}      ${formatBytes(fs.statSync(outPath).size)}\n`);
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

// ── search ────────────────────────────────────────────────────────────────────

program
  .command("search <query>")
  .description("Search across cases, evidence, and findings")
  .option("--type <type>", "all|cases|evidence|findings", "all")
  .action(async (query: string, opts: { type: string }) => {
    const s = spin(`Searching: "${query}"...`);
    try {
      const result = await api("GET", `/search?q=${encodeURIComponent(query)}&type=${opts.type}`) as {
        totalResults: number; cases: Case[]; evidence: Evidence[]; findings: Finding[];
      };
      s.stop(`${result.totalResults} results`);
      if (program.opts().json) { console.log(JSON.stringify(result, null, 2)); return; }

      console.log(`\n  ${cyan(`"${query}"`)} — ${bold(String(result.totalResults))} result(s)\n`);

      if (result.cases.length > 0) {
        console.log(`  ${bold("CASES")}`);
        result.cases.forEach(c => {
          console.log(`  ${cyan(c.caseNumber)}  ${statusColor(c.status)}  ${bold(c.name)}`);
          console.log(`  ${dim(`  ${c.investigator} • ${c.evidenceCount} evidence`)}`);
        });
        console.log();
      }
      if (result.evidence.length > 0) {
        console.log(`  ${bold("EVIDENCE")}`);
        result.evidence.forEach(e => {
          console.log(`  ${dim(String(e.id).padStart(4))}  ${e.originalName.padEnd(40)} ${dim(formatBytes(e.fileSize))}`);
        });
        console.log();
      }
      if (result.findings.length > 0) {
        console.log(`  ${bold("FINDINGS")}`);
        result.findings.forEach(f => {
          console.log(`  ${severityColor(f.severity).padEnd(10)} ${f.description}`);
          console.log(`  ${dim("           " + f.value.substring(0, 70))}`);
        });
        console.log();
      }
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

// ── stats ──────────────────────────────────────────────────────────────────────

program
  .command("stats")
  .description("Show platform statistics")
  .action(async () => {
    const s = spin("Loading stats...");
    try {
      const data = await api("GET", "/stats") as {
        totalCases: number; activeCases: number;
        totalEvidence: number; analyzedEvidence: number;
        casesByStatus: { status: string; count: number }[];
      };
      s.stop("Stats loaded");
      if (program.opts().json) { console.log(JSON.stringify(data, null, 2)); return; }

      console.log(`\n  ${bold("FORENSIX PLATFORM STATUS")}\n`);
      console.log(`  ${cyan("Total Cases:")}     ${bold(String(data.totalCases))}  (${data.activeCases} active)`);
      console.log(`  ${cyan("Evidence Files:")}  ${bold(String(data.totalEvidence))}  (${data.analyzedEvidence} analyzed)`);
      const pct = data.totalEvidence > 0 ? Math.round(data.analyzedEvidence / data.totalEvidence * 100) : 0;
      const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
      console.log(`  ${cyan("Coverage:")}        ${pct}%  ${dim(bar)}`);
      console.log(`\n  ${bold("Cases by Status")}`);
      for (const s of data.casesByStatus) {
        console.log(`  ${statusColor(s.status).padEnd(14)} ${s.count}`);
      }
      console.log();
    } catch (e) { s.stop(); console.error(red(`  ✖ ${(e as Error).message}`)); process.exit(1); }
  });

program.parse(process.argv);
