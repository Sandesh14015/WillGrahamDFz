import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const custodyTable = pgTable("custody", {
  id: serial("id").primaryKey(),
  evidenceId: integer("evidence_id").notNull(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustodySchema = createInsertSchema(custodyTable).omit({ id: true });
export type InsertCustody = z.infer<typeof insertCustodySchema>;
export type Custody = typeof custodyTable.$inferSelect;
