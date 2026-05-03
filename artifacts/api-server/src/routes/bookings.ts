import { Router, type IRouter } from "express";
import { db, bookingsTable, labsTable, labSessionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import {
  GetMyBookingsResponse,
  CreateBookingBody,
  GetBookingParams,
  GetBookingResponse,
  ProvisionLabParams,
  ProvisionLabResponse,
  GetDashboardSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function getPublicOrigin(): string {
  const domain = process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",")[0]
    : process.env.REPLIT_DEV_DOMAIN ?? "";
  if (domain) return `https://${domain}`;
  return process.env.APP_URL ?? "http://localhost:80";
}

function formatBookingWithLab(booking: any, lab: any) {
  return {
    ...booking,
    lab,
    provisionedAt: booking.provisionedAt ? booking.provisionedAt.toISOString() : null,
    expiresAt: booking.expiresAt ? booking.expiresAt.toISOString() : null,
    createdAt: booking.createdAt.toISOString(),
  };
}

router.get("/bookings", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(bookingsTable)
    .leftJoin(labsTable, eq(bookingsTable.labId, labsTable.id))
    .where(eq(bookingsTable.userId, userId))
    .orderBy(desc(bookingsTable.createdAt));

  const bookings = rows.map((r) => formatBookingWithLab(r.bookings, r.labs));
  res.json(GetMyBookingsResponse.parse(bookings));
});

router.post("/bookings", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lab] = await db.select().from(labsTable).where(eq(labsTable.id, parsed.data.labId));
  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return;
  }

  if (parsed.data.hours > lab.maxHours) {
    res.status(400).json({ error: `Maximum hours allowed is ${lab.maxHours}` });
    return;
  }

  const totalAmount = lab.pricePerHour * parsed.data.hours;

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      userId,
      labId: parsed.data.labId,
      hours: parsed.data.hours,
      totalAmount,
      status: "pending",
    })
    .returning();

  const result = formatBookingWithLab(booking, lab);
  res.status(201).json(GetBookingResponse.parse(result));
});

router.get("/bookings/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(bookingsTable)
    .leftJoin(labsTable, eq(bookingsTable.labId, labsTable.id))
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.userId, userId)));

  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(GetBookingResponse.parse(formatBookingWithLab(row.bookings, row.labs)));
});

router.post("/bookings/:id/provision", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = ProvisionLabParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.userId, userId)));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (booking.status !== "paid") {
    res.status(400).json({ error: "Booking must be in paid status to provision" });
    return;
  }

  const [lab] = await db.select().from(labsTable).where(eq(labsTable.id, booking.labId));

  const expiresAt = new Date(Date.now() + booking.hours * 60 * 60 * 1000);

  // Generate a cryptographically secure session token
  const sessionToken = crypto.randomBytes(32).toString("hex");

  // Create a live lab session record in the database
  await db.insert(labSessionsTable).values({
    bookingId: booking.id,
    userId,
    sessionToken,
    status: "pending",
  });

  const origin = getPublicOrigin();
  const accessUrl = `${origin}/terminal/${sessionToken}`;

  const credentials = JSON.stringify({
    username: `student_${userId.slice(-8)}`,
    sessionToken,
    labIp: "10.13.37." + ((booking.id % 200) + 10),
    labName: lab?.name ?? "CyberLab Environment",
  });

  req.log.info({ bookingId: booking.id, sessionToken: sessionToken.slice(0, 8) + "..." }, "Lab session created");

  const [updated] = await db
    .update(bookingsTable)
    .set({
      status: "provisioned",
      labAccessUrl: accessUrl,
      labCredentials: credentials,
      provisionedAt: new Date(),
      expiresAt,
    })
    .where(eq(bookingsTable.id, booking.id))
    .returning();

  res.json(
    ProvisionLabResponse.parse({
      success: true,
      accessUrl: updated.labAccessUrl!,
      credentials: updated.labCredentials!,
      expiresAt: updated.expiresAt!,
    }),
  );
});

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(bookingsTable)
    .leftJoin(labsTable, eq(bookingsTable.labId, labsTable.id))
    .where(eq(bookingsTable.userId, userId))
    .orderBy(desc(bookingsTable.createdAt));

  const bookings = rows.map((r) => formatBookingWithLab(r.bookings, r.labs));

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) => b.status === "provisioned").length;
  const totalSpent = bookings
    .filter((b) => b.status === "paid" || b.status === "provisioned")
    .reduce((sum, b) => sum + b.totalAmount, 0);
  const completedLabs = bookings.filter((b) => b.status === "provisioned" || b.status === "expired").length;
  const recentBookings = bookings.slice(0, 5);

  res.json(
    GetDashboardSummaryResponse.parse({
      totalBookings,
      activeBookings,
      totalSpent,
      completedLabs,
      recentBookings,
    }),
  );
});

export default router;
