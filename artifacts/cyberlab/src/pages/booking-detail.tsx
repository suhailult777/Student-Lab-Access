import { Layout } from "@/components/layout";
import { useGetBooking, useProvisionLab, getGetBookingQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Clock, CreditCard, Database, Terminal, ShieldAlert, CheckCircle2, PlaySquare, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function BookingDetail({ params }: { params: { id: string } }) {
  const bookingId = parseInt(params.id);
  const { data: booking, isLoading } = useGetBooking(bookingId, { query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) } });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  
  const provisionLab = useProvisionLab();

  const handleProvision = () => {
    provisionLab.mutate({ id: bookingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({
          title: "Environment Provisioned",
          description: "Your lab is ready to access.",
        });
      },
      onError: (error) => {
        toast({
          title: "Provisioning Failed",
          description: error.error || "Failed to provision lab",
          variant: "destructive"
        });
      }
    });
  };

  const copyCredentials = () => {
    if (booking?.labCredentials) {
      navigator.clipboard.writeText(booking.labCredentials);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Credentials copied to clipboard" });
    }
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Link href="/bookings" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-mono font-bold uppercase tracking-wider">DEPLOYMENT #{booking.id.toString().padStart(4, '0')}</h1>
          <span className={`px-4 py-2 text-xs uppercase tracking-wider border font-mono font-bold ${
            booking.status === 'provisioned' ? 'border-primary/50 text-primary bg-primary/10' :
            booking.status === 'paid' ? 'border-green-500/50 text-green-500 bg-green-500/10' :
            booking.status === 'pending' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
            booking.status === 'failed' ? 'border-red-500/50 text-red-500 bg-red-500/10' :
            'border-muted-foreground/50 text-muted-foreground bg-muted/10'
          }`}>
            STATUS: {booking.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
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
                    <div className="font-mono flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {booking.hours} Hours</div>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Created At</div>
                    <div className="font-mono text-sm">{format(new Date(booking.createdAt), 'MMM dd, HH:mm')}</div>
                  </div>
                  {booking.provisionedAt && (
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Deployed At</div>
                      <div className="font-mono text-sm">{format(new Date(booking.provisionedAt), 'MMM dd, HH:mm')}</div>
                    </div>
                  )}
                  {booking.expiresAt && (
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Expires At</div>
                      <div className="font-mono text-sm text-yellow-500/90">{format(new Date(booking.expiresAt), 'MMM dd, HH:mm')}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {booking.status === 'provisioned' && booking.labAccessUrl && (
              <div className="border border-primary/50 bg-primary/5 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Terminal className="w-32 h-32 text-primary" />
                </div>
                <h2 className="text-xl font-mono font-bold uppercase mb-6 flex items-center gap-3 text-primary">
                  <ShieldAlert className="w-5 h-5" /> Access Credentials
                </h2>
                
                <div className="space-y-6 relative z-10">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Connection String</div>
                    <div className="flex items-center gap-2">
                      <div className="bg-background border border-border p-4 font-mono text-sm flex-1 overflow-x-auto">
                        {booking.labCredentials || "No credentials provided"}
                      </div>
                      <Button variant="outline" size="icon" className="h-full px-4 rounded-none border-border bg-background" onClick={copyCredentials}>
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <a 
                    href={booking.labAccessUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 font-mono font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)] w-full"
                  >
                    <PlaySquare className="w-5 h-5" /> Launch Web VNC
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="border border-border bg-card p-6 space-y-6">
              <h2 className="text-xl font-mono font-bold uppercase border-b border-border pb-4 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" /> Payment Info
              </h2>
              
              <div className="space-y-4 font-mono">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground uppercase">Amount</span>
                  <span className="font-bold">${booking.totalAmount.toFixed(2)}</span>
                </div>
                {booking.paymentTxnId && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground uppercase">Txn ID</span>
                    <span className="text-xs">{booking.paymentTxnId}</span>
                  </div>
                )}
                
                <div className="pt-4">
                  {booking.status === 'pending' && (
                    <Button 
                      className="w-full font-mono font-bold tracking-widest uppercase rounded-none shadow-[0_0_15px_rgba(0,255,255,0.2)]"
                      onClick={() => setLocation(`/payment/${booking.id}`)}
                    >
                      Proceed to Payment
                    </Button>
                  )}
                  
                  {booking.status === 'paid' && (
                    <Button 
                      className="w-full font-mono font-bold tracking-widest uppercase rounded-none bg-green-600 hover:bg-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                      onClick={handleProvision}
                      disabled={provisionLab.isPending}
                    >
                      {provisionLab.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> PROVISIONING...</>
                      ) : (
                        <><Terminal className="mr-2 h-4 w-4" /> PROVISION ENVIRONMENT</>
                      )}
                    </Button>
                  )}
                  
                  {booking.status === 'provisioned' && (
                    <div className="text-center p-3 bg-primary/10 border border-primary/30 text-primary font-mono text-sm uppercase flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Paid & Provisioned
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