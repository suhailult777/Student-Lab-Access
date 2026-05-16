import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ShieldAlert, Terminal, Lock, ChevronRight, Activity } from "lucide-react";
import { useGetLabs } from "@workspace/api-client-react";
import { formatInr } from "@/lib/currency";

export function Home() {
  const { data: labs, isLoading } = useGetLabs();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/5 text-primary text-xs font-mono uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Environment Ready
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              PROVISION YOUR <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 filter drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                TARGET VECTOR
              </span>
            </h1>
            <p className="text-xl text-muted-foreground font-mono max-w-2xl mx-auto leading-relaxed">
              On-demand, isolated cybersecurity laboratory environments for penetration testing, forensic analysis, and security research.
            </p>
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 font-mono font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                Deploy Lab <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/sign-in" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-border bg-background hover:bg-accent/50 px-8 py-4 font-mono uppercase tracking-wider transition-all">
                Access Terminal
              </Link>
            </div>
          </div>

          {/* Stats/Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
            <div className="border border-border/50 bg-card p-6 space-y-4 hover:border-primary/50 transition-colors">
              <ShieldAlert className="w-8 h-8 text-primary" />
              <h3 className="font-mono font-bold text-lg">Fully Isolated</h3>
              <p className="text-sm text-muted-foreground font-mono">Dedicated network segments for safe detonation and exploitation.</p>
            </div>
            <div className="border border-border/50 bg-card p-6 space-y-4 hover:border-primary/50 transition-colors">
              <Terminal className="w-8 h-8 text-primary" />
              <h3 className="font-mono font-bold text-lg">Pre-configured</h3>
              <p className="text-sm text-muted-foreground font-mono">Kali Linux, Commando VM, and vulnerable targets ready to hack.</p>
            </div>
            <div className="border border-border/50 bg-card p-6 space-y-4 hover:border-primary/50 transition-colors">
              <Lock className="w-8 h-8 text-primary" />
              <h3 className="font-mono font-bold text-lg">Hourly Billing</h3>
              <p className="text-sm text-muted-foreground font-mono">Pay only for the execution time you need. No commitments.</p>
            </div>
          </div>

          {/* Labs preview */}
          <div className="pt-24 space-y-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-2xl font-mono font-bold uppercase flex items-center gap-3">
                <Activity className="w-6 h-6 text-primary" /> Available Environments
              </h2>
              <Link href="/labs" className="text-sm text-primary hover:underline font-mono uppercase">
                View Catalog →
              </Link>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-48 border border-border bg-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {labs?.slice(0, 4).map(lab => (
                  <div key={lab.id} className="group border border-border bg-card hover:border-primary/50 transition-all flex flex-col overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Terminal className="w-16 h-16" />
                    </div>
                    <div className="p-6 flex-1 space-y-4 z-10">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{lab.name}</h3>
                          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{lab.category}</div>
                        </div>
                        <span className={`text-xs font-mono uppercase border px-2 py-1 ${
                          lab.difficulty === 'beginner' ? 'border-green-500/30 text-green-500' :
                          lab.difficulty === 'intermediate' ? 'border-yellow-500/30 text-yellow-500' :
                          'border-red-500/30 text-red-500'
                        }`}>
                          {lab.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{lab.description}</p>
                    </div>
                    <div className="px-6 py-4 border-t border-border bg-background/50 flex justify-between items-center z-10">
                      <span className="font-mono text-primary font-bold">{formatInr(lab.pricePerHour)}/hr</span>
                      <Link href={`/labs/${lab.id}`} className="text-xs font-mono uppercase hover:text-primary transition-colors flex items-center gap-1">
                        Details <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
