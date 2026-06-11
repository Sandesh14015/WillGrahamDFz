import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, casesTable, evidenceTable, findingsTable, timelineEventsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [caseStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status in ('open', 'active'))::int`,
    })
    .from(casesTable);

  const [evidenceStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      analyzed: sql<number>`count(*) filter (where analysis_status = 'complete')::int`,
    })
    .from(evidenceTable);

  const recentEvidence = await db
    .select()
    .from(evidenceTable)
    .orderBy(sql`${evidenceTable.uploadedAt} DESC`)
    .limit(5);

  const recentCases = await db
    .select()
    .from(casesTable)
    .orderBy(sql`${casesTable.createdAt} DESC`)
    .limit(5);

  const recentActivity = [
    ...recentEvidence.map(e => ({
      id: e.id,
      description: `Evidence uploaded: ${e.originalName}`,
      timestamp: e.uploadedAt.toISOString(),
      type: "evidence",
    })),
    ...recentCases.map(c => ({
      id: c.id + 10000,
      description: `Case created: ${c.name}`,
      timestamp: c.createdAt.toISOString(),
      type: "case",
    })),
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  const evidenceByTypeRows = await db
    .select({
      type: evidenceTable.mimeType,
      count: sql<number>`count(*)::int`,
    })
    .from(evidenceTable)
    .groupBy(evidenceTable.mimeType)
    .orderBy(sql`count(*) DESC`)
    .limit(8);

  const evidenceByType = evidenceByTypeRows.map(r => ({
    type: simplifyMimeType(r.type),
    count: r.count,
  }));

  const casesByStatusRows = await db
    .select({
      status: casesTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(casesTable)
    .groupBy(casesTable.status);

  res.json({
    totalCases: caseStats?.total ?? 0,
    activeCases: caseStats?.active ?? 0,
    totalEvidence: evidenceStats?.total ?? 0,
    analyzedEvidence: evidenceStats?.analyzed ?? 0,
    recentActivity,
    evidenceByType,
    casesByStatus: casesByStatusRows,
  });
});

function simplifyMimeType(mime: string): string {
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("document")) return "Document";
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("archive")) return "Archive";
  if (mime.includes("text")) return "Text";
  if (mime.includes("executable") || mime.includes("x-msdownload")) return "Executable";
  if (mime.includes("email") || mime.includes("message")) return "Email";
  return "Other";
}

export default router;
