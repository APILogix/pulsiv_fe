import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Sparkles,
  Zap,
  ShieldAlert,
  Search,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, CopyButton } from "@/shared/observe";
import { SectionShell } from "./ui";
import { sectionDomId } from "./helpers";
import type { TraceDetailData } from "./types";
import type { AIIntent } from "../hooks/useObservabilityApi";

const QUICK_INTENTS: Array<{
  id: AIIntent;
  label: string;
  desc: string;
  icon: LucideIcon;
}> = [
  {
    id: "performance",
    label: "Analyze Bottlenecks",
    desc: "Pinpoint longest duration spans & blocking execution paths",
    icon: Zap,
  },
  {
    id: "explain",
    label: "Explain Execution",
    desc: "Narrative breakdown of the span hierarchy and timeline",
    icon: Search,
  },
  {
    id: "security",
    label: "Security & Permissions",
    desc: "Inspect authorization flows, RBAC, and policy evaluations",
    icon: ShieldAlert,
  },
  {
    id: "optimization",
    label: "Optimization Advice",
    desc: "Caching, query batching, and async concurrency ideas",
    icon: Lightbulb,
  },
];

export function AIInvestigationSection({
  detail,
  aiResult,
  analyzing,
  onRunAnalysis,
}: {
  detail: TraceDetailData;
  aiResult: any;
  analyzing: boolean;
  onRunAnalysis: (intent: AIIntent, question?: string) => Promise<void>;
}) {
  const [selectedIntent, setSelectedIntent] = useState<AIIntent>("performance");
  const [customQuestion, setCustomQuestion] = useState("");

  const handleQuickIntent = (intent: AIIntent) => {
    setSelectedIntent(intent);
    void onRunAnalysis(intent, customQuestion || undefined);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onRunAnalysis(selectedIntent, customQuestion || undefined);
  };

  const facts = detail.aiContext?.facts ?? [];

  return (
    <SectionShell
      id={sectionDomId("ai")}
      title="AI Trace Investigation"
      description="Automated root-cause, bottleneck detection, and architectural optimization."
      action={
        aiResult ? (
          <Button
            variant="secondary"
            className="h-8 gap-1.5"
            onClick={() => onRunAnalysis(selectedIntent, customQuestion || undefined)}
            disabled={analyzing}
          >
            <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} />
            {analyzing ? "Re-analyzing…" : "Re-run Analysis"}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        {/* Quick action triggers if no result or below */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_INTENTS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedIntent === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQuickIntent(item.id)}
                disabled={analyzing}
                className={cn(
                  "flex flex-col items-start rounded-[var(--radius)] border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-[var(--ai)] bg-[var(--ai-bg)]/40 shadow-xs"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--ai)]/50 hover:bg-[var(--bg2)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded",
                      isSelected ? "bg-[var(--ai)] text-[var(--ai-fg)]" : "bg-[var(--bg2)] text-[var(--text2)]",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--text)]">
                    {item.label}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--text3)]">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom prompt bar */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Ask a specific question about this trace (e.g. 'Why is evaluateRequiredPermissions taking 11ms?')..."
            className="h-10 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3.5 text-[13px] text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--ai)]"
          />
          <Button
            type="submit"
            variant="primary"
            className="h-10 gap-1.5 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90"
            disabled={analyzing}
          >
            <Sparkles className={cn("size-4", analyzing && "animate-spin")} />
            {analyzing ? "Investigating…" : "Investigate"}
          </Button>
        </form>

        {/* AI Result Card */}
        {aiResult ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--ai)]/30 bg-[var(--ai-bg)]/20 p-5">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--ai)]/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-[var(--ai)] text-[var(--ai-fg)]">
                  <Brain className="size-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--text)]">
                    Investigation Findings
                  </h3>
                  <div className="text-[11px] text-[var(--text3)]">
                    Model: {aiResult.model || "pulse-analyzer"} · Source: {aiResult.source || "ai"}
                  </div>
                </div>
              </div>

              <CopyButton value={JSON.stringify(aiResult, null, 2)} label="Copy Report" />
            </div>

            {/* Summary */}
            {aiResult.summary && (
              <div className="mt-4 text-[13.5px] leading-relaxed text-[var(--text)]">
                {aiResult.summary}
              </div>
            )}

            {/* Root cause / Bottleneck */}
            {aiResult.rootCause && (
              <div className="mt-4 rounded-[var(--radius)] border border-[var(--amber)]/30 bg-[var(--amber-bg)]/30 p-3 text-[12.5px] text-[var(--text)]">
                <strong className="text-[var(--amber)]">Primary Bottleneck / Root Cause:</strong>{" "}
                {aiResult.rootCause}
              </div>
            )}

            {/* Findings list */}
            {Array.isArray(aiResult.findings) && aiResult.findings.length > 0 && (
              <div className="mt-4">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                  Key Observations
                </div>
                <ul className="mt-2 space-y-1.5 pl-4 text-[12.5px] text-[var(--text2)] list-disc">
                  {aiResult.findings.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(aiResult.recommendations) && aiResult.recommendations.length > 0 && (
              <div className="mt-4 border-t border-[var(--ai)]/20 pt-3.5">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                  Recommended Optimizations
                </div>
                <ul className="mt-2 space-y-1.5 pl-4 text-[12.5px] text-[var(--text2)] list-disc">
                  {aiResult.recommendations.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Context facts preview when no AI result has been run yet */
          facts.length > 0 && (
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                <Brain className="size-3.5 text-[var(--text3)]" />
                Trace Context Facts Assembled
              </div>
              <ul className="mt-2 space-y-1 pl-4 text-[12px] text-[var(--text2)] list-disc">
                {facts.map((fact: string, idx: number) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </SectionShell>
  );
}
