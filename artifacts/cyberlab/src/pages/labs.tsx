import { Layout } from "@/components/layout";
import { useGetLabs } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Database, Filter, Search, Terminal, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function Labs() {
  const { data: labs, isLoading } = useGetLabs();
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const filteredLabs = labs?.filter(lab => {
    const matchesSearch = lab.name.toLowerCase().includes(search.toLowerCase()) || 
                          lab.description.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = filterDifficulty === "all" || lab.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty && lab.isActive;
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-mono font-bold uppercase tracking-wider flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" /> LAB CATALOG
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Select an environment to provision.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search environments..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-mono bg-card border-border rounded-none focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 font-mono text-sm">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select 
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="bg-card border border-border px-3 py-2 outline-none focus:border-primary text-foreground"
            >
              <option value="all">ALL DIFFICULTIES</option>
              <option value="beginner">BEGINNER</option>
              <option value="intermediate">INTERMEDIATE</option>
              <option value="advanced">ADVANCED</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLabs?.length === 0 ? (
              <div className="col-span-full py-12 text-center border border-dashed border-border text-muted-foreground font-mono">
                No environments match your criteria.
              </div>
            ) : (
              filteredLabs?.map(lab => (
                <div key={lab.id} className="group border border-border bg-card hover:border-primary/50 transition-all flex flex-col overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Terminal className="w-24 h-24" />
                  </div>
                  
                  <div className="p-6 flex-1 space-y-4 z-10">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-xl group-hover:text-primary transition-colors leading-tight">{lab.name}</h3>
                        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{lab.category}</div>
                      </div>
                      <span className={`text-[10px] font-mono uppercase border px-2 py-1 whitespace-nowrap ${
                        lab.difficulty === 'beginner' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                        lab.difficulty === 'intermediate' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' :
                        'border-red-500/30 text-red-500 bg-red-500/5'
                      }`}>
                        {lab.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3">{lab.description}</p>
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {lab.tools.slice(0, 3).map((tool, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-1 font-mono text-muted-foreground">
                          {tool}
                        </span>
                      ))}
                      {lab.tools.length > 3 && (
                        <span className="text-xs bg-muted px-2 py-1 font-mono text-muted-foreground">
                          +{lab.tools.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 border-t border-border bg-background/50 flex justify-between items-center z-10">
                    <div className="space-y-1">
                      <div className="font-mono text-primary font-bold text-lg">${lab.pricePerHour.toFixed(2)}<span className="text-xs text-muted-foreground">/hr</span></div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase">Max {lab.maxHours}h</div>
                    </div>
                    <Link href={`/labs/${lab.id}`} className="bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary px-4 py-2 text-xs font-mono uppercase transition-colors flex items-center gap-1">
                      Configure <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}