import { useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitModule } from "@/hooks/useModules";
import { useToast } from "@/hooks/use-toast";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Props = {
  moduleId: number;
  xp: number;
  content: { questions: Question[] };
  progress?: { status: string; score: number | null };
  onComplete?: (xp: number) => void;
};

export function QuizModule({ moduleId, xp, content, progress, onComplete }: Props) {
  const { questions } = content;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [revealed, setRevealed] = useState<boolean[]>(Array(questions.length).fill(false));
  const [done, setDone] = useState(progress?.status === "completed");
  const [finalScore, setFinalScore] = useState<number | null>(progress?.score ?? null);
  const submit = useSubmitModule(moduleId);
  const { toast } = useToast();

  const q = questions[current];
  const isAnswered = revealed[current];
  const sel = selected[current];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    const newSelected = [...selected];
    newSelected[current] = idx;
    setSelected(newSelected);
    const newRevealed = [...revealed];
    newRevealed[current] = true;
    setRevealed(newRevealed);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      const answers = selected.map((s) => s ?? -1);
      submit.mutate({ answer: answers }, {
        onSuccess: (res) => {
          setFinalScore(res.score);
          setDone(true);
          if (res.correct) {
            onComplete?.(res.xp);
            toast({ title: `+${res.xp} XP Earned`, description: res.explanation });
          }
        },
        onError: () => toast({ title: "Submit failed", variant: "destructive" }),
      });
    }
  };

  const handleReset = () => {
    setCurrent(0);
    setSelected(Array(questions.length).fill(null));
    setRevealed(Array(questions.length).fill(false));
    setDone(false);
    setFinalScore(null);
  };

  if (done && finalScore !== null) {
    const correct = questions.filter((_, i) => selected[i] === questions[i].correctIndex).length;
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-3">
          <Trophy className={`w-16 h-16 mx-auto ${finalScore >= 60 ? "text-primary" : "text-yellow-500"} drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]`} />
          <h3 className="text-xl font-mono font-bold uppercase tracking-widest">
            {finalScore >= 60 ? "Module Complete" : "Keep Practicing"}
          </h3>
          <div className="text-4xl font-mono font-bold text-primary">{finalScore}%</div>
          <p className="text-muted-foreground font-mono text-sm">{correct} / {questions.length} correct</p>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const isCorrect = selected[i] === q.correctIndex;
            return (
              <div key={q.id} className={`border p-3 font-mono text-sm ${isCorrect ? "border-primary/30 bg-primary/5" : "border-red-500/30 bg-red-500/5"}`}>
                <div className="flex items-start gap-2">
                  {isCorrect ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-foreground/80">{q.question}</p>
                    {!isCorrect && <p className="text-primary mt-1 text-xs">Correct: {q.options[q.correctIndex]}</p>}
                    <p className="text-muted-foreground text-xs mt-1">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="outline" className="w-full rounded-none font-mono uppercase" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground uppercase">
        <span>Question {current + 1} / {questions.length}</span>
        <span className="text-primary">+{xp} XP</span>
      </div>
      <div className="w-full bg-muted/30 h-1 rounded-none">
        <div className="h-1 bg-primary transition-all" style={{ width: `${((current + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <p className="font-mono text-base font-semibold leading-snug">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          const isSelected = sel === idx;
          const isCorrect = idx === q.correctIndex;
          let cls = "border border-border bg-background hover:bg-muted/40 text-foreground cursor-pointer";
          if (isAnswered) {
            if (isCorrect) cls = "border border-primary bg-primary/10 text-primary cursor-default";
            else if (isSelected) cls = "border border-red-500 bg-red-500/10 text-red-400 cursor-default";
            else cls = "border border-border/40 bg-background/40 text-muted-foreground cursor-default";
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)} className={`w-full text-left px-4 py-3 font-mono text-sm transition-colors ${cls} flex items-center gap-3`}>
              <span className="shrink-0 w-6 h-6 border border-current flex items-center justify-center text-xs font-bold">
                {isAnswered && isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : isAnswered && isSelected && !isCorrect ? <XCircle className="w-3.5 h-3.5" /> : String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {isAnswered && (
        <div className={`border p-4 font-mono text-sm ${sel === q.correctIndex ? "border-primary/40 bg-primary/5 text-primary" : "border-red-500/40 bg-red-500/5 text-red-400"}`}>
          <div className="flex items-start gap-2">
            {sel === q.correctIndex ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <p className="text-foreground/80">{q.explanation}</p>
          </div>
        </div>
      )}
      <Button
        className="w-full rounded-none font-mono uppercase font-bold tracking-widest"
        onClick={handleNext}
        disabled={!isAnswered || submit.isPending}
      >
        {submit.isPending ? "Submitting..." : current < questions.length - 1 ? <><ChevronRight className="w-4 h-4 mr-1" /> Next Question</> : <><Trophy className="w-4 h-4 mr-1" /> Submit Quiz</>}
      </Button>
    </div>
  );
}
