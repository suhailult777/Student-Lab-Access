import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { labsTable } from "./labs";

export const bookingStatusValues = ["pending", "paid", "provisioned", "expired", "failed"] as const;
export type BookingStatus = typeof bookingStatusValues[number];

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  labId: integer("lab_id").notNull().references(() => labsTable.id),
  hours: integer("hours").notNull(),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  paymentTxnId: text("payment_txn_id"),
  labAccessUrl: text("lab_access_url"),
  labCredentials: text("lab_credentials"),
  provisionedAt: timestamp("provisioned_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
