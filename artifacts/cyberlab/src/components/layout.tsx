import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { LogOut, Terminal, LayoutDashboard, Database, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [location] = useLocation();

  if (!isLoaded) return <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-primary font-mono animate-pulse">Initializing Terminal...</div>
  </div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {/* Decorative grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
           style={{ backgroundImage: "linear-gradient(to right, #00ffff 1px, transparent 1px), linear-gradient(to bottom, #00ffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm z-10 sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="w-8 h-8 border-2 border-primary bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)]">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <span className="font-mono font-bold tracking-widest text-lg uppercase hidden sm:block">
              CyberLab<span className="text-primary">_Portal</span>
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-6 font-mono text-sm">
                <Link href="/dashboard" className={`hover:text-primary transition-colors ${location === "/dashboard" ? "text-primary" : "text-muted-foreground"}`}>
                  <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> DASHBOARD</span>
                </Link>
                <Link href="/labs" className={`hover:text-primary transition-colors ${location.startsWith("/labs") ? "text-primary" : "text-muted-foreground"}`}>
                  <span className="flex items-center gap-2"><Database className="w-4 h-4" /> LABS</span>
                </Link>
                <Link href="/bookings" className={`hover:text-primary transition-colors ${location.startsWith("/bookings") ? "text-primary" : "text-muted-foreground"}`}>
                  <span className="flex items-center gap-2"><History className="w-4 h-4" /> BOOKINGS</span>
                </Link>
              </nav>
              <div className="flex items-center gap-4 border-l border-border pl-6">
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="hidden sm:block">{user.primaryEmailAddress?.emailAddress}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors uppercase">
                Authenticate
              </Link>
              <Link href="/sign-up" className="bg-primary/10 text-primary border border-primary hover:bg-primary/20 px-4 py-2 text-sm font-mono uppercase transition-colors shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                Initialize
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {children}
      </main>

      <footer className="border-t border-border/50 py-6 z-10 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Terminal className="w-3 h-3 text-primary" />
            <span>CyberLab Portal v1.0.0</span>
          </div>
          <div>SECURE CONNECTION ESTABLISHED</div>
        </div>
      </footer>
    </div>
  );
}