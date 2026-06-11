import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, casesTable, evidenceTable, findingsTable, timelineEventsTable, custodyTable, analysisTable } from "@workspace/db";
import { GenerateReportBody, GenerateReportParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/cases/:caseId/report", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const params = GenerateReportParams.safeParse({ caseId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = GenerateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, params.data.caseId));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const evidence = await db.select().from(evidenceTable).where(eq(evidenceTable.caseId, params.data.caseId));
  const findings = await db.select().from(findingsTable).where(eq(findingsTable.caseId, params.data.caseId));
  const timeline = await db.select().from(timelineEventsTable)
    .where(eq(timelineEventsTable.caseId, params.data.caseId))
    .orderBy(asc(timelineEventsTable.timestamp));

  const custodyRecords: Array<{ id: number; evidenceId: number; action: string; actor: string; notes: string | null; timestamp: string }> = [];
  for (const ev of evidence) {
    const records = await db.select().from(custodyTable).where(eq(custodyTable.evidenceId, ev.id));
    custodyRecords.push(...records.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })));
  }

  const title = parsed.data.title || `Forensic Report - ${caseRow.name}`;
  const generatedAt = new Date().toISOString();

  let content: string;

  if (parsed.data.format === "json") {
    const reportData = {
      title,
      generatedAt,
      case: {
        ...caseRow,
        createdAt: caseRow.createdAt.toISOString(),
        updatedAt: caseRow.updatedAt.toISOString(),
      },
      evidenceSummary: evidence.map(e => ({
        id: e.id,
        name: e.originalName,
        type: e.mimeType,
        size: Number(e.fileSize),
        sha256: e.sha256,
        md5: e.md5,
        sha1: e.sha1,
        status: e.analysisStatus,
        uploaded: e.uploadedAt.toISOString(),
      })),
      findings: parsed.data.includeFindings !== false ? findings.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })) : [],
      timeline: parsed.data.includeTimeline !== false ? timeline.map(t => ({ ...t, timestamp: t.timestamp.toISOString(), createdAt: t.createdAt.toISOString() })) : [],
      chainOfCustody: parsed.data.includeCustody !== false ? custodyRecords : [],
    };
    content = JSON.stringify(reportData, null, 2);
  } else {
    content = generateHtmlReport({
      title,
      generatedAt,
      caseRow,
      evidence,
      findings,
      timeline,
      custodyRecords,
      options: parsed.data,
    });
  }

  res.json({
    caseId: params.data.caseId,
    format: parsed.data.format,
    generatedAt,
    title,
    content,
  });
});

function generateHtmlReport(data: {
  title: string;
  generatedAt: string;
  caseRow: typeof casesTable.$inferSelect;
  evidence: (typeof evidenceTable.$inferSelect)[];
  findings: (typeof findingsTable.$inferSelect)[];
  timeline: (typeof timelineEventsTable.$inferSelect)[];
  custodyRecords: Array<{ id: number; evidenceId: number; action: string; actor: string; notes: string | null; timestamp: string }>;
  options: { includeTimeline?: boolean; includeFindings?: boolean; includeHashes?: boolean; includeCustody?: boolean; format: string; title?: string };
}): string {
  const { title, generatedAt, caseRow, evidence, findings, timeline, custodyRecords, options } = data;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
body { font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 40px; max-width: 1200px; margin: 0 auto; }
h1 { color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }
h2 { color: #00b8d9; margin-top: 30px; }
table { width: 100%; border-collapse: collapse; margin: 15px 0; }
th { background: #1a1a2e; color: #00d4ff; padding: 10px; text-align: left; }
td { padding: 8px 10px; border-bottom: 1px solid #2a2a3e; }
.severity-critical { color: #ff4444; font-weight: bold; }
.severity-high { color: #ff8800; }
.severity-medium { color: #ffcc00; }
.severity-low { color: #88cc00; }
.severity-info { color: #8888ff; }
.hash { font-family: monospace; font-size: 11px; color: #88aaff; }
.timestamp { color: #888; font-size: 12px; }
.meta { background: #111; padding: 20px; border-left: 3px solid #00d4ff; margin: 20px 0; }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="meta">
  <p><strong>Case Number:</strong> ${caseRow.caseNumber}</p>
  <p><strong>Case Name:</strong> ${caseRow.name}</p>
  <p><strong>Investigator:</strong> ${caseRow.investigator}</p>
  <p><strong>Status:</strong> ${caseRow.status}</p>
  <p><strong>Priority:</strong> ${caseRow.priority || "N/A"}</p>
  <p><strong>Generated:</strong> ${generatedAt}</p>
  ${caseRow.description ? `<p><strong>Description:</strong> ${caseRow.description}</p>` : ""}
</div>

<h2>Evidence Summary (${evidence.length} items)</h2>
<table>
  <tr><th>Name</th><th>Type</th><th>Size</th>${options.includeHashes !== false ? "<th>SHA256</th>" : ""}<th>Status</th><th>Uploaded</th></tr>
  ${evidence.map(e => `<tr>
    <td>${e.originalName}</td>
    <td>${e.mimeType}</td>
    <td>${formatBytes(Number(e.fileSize))}</td>
    ${options.includeHashes !== false ? `<td class="hash">${e.sha256.substring(0, 16)}...</td>` : ""}
    <td>${e.analysisStatus}</td>
    <td class="timestamp">${e.uploadedAt.toISOString()}</td>
  </tr>`).join("")}
</table>

${options.includeFindings !== false && findings.length > 0 ? `
<h2>Findings (${findings.length})</h2>
<table>
  <tr><th>Severity</th><th>Type</th><th>Description</th><th>Value</th></tr>
  ${findings.map(f => `<tr>
    <td class="severity-${f.severity}">${f.severity.toUpperCase()}</td>
    <td>${f.indicatorType}</td>
    <td>${f.description}</td>
    <td class="hash">${f.value.substring(0, 80)}</td>
  </tr>`).join("")}
</table>` : ""}

${options.includeTimeline !== false && timeline.length > 0 ? `
<h2>Timeline (${timeline.length} events)</h2>
<table>
  <tr><th>Timestamp</th><th>Type</th><th>Description</th><th>Source</th></tr>
  ${timeline.map(t => `<tr>
    <td class="timestamp">${t.timestamp.toISOString()}</td>
    <td>${t.eventType}</td>
    <td>${t.description}</td>
    <td>${t.source}</td>
  </tr>`).join("")}
</table>` : ""}

${options.includeCustody !== false && custodyRecords.length > 0 ? `
<h2>Chain of Custody</h2>
<table>
  <tr><th>Evidence ID</th><th>Action</th><th>Actor</th><th>Timestamp</th><th>Notes</th></tr>
  ${custodyRecords.map(c => `<tr>
    <td>${c.evidenceId}</td>
    <td>${c.action}</td>
    <td>${c.actor}</td>
    <td class="timestamp">${c.timestamp}</td>
    <td>${c.notes || "-"}</td>
  </tr>`).join("")}
</table>` : ""}

<p style="margin-top:40px; color:#555; font-size:11px;">Generated by ForensiX Digital Forensics Investigation Platform &mdash; ${generatedAt}</p>
</body>
</html>`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default router;
