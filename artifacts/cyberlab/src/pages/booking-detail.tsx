import { Layout } from "@/components/layout";
import { useGetBooking, useProvisionLab, getGetBookingQueryKey } from "@workspace/api-client-react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowLeft, Clock, CreditCard, Database, Terminal, ShieldAlert,
  CheckCircle2, PlaySquare, Loader2, Copy, Check, XCircle, AlertTriangle,
  Wifi, Lock, ChevronRight, User, KeyRound, FileKey, Monitor, TerminalSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function useCopy(text: string, duration = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), duration);
    });
  };
  return { copied, copy };
}

function CopyField({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  const { copied, copy } = useCopy(value);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-background border border-border px-4 py-2.5 font-mono text-sm flex-1 overflow-x-auto text-foreground/90 select-all">
          {value}
        </div>
        <button
          onClick={copy}
          className="shrink-0 border border-border bg-background hover:bg-muted px-3 py-2.5 transition-colors"
          title="Copy"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

const DEMO_TERMINAL_LINES = [
  { delay: 0,    text: "$ ssh student@cyberlab-env --port 2222", color: "text-primary" },
  { delay: 600,  text: "Warning: Permanently added 'cyberlab-env' (ED25519) to known hosts.", color: "text-yellow-400/70" },
  { delay: 900,  text: "Authenticated with public key.", color: "text-green-400/80" },
  { delay: 1200, text: "", color: "" },
  { delay: 1300, text: "  ██████╗██╗   ██╗██████╗ ███████╗██████╗ ██╗      █████╗ ██████╗ ", color: "text-primary/60" },
  { delay: 1350, text: " ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██║     ██╔══██╗██╔══██╗", color: "text-primary/60" },
  { delay: 1400, text: " ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║     ███████║██████╔╝", color: "text-primary/60" },
  { delay: 1450, text: " ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║     ██╔══██║██╔══██╗", color: "text-primary/60" },
  { delay: 1500, text: " ╚██████╗   ██║   ██████╔╝███████╗██║  ██║███████╗██║  ██║██████╔╝", color: "text-primary/60" },
  { delay: 1550, text: "  ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ", color: "text-primary/60" },
  { delay: 1700, text: "", color: "" },
  { delay: 1800, text: "  Lab Environment Ready  |  Kali Linux 2024.1  |  Kernel 6.6.9", color: "text-foreground/60" },
  { delay: 1900, text: "", color: "" },
  { delay: 2000, text: "student@cyberlab:~$ ifconfig eth0 | grep 'inet '", color: "text-primary" },
  { delay: 2500, text: "        inet 10.13.37.42  netmask 255.255.255.0  broadcast 10.13.37.255", color: "text-foreground/80" },
  { delay: 2700, text: "student@cyberlab:~$ ls ~/tools/", color: "text-primary" },
  { delay: 3100, text: "burpsuite/  metasploit/  nmap/  sqlmap/  wireshark/  wordlists/", color: "text-blue-400/90" },
  { delay: 3300, text: "student@cyberlab:~$ _", color: "text-primary", blink: true },
];

function DemoTerminal() {
  const [visibleLines, setVisibleLines] = useState<typeof DEMO_TERMINAL_LINES>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    DEMO_TERMINAL_LINES.forEach((line) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, line.delay);
    });
  }, []);

  return (
    <div className="bg-[#050f0f] border border-primary/30 font-mono text-xs leading-relaxed overflow-y-auto max-h-72 p-4 space-y-0.5">
      <div className="flex items-center gap-2 border-b border-primary/20 pb-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="text-muted-foreground/60 ml-2">cyberlab-terminal — ssh session</span>
        <Wifi className="w-3 h-3 text-green-400 ml-auto" />
      </div>
      {visibleLines.map((line, i) => (
        <div key={i} className={`whitespace-pre ${line.color}`}>
          {line.text}
          {line.blink && <span className="animate-pulse">█</span>}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function isPlaceholderUrl(url: string | null | undefined) {
  if (!url) return true;
  return url.includes("placeholder") || url.includes("example.com");
}

function isTerminalUrl(url: string | null | undefined) {
  return !!url && url.includes("/terminal/");
}

function parseCredentials(raw: string | null | undefined): Record<string, string> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const CRED_META: Record<string, { label: string; icon: React.ElementType; sensitive?: boolean }> = {
  username:     { label: "Username",      icon: User },
  password:     { label: "Password",      icon: KeyRound, sensitive: true },
  sessionToken: { label: "Session Token", icon: FileKey,  sensitive: true },
  labIp:        { label: "Lab IP",        icon: Wifi },
  labName:      { label: "Environment",   icon: Database },
  vpnConfig:    { label: "VPN Config",    icon: FileKey },
};

export function BookingDetail({ params }: { params: { id: string } }) {
  const bookingId = parseInt(params.id);
  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) },
  });
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showVnc, setShowVnc] = useState(false);

  const provisionLab = useProvisionLab();

  useEffect(() => {
    const p = new URLSearchParams(search);
    const paymentStatus = p.get("payment");
    if (paymentStatus === "success") {
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
      toast({ title: "Payment Successful", description: "Your booking is now paid. You can provision your lab." });
      window.history.replaceState({}, "", `/bookings/${bookingId}`);
    } else if (paymentStatus === "failed") {
      const reason = p.get("reason");
      toast({
        title: "Payment Failed",
        description: reason === "hash"
          ? "Payment verification failed — possible tampering detected."
          : "Your payment was not completed. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", `/bookings/${bookingId}`);
    }
  }, [search]);

  const handleProvision = () => {
    provisionLab.mutate({ id: bookingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: "Environment Provisioned", description: "Your lab is ready to access." });
      },
      onError: (error) => {
        toast({ title: "Provisioning Failed", description: (error as any)?.error ?? "Failed to provision lab", variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 animate-pulse space-y-8">
          <div className="h-8 w-24 bg-card border border-border" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-2 h-96 bg-card border border-border" />
            <div className="h-64 bg-card border border-border" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!booking) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <Terminal className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-mono font-bold uppercase">Deployment Not Found</h1>
          <Link href="/bookings" className="inline-flex mt-4 bg-primary/10 text-primary border border-primary px-6 py-2 uppercase font-mono text-sm hover:bg-primary/20 transition-colors">
            Return to History
          </Link>
        </div>
      </Layout>
    );
  }

  const creds = parseCredentials(booking.labCredentials);
  const isDemo = isPlaceholderUrl(booking.labAccessUrl);

  const statusColors: Record<string, string> = {
    provisioned: "border-primary/50 text-primary bg-primary/10",
    paid:        "border-green-500/50 text-green-500 bg-green-500/10",
    pending:     "border-yellow-500/50 text-yellow-500 bg-yellow-500/10",
    failed:      "border-red-500/50 text-red-500 bg-red-500/10",
    expired:     "border-muted-foreground/50 text-muted-foreground bg-muted/10",
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Link href="/bookings" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-mono font-bold uppercase tracking-wider">
            DEPLOYMENT #{booking.id.toString().padStart(4, "0")}
          </h1>
          <span className={`px-4 py-2 text-xs uppercase tracking-wider border font-mono font-bold ${statusColors[booking.status] ?? statusColors.expired}`}>
            STATUS: {booking.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Details ── */}
          <div className="col-span-2 space-y-8">

            {/* Environment info card */}
            <div className="border border-border bg-card p-8">
              <h2 className="text-xl font-mono font-bold uppercase border-b border-border pb-4 mb-6 flex items-center gap-3">
                <Database className="w-5 h-5 text-primary" /> Environment Details
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Target Lab</div>
                  <div className="text-xl font-bold">{booking.lab?.name}</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Duration</div>
                    <div className="font-mono flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> {booking.hours}h
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Created</div>
                    <div className="font-mono text-sm">{format(new Date(booking.createdAt), "MMM dd, HH:mm")}</div>
                  </div>
                  {booking.provisionedAt && (
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Deployed</div>
                      <div className="font-mono text-sm">{format(new Date(booking.provisionedAt), "MMM dd, HH:mm")}</div>
                    </div>
                  )}
                  {booking.expiresAt && (
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Expires</div>
                      <div className="font-mono text-sm text-yellow-500/90">{format(new Date(booking.expiresAt), "MMM dd, HH:mm")}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Provisioned: credentials + VNC */}
            {booking.status === "provisioned" && (
              <div className="border border-primary/40 bg-primary/5 p-8 relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Terminal className="w-36 h-36 text-primary" />
                </div>

                <h2 className="text-xl font-mono font-bold uppercase flex items-center gap-3 text-primary">
                  <ShieldAlert className="w-5 h-5" /> Access Credentials
                  {isDemo && (
                    <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-2 py-1 ml-auto font-normal tracking-widest">
                      DEMO MODE
                    </span>
                  )}
                </h2>

                {/* Parsed credentials */}
                {creds ? (
                  <div className="space-y-4 relative z-10">
                    {Object.entries(creds).map(([key, value]) => {
                      const meta = CRED_META[key];
                      if (!meta || !value) return null;
                      return (
                        <CopyField
                          key={key}
                          label={meta.label}
                          value={value}
                          icon={meta.icon as any}
                        />
                      );
                    })}
                  </div>
                ) : booking.labCredentials ? (
                  <CopyField label="Credentials" value={booking.labCredentials} icon={KeyRound} />
                ) : null}

                {/* Terminal / VNC access */}
                {!showVnc ? (
                  <div className="relative z-10">
                    {isDemo ? (
                      <Button
                        className="w-full font-mono font-bold tracking-widest uppercase rounded-none py-5 shadow-[0_0_20px_rgba(0,255,255,0.15)]"
                        onClick={() => setShowVnc(true)}
                      >
                        <Monitor className="mr-2 h-5 w-5" /> LAUNCH DEMO TERMINAL
                      </Button>
                    ) : isTerminalUrl(booking.labAccessUrl) ? (
                      <a
                        href={booking.labAccessUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-5 font-mono font-bold tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(0,255,255,0.25)] w-full"
                      >
                        <TerminalSquare className="w-5 h-5" /> OPEN SECURE TERMINAL
                      </a>
                    ) : (
                      <a
                        href={booking.labAccessUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-5 font-mono font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)] w-full"
                      >
                        <PlaySquare className="w-5 h-5" /> LAUNCH WEB VNC
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between font-mono text-xs text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-2 text-green-400">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Connected
                      </span>
                      <button
                        onClick={() => setShowVnc(false)}
                        className="hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <ChevronRight className="w-3 h-3 rotate-180" /> Hide
                      </button>
                    </div>
                    <DemoTerminal />
                    <p className="text-[10px] text-muted-foreground font-mono text-center">
                      Demo environment — simulated for preview. In production, a live Web VNC session loads here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Failed state */}
            {booking.status === "failed" && (
              <div className="border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-4">
                <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div className="font-mono">
                  <p className="text-red-400 font-bold uppercase tracking-wider text-sm">Payment Failed</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Your payment was not completed. Please create a new booking to try again.
                  </p>
                  <Button
                    variant="outline" size="sm"
                    className="mt-4 rounded-none font-mono uppercase text-xs"
                    onClick={() => setLocation(`/labs/${booking.labId}`)}
                  >
                    Book Again
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Payment panel ── */}
          <div className="space-y-6">
            <div className="border border-border bg-card p-6 space-y-6">
              <h2 className="text-xl font-mono font-bold uppercase border-b border-border pb-4 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" /> Payment Info
              </h2>
              <div className="space-y-4 font-mono">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground uppercase">Amount</span>
                  <span className="font-bold">₹{booking.totalAmount.toFixed(2)}</span>
                </div>
                {booking.paymentTxnId && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground uppercase">Txn ID</span>
                    <span className="text-xs truncate max-w-[60%]" title={booking.paymentTxnId}>
                      {booking.paymentTxnId}
                    </span>
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  {booking.status === "pending" && (
                    <Button
                      className="w-full font-mono font-bold tracking-widest uppercase rounded-none shadow-[0_0_15px_rgba(0,255,255,0.2)]"
                      onClick={() => setLocation(`/payment/${booking.id}`)}
                    >
                      Proceed to Payment
                    </Button>
                  )}

                  {booking.status === "paid" && (
                    <Button
                      className="w-full font-mono font-bold tracking-widest uppercase rounded-none bg-green-600 hover:bg-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                      onClick={handleProvision}
                      disabled={provisionLab.isPending}
                    >
                      {provisionLab.isPending
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> PROVISIONING...</>
                        : <><Terminal className="mr-2 h-4 w-4" /> PROVISION ENVIRONMENT</>}
                    </Button>
                  )}

                  {booking.status === "provisioned" && (
                    <div className="text-center p-3 bg-primary/10 border border-primary/30 text-primary font-mono text-sm uppercase flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Paid & Provisioned
                    </div>
                  )}

                  {booking.status === "failed" && (
                    <div className="text-center p-3 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm uppercase flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Payment Failed
                    </div>
                  )}

                  {booking.status === "expired" && (
                    <div className="flex items-center gap-2 p-3 bg-muted/10 border border-muted-foreground/30 text-muted-foreground font-mono text-sm uppercase justify-center">
                      <Lock className="w-4 h-4" /> Session Expired
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
