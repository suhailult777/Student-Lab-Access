import crypto from "node:crypto";
import { prototypeLabs } from "../_data/prototype-labs";
import { prototypeModules } from "../_data/prototype-modules";

type BookingStatus = "pending" | "paid" | "provisioned" | "expired" | "failed";
type ModuleProgressStatus = "not_started" | "in_progress" | "completed";

type StoredBooking = {
  id: number;
  labId: number;
  hours: number;
  totalAmount: number;
  status: BookingStatus;
  paymentTxnId: string | null;
  labAccessUrl: string | null;
  labCredentials: string | null;
  provisionedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type StoredProgress = {
  id: number;
  moduleId: number;
  status: ModuleProgressStatus;
  score: number | null;
  attempts: number;
  completedAt: string | null;
};

type PrototypeState = {
  version: 1;
  userId: string | null;
  nextBookingId: number;
  nextProgressId: number;
  bookings: StoredBooking[];
  progress: StoredProgress[];
};

const STATE_COOKIE_NAME = "__cyberlab_state";
const STATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const PROTOTYPE_VERSION = 1;
const EASEBUZZ_KEY = process.env.EASEBUZZ_KEY ?? "";
const EASEBUZZ_SALT = process.env.EASEBUZZ_SALT ?? "";
const EASEBUZZ_ENV = process.env.EASEBUZZ_ENV === "production" ? "production" : "test";
const EASEBUZZ_BASE =
  EASEBUZZ_ENV === "production" ? "https://pay.easebuzz.in" : "https://testpay.easebuzz.in";
const isMockPaymentMode = !EASEBUZZ_KEY || !EASEBUZZ_SALT;

const activeLabs = prototypeLabs.filter((lab) => lab.isActive);
const moduleSummaries = prototypeModules.map((mod) => ({
  id: mod.id,
  labId: mod.labId,
  title: mod.title,
  description: mod.description,
  type: mod.type,
  orderIndex: mod.orderIndex,
  xp: mod.xp,
}));

function createDefaultState(userId: string | null): PrototypeState {
  return {
    version: PROTOTYPE_VERSION,
    userId,
    nextBookingId: 1,
    nextProgressId: 1,
    bookings: [],
    progress: [],
  };
}

function getHeader(req: any, name: string): string | null {
  const raw = req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  return typeof raw === "string" ? raw : null;
}

function getProtocol(req: any): string {
  const forwarded = getHeader(req, "x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "https";
  }
  return process.env.NODE_ENV === "development" ? "http" : "https";
}

function getHost(req: any): string {
  const forwarded = getHeader(req, "x-forwarded-host");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "localhost";
  }
  return getHeader(req, "host") || process.env.VERCEL_URL || "localhost";
}

function getPublicOrigin(req: any): string {
  return `${getProtocol(req)}://${getHost(req)}`;
}

function sha512(input: string): string {
  return crypto.createHash("sha512").update(input).digest("hex");
}

function forwardHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  salt: string;
}): string {
  return sha512(
    [
      params.key,
      params.txnid,
      params.amount,
      params.productinfo,
      params.firstname,
      params.email,
      params.udf1 ?? "",
      params.udf2 ?? "",
      params.udf3 ?? "",
      params.udf4 ?? "",
      params.udf5 ?? "",
      params.udf6 ?? "",
      params.udf7 ?? "",
      "",
      "",
      "",
      params.salt,
    ].join("|"),
  );
}

function reverseHash(params: {
  salt: string;
  status: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  email: string;
  firstname: string;
  productinfo: string;
  amount: string;
  txnid: string;
  key: string;
}): string {
  return sha512(
    [
      params.salt,
      params.status,
      "",
      "",
      "",
      "",
      "",
      params.udf5 ?? "",
      params.udf4 ?? "",
      params.udf3 ?? "",
      params.udf2 ?? "",
      params.udf1 ?? "",
      params.email,
      params.firstname,
      params.productinfo,
      params.amount,
      params.txnid,
      params.key,
    ].join("|"),
  );
}

function toBase64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function fromBase64Json(raw: string): PrototypeState | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (parsed.version !== PROTOTYPE_VERSION) {
      return null;
    }
    if (!Array.isArray(parsed.bookings) || !Array.isArray(parsed.progress)) {
      return null;
    }
    return parsed as PrototypeState;
  } catch {
    return null;
  }
}

function parseCookies(req: any): Record<string, string> {
  const header = getHeader(req, "cookie");
  if (!header) {
    return {};
  }

  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf("=");
    if (index === -1) {
      return acc;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
}

function buildStateCookie(state: PrototypeState): string {
  const payload = toBase64Json(state);
  return `${STATE_COOKIE_NAME}=${payload}; Path=/; Max-Age=${STATE_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=None`;
}

function parseTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function getUserIdFromRequest(req: any): string | null {
  const authHeader = getHeader(req, "authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  if (token.startsWith("user:")) {
    return token.slice(5) || null;
  }

  const payload = parseTokenPayload(token);
  const candidate =
    (typeof payload?.sub === "string" && payload.sub) ||
    (typeof payload?.userId === "string" && payload.userId) ||
    (typeof payload?.user_id === "string" && payload.user_id) ||
    (typeof payload?.sid === "string" && payload.sid) ||
    null;

  if (candidate) {
    return candidate;
  }

  return `session_${crypto.createHash("sha1").update(token).digest("hex").slice(0, 24)}`;
}

function normalizeBookingStatus(booking: StoredBooking): BookingStatus {
  if (
    booking.status === "provisioned" &&
    booking.expiresAt &&
    new Date(booking.expiresAt).getTime() <= Date.now()
  ) {
    return "expired";
  }
  return booking.status;
}

function loadState(req: any, currentUserId: string | null): { state: PrototypeState; dirty: boolean } {
  const cookies = parseCookies(req);
  const stored = cookies[STATE_COOKIE_NAME] ? fromBase64Json(cookies[STATE_COOKIE_NAME]) : null;
  let state = stored ?? createDefaultState(currentUserId);
  let dirty = !stored;

  if (currentUserId) {
    if (state.userId && state.userId !== currentUserId) {
      state = createDefaultState(currentUserId);
      dirty = true;
    } else if (state.userId !== currentUserId) {
      state.userId = currentUserId;
      dirty = true;
    }
  }

  for (const booking of state.bookings) {
    const normalized = normalizeBookingStatus(booking);
    if (normalized !== booking.status) {
      booking.status = normalized;
      dirty = true;
    }
  }

  return { state, dirty };
}

function getLabById(labId: number) {
  return activeLabs.find((lab) => lab.id === labId) ?? null;
}

function getModuleById(moduleId: number) {
  return prototypeModules.find((module) => module.id === moduleId) ?? null;
}

function getModulesForLab(labId: number) {
  return moduleSummaries.filter((module) => module.labId === labId).sort((a, b) => a.orderIndex - b.orderIndex);
}

function toPublicBooking(booking: StoredBooking, userId: string | null) {
  return {
    id: booking.id,
    userId: userId ?? "prototype-user",
    labId: booking.labId,
    hours: booking.hours,
    totalAmount: booking.totalAmount,
    status: normalizeBookingStatus(booking),
    paymentTxnId: booking.paymentTxnId,
    labAccessUrl: booking.labAccessUrl,
    labCredentials: booking.labCredentials,
    provisionedAt: booking.provisionedAt,
    expiresAt: booking.expiresAt,
    createdAt: booking.createdAt,
    lab: getLabById(booking.labId),
  };
}

function toPublicProgress(progress: StoredProgress, userId: string | null) {
  return {
    id: progress.id,
    userId: userId ?? "prototype-user",
    moduleId: progress.moduleId,
    status: progress.status,
    score: progress.score,
    attempts: progress.attempts,
    completedAt: progress.completedAt,
  };
}

function json(res: any, status: number, body: unknown, headers?: Record<string, string>): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.end(JSON.stringify(body));
}

function redirect(res: any, location: string, headers?: Record<string, string>): void {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.end();
}

function invalidMethod(res: any): void {
  json(res, 405, { error: "Method not allowed" });
}

function badRequest(res: any, error: string): void {
  json(res, 400, { error });
}

function unauthorized(res: any): void {
  json(res, 401, { error: "Unauthorized" });
}

function getPathname(req: any): string {
  const url = new URL(req.url ?? "/", getPublicOrigin(req));
  let path = url.pathname;
  if (path.startsWith("/api")) {
    path = path.slice(4) || "/";
  }
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path || "/";
}

async function readRawBody(req: any): Promise<string> {
  if (typeof req.body === "string") {
    return req.body;
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString("utf8");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseBodyText(raw: string, contentType: string | null): unknown {
  if (!raw) {
    return {};
  }
  if (contentType?.includes("application/json")) {
    return JSON.parse(raw);
  }
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return raw;
}

async function readBody(req: any): Promise<any> {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const raw = await readRawBody(req);
  return parseBodyText(raw, getHeader(req, "content-type"));
}

function requireUserId(res: any, userId: string | null): string | null {
  if (!userId) {
    unauthorized(res);
    return null;
  }
  return userId;
}

function withStateHeaders(isDirty: boolean, state: PrototypeState): Record<string, string> | undefined {
  if (!isDirty) {
    return undefined;
  }
  return { "Set-Cookie": buildStateCookie(state) };
}

function createProvisionedCredentials(userId: string, bookingId: number, labName: string) {
  const sanitizedUser = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "student";
  const sessionToken = crypto.randomBytes(24).toString("hex");
  const password = `Lab!${bookingId}${sanitizedUser.slice(-3) || "ops"}`;
  const labIp = `10.${(bookingId % 20) + 10}.${(bookingId % 50) + 20}.${(bookingId % 200) + 10}`;

  return {
    accessUrl: `https://placeholder.cyberlab.local/terminal/${sessionToken}`,
    credentials: JSON.stringify({
      username: `student_${sanitizedUser}`,
      password,
      sessionToken,
      labIp,
      labName,
    }),
  };
}

function findBooking(state: PrototypeState, bookingId: number): StoredBooking | null {
  return state.bookings.find((booking) => booking.id === bookingId) ?? null;
}

function listBookings(state: PrototypeState) {
  return [...state.bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((booking) => toPublicBooking(booking, state.userId));
}

function getDashboardSummary(state: PrototypeState) {
  const bookings = listBookings(state);
  return {
    totalBookings: bookings.length,
    activeBookings: bookings.filter((booking) => booking.status === "provisioned").length,
    totalSpent: bookings
      .filter((booking) => booking.status === "paid" || booking.status === "provisioned" || booking.status === "expired")
      .reduce((sum, booking) => sum + booking.totalAmount, 0),
    completedLabs: bookings.filter((booking) => booking.status === "provisioned" || booking.status === "expired").length,
    recentBookings: bookings.slice(0, 5),
  };
}

async function handlePaymentReturn(req: any, res: any, state: PrototypeState, stateDirty: boolean): Promise<void> {
  const body = await readBody(req);
  const record = typeof body === "object" && body ? (body as Record<string, string>) : {};
  const txnid = record.txnid ?? "";
  const status = record.status ?? "";
  const hash = record.hash ?? "";
  const key = record.key ?? "";
  const amount = record.amount ?? "";
  const email = record.email ?? "";
  const firstname = record.firstname ?? "";
  const productinfo = record.productinfo ?? "";
  const udf1 = record.udf1 ?? "";
  const udf2 = record.udf2 ?? "";
  const udf3 = record.udf3 ?? "";
  const udf4 = record.udf4 ?? "";
  const udf5 = record.udf5 ?? "";
  const bookingId = Number.parseInt(udf1, 10);
  const origin = getPublicOrigin(req);

  if (!isMockPaymentMode) {
    if (!hash || !txnid || !status) {
      redirect(res, `${origin}/bookings${Number.isFinite(bookingId) ? `/${bookingId}` : ""}?payment=failed`);
      return;
    }

    const expected = reverseHash({
      salt: EASEBUZZ_SALT,
      status,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      key: EASEBUZZ_KEY || key,
    });

    if (expected !== hash) {
      redirect(
        res,
        `${origin}/bookings${Number.isFinite(bookingId) ? `/${bookingId}` : ""}?payment=failed&reason=hash`,
      );
      return;
    }
  }

  if (!Number.isFinite(bookingId)) {
    redirect(res, `${origin}?payment=failed`);
    return;
  }

  const booking = findBooking(state, bookingId);
  if (booking) {
    if (status === "success") {
      booking.status = "paid";
      booking.paymentTxnId = txnid || booking.paymentTxnId;
    } else if (booking.status === "pending") {
      booking.status = "failed";
    }
    stateDirty = true;
  }

  const headers = booking ? { "Set-Cookie": buildStateCookie(state) } : undefined;
  if (status === "success") {
    redirect(res, `${origin}/bookings/${bookingId}?payment=success`, headers);
    return;
  }

  redirect(res, `${origin}/bookings/${bookingId}?payment=failed&reason=${encodeURIComponent(status || "failure")}`, headers);
}

async function handlePaymentWebhook(req: any, res: any, state: PrototypeState, stateDirty: boolean): Promise<void> {
  const body = await readBody(req);
  const record = typeof body === "object" && body ? (body as Record<string, string>) : {};
  const txnid = record.txnid ?? "";
  const status = record.status ?? "";
  const hash = record.hash ?? "";
  const key = record.key ?? "";
  const amount = record.amount ?? "";
  const email = record.email ?? "";
  const firstname = record.firstname ?? "";
  const productinfo = record.productinfo ?? "";
  const udf1 = record.udf1 ?? "";
  const udf2 = record.udf2 ?? "";
  const udf3 = record.udf3 ?? "";
  const udf4 = record.udf4 ?? "";
  const udf5 = record.udf5 ?? "";

  if (!isMockPaymentMode) {
    if (!hash || !txnid || !status) {
      json(res, 200, { error: "Missing fields" });
      return;
    }

    const expected = reverseHash({
      salt: EASEBUZZ_SALT,
      status,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      key: EASEBUZZ_KEY || key,
    });

    if (expected !== hash) {
      json(res, 200, { error: "Hash mismatch" });
      return;
    }
  }

  const bookingId = Number.parseInt(udf1, 10);
  if (Number.isFinite(bookingId)) {
    const booking = findBooking(state, bookingId);
    if (booking) {
      if (status === "success") {
        booking.status = "paid";
        booking.paymentTxnId = txnid || booking.paymentTxnId;
        stateDirty = true;
      } else if ((status === "failure" || status === "usercancelled") && booking.status === "pending") {
        booking.status = "failed";
        stateDirty = true;
      }
    }
  }

  json(res, 200, { ok: true }, withStateHeaders(stateDirty, state));
}

export async function handlePrototypeApi(req: any, res: any): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const pathname = getPathname(req);
  const currentUserId = getUserIdFromRequest(req);
  const loaded = loadState(req, currentUserId);
  const state = loaded.state;
  let stateDirty = loaded.dirty;

  if (pathname === "/healthz") {
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }
    json(res, 200, { status: "ok" }, withStateHeaders(stateDirty, state));
    return;
  }

  if (pathname === "/labs") {
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }
    json(res, 200, activeLabs, withStateHeaders(stateDirty, state));
    return;
  }

  const labDetailMatch = pathname.match(/^\/labs\/(\d+)$/);
  if (labDetailMatch) {
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }
    const lab = getLabById(Number.parseInt(labDetailMatch[1], 10));
    if (!lab) {
      json(res, 404, { error: "Lab not found" });
      return;
    }
    json(res, 200, lab, withStateHeaders(stateDirty, state));
    return;
  }

  const labModulesMatch = pathname.match(/^\/labs\/(\d+)\/modules$/);
  if (labModulesMatch) {
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }
    const labId = Number.parseInt(labModulesMatch[1], 10);
    json(res, 200, getModulesForLab(labId), withStateHeaders(stateDirty, state));
    return;
  }

  const labProgressMatch = pathname.match(/^\/labs\/(\d+)\/progress$/);
  if (labProgressMatch) {
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }
    const labId = Number.parseInt(labProgressMatch[1], 10);
    const moduleIds = new Set<number>(getModulesForLab(labId).map((module) => Number(module.id)));
    const progress = state.progress.filter((item) => moduleIds.has(item.moduleId)).map((item) => toPublicProgress(item, userId));
    json(res, 200, progress, withStateHeaders(stateDirty, state));
    return;
  }

  const moduleMatch = pathname.match(/^\/modules\/(\d+)$/);
  if (moduleMatch) {
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }
    const moduleId = Number.parseInt(moduleMatch[1], 10);
    const moduleRecord = getModuleById(moduleId);
    if (!moduleRecord) {
      json(res, 404, { error: "Module not found" });
      return;
    }
    json(res, 200, moduleRecord, withStateHeaders(stateDirty, state));
    return;
  }

  const moduleSubmitMatch = pathname.match(/^\/modules\/(\d+)\/submit$/);
  if (moduleSubmitMatch) {
    if (method !== "POST") {
      invalidMethod(res);
      return;
    }
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }

    const moduleId = Number.parseInt(moduleSubmitMatch[1], 10);
    const moduleRecord = getModuleById(moduleId);
    if (!moduleRecord) {
      json(res, 404, { error: "Module not found" });
      return;
    }

    const body = await readBody(req);
    const payload = typeof body === "object" && body ? (body as Record<string, unknown>) : {};
    const answer = payload.answer;
    const commandsCompleted =
      typeof payload.commandsCompleted === "number"
        ? payload.commandsCompleted
        : Number.parseInt(String(payload.commandsCompleted ?? "0"), 10) || 0;

    let correct = false;
    let score = 0;
    let explanation = "";

    if (moduleRecord.type === "quiz") {
      const answers = Array.isArray(answer) ? answer.map((value) => Number(value)) : [];
      const questions = Array.isArray((moduleRecord.content as any).questions) ? (moduleRecord.content as any).questions : [];
      let correctCount = 0;
      questions.forEach((question: any, index: number) => {
        if (answers[index] === question.correctIndex) {
          correctCount += 1;
        }
      });
      score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      correct = score >= 60;
      explanation = `You answered ${correctCount} of ${questions.length} correctly.`;
    } else if (moduleRecord.type === "terminal") {
      const required = ((moduleRecord.content as any).steps ?? []).filter((step: any) => step.required).length;
      const completed = Math.min(Math.max(commandsCompleted, 0), required || 0);
      score = required > 0 ? Math.round((completed / required) * 100) : 0;
      correct = required > 0 && completed === required;
      explanation = correct
        ? String((moduleRecord.content as any).completionMessage ?? "Module completed.")
        : `Completed ${completed} of ${required} required commands.`;
    } else if (moduleRecord.type === "flag") {
      const submitted = typeof answer === "string" ? answer.trim().toLowerCase() : "";
      const expected = String((moduleRecord.content as any).flag ?? "").trim().toLowerCase();
      correct = submitted !== "" && submitted === expected;
      score = correct ? 100 : 0;
      explanation = correct ? "Correct flag! Well done." : "Incorrect flag. Check your hints.";
    } else if (moduleRecord.type === "code") {
      const submitted = Number.parseInt(String(answer ?? ""), 10);
      correct = Number.isFinite(submitted) && submitted === (moduleRecord.content as any).correctIndex;
      score = correct ? 100 : 0;
      explanation = correct ? String((moduleRecord.content as any).explanation ?? "Correct.") : "Incorrect. Review the code carefully.";
    }

    const existing = state.progress.find((item) => item.moduleId === moduleId) ?? null;
    if (existing) {
      existing.status = correct ? "completed" : "in_progress";
      existing.score = Math.max(existing.score ?? 0, score);
      existing.attempts += 1;
      existing.completedAt = correct ? new Date().toISOString() : existing.completedAt;
    } else {
      state.progress.push({
        id: state.nextProgressId,
        moduleId,
        status: correct ? "completed" : "in_progress",
        score,
        attempts: 1,
        completedAt: correct ? new Date().toISOString() : null,
      });
      state.nextProgressId += 1;
    }
    stateDirty = true;

    json(res, 200, { correct, score, explanation, xp: correct ? moduleRecord.xp : 0 }, withStateHeaders(stateDirty, state));
    return;
  }

  if (pathname === "/bookings") {
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }

    if (method === "GET") {
      json(res, 200, listBookings(state), withStateHeaders(stateDirty, state));
      return;
    }

    if (method !== "POST") {
      invalidMethod(res);
      return;
    }

    const body = await readBody(req);
    const payload = typeof body === "object" && body ? (body as Record<string, unknown>) : {};
    const labId = Number.parseInt(String(payload.labId ?? ""), 10);
    const hours = Number.parseInt(String(payload.hours ?? ""), 10);
    const lab = getLabById(labId);

    if (!lab) {
      json(res, 404, { error: "Lab not found" });
      return;
    }
    if (!Number.isFinite(hours) || hours < 1) {
      badRequest(res, "Hours must be at least 1");
      return;
    }
    if (hours > lab.maxHours) {
      badRequest(res, `Maximum hours allowed is ${lab.maxHours}`);
      return;
    }

    const booking: StoredBooking = {
      id: state.nextBookingId,
      labId,
      hours,
      totalAmount: Number((lab.pricePerHour * hours).toFixed(2)),
      status: "pending",
      paymentTxnId: null,
      labAccessUrl: null,
      labCredentials: null,
      provisionedAt: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    };

    state.bookings.push(booking);
    state.nextBookingId += 1;
    stateDirty = true;

    json(res, 201, toPublicBooking(booking, userId), withStateHeaders(stateDirty, state));
    return;
  }

  const bookingDetailMatch = pathname.match(/^\/bookings\/(\d+)$/);
  if (bookingDetailMatch) {
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }

    const booking = findBooking(state, Number.parseInt(bookingDetailMatch[1], 10));
    if (!booking) {
      json(res, 404, { error: "Booking not found" });
      return;
    }

    json(res, 200, toPublicBooking(booking, userId), withStateHeaders(stateDirty, state));
    return;
  }

  const provisionMatch = pathname.match(/^\/bookings\/(\d+)\/provision$/);
  if (provisionMatch) {
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }
    if (method !== "POST") {
      invalidMethod(res);
      return;
    }

    const booking = findBooking(state, Number.parseInt(provisionMatch[1], 10));
    if (!booking) {
      json(res, 404, { error: "Booking not found" });
      return;
    }
    if (normalizeBookingStatus(booking) !== "paid") {
      badRequest(res, "Booking must be in paid status to provision");
      return;
    }

    const lab = getLabById(booking.labId);
    const provisionedAt = new Date();
    const expiresAt = new Date(provisionedAt.getTime() + booking.hours * 60 * 60 * 1000);
    const access = createProvisionedCredentials(userId, booking.id, lab?.name ?? "CyberLab Environment");

    booking.status = "provisioned";
    booking.labAccessUrl = access.accessUrl;
    booking.labCredentials = access.credentials;
    booking.provisionedAt = provisionedAt.toISOString();
    booking.expiresAt = expiresAt.toISOString();
    stateDirty = true;

    json(
      res,
      200,
      {
        success: true,
        accessUrl: booking.labAccessUrl,
        credentials: booking.labCredentials,
        expiresAt: booking.expiresAt,
      },
      withStateHeaders(stateDirty, state),
    );
    return;
  }

  if (pathname === "/dashboard/summary") {
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }
    if (method !== "GET") {
      invalidMethod(res);
      return;
    }
    json(res, 200, getDashboardSummary(state), withStateHeaders(stateDirty, state));
    return;
  }

  if (pathname === "/payments/initiate") {
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }
    if (method !== "POST") {
      invalidMethod(res);
      return;
    }

    const body = await readBody(req);
    const payload = typeof body === "object" && body ? (body as Record<string, unknown>) : {};
    const bookingId = Number.parseInt(String(payload.bookingId ?? ""), 10);
    const booking = findBooking(state, bookingId);
    if (!Number.isFinite(bookingId)) {
      badRequest(res, "Invalid bookingId");
      return;
    }
    if (!booking) {
      json(res, 404, { error: "Booking not found" });
      return;
    }
    if (normalizeBookingStatus(booking) !== "pending") {
      badRequest(res, "Booking is not pending");
      return;
    }

    if (isMockPaymentMode) {
      json(res, 200, { mockMode: true, bookingId: booking.id, amount: booking.totalAmount }, withStateHeaders(stateDirty, state));
      return;
    }

    const lab = getLabById(booking.labId);
    const txnId = `CL${booking.id}${Date.now()}`.slice(0, 40);
    const amount = booking.totalAmount.toFixed(2);
    const productinfo = `CyberLab - ${lab?.name ?? "Lab"} (${booking.hours}h)`
      .replace(/[^a-zA-Z0-9\s\-|]/g, "")
      .slice(0, 45)
      .trim();
    const firstname =
      String(payload.name ?? `Student${userId.slice(-6)}`)
        .trim()
        .slice(0, 150) || `Student${userId.slice(-6)}`;
    const email = String(payload.email ?? `user+${userId.slice(-8)}@cyberlab.app`).trim();
    const phone = String(payload.phone ?? "9999999999").trim() || "9999999999";
    const udf1 = String(booking.id);
    const origin = getPublicOrigin(req);
    const surl = `${origin}/api/payments/easebuzz-return`;
    const furl = surl;
    const hash = forwardHash({
      key: EASEBUZZ_KEY,
      txnid: txnId,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      salt: EASEBUZZ_SALT,
    });

    const easebuzzBody = new URLSearchParams({
      key: EASEBUZZ_KEY,
      txnid: txnId,
      amount,
      productinfo,
      firstname,
      phone,
      email,
      surl,
      furl,
      hash,
      udf1,
    });

    const response = await fetch(`${EASEBUZZ_BASE}/payment/initiateLink`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: easebuzzBody.toString(),
    });
    const easebuzzJson = (await response.json()) as { status?: number; data?: string };

    if (easebuzzJson.status !== 1 || !easebuzzJson.data) {
      json(res, 502, { error: `Easebuzz error: ${easebuzzJson.data ?? "Unable to initiate payment"}` });
      return;
    }

    booking.paymentTxnId = txnId;
    stateDirty = true;
    json(
      res,
      200,
      {
        checkoutUrl: `${EASEBUZZ_BASE}/pay/${easebuzzJson.data}`,
        txnId,
        amount: Number(amount),
        productinfo,
        mockMode: false,
      },
      withStateHeaders(stateDirty, state),
    );
    return;
  }

  if (pathname === "/payments/mock-complete") {
    const userId = requireUserId(res, currentUserId);
    if (!userId) {
      return;
    }
    if (method !== "POST") {
      invalidMethod(res);
      return;
    }

    const body = await readBody(req);
    const payload = typeof body === "object" && body ? (body as Record<string, unknown>) : {};
    const bookingId = Number.parseInt(String(payload.bookingId ?? ""), 10);
    if (!Number.isFinite(bookingId)) {
      badRequest(res, "Invalid bookingId");
      return;
    }

    const booking = findBooking(state, bookingId);
    if (!booking) {
      json(res, 404, { error: "Booking not found" });
      return;
    }
    if (normalizeBookingStatus(booking) !== "pending") {
      badRequest(res, "Booking is not pending");
      return;
    }

    booking.status = "paid";
    booking.paymentTxnId = `MOCK${booking.id}${Date.now()}`.slice(0, 40);
    stateDirty = true;

    json(res, 200, { status: "success", bookingId: booking.id, txnId: booking.paymentTxnId }, withStateHeaders(stateDirty, state));
    return;
  }

  if (pathname === "/payments/easebuzz-return" || pathname === "/payments/callback") {
    if (method !== "POST") {
      invalidMethod(res);
      return;
    }
    await handlePaymentReturn(req, res, state, stateDirty);
    return;
  }

  if (pathname === "/payments/webhook") {
    if (method !== "POST") {
      invalidMethod(res);
      return;
    }
    await handlePaymentWebhook(req, res, state, stateDirty);
    return;
  }

  json(res, 404, { error: "Not found" });
}
