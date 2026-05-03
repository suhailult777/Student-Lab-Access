import { useState } from "react";
import { Flag, Lightbulb, CheckCircle2, XCircle, Trophy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitModule } from "@/hooks/useModules";
import { useToast } from "@/hooks/use-toast";

type SimInterface = {
  type: string;
  [key: string]: any;
};

type Props = {
  moduleId: number;
  xp: number;
  content: {
    scenario: string;
    simulatedInterface: SimInterface;
    hints: string[];
    flag: string;
  };
  progress?: { status: string; score: number | null };
  onComplete?: (xp: number) => void;
};

function LoginFormSim({ data }: { data: any }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = () => {
    if (pass.includes("'") || pass.toLowerCase().includes("or") || user.includes("'")) {
      setResult(data.response_on_bypass);
    } else {
      setResult(data.response_on_fail);
    }
  };

  return (
    <div className="border border-border bg-background p-5 font-mono space-y-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
        {data.action}
      </div>
      <input
        placeholder="username"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        className="w-full bg-muted/30 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
      />
      <input
        placeholder="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        className="w-full bg-muted/30 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
      />
      <button onClick={handleSubmit} className="w-full bg-primary/20 border border-primary/40 text-primary py-2 text-sm uppercase tracking-wider hover:bg-primary/30 transition-colors">
        Submit
      </button>
      {result && (
        <div className={`p-3 text-sm border ${result.includes("FLAG") ? "border-primary/40 bg-primary/5 text-primary" : "border-red-500/40 bg-red-500/5 text-red-400"}`}>
          {result}
        </div>
      )}
    </div>
  );
}

function PcapViewer({ data }: { data: any }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="border border-border bg-background font-mono text-xs overflow-x-auto">
      <div className="flex bg-muted/50 border-b border-border px-3 py-1.5 text-muted-foreground gap-4 uppercase text-[10px] tracking-wider">
        <span className="w-8">No.</span><span className="w-20">Time</span><span className="w-28">Source</span><span className="w-28">Dest</span><span className="w-16">Proto</span><span>Info</span>
      </div>
      {data.packets.map((p: any) => (
        <div
          key={p.no}
          onClick={() => setSelected(selected === p.no ? null : p.no)}
          className={`flex px-3 py-1.5 gap-4 cursor-pointer border-b border-border/40 transition-colors ${selected === p.no ? "bg-primary/10 text-primary" : "hover:bg-muted/30"}`}
        >
          <span className="w-8 text-muted-foreground">{p.no}</span>
          <span className="w-20 text-muted-foreground">{p.time}</span>
          <span className="w-28 text-cyan-400">{p.src}</span>
          <span className="w-28 text-green-400">{p.dst}</span>
          <span className="w-16 text-yellow-400">{p.proto}</span>
          <span className={p.info.includes("FLAG") ? "text-primary font-bold" : ""}>{p.info}</span>
        </div>
      ))}
    </div>
  );
}

function ExploitSteps({ data }: { data: any }) {
  const [step, setStep] = useState(0);
  return (
    <div className="border border-border bg-[#0a0f0a] font-mono text-sm p-4 space-y-2">
      <div className="text-cyan-300/70 text-xs mb-3">// Execute each step in sequence</div>
      {data.steps.map((s: any, i: number) => (
        <div key={i} className={`transition-all ${i <= step ? "opacity-100" : "opacity-30"}`}>
          <div className="flex items-start gap-2">
            <span className={`text-xs px-1.5 py-0.5 border shrink-0 ${i < step ? "border-primary/40 text-primary bg-primary/10" : i === step ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10" : "border-border/40 text-muted-foreground"}`}>
              {i < step ? "✓" : i === step ? "→" : String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1">
              <code className="text-green-300">{s.cmd}</code>
              {i <= step && <p className="text-muted-foreground text-xs mt-0.5">{s.desc}</p>}
            </div>
          </div>
          {i === data.steps.length - 1 && i <= step && (
            <div className="mt-2 p-2 border border-primary/40 bg-primary/5 text-primary text-sm">
              $ {data.final_output}
            </div>
          )}
        </div>
      ))}
      {step < data.steps.length && (
        <button
          onClick={() => setStep(Math.min(step + 1, data.steps.length))}
          className="mt-3 w-full border border-primary/40 text-primary py-1.5 text-xs uppercase tracking-wider hover:bg-primary/10 transition-colors"
        >
          {step === data.steps.length - 1 ? "Execute Final Step" : `Execute Step ${step + 1}`}
        </button>
      )}
    </div>
  );
}

function DecoderSim({ data }: { data: any }) {
  const [revealed, setRevealed] = useState(0);
  return (
    <div className="border border-border bg-background font-mono text-xs p-4 space-y-3">
      <div className="text-muted-foreground mb-2">{data.instruction}</div>
      {data.layers.slice(0, revealed + 1).map((layer: any, i: number) => (
        <div key={i} className={`p-3 border ${i === revealed ? "border-primary/40 bg-primary/5" : "border-border/40 bg-muted/20"}`}>
          <div className="text-muted-foreground text-[10px] uppercase mb-1">{layer.encoding}</div>
          <div className="text-green-400 break-all">{layer.value}</div>
          {layer.decoded && i < revealed && <div className="text-primary mt-1">→ {layer.decoded}</div>}
        </div>
      ))}
      {revealed < data.layers.length - 1 && (
        <button onClick={() => setRevealed(revealed + 1)} className="w-full border border-primary/40 text-primary py-1.5 text-xs uppercase hover:bg-primary/10 transition-colors">
          Decode Next Layer
        </button>
      )}
    </div>
  );
}

function renderInterface(sim: SimInterface) {
  if (sim.type === "login-form") return <LoginFormSim data={sim} />;
  if (sim.type === "pcap-viewer") return <PcapViewer data={sim} />;
  if (sim.type === "exploit-steps") return <ExploitSteps data={sim} />;
  if (sim.type === "decoder") return <DecoderSim data={sim} />;
  if (sim.type === "hex-viewer") return (
    <div className="border border-border bg-[#0a0f0a] font-mono text-xs p-4 text-green-400 whitespace-pre-wrap">{sim.content}</div>
  );
  return <pre className="border border-border bg-muted p-3 text-xs overflow-auto">{JSON.stringify(sim, null, 2)}</pre>;
}

export function FlagModule({ moduleId, xp, content, progress, onComplete }: Props) {
  const { scenario, simulatedInterface, hints } = content;
  const [flag, setFlag] = useState("");
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [result, setResult] = useState<{ correct: boolean; msg: string } | null>(
    progress?.status === "completed" ? { correct: true, msg: "Already completed!" } : null
  );
  const submit = useSubmitModule(moduleId);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!flag.trim()) return;
    submit.mutate({ answer: flag.trim() }, {
      onSuccess: (res) => {
        setResult({ correct: res.correct, msg: res.explanation });
        if (res.correct) {
          onComplete?.(res.xp);
          toast({ title: `+${res.xp} XP Earned`, description: "Flag accepted!" });
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground uppercase">
        <span className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-primary" /> Find & Submit the Flag</span>
        <span className="text-primary">+{xp} XP</span>
      </div>

      <div className="border border-border/50 bg-muted/10 p-4 font-mono text-sm text-muted-foreground">
        {scenario}
      </div>

      {renderInterface(simulatedInterface)}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground uppercase">Hints ({hintsRevealed}/{hints.length} revealed)</span>
          {hintsRevealed < hints.length && (
            <button
              onClick={() => setHintsRevealed(hintsRevealed + 1)}
              className="flex items-center gap-1 text-xs font-mono text-yellow-400 hover:text-yellow-300 transition-colors uppercase"
            >
              <Lightbulb className="w-3.5 h-3.5" /> Reveal Hint
            </button>
          )}
        </div>
        {hints.slice(0, hintsRevealed).map((h, i) => (
          <div key={i} className="border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 font-mono text-xs text-yellow-400 flex items-start gap-2">
            <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Hint {i + 1}: {h}</span>
          </div>
        ))}
      </div>

      {result ? (
        <div className={`border p-4 font-mono text-sm flex items-start gap-3 ${result.correct ? "border-primary/40 bg-primary/5 text-primary" : "border-red-500/40 bg-red-500/5 text-red-400"}`}>
          {result.correct ? <Trophy className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <div>
            <p className="font-bold uppercase tracking-wider">{result.correct ? "Flag Accepted!" : "Incorrect Flag"}</p>
            <p className="text-xs mt-1 opacity-80">{result.msg}</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="FLAG{...}"
            className="flex-1 bg-background border border-border text-foreground font-mono px-4 py-2.5 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/40"
          />
          <Button className="rounded-none font-mono uppercase tracking-widest" onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "..." : <><CheckCircle2 className="w-4 h-4 mr-1" /> Submit</>}
          </Button>
        </div>
      )}
    </div>
  );
}
