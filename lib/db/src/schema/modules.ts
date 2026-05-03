import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { labsTable } from "./labs";

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id").notNull().references(() => labsTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  content: jsonb("content").notNull(),
  xp: integer("xp").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Module = typeof modulesTable.$inferSelect;
