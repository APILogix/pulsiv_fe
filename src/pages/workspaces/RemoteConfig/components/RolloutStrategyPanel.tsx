import { useState } from "react";
import { Percent, ShieldCheck, Play, Pause, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/shared/observe";

interface RolloutStrategyPanelProps {
  environmentName: string;
}

export function RolloutStrategyPanel({ environmentName }: RolloutStrategyPanelProps) {
  const [strategy, setStrategy] = useState<"full" | "percentage" | "canary">("full");
  const [percentage, setPercentage] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  return (
    <SectionCard title="SDK Rollout Strategy & Canary Control">
      <p className="text-[12px] text-[var(--text-secondary)] mb-4">
        Configure safe deployment rules, gradual percentage rollouts, or canary previews for SDK instances connected to this environment.
      </p>
      <div className="flex flex-col gap-5">
        {/* Strategy Selection */}
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setStrategy("full");
              setPercentage(100);
            }}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
              strategy === "full"
                ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-2)] hover:border-[var(--border-default)]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Mode A</span>
              <Zap className="size-3.5 text-[var(--warning)]" />
            </div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">100% Immediate</div>
            <div className="text-[12px] text-[var(--text-tertiary)]">All SDK instances receive updates on next TTL refresh cycle.</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStrategy("percentage");
              setPercentage(25);
            }}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
              strategy === "percentage"
                ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-2)] hover:border-[var(--border-default)]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Mode B</span>
              <Percent className="size-3.5 text-[var(--info)]" />
            </div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">Gradual Percentage</div>
            <div className="text-[12px] text-[var(--text-tertiary)]">Hash-ring based sticky distribution to a percentage of SDKs.</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStrategy("canary");
              setPercentage(10);
            }}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
              strategy === "canary"
                ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-2)] hover:border-[var(--border-default)]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Mode C</span>
              <ShieldCheck className="size-3.5 text-[var(--success)]" />
            </div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">Canary Preview</div>
            <div className="text-[12px] text-[var(--text-tertiary)]">Restrict deployment to explicitly tagged preview/staging instances.</div>
          </button>
        </div>

        {/* Percentage Slider (If Percentage or Canary) */}
        {strategy !== "full" && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-[var(--text-primary)]">Rollout Target Percentage:</span>
              <span className="font-mono font-medium text-[var(--brand)] text-[13px]">{percentage}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="w-full accent-[var(--brand)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] font-mono">
              <span>1% (Canary)</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% (Global)</span>
            </div>
          </div>
        )}

        {/* Status and Pause controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5">
          <div className="flex items-center gap-3">
            <div className={`flex size-8 items-center justify-center rounded-md ${isPaused ? "bg-[var(--warning-muted)] text-[var(--warning)]" : "bg-[var(--success-muted)] text-[var(--success)]"}`}>
              {isPaused ? <Pause className="size-4" /> : <Play className="size-4" />}
            </div>
            <div>
              <div className="text-[13px] font-medium text-[var(--text-primary)]">
                Rollout Engine Status: {isPaused ? "Paused (Holding current version)" : "Active (Distributing updates)"}
              </div>
              <div className="text-[12px] text-[var(--text-tertiary)]">
                Targeting environment: <strong className="text-[var(--text-primary)] font-medium">{environmentName}</strong>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant={isPaused ? "default" : "secondary"}
            onClick={() => setIsPaused(!isPaused)}
            className="h-8 text-[12px]"
          >
            {isPaused ? "Resume Rollout" : "Pause Rollout Engine"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

