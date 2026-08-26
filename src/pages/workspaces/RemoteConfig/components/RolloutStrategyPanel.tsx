import { useState } from "react";
import { Percent, ShieldCheck, Play, Pause, Zap } from "lucide-react";
import { Button, SectionCard } from "@/shared/observe";

interface RolloutStrategyPanelProps {
  environmentName: string;
}

export function RolloutStrategyPanel({ environmentName }: RolloutStrategyPanelProps) {
  const [strategy, setStrategy] = useState<"full" | "percentage" | "canary">("full");
  const [percentage, setPercentage] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  return (
    <SectionCard
      title="SDK Rollout Strategy & Canary Control"
      description="Configure safe deployment rules, gradual percentage rollouts, or canary previews for SDK instances connected to this environment."
    >
      <div className="flex flex-col gap-6 py-2">
        {/* Strategy Selection */}
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setStrategy("full");
              setPercentage(100);
            }}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
              strategy === "full"
                ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-1 ring-[var(--brand)]"
                : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--brand)]/50"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text3)]">Mode A</span>
              <Zap className="size-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-[var(--text)]">100% Immediate</div>
            <div className="text-xs text-[var(--text3)]">All SDK instances receive updates on next TTL refresh cycle.</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStrategy("percentage");
              setPercentage(25);
            }}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
              strategy === "percentage"
                ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-1 ring-[var(--brand)]"
                : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--brand)]/50"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text3)]">Mode B</span>
              <Percent className="size-4 text-sky-400" />
            </div>
            <div className="text-sm font-bold text-[var(--text)]">Gradual Percentage</div>
            <div className="text-xs text-[var(--text3)]">Hash-ring based sticky distribution to a percentage of SDKs.</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStrategy("canary");
              setPercentage(10);
            }}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
              strategy === "canary"
                ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-1 ring-[var(--brand)]"
                : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--brand)]/50"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text3)]">Mode C</span>
              <ShieldCheck className="size-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-[var(--text)]">Canary Preview</div>
            <div className="text-xs text-[var(--text3)]">Restrict deployment to explicitly tagged preview/staging instances.</div>
          </button>
        </div>

        {/* Percentage Slider (If Percentage or Canary) */}
        {strategy !== "full" && (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text)]">Rollout Target Percentage:</span>
              <span className="font-mono font-bold text-[var(--brand)] text-sm">{percentage}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="w-full accent-[var(--brand)] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[var(--text3)] font-mono">
              <span>1% (Canary)</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% (Global)</span>
            </div>
          </div>
        )}

        {/* Status and Pause controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center gap-3">
            <div className={`flex size-9 items-center justify-center rounded-lg ${isPaused ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {isPaused ? <Pause className="size-4" /> : <Play className="size-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text)]">
                Rollout Engine Status: {isPaused ? "Paused (Holding current version)" : "Active (Distributing updates)"}
              </div>
              <div className="text-[11px] text-[var(--text3)]">
                Targeting environment: <strong className="text-[var(--text)]">{environmentName}</strong>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsPaused(!isPaused)}
            className={`h-8 text-xs font-semibold ${isPaused ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}
          >
            {isPaused ? "Resume Rollout" : "Pause Rollout Engine"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
