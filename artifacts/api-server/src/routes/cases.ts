import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, casesTable, evidenceTable } from "@workspace/db";
import {
  CreateCaseBody,
  UpdateCaseBody,
  GetCaseParams,
  UpdateCaseParams,
  DeleteCaseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `CASE-${year}-${random}`;
}

router.get("/cases", async (req, res): Promise<void> => {
  const cases = await db.select().from(casesTable).orderBy(sql`${casesTable.createdAt} DESC`);

  const evidenceCounts = await db
    .select({ caseId: evidenceTable.caseId, count: sql<number>`count(*)::int` })
    .from(evidenceTable)
    .groupBy(evidenceTable.caseId);

  const countMap = new Map(evidenceCounts.map(e => [e.caseId, e.count]));

  const result = cases.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    evidenceCount: countMap.get(c.id) ?? 0,
  }));

  res.json(result);
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const caseNumber = generateCaseNumber();
  const [newCase] = await db.insert(casesTable).values({
    caseNumber,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    investigator: parsed.data.investigator,
    priority: parsed.data.priority ?? null,
    tags: parsed.data.tags ?? null,
    status: "open",
  }).returning();

  res.status(201).json({
    ...newCase,
    createdAt: newCase.createdAt.toISOString(),
    updatedAt: newCase.updatedAt.toISOString(),
    evidenceCount: 0,
  });
});

router.get("/cases/:caseId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const params = GetCaseParams.safeParse({ caseId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, params.data.caseId));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(evidenceTable)
    .where(eq(evidenceTable.caseId, params.data.caseId));

  res.json({
    ...caseRow,
    createdAt: caseRow.createdAt.toISOString(),
    updatedAt: caseRow.updatedAt.toISOString(),
    evidenceCount: countRow?.count ?? 0,
  });
});

router.patch("/cases/:caseId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const params = UpdateCaseParams.safeParse({ caseId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.investigator !== undefined) updateData.investigator = parsed.data.investigator;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;

  const [updated] = await db
    .update(casesTable)
    .set(updateData)
    .where(eq(casesTable.id, params.data.caseId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(evidenceTable)
    .where(eq(evidenceTable.caseId, params.data.caseId));

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    evidenceCount: countRow?.count ?? 0,
  });
});

router.delete("/cases/:caseId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const params = DeleteCaseParams.safeParse({ caseId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(casesTable)
    .where(eq(casesTable.id, params.data.caseId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
