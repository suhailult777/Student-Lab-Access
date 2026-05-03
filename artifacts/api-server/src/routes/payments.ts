import { Router, type IRouter } from "express";
import { db, bookingsTable, labsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { InitiatePaymentBody, InitiatePaymentResponse, PaymentCallbackResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const EASEBUZZ_KEY = process.env.EASEBUZZ_KEY || "EASEBUZZ_TEST_KEY";
const EASEBUZZ_SALT = process.env.EASEBUZZ_SALT || "EASEBUZZ_TEST_SALT";
const EASEBUZZ_ENV = process.env.EASEBUZZ_ENV || "test";

function generateEasebuzzHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  salt: string;
}): string {
  const hashString = [
    params.key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    params.udf1 || "",
    "", "", "", "", "", "", "", "",
    params.salt,
  ].join("|");
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

router.post("/payments/initiate", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const parsed = InitiatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(bookingsTable)
    .leftJoin(labsTable, eq(bookingsTable.labId, labsTable.id))
    .where(and(eq(bookingsTable.id, parsed.data.bookingId), eq(bookingsTable.userId, userId)));

  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (row.bookings.status !== "pending") {
    res.status(400).json({ error: "Booking is not in pending status" });
    return;
  }

  const txnId = `CL_${row.bookings.id}_${Date.now()}`;
  const amount = row.bookings.totalAmount.toFixed(2);
  const productInfo = `CyberLab - ${row.labs?.name || "Lab"} (${row.bookings.hours}h)`;
  const firstName = userId.slice(0, 12);
  const email = `student+${userId.slice(-8)}@cyberlab.example.com`;

  const hash = generateEasebuzzHash({
    key: EASEBUZZ_KEY,
    txnid: txnId,
    amount,
    productinfo: productInfo,
    firstname: firstName,
    email,
    udf1: String(row.bookings.id),
    salt: EASEBUZZ_SALT,
  });

  const baseUrl = EASEBUZZ_ENV === "production"
    ? "https://pay.easebuzz.in"
    : "https://testpay.easebuzz.in";

  // In real integration, you'd call Easebuzz /payment/initiateLink API here
  // and get back an access_key. For now we return the payment form data.
  const paymentUrl = `${baseUrl}/pay/${EASEBUZZ_KEY}`;

  await db.update(bookingsTable).set({ paymentTxnId: txnId }).where(eq(bookingsTable.id, row.bookings.id));

  req.log.info({ txnId, bookingId: row.bookings.id }, "Payment initiated");

  res.json(
    InitiatePaymentResponse.parse({
      accessKey: hash,
      paymentUrl,
      txnId,
      amount: Number(amount),
      productInfo,
      name: firstName,
      email,
    }),
  );
});

router.post("/payments/mock-complete", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { bookingId } = req.body;

  if (!bookingId || isNaN(Number(bookingId))) {
    res.status(400).json({ error: "Invalid bookingId" });
    return;
  }

  const [row] = await db
    .select()
    .from(bookingsTable)
    .leftJoin(labsTable, eq(bookingsTable.labId, labsTable.id))
    .where(and(eq(bookingsTable.id, Number(bookingId)), eq(bookingsTable.userId, userId)));

  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (row.bookings.status !== "pending") {
    res.status(400).json({ error: "Booking is not in pending status" });
    return;
  }

  const txnId = `CL_${row.bookings.id}_${Date.now()}`;

  await db
    .update(bookingsTable)
    .set({ status: "paid", paymentTxnId: txnId })
    .where(eq(bookingsTable.id, row.bookings.id));

  req.log.info({ bookingId: row.bookings.id, txnId }, "Mock payment completed, booking marked as paid");

  res.json({ status: "success", bookingId: row.bookings.id, txnId });
});

router.post("/payments/callback", async (req, res): Promise<void> => {
  const { txnid, status, hash } = req.body;

  logger.info({ txnid, status }, "Easebuzz payment callback received");

  if (!txnid || !status) {
    res.status(400).json({ error: "Missing txnid or status" });
    return;
  }

  // Extract booking id from txnId format CL_{bookingId}_{timestamp}
  const parts = txnid.split("_");
  const bookingId = parts.length >= 2 ? parseInt(parts[1], 10) : null;

  if (!bookingId || isNaN(bookingId)) {
    res.json(PaymentCallbackResponse.parse({ status: "error", bookingId: null }));
    return;
  }

  if (status === "success") {
    await db
      .update(bookingsTable)
      .set({ status: "paid" })
      .where(eq(bookingsTable.id, bookingId));
    logger.info({ bookingId }, "Payment successful, booking marked as paid");
  } else {
    await db
      .update(bookingsTable)
      .set({ status: "failed" })
      .where(eq(bookingsTable.id, bookingId));
    logger.info({ bookingId }, "Payment failed");
  }

  res.json(PaymentCallbackResponse.parse({ status, bookingId }));
});

export default router;
