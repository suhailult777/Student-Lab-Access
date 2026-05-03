import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { bookingsTable } from "./bookings";

export const labSessionsTable = pgTable("lab_sessions", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  userId: text("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  commandsCount: integer("commands_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LabSession = typeof labSessionsTable.$inferSelect;
