import type { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { spawn } from "child_process";
import { db, labSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const BANNER = [
  "\r\n\x1b[1;36m╔══════════════════════════════════════════════════════════╗\x1b[0m\r\n",
  "\x1b[1;36m║    CyberLab Secure Shell  ·  v2.0  ·  Session Active     ║\x1b[0m\r\n",
  "\x1b[1;36m╚══════════════════════════════════════════════════════════╝\x1b[0m\r\n",
  "\x1b[90mType 'help' for available tools. Session is being recorded.\x1b[0m\r\n\r\n",
].join("");

const SHELL_SETUP = [
  'export PS1="\\[\\033[1;36m\\]student@cyberlab\\[\\033[0m\\]:\\[\\033[0;34m\\]\\w\\[\\033[0m\\]\\$ "',
  "export TERM=xterm-256color",
  "export HISTFILE=/dev/null",
  "alias ls='ls --color=auto'",
  "alias ll='ls -la --color=auto'",
  "echo -e '\\033[1;32mEnvironment ready.\\033[0m'",
].join("\n") + "\n";

export async function handleTerminalWs(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const url = new URL(req.url!, "http://localhost");
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(4001, "Missing session token");
    return;
  }

  const [session] = await db
    .select()
    .from(labSessionsTable)
    .where(eq(labSessionsTable.sessionToken, token));

  if (!session) {
    ws.close(4002, "Invalid session token");
    return;
  }
  if (session.status === "ended") {
    ws.close(4003, "Session has ended");
    return;
  }

  await db
    .update(labSessionsTable)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(labSessionsTable.id, session.id));

  logger.info({ sessionId: session.id, bookingId: session.bookingId }, "Terminal session started");

  // Use /usr/bin/script to create a proper PTY without native modules.
  // script -q -c <cmd> /dev/null: runs bash through a PTY, discards typescript log.
  const shell = spawn(
    "/usr/bin/script",
    ["-q", "-c", "/bin/bash --norc --noprofile", "/dev/null"],
    {
      env: {
        TERM: "xterm-256color",
        HOME: process.env.HOME ?? "/root",
        PATH: process.env.PATH ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        USER: `student_${session.userId.slice(-6)}`,
        LOGNAME: `student_${session.userId.slice(-6)}`,
        SHELL: "/bin/bash",
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  // Send banner, then inject shell setup after bash has initialised
  ws.send(BANNER);
  const setupTimer = setTimeout(() => {
    if (shell.stdin.writable) {
      shell.stdin.write(SHELL_SETUP);
    }
  }, 250);

  // Pipe shell output → WebSocket
  shell.stdout.on("data", (chunk: Buffer) => {
    if (ws.readyState === 1 /* OPEN */) ws.send(chunk);
  });
  shell.stderr.on("data", (chunk: Buffer) => {
    if (ws.readyState === 1) ws.send(chunk);
  });

  let cmdCount = 0;

  // Pipe WebSocket input → shell stdin
  // Protocol: Buffer[0] === 0x01 → JSON control message; otherwise raw input
  ws.on("message", (raw) => {
    const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as unknown as string);
    if (data.length > 0 && data[0] === 0x01) {
      try {
        const ctrl = JSON.parse(data.slice(1).toString("utf8")) as { type: string; cols?: number; rows?: number };
        if (ctrl.type === "resize" && ctrl.cols && ctrl.rows) {
          // xterm resize via stty — works within script PTY
          shell.stdin.write(`stty cols ${ctrl.cols} rows ${ctrl.rows}\n`);
        }
      } catch { /* ignore bad control messages */ }
      return;
    }
    // Count newlines as approximate command count
    if (data.includes(0x0d) || data.includes(0x0a)) cmdCount++;
    if (shell.stdin.writable) shell.stdin.write(data);
  });

  shell.on("error", (err) => {
    logger.error({ err, sessionId: session.id }, "Shell process error");
    if (ws.readyState === 1) {
      ws.send(`\r\n\x1b[1;31m[Shell error: ${err.message}]\x1b[0m\r\n`);
    }
  });

  shell.on("exit", (code) => {
    clearTimeout(setupTimer);
    logger.info({ sessionId: session.id, code }, "Shell process exited");
    if (ws.readyState === 1) {
      ws.send("\r\n\x1b[1;33m[Session terminated — goodbye]\x1b[0m\r\n");
      ws.close(1000, "Shell exited");
    }
  });

  ws.on("close", async () => {
    clearTimeout(setupTimer);
    try { shell.kill("SIGHUP"); } catch { /* already dead */ }
    try {
      await db
        .update(labSessionsTable)
        .set({ status: "ended", endedAt: new Date(), commandsCount: cmdCount })
        .where(eq(labSessionsTable.id, session.id));
    } catch (e) {
      logger.error({ e }, "Failed to update session on close");
    }
    logger.info({ sessionId: session.id, cmdCount }, "Terminal session ended");
  });
}
