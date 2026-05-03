import { Router, type IRouter, type Request, type Response } from "express";
import { db, bookingsTable, labsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const EASEBUZZ_KEY  = process.env.EASEBUZZ_KEY  ?? "";
const EASEBUZZ_SALT = process.env.EASEBUZZ_SALT ?? "";
const EASEBUZZ_ENV  = (process.env.EASEBUZZ_ENV ?? "test") as "test" | "production";

const isMockMode = !EASEBUZZ_KEY || !EASEBUZZ_SALT;

const EASEBUZZ_BASE = EASEBUZZ_ENV === "production"
  ? "https://pay.easebuzz.in"
  : "https://testpay.easebuzz.in";

function sha512(input: string): string {
  return crypto.createHash("sha512").update(input).digest("hex");
}

/**
 * Forward hash for initiating payment.
 * Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
 * Note: udf8, udf9, udf10 must always be empty per Easebuzz docs.
 */
function forwardHash(p: {
  key: string; txnid: string; amount: string; productinfo: string;
  firstname: string; email: string;
  udf1?: string; udf2?: string; udf3?: string; udf4?: string; udf5?: string;
  udf6?: string; udf7?: string;
  salt: string;
}): string {
  const seq = [
    p.key, p.txnid, p.amount, p.productinfo, p.firstname, p.email,
    p.udf1 ?? "", p.udf2 ?? "", p.udf3 ?? "", p.udf4 ?? "", p.udf5 ?? "",
    p.udf6 ?? "", p.udf7 ?? "",
    "", "", "",        // udf8, udf9, udf10 — always empty
    p.salt,
  ].join("|");
  return sha512(seq);
}

/**
 * Reverse hash for verifying Easebuzz callback/webhook response.
 * Sequence: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
function reverseHash(p: {
  salt: string; status: string;
  udf1?: string; udf2?: string; udf3?: string; udf4?: string; udf5?: string;
  email: string; firstname: string; productinfo: string;
  amount: string; txnid: string; key: string;
}): string {
  const seq = [
    p.salt, p.status,
    "", "", "", "", "",          // 5 empty slots (as per official reverse sequence)
    p.udf5 ?? "", p.udf4 ?? "", p.udf3 ?? "", p.udf2 ?? "", p.udf1 ?? "",
    p.email, p.firstname, p.productinfo, p.amount, p.txnid, p.key,
  ].join("|");
  return sha512(seq);
}

/** Returns the publicly reachable origin for surl/furl construction. */
function getPublicOrigin(): string {
  const domain = process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",")[0]
    : process.env.REPLIT_DEV_DOMAIN ?? "";
  if (domain) return `https://${domain}`;
  return process.env.APP_URL ?? "http://localhost:80";
}

// ─── POST /payments/initiate ───────────────────────────────────────────────

router.post("/payments/initiate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const { bookingId, name, email, phone } = req.body as {
    bookingId: number; name?: string; email?: string; phone?: string;
  };

  if (!bookingId || isNaN(Number(bookingId))) {
    res.status(400).json({ error: "Invalid bookingId" });
    return;
  }

  const [row] = await db
    .select()
    .from(bookingsTable)
    .leftJoin(labsTable, eq(bookingsTable.labId, labsTable.id))
    .where(and(eq(bookingsTable.id, Number(bookingId)), eq(bookingsTable.userId, userId)));

  if (!row) { res.status(404).json({ error: "Booking not found" }); return; }
  if (row.bookings.status !== "pending") {
    res.status(400).json({ error: "Booking is not pending" });
    return;
  }

  // ── Mock mode ─────────────────────────────────────────────────────────────
  if (isMockMode) {
    req.log.info({ bookingId }, "Easebuzz mock mode — returning mock flag");
    res.json({ mockMode: true, bookingId: row.bookings.id, amount: row.bookings.totalAmount });
    return;
  }

  // ── Real Easebuzz integration ──────────────────────────────────────────────
  const txnId       = `CL${row.bookings.id}${Date.now()}`.slice(0, 40);
  const amount      = row.bookings.totalAmount.toFixed(2);
  const rawProduct  = `CyberLab - ${row.labs?.name ?? "Lab"} (${row.bookings.hours}h)`;
  const productinfo = rawProduct.replace(/[^a-zA-Z0-9\s\-|]/g, "").slice(0, 45).trim();
  const firstname   = (name ?? `Student${userId.slice(-6)}`).slice(0, 150);
  const emailVal    = email ?? `user+${userId.slice(-8)}@cyberlab.app`;
  const phoneVal    = phone ?? "9999999999";
  const udf1        = String(row.bookings.id);   // booking id — used in callback to look up booking

  const origin = getPublicOrigin();
  const surl   = `${origin}/api/payments/easebuzz-return`;
  const furl   = `${origin}/api/payments/easebuzz-return`;

  const hash = forwardHash({
    key: EASEBUZZ_KEY, txnid: txnId, amount, productinfo,
    firstname: firstname, email: emailVal, udf1, salt: EASEBUZZ_SALT,
  });

  const body = new URLSearchParams({
    key:         EASEBUZZ_KEY,
    txnid:       txnId,
    amount,
    productinfo,
    firstname,
    phone:       phoneVal,
    email:       emailVal,
    surl,
    furl,
    hash,
    udf1,
  });

  req.log.info({ txnId, bookingId, amount, surl }, "Calling Easebuzz initiateLink");

  const ebResponse = await fetch(`${EASEBUZZ_BASE}/payment/initiateLink`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  const ebJson = await ebResponse.json() as { status: number; data: string };

  if (ebJson.status !== 1) {
    req.log.error({ txnId, ebJson }, "Easebuzz initiateLink failed");
    res.status(502).json({ error: `Easebuzz error: ${ebJson.data}` });
    return;
  }

  const accessKey  = ebJson.data;
  const checkoutUrl = `${EASEBUZZ_BASE}/pay/${accessKey}`;

  await db
    .update(bookingsTable)
    .set({ paymentTxnId: txnId })
    .where(eq(bookingsTable.id, row.bookings.id));

  req.log.info({ txnId, bookingId, accessKey }, "Easebuzz payment initiated");

  res.json({
    checkoutUrl,
    txnId,
    amount: Number(amount),
    productinfo,
    mockMode: false,
  });
});

// ─── POST /payments/easebuzz-return (surl + furl from Easebuzz) ────────────
// Easebuzz redirects the customer's browser here via a form POST after payment.

router.post("/payments/easebuzz-return", async (req: Request, res: Response): Promise<void> => {
  const {
    txnid, status, hash,
    key, amount, email, firstname, productinfo,
    udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
    easepayid,
  } = req.body as Record<string, string>;

  logger.info({ txnid, status, easepayid }, "Easebuzz payment return received");

  const bookingId = udf1 ? parseInt(udf1, 10) : null;
  const origin    = getPublicOrigin();

  // ── Hash verification ──────────────────────────────────────────────────────
  if (!isMockMode) {
    if (!hash || !txnid || !status) {
      logger.warn({ txnid }, "Easebuzz return missing required fields — redirecting to failure");
      res.redirect(`${origin}/bookings${bookingId ? `/${bookingId}` : ""}?payment=failed`);
      return;
    }

    const expected = reverseHash({
      salt: EASEBUZZ_SALT, status,
      udf1, udf2, udf3, udf4, udf5,
      email: email ?? "", firstname: firstname ?? "",
      productinfo: productinfo ?? "", amount: amount ?? "",
      txnid, key: EASEBUZZ_KEY,
    });

    if (hash !== expected) {
      logger.error({ txnid, status }, "Easebuzz return hash mismatch — possible tampering");
      res.redirect(`${origin}/bookings${bookingId ? `/${bookingId}` : ""}?payment=failed&reason=hash`);
      return;
    }
  }

  if (!bookingId || isNaN(bookingId)) {
    logger.warn({ txnid, udf1 }, "Easebuzz return: could not determine bookingId");
    res.redirect(`${origin}?payment=failed`);
    return;
  }

  // ── Update booking status ──────────────────────────────────────────────────
  if (status === "success") {
    await db.update(bookingsTable)
      .set({ status: "paid", paymentTxnId: txnid })
      .where(eq(bookingsTable.id, bookingId));
    logger.info({ bookingId, txnid, easepayid }, "Booking marked as paid via Easebuzz return");
    res.redirect(`${origin}/bookings/${bookingId}?payment=success`);
  } else {
    await db.update(bookingsTable)
      .set({ status: "failed" })
      .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.status, "pending")));
    logger.info({ bookingId, txnid, status }, "Payment returned non-success, booking marked failed");
    res.redirect(`${origin}/bookings/${bookingId}?payment=failed&reason=${encodeURIComponent(status)}`);
  }
});

// ─── POST /payments/webhook (server-to-server from Easebuzz) ──────────────
// Must return HTTP 200. Retry logic: every 30 min for 5 attempts if non-200.

router.post("/payments/webhook", async (req: Request, res: Response): Promise<void> => {
  const {
    txnid, status, hash,
    key, amount, email, firstname, productinfo, easepayid,
    udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
  } = req.body as Record<string, string>;

  logger.info({ txnid, status, easepayid }, "Easebuzz webhook received");

  // ── Verify hash ────────────────────────────────────────────────────────────
  if (!isMockMode) {
    if (!hash || !txnid || !status) {
      logger.warn({ txnid }, "Webhook missing fields");
      res.status(200).json({ error: "Missing fields" }); // still 200 to stop retries
      return;
    }

    const expected = reverseHash({
      salt: EASEBUZZ_SALT, status,
      udf1, udf2, udf3, udf4, udf5,
      email: email ?? "", firstname: firstname ?? "",
      productinfo: productinfo ?? "", amount: amount ?? "",
      txnid, key: EASEBUZZ_KEY,
    });

    if (hash !== expected) {
      logger.error({ txnid }, "Webhook hash mismatch — ignoring");
      res.status(200).json({ error: "Hash mismatch" }); // 200 to stop retries on bad data
      return;
    }
  }

  const bookingId = udf1 ? parseInt(udf1, 10) : null;
  if (!bookingId || isNaN(bookingId)) {
    logger.warn({ txnid, udf1 }, "Webhook: cannot determine bookingId");
    res.status(200).json({ ok: true });
    return;
  }

  if (status === "success") {
    await db.update(bookingsTable)
      .set({ status: "paid", paymentTxnId: txnid })
      .where(eq(bookingsTable.id, bookingId));
    logger.info({ bookingId, txnid, easepayid }, "Webhook: booking marked paid");
  } else if (status === "failure" || status === "usercancelled") {
    await db.update(bookingsTable)
      .set({ status: "failed" })
      .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.status, "pending")));
    logger.info({ bookingId, txnid, status }, "Webhook: booking marked failed");
  } else {
    logger.info({ bookingId, txnid, status }, "Webhook: unhandled status, no action taken");
  }

  res.status(200).json({ ok: true });
});

// ─── POST /payments/mock-complete (test / development only) ───────────────

router.post("/payments/mock-complete", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const { bookingId } = req.body as { bookingId: number };

  if (!bookingId || isNaN(Number(bookingId))) {
    res.status(400).json({ error: "Invalid bookingId" });
    return;
  }

  const [row] = await db
    .select()
    .from(bookingsTable)
    .leftJoin(labsTable, eq(bookingsTable.labId, labsTable.id))
    .where(and(eq(bookingsTable.id, Number(bookingId)), eq(bookingsTable.userId, userId)));

  if (!row) { res.status(404).json({ error: "Booking not found" }); return; }
  if (row.bookings.status !== "pending") {
    res.status(400).json({ error: "Booking is not pending" });
    return;
  }

  const txnId = `MOCK${row.bookings.id}${Date.now()}`.slice(0, 40);

  await db.update(bookingsTable)
    .set({ status: "paid", paymentTxnId: txnId })
    .where(eq(bookingsTable.id, row.bookings.id));

  req.log.info({ bookingId: row.bookings.id, txnId }, "Mock payment completed");
  res.json({ status: "success", bookingId: row.bookings.id, txnId });
});

export default router;
