import { pgTable, text, serial, timestamp, integer, real, unique } from "drizzle-orm/pg-core";
import { modulesTable } from "./modules";

export const moduleProgressTable = pgTable("module_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id),
  status: text("status").notNull().default("not_started"),
  score: real("score").default(0),
  attempts: integer("attempts").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("uq_user_module").on(t.userId, t.moduleId)]);

export type ModuleProgress = typeof moduleProgressTable.$inferSelect;
