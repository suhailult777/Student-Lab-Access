import { useState, useRef, useEffect } from "react";
import { Terminal, CheckCircle2, Trophy, RotateCcw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitModule } from "@/hooks/useModules";
import { useToast } from "@/hooks/use-toast";

type Step = {
  command: string;
  output: string;
  hint: string;
  required: boolean;
};

type Props = {
  moduleId: number;
  xp: number;
  content: {
    scenario: string;
    prompt: string;
    steps: Step[];
    completionMessage: string;
  };
  progress?: { status: string; score: number | null };
  onComplete?: (xp: number) => void;
};

type HistoryEntry = { input?: string; output: string; type: "output" | "command" | "system" | "error" };

export function TerminalModule({ moduleId, xp, content, progress, onComplete }: Props) {
  const { scenario, prompt, steps } = content;
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([
    { output: `CYBERLAB TERMINAL v2.4.1 — Secure Shell`, type: "system" },
    { output: `Mission: ${scenario}`, type: "system" },
    { output: `Type commands below. Use HINT to reveal the next step.`, type: "system" },
    { output: "", type: "output" },
  ]);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState<number | null>(null);
  const [done, setDone] = useState(progress?.status === "completed");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = useSubmitModule(moduleId);
  const { toast } = useToast();

  const requiredSteps = steps.filter((s) => s.required);
  const allDone = requiredSteps.every((_, i) => completedSteps.has(steps.findIndex((s) => s === requiredSteps[i])));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newHistory: HistoryEntry[] = [...history, { input: trimmed, output: "", type: "command" }];

    if (trimmed.toLowerCase() === "hint") {
      const next = steps.findIndex((s, i) => !completedSteps.has(i));
      if (next >= 0) {
        newHistory.push({ output: `HINT [Step ${next + 1}]: ${steps[next].hint}`, type: "system" });
        setShowHint(next);
      } else {
        newHistory.push({ output: "All steps completed!", type: "system" });
      }
      setHistory(newHistory);
      setInput("");
      return;
    }

    if (trimmed.toLowerCase() === "clear") {
      setHistory([{ output: "Terminal cleared.", type: "system" }]);
      setInput("");
      return;
    }

    const stepIdx = steps.findIndex((s) => {
      const normalise = (c: string) => c.replace(/\s+/g, " ").trim().toLowerCase();
      return normalise(s.command) === normalise(trimmed);
    });

    if (stepIdx >= 0) {
      const step = steps[stepIdx];
      newHistory.push({ output: step.output, type: "output" });
      if (!completedSteps.has(stepIdx)) {
        const next = new Set(completedSteps);
        next.add(stepIdx);
        newHistory.push({ output: `✓ Step ${stepIdx + 1} complete`, type: "system" });
        setCompletedSteps(next);

        const reqDone = requiredSteps.every((rs) => {
          const ri = steps.indexOf(rs);
          return next.has(ri);
        });

        if (reqDone) {
          newHistory.push({ output: `\n🏁 ${content.completionMessage}`, type: "system" });
        }
      }
    } else {
      newHistory.push({ output: `bash: ${trimmed.split(" ")[0]}: command not found`, type: "error" });
    }

    setHistory(newHistory);
    setInput("");
  };

  const handleSubmit = () => {
    const count = requiredSteps.filter((rs) => completedSteps.has(steps.indexOf(rs))).length;
    submit.mutate({ commandsCompleted: count }, {
      onSuccess: (res) => {
        setDone(true);
        onComplete?.(res.xp);
        toast({ title: res.correct ? `+${res.xp} XP Earned` : "Partial Credit", description: res.explanation });
      },
    });
  };

  const handleReset = () => {
    setHistory([
      { output: `CYBERLAB TERMINAL v2.4.1 — Secure Shell`, type: "system" },
      { output: `Mission: ${scenario}`, type: "system" },
      { output: `Type commands below. Use HINT to reveal the next step.`, type: "system" },
      { output: "", type: "output" },
    ]);
    setCompletedSteps(new Set());
    setInput("");
    setDone(false);
  };

  const completedRequired = requiredSteps.filter((rs) => completedSteps.has(steps.indexOf(rs))).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground uppercase">
        <span className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          {completedRequired}/{requiredSteps.length} steps completed
        </span>
        <span className="text-primary">+{xp} XP</span>
      </div>

      <div className="w-full bg-muted/30 h-1">
        <div className="h-1 bg-primary transition-all" style={{ width: `${(completedRequired / requiredSteps.length) * 100}%` }} />
      </div>

      <div
        className="bg-[#0a0f0a] border border-border/60 font-mono text-sm text-green-400 p-4 h-80 overflow-y-auto cursor-text rounded-none"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((entry, i) => (
          <div key={i} className="leading-relaxed whitespace-pre-wrap break-all">
            {entry.type === "command" && (
              <div className="flex gap-2">
                <span className="text-cyan-400 shrink-0">{prompt}</span>
                <span className="text-green-300">{entry.input}</span>
              </div>
            )}
            {entry.type === "output" && entry.output && (
              <div className="text-green-400/80 pl-0">{entry.output}</div>
            )}
            {entry.type === "system" && (
              <div className="text-cyan-300/70">{entry.output}</div>
            )}
            {entry.type === "error" && (
              <div className="text-red-400">{entry.output}</div>
            )}
          </div>
        ))}
        {!done && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-cyan-400 shrink-0">{prompt}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCommand(input); }}
              className="flex-1 bg-transparent outline-none text-green-300 caret-green-400 font-mono"
              autoComplete="off"
              spellCheck={false}
              placeholder="type a command..."
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!done && (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border/40 p-2">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          Type <kbd className="px-1 bg-muted border border-border">HINT</kbd> to reveal the next step, or <kbd className="px-1 bg-muted border border-border">CLEAR</kbd> to reset.
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" size="sm" className="rounded-none font-mono uppercase text-xs" onClick={handleReset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
        {!done && (
          <Button
            size="sm"
            className="flex-1 rounded-none font-mono uppercase font-bold tracking-widest"
            onClick={handleSubmit}
            disabled={submit.isPending || completedRequired === 0}
          >
            {submit.isPending ? "Submitting..." : allDone ? <><Trophy className="w-4 h-4 mr-1" /> Complete Module</> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Submit Progress ({completedRequired}/{requiredSteps.length})</>}
          </Button>
        )}
        {done && (
          <div className="flex-1 border border-primary/40 bg-primary/5 text-primary font-mono text-sm flex items-center justify-center gap-2 px-4 py-2">
            <CheckCircle2 className="w-4 h-4" /> Module Completed
          </div>
        )}
      </div>
    </div>
  );
}
