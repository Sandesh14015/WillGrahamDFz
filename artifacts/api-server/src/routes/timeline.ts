import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, timelineEventsTable, casesTable } from "@workspace/db";
import { GetCaseTimelineParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cases/:caseId/timeline", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const params = GetCaseTimelineParams.safeParse({ caseId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, params.data.caseId));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const events = await db
    .select()
    .from(timelineEventsTable)
    .where(eq(timelineEventsTable.caseId, params.data.caseId))
    .orderBy(asc(timelineEventsTable.timestamp));

  res.json(events.map(e => ({
    ...e,
    timestamp: e.timestamp.toISOString(),
    createdAt: e.createdAt.toISOString(),
  })));
});

export default router;
