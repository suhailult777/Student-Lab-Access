import { useState } from "react";
import { useLabModules, useLabProgress, useModule, type ModuleSummary } from "@/hooks/useModules";
import { QuizModule } from "./QuizModule";
import { TerminalModule } from "./TerminalModule";
import { FlagModule } from "./FlagModule";
import { CodeModule } from "./CodeModule";
import {
  BookOpen, Terminal, Flag, Code2, CheckCircle2, Lock,
  ChevronRight, Star, Loader2, Trophy, AlertCircle,
} from "lucide-react";
import { useUser } from "@clerk/react";

const TYPE_META: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  quiz:     { icon: BookOpen,  label: "Quiz",     color: "text-blue-400 border-blue-400/40 bg-blue-400/5" },
  terminal: { icon: Terminal,  label: "Terminal",  color: "text-green-400 border-green-400/40 bg-green-400/5" },
  flag:     { icon: Flag,      label: "CTF Flag",  color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/5" },
  code:     { icon: Code2,     label: "Code Analysis", color: "text-purple-400 border-purple-400/40 bg-purple-400/5" },
};

function ModuleContent({ mod, progress, onComplete }: {
  mod: ModuleSummary;
  progress: any;
  onComplete: (xp: number) => void;
}) {
  const { data: full, isLoading } = useModule(mod.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-primary font-mono">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading module...
      </div>
    );
  }
  if (!full) return null;

  const props = { moduleId: mod.id, xp: mod.xp, content: full.content, progress, onComplete };

  if (mod.type === "quiz")     return <QuizModule {...props} />;
  if (mod.type === "terminal") return <TerminalModule {...props} />;
  if (mod.type === "flag")     return <FlagModule {...props} />;
  if (mod.type === "code")     return <CodeModule {...props} />;
  return null;
}

export function LabModules({ labId }: { labId: number }) {
  const { isSignedIn } = useUser();
  const { data: modules, isLoading: modsLoading } = useLabModules(labId);
  const { data: progressList } = useLabProgress(labId);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [earnedXP, setEarnedXP] = useState(0);

  if (modsLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-primary font-mono">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading training modules...
      </div>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground font-mono">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
        No modules available for this lab yet.
      </div>
    );
  }

  const getProgress = (modId: number) => progressList?.find((p) => p.moduleId === modId);

  const totalXP = modules.reduce((s, m) => s + m.xp, 0);
  const completedCount = modules.filter((m) => getProgress(m.id)?.status === "completed").length;
  const earnedFromDB = progressList
    ?.filter((p) => p.status === "completed")
    .reduce((s, p) => {
      const mod = modules.find((m) => m.id === p.moduleId);
      return s + (mod?.xp ?? 0);
    }, 0) ?? 0;

  const active = modules.find((m) => m.id === activeId);

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border bg-card p-4 text-center font-mono">
          <div className="text-2xl font-bold text-primary">{completedCount}/{modules.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Modules Done</div>
        </div>
        <div className="border border-border bg-card p-4 text-center font-mono">
          <div className="text-2xl font-bold text-yellow-400">{earnedFromDB + earnedXP}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">XP Earned</div>
        </div>
        <div className="border border-border bg-card p-4 text-center font-mono">
          <div className="text-2xl font-bold text-foreground/70">{totalXP}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Total XP</div>
        </div>
      </div>

      {!isSignedIn && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-3 font-mono text-sm text-yellow-400">
          <Lock className="w-4 h-4 shrink-0" />
          Sign in to track your progress and earn XP
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module list */}
        <div className="space-y-2">
          {modules.map((mod, idx) => {
            const prog = getProgress(mod.id);
            const isCompleted = prog?.status === "completed";
            const isActive = activeId === mod.id;
            const meta = TYPE_META[mod.type] ?? TYPE_META.quiz;
            const Icon = meta.icon;

            return (
              <button
                key={mod.id}
                onClick={() => setActiveId(isActive ? null : mod.id)}
                className={`w-full text-left border p-4 transition-all font-mono ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : isCompleted
                    ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-7 h-7 border flex items-center justify-center text-xs font-bold mt-0.5 ${isCompleted ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[9px] text-yellow-400 uppercase">+{mod.xp} XP</span>
                    </div>
                    <p className="text-sm font-semibold leading-tight truncate">{mod.title}</p>
                    {prog && prog.score !== null && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex-1 h-0.5 bg-muted/50">
                          <div className="h-0.5 bg-primary" style={{ width: `${prog.score}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{prog.score}%</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform ${isActive ? "rotate-90 text-primary" : ""}`} />
                </div>
              </button>
            );
          })}

          {completedCount === modules.length && modules.length > 0 && (
            <div className="border border-primary/40 bg-primary/5 p-4 text-center font-mono">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-2 drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]" />
              <p className="text-primary text-sm font-bold uppercase tracking-wider">Lab Complete!</p>
              <p className="text-muted-foreground text-xs mt-1">{totalXP} XP earned</p>
            </div>
          )}
        </div>

        {/* Active module content */}
        <div className="lg:col-span-2">
          {active ? (
            <div className="border border-border bg-card p-6">
              <div className="mb-5 pb-5 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  {(() => { const meta = TYPE_META[active.type]; const Icon = meta.icon; return <Icon className={`w-5 h-5 ${meta.color.split(" ")[0]}`} />; })()}
                  <span className={`text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${TYPE_META[active.type]?.color}`}>
                    {TYPE_META[active.type]?.label}
                  </span>
                  <span className="text-xs text-yellow-400 font-mono ml-auto">+{active.xp} XP</span>
                </div>
                <h3 className="text-lg font-mono font-bold">{active.title}</h3>
                <p className="text-sm text-muted-foreground font-mono mt-1">{active.description}</p>
              </div>
              <ModuleContent
                mod={active}
                progress={getProgress(active.id)}
                onComplete={(xp) => setEarnedXP((e) => e + xp)}
              />
            </div>
          ) : (
            <div className="border border-border/40 bg-card/40 h-full flex items-center justify-center py-24 text-center">
              <div className="space-y-3">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="font-mono text-muted-foreground text-sm uppercase tracking-wider">Select a module to begin training</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
