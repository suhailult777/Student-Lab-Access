import { Layout } from "@/components/layout";
import { useGetLab, useCreateBooking, getGetLabQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Clock, Database, Terminal, Shield, Info, ArrowLeft, Loader2, DollarSign } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";

export function LabDetail({ params }: { params: { id: string } }) {
  const labId = parseInt(params.id);
  const { data: lab, isLoading } = useGetLab(labId, { query: { enabled: !!labId, queryKey: getGetLabQueryKey(labId) } });
  const [hours, setHours] = useState(1);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  
  const createBooking = useCreateBooking();

  const handleBook = () => {
    if (!user) {
      setLocation("/sign-in");
      return;
    }
    
    createBooking.mutate({ data: { labId, hours } }, {
      onSuccess: (booking) => {
        setLocation(`/payment/${booking.id}`);
      },
      onError: (error) => {
        toast({
          title: "Booking Failed",
          description: error.error || "Failed to create booking",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 animate-pulse space-y-8">
          <div className="h-8 w-24 bg-card border border-border" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              <div className="h-48 bg-card border border-border" />
              <div className="h-64 bg-card border border-border" />
            </div>
            <div className="h-96 bg-card border border-border" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!lab) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <Terminal className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-mono font-bold uppercase">Environment Not Found</h1>
          <p className="text-muted-foreground font-mono">The requested lab environment does not exist or has been retired.</p>
          <Link href="/labs" className="inline-flex mt-4 bg-primary/10 text-primary border border-primary px-6 py-2 uppercase font-mono text-sm hover:bg-primary/20 transition-colors">
            Return to Catalog
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Link href="/labs" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            <div className="border border-border bg-card p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Database className="w-48 h-48" />
              </div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/30 text-xs font-mono uppercase tracking-wider">
                    {lab.category}
                  </span>
                  <span className={`px-3 py-1 border text-xs font-mono uppercase tracking-wider ${
                    lab.difficulty === 'beginner' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                    lab.difficulty === 'intermediate' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' :
                    'border-red-500/30 text-red-500 bg-red-500/5'
                  }`}>
                    {lab.difficulty}
                  </span>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">{lab.name}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">{lab.description}</p>
              </div>
            </div>

            <div className="border border-border bg-card p-8 space-y-6">
              <h2 className="text-xl font-mono font-bold uppercase flex items-center gap-3">
                <Terminal className="w-5 h-5 text-primary" /> Pre-installed Tools
              </h2>
              <div className="flex flex-wrap gap-3">
                {lab.tools.map((tool, i) => (
                  <span key={i} className="px-4 py-2 bg-muted border border-border font-mono text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-border bg-card p-8 space-y-6">
              <h2 className="text-xl font-mono font-bold uppercase flex items-center gap-3">
                <Info className="w-5 h-5 text-primary" /> Environment Details
              </h2>
              <ul className="space-y-4 font-mono text-sm">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" /> Fully isolated network segment
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Terminal className="w-4 h-4 text-primary" /> Web-based VNC access included
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Database className="w-4 h-4 text-primary" /> Root/Administrator privileges on all targets
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border bg-card p-6 space-y-6 sticky top-24">
              <h2 className="text-xl font-mono font-bold uppercase border-b border-border pb-4">Provisioning Setup</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-mono uppercase tracking-wider text-muted-foreground">
                  <span>Rate</span>
                  <span className="text-foreground">${lab.pricePerHour.toFixed(2)} / hr</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Duration (Hours)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max={lab.maxHours} 
                      value={hours} 
                      onChange={(e) => setHours(parseInt(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <div className="font-mono font-bold w-12 text-center bg-muted py-1 border border-border">{hours}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono uppercase text-right">Max: {lab.maxHours} hours</div>
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Total</span>
                  <span className="text-2xl font-mono font-bold text-primary">${(lab.pricePerHour * hours).toFixed(2)}</span>
                </div>

                <Button 
                  className="w-full font-mono font-bold tracking-widest uppercase rounded-none py-6 shadow-[0_0_15px_rgba(0,255,255,0.2)]" 
                  size="lg"
                  onClick={handleBook}
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> INITIALIZING...</>
                  ) : (
                    <><Terminal className="mr-2 h-5 w-5" /> {user ? "Deploy Environment" : "Authenticate to Deploy"}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}