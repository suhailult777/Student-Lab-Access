import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Activity, Clock, CreditCard, PlaySquare, Shield, Terminal } from "lucide-react";
import { format } from "date-fns";
import { formatInr } from "@/lib/currency";

export function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-8 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card border border-border" />)}
          </div>
          <div className="h-64 bg-card border border-border" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-mono font-bold uppercase tracking-wider">COMMAND CENTER</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">System status: ONLINE</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-border bg-card p-6 flex items-center gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-mono font-bold">{summary?.activeBookings || 0}</div>
              <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Active Instances</div>
            </div>
          </div>
          
          <div className="border border-border bg-card p-6 flex items-center gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shield className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-mono font-bold">{summary?.completedLabs || 0}</div>
              <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Completed Labs</div>
            </div>
          </div>

          <div className="border border-border bg-card p-6 flex items-center gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Terminal className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-mono font-bold">{summary?.totalBookings || 0}</div>
              <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Total Bookings</div>
            </div>
          </div>

          <div className="border border-border bg-card p-6 flex items-center gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CreditCard className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-mono font-bold">{summary ? formatInr(summary.totalSpent) : "₹0.00"}</div>
              <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Total Spent</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-xl font-mono font-bold uppercase">Recent Deployments</h2>
            <Link href="/bookings" className="text-xs font-mono text-primary hover:underline uppercase">View All</Link>
          </div>
          
          {summary?.recentBookings && summary.recentBookings.length > 0 ? (
            <div className="border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-mono uppercase bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Environment</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentBookings.map(booking => (
                      <tr key={booking.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors font-mono">
                        <td className="px-6 py-4 text-muted-foreground">#{booking.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 font-bold text-foreground">
                          {booking.lab?.name || 'Unknown Lab'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[10px] uppercase tracking-wider border ${
                            booking.status === 'provisioned' ? 'border-primary/50 text-primary bg-primary/10' :
                            booking.status === 'paid' ? 'border-green-500/50 text-green-500 bg-green-500/10' :
                            booking.status === 'pending' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
                            booking.status === 'failed' ? 'border-red-500/50 text-red-500 bg-red-500/10' :
                            'border-muted-foreground/50 text-muted-foreground bg-muted/10'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3 h-3" /> {booking.hours}h
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/bookings/${booking.id}`} className="text-primary hover:text-primary-foreground hover:bg-primary px-3 py-1 border border-primary transition-colors text-xs uppercase inline-flex items-center gap-1">
                            <PlaySquare className="w-3 h-3" /> Access
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-border border-dashed bg-card/50 p-12 text-center flex flex-col items-center justify-center">
              <Terminal className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="font-mono text-muted-foreground">No recent deployments found.</p>
              <Link href="/labs" className="mt-4 bg-primary/10 text-primary border border-primary hover:bg-primary/20 px-6 py-2 text-sm font-mono uppercase transition-colors">
                Browse Catalog
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
