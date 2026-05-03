import { pgTable, text, serial, timestamp, boolean, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const labsTable = pgTable("labs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  pricePerHour: real("price_per_hour").notNull(),
  maxHours: integer("max_hours").notNull().default(8),
  tools: text("tools").array().notNull().default([]),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLabSchema = createInsertSchema(labsTable).omit({ id: true, createdAt: true });
export type InsertLab = z.infer<typeof insertLabSchema>;
export type Lab = typeof labsTable.$inferSelect;
