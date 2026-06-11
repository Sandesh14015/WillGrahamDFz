import { pgTable, text, serial, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evidenceTable = pgTable("evidence", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  sha256: text("sha256").notNull(),
  md5: text("md5").notNull(),
  sha1: text("sha1").notNull(),
  analysisStatus: text("analysis_status").notNull().default("pending"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEvidenceSchema = createInsertSchema(evidenceTable).omit({ id: true, uploadedAt: true });
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidenceTable.$inferSelect;
