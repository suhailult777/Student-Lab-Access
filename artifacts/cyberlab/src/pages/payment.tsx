import { Layout } from "@/components/layout";
import { useGetBooking, useInitiatePayment, getGetBookingQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { CreditCard, Loader2, ShieldCheck, Terminal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function Payment({ params }: { params: { bookingId: string } }) {
  const bookingId = parseInt(params.bookingId);
  const { data: booking, isLoading } = useGetBooking(bookingId, { query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) } });
  const initiatePayment = useInitiatePayment();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handlePayment = () => {
    initiatePayment.mutate({ data: { bookingId } }, {
      onSuccess: (res) => {
        // Redirect to Easebuzz payment URL
        window.location.href = res.paymentUrl;
      },
      onError: (err) => {
        toast({
          title: "Payment Initialization Failed",
          description: err.error || "Could not connect to payment gateway",
          variant: "destructive"
        });
      }
    });
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

  if (!booking || booking.status !== 'pending') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-mono font-bold uppercase">Invalid Payment Request</h1>
          <p className="text-muted-foreground font-mono">This booking is either invalid or has already been processed.</p>
          <Button variant="outline" className="font-mono rounded-none mt-4" onClick={() => setLocation('/bookings')}>
            Return to Bookings
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="border border-border bg-card p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
          
          <div className="text-center mb-8 space-y-2">
            <CreditCard className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-mono font-bold uppercase tracking-widest">Secure Checkout</h1>
            <p className="text-muted-foreground font-mono text-sm flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" /> 256-bit Encrypted Connection
            </p>
          </div>

          <div className="bg-background border border-border p-6 mb-8 space-y-4 font-mono">
            <h2 className="font-bold uppercase border-b border-border/50 pb-2 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Order Summary
            </h2>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-bold">{booking.lab?.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span>{booking.hours} Hours</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span>${booking.lab?.pricePerHour.toFixed(2)} / hr</span>
            </div>
            
            <div className="border-t border-border pt-4 mt-4 flex justify-between items-center">
              <span className="uppercase font-bold tracking-widest">Total Due</span>
              <span className="text-2xl font-bold text-primary">${booking.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            className="w-full font-mono font-bold tracking-widest uppercase rounded-none py-6 shadow-[0_0_15px_rgba(0,255,255,0.2)]" 
            size="lg"
            onClick={handlePayment}
            disabled={initiatePayment.isPending}
          >
            {initiatePayment.isPending ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESSING...</>
            ) : (
              "Pay via Easebuzz"
            )}
          </Button>
          
          <div className="mt-6 text-center text-xs font-mono text-muted-foreground">
            By proceeding, you agree to our Terms of Service and acceptable use policy for lab environments.
          </div>
        </div>
      </div>
    </Layout>
  );
}