import { useState } from "react";
import { Code2, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitModule } from "@/hooks/useModules";
import { useToast } from "@/hooks/use-toast";

type Props = {
  moduleId: number;
  xp: number;
  content: {
    language: string;
    code: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    vulnerableLines?: number[];
  };
  progress?: { status: string; score: number | null };
  onComplete?: (xp: number) => void;
};

function CodeBlock({ code, language, vulnerableLines }: { code: string; language: string; vulnerableLines?: number[] }) {
  const lines = code.split("\n");
  return (
    <div className="border border-border bg-[#0a0f0a] rounded-none overflow-auto">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/20">
        <Code2 className="w-3.5 h-3.5 text-primary" />
        <span className="font-mono text-xs text-muted-foreground uppercase">{language}</span>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono">
        {lines.map((line, i) => {
          const lineNum = i + 1;
          const isVuln = vulnerableLines?.includes(lineNum);
          return (
            <div key={i} className={`flex ${isVuln ? "bg-red-500/10 -mx-4 px-4 border-l-2 border-red-500" : ""}`}>
              <span className="text-muted-foreground/40 select-none w-8 shrink-0 text-right mr-4">{lineNum}</span>
              <span className={isVuln ? "text-red-300" : "text-green-300/90"}>{line || " "}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export function CodeModule({ moduleId, xp, content, progress, onComplete }: Props) {
  const { code, language, question, options, correctIndex, explanation, vulnerableLines } = content;
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(progress?.status === "completed");
  const [wasCorrect, setWasCorrect] = useState(progress?.status === "completed");
  const submit = useSubmitModule(moduleId);
  const { toast } = useToast();

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    submit.mutate({ answer: selected }, {
      onSuccess: (res) => {
        setAnswered(true);
        setWasCorrect(res.correct);
        if (res.correct) {
          onComplete?.(res.xp);
          toast({ title: `+${res.xp} XP Earned`, description: "Vulnerability identified correctly!" });
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground uppercase">
        <span className="flex items-center gap-2"><Code2 className="w-3.5 h-3.5 text-primary" /> Code Analysis</span>
        <span className="text-primary">+{xp} XP</span>
      </div>

      <CodeBlock code={code} language={language} vulnerableLines={answered ? vulnerableLines : undefined} />

      {answered && vulnerableLines && (
        <div className="font-mono text-xs text-red-400/80 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 inline-block" />
          Vulnerable lines highlighted in red: {vulnerableLines.join(", ")}
        </div>
      )}

      <div className="space-y-4">
        <p className="font-mono text-sm font-semibold">{question}</p>
        <div className="space-y-2">
          {options.map((opt, idx) => {
            let cls = "border border-border bg-background hover:bg-muted/40 cursor-pointer";
            if (answered) {
              if (idx === correctIndex) cls = "border border-primary bg-primary/10 text-primary cursor-default";
              else if (idx === selected && idx !== correctIndex) cls = "border border-red-500 bg-red-500/10 text-red-400 cursor-default";
              else cls = "border border-border/40 bg-background/40 text-muted-foreground cursor-default";
            } else if (selected === idx) {
              cls = "border border-primary/60 bg-primary/5 cursor-pointer";
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)} className={`w-full text-left px-4 py-3 font-mono text-sm transition-colors ${cls} flex items-center gap-3`}>
                <span className="shrink-0 w-6 h-6 border border-current flex items-center justify-center text-xs font-bold">
                  {answered && idx === correctIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                   answered && idx === selected && idx !== correctIndex ? <XCircle className="w-3.5 h-3.5" /> :
                   String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div className={`border p-4 font-mono text-sm ${wasCorrect ? "border-primary/40 bg-primary/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
          <div className="flex items-start gap-3">
            {wasCorrect ? <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />}
            <div>
              <p className={`font-bold uppercase tracking-wider text-xs mb-2 ${wasCorrect ? "text-primary" : "text-yellow-400"}`}>
                {wasCorrect ? "Correct!" : `Correct Answer: ${options[correctIndex]}`}
              </p>
              <p className="text-foreground/80 text-xs leading-relaxed">{explanation}</p>
            </div>
          </div>
        </div>
      )}

      {!answered && (
        <Button
          className="w-full rounded-none font-mono uppercase font-bold tracking-widest"
          onClick={handleSubmit}
          disabled={selected === null || submit.isPending}
        >
          {submit.isPending ? "Checking..." : "Submit Answer"}
        </Button>
      )}
    </div>
  );
}
