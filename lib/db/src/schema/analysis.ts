import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysisTable = pgTable("analysis", {
  id: serial("id").primaryKey(),
  evidenceId: integer("evidence_id").notNull().unique(),
  status: text("status").notNull().default("pending"),
  fileMetadata: jsonb("file_metadata"),
  strings: jsonb("strings"),
  documentMeta: jsonb("document_meta"),
  imageMeta: jsonb("image_meta"),
  emailMeta: jsonb("email_meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAnalysisSchema = createInsertSchema(analysisTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysisTable.$inferSelect;
