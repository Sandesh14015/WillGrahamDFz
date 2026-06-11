import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const findingsTable = pgTable("findings", {
  id: serial("id").primaryKey(),
  evidenceId: integer("evidence_id").notNull(),
  caseId: integer("case_id").notNull(),
  severity: text("severity").notNull().default("info"),
  description: text("description").notNull(),
  indicatorType: text("indicator_type").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFindingSchema = createInsertSchema(findingsTable).omit({ id: true, createdAt: true });
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findingsTable.$inferSelect;
