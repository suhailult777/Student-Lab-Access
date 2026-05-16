import { Layout } from "@/components/layout";
import { useGetMyBookings } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Clock, Terminal, ChevronRight, PlaySquare } from "lucide-react";
import { format } from "date-fns";
import { formatInr } from "@/lib/currency";

export function Bookings() {
  const { data: bookings, isLoading } = useGetMyBookings();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-mono font-bold uppercase tracking-wider">DEPLOYMENT HISTORY</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Review and access your lab environments.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : bookings?.length === 0 ? (
          <div className="border border-border border-dashed bg-card/50 p-16 text-center flex flex-col items-center justify-center space-y-4">
            <Terminal className="w-16 h-16 text-muted-foreground" />
            <h2 className="text-xl font-mono font-bold uppercase">No Deployments Found</h2>
            <p className="font-mono text-muted-foreground max-w-md">You haven't provisioned any lab environments yet.</p>
            <Link href="/labs" className="mt-4 bg-primary/10 text-primary border border-primary hover:bg-primary/20 px-8 py-3 text-sm font-mono uppercase transition-colors shadow-[0_0_10px_rgba(0,255,255,0.1)]">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings?.map(booking => (
              <div key={booking.id} className="border border-border bg-card hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center justify-between p-6 gap-6 group">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground text-xs">#{booking.id.toString().padStart(4, '0')}</span>
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider border font-mono ${
                      booking.status === 'provisioned' ? 'border-primary/50 text-primary bg-primary/10' :
                      booking.status === 'paid' ? 'border-green-500/50 text-green-500 bg-green-500/10' :
                      booking.status === 'pending' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
                      booking.status === 'failed' ? 'border-red-500/50 text-red-500 bg-red-500/10' :
                      'border-muted-foreground/50 text-muted-foreground bg-muted/10'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{booking.lab?.name}</h3>
                  <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.hours} Hours</div>
                    <div>•</div>
                    <div>Created: {format(new Date(booking.createdAt), 'MMM dd, yyyy HH:mm')}</div>
                    {booking.expiresAt && (
                      <>
                        <div>•</div>
                        <div className="text-yellow-500/70">Expires: {format(new Date(booking.expiresAt), 'MMM dd, yyyy HH:mm')}</div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <div className="text-right flex-1 md:flex-none">
                    <div className="font-mono font-bold text-lg">{formatInr(booking.totalAmount)}</div>
                  </div>
                  <Link href={`/bookings/${booking.id}`} className="bg-background border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 py-3 font-mono text-sm uppercase transition-colors flex items-center gap-2 whitespace-nowrap">
                    {booking.status === 'provisioned' ? <><PlaySquare className="w-4 h-4" /> Access</> : <><ChevronRight className="w-4 h-4" /> Details</>}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
