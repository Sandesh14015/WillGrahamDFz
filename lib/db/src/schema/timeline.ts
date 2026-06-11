import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timelineEventsTable = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  evidenceId: integer("evidence_id"),
  evidenceName: text("evidence_name"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimelineEventSchema = createInsertSchema(timelineEventsTable).omit({ id: true, createdAt: true });
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
