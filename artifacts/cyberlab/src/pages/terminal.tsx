import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useLocation } from "wouter";
import {
  Wifi, WifiOff, Loader2, ArrowLeft, Maximize2, Minimize2,
  TerminalSquare, Circle,
} from "lucide-react";

type ConnStatus = "connecting" | "connected" | "disconnected" | "error";

export function TerminalPage({ params }: { params: { token: string } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef      = useRef<Terminal | null>(null);
  const fitRef       = useRef<FitAddon | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const [status, setStatus]     = useState<ConnStatus>("connecting");
  const [errMsg, setErrMsg]     = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [, setLocation] = useLocation();

  // Send resize control message to server
  const sendResize = useCallback((cols: number, rows: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const ctrl = Buffer.from(
      JSON.stringify({ type: "resize", cols, rows }),
      "utf8",
    );
    const msg = new Uint8Array(ctrl.length + 1);
    msg[0] = 0x01; // control prefix
    msg.set(ctrl, 1);
    ws.send(msg);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── Init xterm ──────────────────────────────────────────────────────────
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
      fontSize: 14,
      lineHeight: 1.3,
      theme: {
        background:       "#050f0f",
        foreground:       "#c9f0eb",
        cursor:           "#00ffcc",
        cursorAccent:     "#050f0f",
        selectionBackground: "rgba(0,255,204,0.25)",
        black:            "#1a2a2a",
        brightBlack:      "#2a4a4a",
        red:              "#ff5555",
        brightRed:        "#ff6e6e",
        green:            "#50fa7b",
        brightGreen:      "#69ff94",
        yellow:           "#f1fa8c",
        brightYellow:     "#ffffa5",
        blue:             "#6272a4",
        brightBlue:       "#7b88c0",
        magenta:          "#ff79c6",
        brightMagenta:    "#ff92df",
        cyan:             "#00ffcc",
        brightCyan:       "#33ffdd",
        white:            "#c8e6e0",
        brightWhite:      "#e4f8f4",
      },
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current  = fitAddon;

    // ── Open WebSocket ───────────────────────────────────────────────────────
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/terminal/ws?token=${params.token}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      sendResize(term.cols, term.rows);
    };

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(e.data));
      } else {
        term.write(e.data as string);
      }
    };

    ws.onclose = (e) => {
      setStatus("disconnected");
      if (e.code === 4002 || e.code === 4001) {
        setErrMsg("Invalid or expired session token.");
        setStatus("error");
      } else if (e.code === 4003) {
        setErrMsg("Session has already ended.");
        setStatus("error");
      }
      term.write("\r\n\x1b[1;33m[Disconnected from server]\x1b[0m\r\n");
    };

    ws.onerror = () => {
      setStatus("error");
      setErrMsg("WebSocket connection failed.");
      term.write("\r\n\x1b[1;31m[Connection error — please refresh]\x1b[0m\r\n");
    };

    // Pipe terminal key input to WS
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    // ── Resize handling ──────────────────────────────────────────────────────
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      sendResize(term.cols, term.rows);
    });
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
      ws.close();
    };
  }, [params.token, sendResize]);

  // Fullscreen toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F11") { e.preventDefault(); setFullscreen((f) => !f); }
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  // Re-fit after fullscreen toggle
  useEffect(() => {
    setTimeout(() => {
      fitRef.current?.fit();
      if (termRef.current && fitRef.current) {
        sendResize(termRef.current.cols, termRef.current.rows);
      }
    }, 100);
  }, [fullscreen, sendResize]);

  const statusConfig = {
    connecting:   { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,  color: "text-yellow-400", label: "CONNECTING" },
    connected:    { icon: <Wifi className="w-3.5 h-3.5" />,                   color: "text-green-400",  label: "LIVE" },
    disconnected: { icon: <WifiOff className="w-3.5 h-3.5" />,               color: "text-muted-foreground", label: "DISCONNECTED" },
    error:        { icon: <WifiOff className="w-3.5 h-3.5" />,               color: "text-red-400",    label: "ERROR" },
  }[status];

  return (
    <div
      className={`flex flex-col bg-[#050f0f] text-foreground font-mono ${
        fullscreen ? "fixed inset-0 z-50" : "h-screen"
      }`}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-primary/20 bg-[#070e0e] shrink-0">
        {/* Window dots */}
        <div className="flex items-center gap-1.5">
          <Circle className="w-3 h-3 fill-red-500 text-red-500" />
          <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
          <Circle className="w-3 h-3 fill-green-500 text-green-500" />
        </div>

        <div className="flex items-center gap-2 ml-2">
          <TerminalSquare className="w-4 h-4 text-primary" />
          <span className="text-primary text-xs uppercase tracking-widest">CyberLab Terminal</span>
        </div>

        <div className="ml-4 hidden sm:flex items-center gap-1.5 text-xs bg-[#0a1a1a] border border-primary/20 px-2.5 py-1">
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          <span className={`${statusConfig.color} tracking-widest`}>{statusConfig.label}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
            title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F11)"}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {!fullscreen && (
            <button
              onClick={() => setLocation("/bookings")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 border border-transparent hover:border-primary/30"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>
      </div>

      {/* ── Error overlay ── */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050f0f]/95 z-10 gap-4 font-mono">
          <WifiOff className="w-12 h-12 text-red-500" />
          <div className="text-center">
            <p className="text-red-400 font-bold uppercase tracking-widest text-lg">Connection Failed</p>
            <p className="text-muted-foreground text-sm mt-2">{errMsg}</p>
          </div>
          <button
            onClick={() => setLocation("/bookings")}
            className="mt-4 border border-border hover:border-primary px-6 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            Return to Bookings
          </button>
        </div>
      )}

      {/* ── Connecting overlay ── */}
      {status === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050f0f]/90 z-10 gap-4 pointer-events-none">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-primary font-bold uppercase tracking-widest">Establishing Connection</p>
            <p className="text-muted-foreground text-xs mt-1">Spawning secure shell...</p>
          </div>
        </div>
      )}

      {/* ── Terminal ── */}
      <div className="flex-1 overflow-hidden p-2">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t border-primary/20 bg-[#070e0e] text-[10px] text-muted-foreground/60 uppercase tracking-widest shrink-0">
        <span>bash · xterm-256color</span>
        <span className="ml-auto">F11 fullscreen · Esc exit</span>
      </div>
    </div>
  );
}
