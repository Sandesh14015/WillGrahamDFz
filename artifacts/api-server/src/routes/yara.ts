import { Router, type IRouter } from "express";
import path from "path";
import { eq } from "drizzle-orm";
import { db, evidenceTable } from "@workspace/db";
import { YaraPatternScanBody } from "@workspace/api-zod";
import { runYaraScan } from "../lib/forensics";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

router.post("/yara/scan", async (req, res): Promise<void> => {
  const parsed = YaraPatternScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [evidence] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, parsed.data.evidenceId));
  if (!evidence) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  const filePath = path.join(uploadsDir, evidence.storedName);
  const customRules = parsed.data.rules ?? undefined;
  const matches = runYaraScan(filePath, customRules);

  const builtinRuleCount = 10;
  const customRuleCount = customRules ? customRules.split("\n").filter(l => l.trim() && !l.trim().startsWith("#")).length : 0;

  res.json({
    evidenceId: parsed.data.evidenceId,
    matches,
    scannedAt: new Date().toISOString(),
    rulesUsed: (parsed.data.useBuiltinRules !== false ? builtinRuleCount : 0) + customRuleCount,
  });
});

export default router;
