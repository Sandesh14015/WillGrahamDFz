import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db, evidenceTable, casesTable, findingsTable, timelineEventsTable, custodyTable, analysisTable } from "@workspace/db";
import {
  GetEvidenceParams,
  DeleteEvidenceParams,
  AnalyzeEvidenceParams,
  GetEvidenceAnalysisParams,
  GetChainOfCustodyParams,
  ListCaseEvidenceParams,
  UploadEvidenceParams,
} from "@workspace/api-zod";
import {
  computeHashes,
  extractStrings,
  extractPdfMeta,
  extractImageExif,
  extractEmailMeta,
  getFileStats,
} from "../lib/forensics";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

function formatEvidence(e: typeof evidenceTable.$inferSelect) {
  return {
    ...e,
    fileSize: Number(e.fileSize),
    uploadedAt: e.uploadedAt.toISOString(),
  };
}

router.get("/cases/:caseId/evidence", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const params = ListCaseEvidenceParams.safeParse({ caseId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const evidence = await db
    .select()
    .from(evidenceTable)
    .where(eq(evidenceTable.caseId, params.data.caseId))
    .orderBy(asc(evidenceTable.uploadedAt));

  res.json(evidence.map(formatEvidence));
});

router.post("/cases/:caseId/evidence", upload.single("file"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;
  const params = UploadEvidenceParams.safeParse({ caseId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, params.data.caseId));
  if (!caseRow) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(404).json({ error: "Case not found" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const hashes = computeHashes(req.file.path);
  const notes = typeof req.body.notes === "string" ? req.body.notes : null;

  const [evidence] = await db.insert(evidenceTable).values({
    caseId: params.data.caseId,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    sha256: hashes.sha256,
    md5: hashes.md5,
    sha1: hashes.sha1,
    analysisStatus: "pending",
    notes,
  }).returning();

  await db.insert(custodyTable).values({
    evidenceId: evidence.id,
    action: "uploaded",
    actor: caseRow.investigator,
    notes: `File: ${req.file.originalname}, SHA256: ${hashes.sha256}`,
  });

  await db.insert(timelineEventsTable).values({
    caseId: params.data.caseId,
    evidenceId: evidence.id,
    evidenceName: req.file.originalname,
    timestamp: new Date(),
    eventType: "evidence_uploaded",
    description: `Evidence file uploaded: ${req.file.originalname} (${formatBytes(req.file.size)})`,
    source: "upload",
  });

  req.log.info({ evidenceId: evidence.id, file: req.file.originalname }, "Evidence uploaded");

  res.status(201).json(formatEvidence(evidence));
});

router.get("/evidence/:evidenceId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.evidenceId) ? req.params.evidenceId[0] : req.params.evidenceId;
  const params = GetEvidenceParams.safeParse({ evidenceId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evidence] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, params.data.evidenceId));
  if (!evidence) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  res.json(formatEvidence(evidence));
});

router.delete("/evidence/:evidenceId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.evidenceId) ? req.params.evidenceId[0] : req.params.evidenceId;
  const params = DeleteEvidenceParams.safeParse({ evidenceId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evidence] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, params.data.evidenceId));
  if (!evidence) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  const filePath = path.join(uploadsDir, evidence.storedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.delete(evidenceTable).where(eq(evidenceTable.id, params.data.evidenceId));
  res.sendStatus(204);
});

router.post("/evidence/:evidenceId/analyze", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.evidenceId) ? req.params.evidenceId[0] : req.params.evidenceId;
  const params = AnalyzeEvidenceParams.safeParse({ evidenceId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evidence] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, params.data.evidenceId));
  if (!evidence) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  await db.update(evidenceTable).set({ analysisStatus: "analyzing" }).where(eq(evidenceTable.id, params.data.evidenceId));

  const filePath = path.join(uploadsDir, evidence.storedName);
  const hashes = computeHashes(filePath);
  const fileStats = getFileStats(filePath);
  const stringsResult = extractStrings(filePath);

  const fileMetadata = {
    name: evidence.originalName,
    size: Number(evidence.fileSize),
    mimeType: evidence.mimeType,
    ...fileStats,
    sha256: hashes.sha256,
    md5: hashes.md5,
    sha1: hashes.sha1,
  };

  let documentMeta = null;
  let imageMeta = null;
  let emailMeta = null;

  const mime = evidence.mimeType;
  if (mime.includes("pdf")) {
    documentMeta = await extractPdfMeta(filePath);
  } else if (mime.startsWith("image/")) {
    imageMeta = await extractImageExif(filePath);
  } else if (mime.includes("message") || evidence.originalName.endsWith(".eml") || evidence.originalName.endsWith(".mbox")) {
    emailMeta = await extractEmailMeta(filePath);
  }

  await db.delete(findingsTable).where(eq(findingsTable.evidenceId, params.data.evidenceId));

  const newFindings: Array<{ evidenceId: number; caseId: number; severity: string; description: string; indicatorType: string; value: string }> = [];

  for (const ip of stringsResult.ipAddresses.slice(0, 10)) {
    if (!ip.startsWith("127.") && !ip.startsWith("192.168.") && !ip.startsWith("10.")) {
      newFindings.push({ evidenceId: params.data.evidenceId, caseId: evidence.caseId, severity: "medium", description: `Public IP address found`, indicatorType: "ip_address", value: ip });
    }
  }

  for (const url of stringsResult.urls.slice(0, 5)) {
    if (/\d+\.\d+\.\d+\.\d+/.test(url)) {
      newFindings.push({ evidenceId: params.data.evidenceId, caseId: evidence.caseId, severity: "high", description: `URL with IP address host`, indicatorType: "url", value: url });
    }
  }

  for (const domain of stringsResult.domains.slice(0, 5)) {
    if (domain.endsWith(".onion")) {
      newFindings.push({ evidenceId: params.data.evidenceId, caseId: evidence.caseId, severity: "critical", description: `Tor hidden service domain`, indicatorType: "domain", value: domain });
    }
  }

  if (newFindings.length > 0) {
    await db.insert(findingsTable).values(newFindings);
  }

  const [existing] = await db.select().from(analysisTable).where(eq(analysisTable.evidenceId, params.data.evidenceId));
  if (existing) {
    await db.update(analysisTable).set({ status: "complete", fileMetadata, strings: stringsResult, documentMeta, imageMeta, emailMeta }).where(eq(analysisTable.evidenceId, params.data.evidenceId));
  } else {
    await db.insert(analysisTable).values({ evidenceId: params.data.evidenceId, status: "complete", fileMetadata, strings: stringsResult, documentMeta, imageMeta, emailMeta });
  }

  await db.update(evidenceTable).set({ analysisStatus: "complete" }).where(eq(evidenceTable.id, params.data.evidenceId));

  await db.insert(timelineEventsTable).values({
    caseId: evidence.caseId,
    evidenceId: params.data.evidenceId,
    evidenceName: evidence.originalName,
    timestamp: new Date(),
    eventType: "evidence_analyzed",
    description: `Analysis complete: ${stringsResult.urls.length} URLs, ${stringsResult.ipAddresses.length} IPs, ${newFindings.length} findings`,
    source: "analysis",
  });

  await db.insert(custodyTable).values({
    evidenceId: params.data.evidenceId,
    action: "analyzed",
    actor: "ForensiX System",
    notes: `Forensic analysis performed. Found: ${stringsResult.urls.length} URLs, ${stringsResult.ipAddresses.length} IP addresses, ${stringsResult.emailAddresses.length} emails`,
  });

  const updatedFindings = await db.select().from(findingsTable).where(eq(findingsTable.evidenceId, params.data.evidenceId));

  res.json({
    evidenceId: params.data.evidenceId,
    status: "complete",
    fileMetadata,
    strings: stringsResult,
    documentMeta,
    imageMeta,
    emailMeta,
    findings: updatedFindings.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })),
  });
});

router.get("/evidence/:evidenceId/analysis", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.evidenceId) ? req.params.evidenceId[0] : req.params.evidenceId;
  const params = GetEvidenceAnalysisParams.safeParse({ evidenceId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evidence] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, params.data.evidenceId));
  if (!evidence) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  const [analysis] = await db.select().from(analysisTable).where(eq(analysisTable.evidenceId, params.data.evidenceId));
  const findings = await db.select().from(findingsTable).where(eq(findingsTable.evidenceId, params.data.evidenceId));

  res.json({
    evidenceId: params.data.evidenceId,
    status: analysis?.status || evidence.analysisStatus,
    fileMetadata: analysis?.fileMetadata || null,
    strings: analysis?.strings || null,
    documentMeta: analysis?.documentMeta || null,
    imageMeta: analysis?.imageMeta || null,
    emailMeta: analysis?.emailMeta || null,
    findings: findings.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })),
  });
});

router.get("/evidence/:evidenceId/custody", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.evidenceId) ? req.params.evidenceId[0] : req.params.evidenceId;
  const params = GetChainOfCustodyParams.safeParse({ evidenceId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const records = await db
    .select()
    .from(custodyTable)
    .where(eq(custodyTable.evidenceId, params.data.evidenceId))
    .orderBy(asc(custodyTable.timestamp));

  res.json(records.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })));
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default router;
