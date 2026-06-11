import { Router, type IRouter } from "express";
import { ilike, or, sql, eq } from "drizzle-orm";
import { db, casesTable, evidenceTable, findingsTable } from "@workspace/db";
import { SearchForensicQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchForensicQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, type } = parsed.data;
  const searchType = type || "all";
  const term = `%${q}%`;

  let cases: typeof casesTable.$inferSelect[] = [];
  let evidence: typeof evidenceTable.$inferSelect[] = [];
  let findings: typeof findingsTable.$inferSelect[] = [];

  if (searchType === "all" || searchType === "cases") {
    cases = await db
      .select()
      .from(casesTable)
      .where(or(
        ilike(casesTable.name, term),
        ilike(casesTable.caseNumber, term),
        ilike(casesTable.investigator, term),
        ilike(casesTable.description ?? "", term),
      ))
      .limit(20);
  }

  if (searchType === "all" || searchType === "evidence") {
    evidence = await db
      .select()
      .from(evidenceTable)
      .where(or(
        ilike(evidenceTable.originalName, term),
        ilike(evidenceTable.sha256, term),
        ilike(evidenceTable.mimeType, term),
      ))
      .limit(20);
  }

  if (searchType === "all" || searchType === "findings") {
    findings = await db
      .select()
      .from(findingsTable)
      .where(or(
        ilike(findingsTable.description, term),
        ilike(findingsTable.value, term),
        ilike(findingsTable.indicatorType, term),
      ))
      .limit(20);
  }

  const evidenceCounts = await db
    .select({ caseId: evidenceTable.caseId, count: sql<number>`count(*)::int` })
    .from(evidenceTable)
    .groupBy(evidenceTable.caseId);
  const countMap = new Map(evidenceCounts.map(e => [e.caseId, e.count]));

  res.json({
    query: q,
    totalResults: cases.length + evidence.length + findings.length,
    cases: cases.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      evidenceCount: countMap.get(c.id) ?? 0,
    })),
    evidence: evidence.map(e => ({
      ...e,
      fileSize: Number(e.fileSize),
      uploadedAt: e.uploadedAt.toISOString(),
    })),
    findings: findings.map(f => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    })),
  });
});

export default router;
