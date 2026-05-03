import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetBooking, getGetBookingQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Terminal,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

function formatCard(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

function CardPreview({
  number,
  name,
  expiry,
}: {
  number: string;
  name: string;
  expiry: string;
}) {
  const displayNum = (number || "").padEnd(16, "·").replace(/(.{4})/g, "$1 ").trim();
  return (
    <div className="relative w-full h-44 rounded-none border border-primary/40 bg-gradient-to-br from-[#0a1a1a] via-[#0d2020] to-[#061212] overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.08)] p-6 flex flex-col justify-between font-mono select-none">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,255,255,0.3) 20px, rgba(0,255,255,0.3) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,255,255,0.3) 20px, rgba(0,255,255,0.3) 21px)" }} />
      <div className="flex justify-between items-start relative z-10">
        <div className="text-primary/70 text-xs uppercase tracking-widest">CyberLab Pay</div>
        <Wifi className="w-5 h-5 text-primary/60 rotate-90" />
      </div>
      <div className="relative z-10">
        <div className="text-xl tracking-[0.25em] text-foreground/90 mb-4">{displayNum}</div>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase mb-0.5">Card Holder</div>
            <div className="text-sm text-foreground/80 uppercase tracking-wider">{name || "YOUR NAME"}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase mb-0.5">Expires</div>
            <div className="text-sm text-foreground/80">{expiry || "MM/YY"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Payment({ params }: { params: { bookingId: string } }) {
  const bookingId = parseInt(params.bookingId);
  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) },
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePay = async () => {
    if (!cardNumber || !cardName || !expiry || !cvv) {
      toast({ title: "Missing Details", description: "Please fill in all card fields.", variant: "destructive" });
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 16) {
      toast({ title: "Invalid Card", description: "Card number must be 16 digits.", variant: "destructive" });
      return;
    }

    setPaying(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/payments/mock-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment failed");
      }

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });

      setTimeout(() => {
        setLocation(`/bookings/${bookingId}`);
      }, 2200);
    } catch (err: any) {
      toast({
        title: "Payment Failed",
        description: err.message || "Could not process payment",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="flex flex-col items-center gap-4 text-primary font-mono">
            <Loader2 className="w-8 h-8 animate-spin" />
            <div>ESTABLISHING SECURE CONNECTION...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!booking || booking.status !== "pending") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-mono font-bold uppercase">Invalid Payment Request</h1>
          <p className="text-muted-foreground font-mono">
            This booking is either invalid or has already been processed.
          </p>
          <Button
            variant="outline"
            className="font-mono rounded-none mt-4"
            onClick={() => setLocation("/bookings")}
          >
            Return to Bookings
          </Button>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="flex flex-col items-center gap-6 text-center font-mono max-w-sm">
            <div className="relative">
              <CheckCircle2 className="w-20 h-20 text-primary drop-shadow-[0_0_20px_rgba(0,255,255,0.6)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-widest text-primary mb-2">
                Payment Authorized
              </h1>
              <p className="text-muted-foreground text-sm">Redirecting to your deployment...</p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Order summary */}
          <div className="space-y-6">
            <div className="border border-border bg-card p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
              <h2 className="font-mono font-bold uppercase tracking-widest text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Order Summary
              </h2>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="font-bold text-right max-w-[60%]">{booking.lab?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{booking.hours} Hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span>${booking.lab?.pricePerHour.toFixed(2)} / hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span className="text-xs">#{String(booking.id).padStart(4, "0")}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="uppercase font-bold tracking-widest">Total Due</span>
                  <span className="text-2xl font-bold text-primary">${booking.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <CardPreview
              number={cardNumber}
              name={cardName}
              expiry={expiry}
            />

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border/50 p-3">
              <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
              256-bit encrypted · Test mode — any card details accepted
            </div>
          </div>

          {/* Right — Card form */}
          <div className="border border-border bg-card p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-primary" />

            <div className="text-center mb-8">
              <CreditCard className="w-10 h-10 text-primary mx-auto mb-3" />
              <h1 className="text-xl font-mono font-bold uppercase tracking-widest">Secure Checkout</h1>
            </div>

            <div className="space-y-5 font-mono">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Card Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  className="w-full bg-background border border-border text-foreground font-mono px-4 py-3 text-sm focus:outline-none focus:border-primary tracking-widest placeholder:text-muted-foreground/40 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Card Holder Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="w-full bg-background border border-border text-foreground font-mono px-4 py-3 text-sm focus:outline-none focus:border-primary uppercase placeholder:normal-case placeholder:text-muted-foreground/40 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="w-full bg-background border border-border text-foreground font-mono px-4 py-3 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/40 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">CVV</label>
                  <input
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full bg-background border border-border text-foreground font-mono px-4 py-3 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/40 transition-colors"
                  />
                </div>
              </div>

              <Button
                className="w-full font-mono font-bold tracking-widest uppercase rounded-none py-6 shadow-[0_0_20px_rgba(0,255,255,0.2)] mt-2"
                size="lg"
                onClick={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> AUTHORIZING...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" /> PAY ${booking.totalAmount.toFixed(2)}
                  </>
                )}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground uppercase tracking-wider">
                By paying you agree to CyberLab terms of service
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
