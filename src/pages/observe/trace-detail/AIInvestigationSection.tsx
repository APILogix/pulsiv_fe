import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  Zap,
  ShieldAlert,
  Search,
  RefreshCw,
  Lightbulb,
  Check,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/observe";
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
  const [copied, setCopied] = useState(false);

  const handleQuickIntent = (intent: AIIntent) => {
    setSelectedIntent(intent);
    void onRunAnalysis(intent, customQuestion || undefined);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onRunAnalysis(selectedIntent, customQuestion || undefined);
  };

  const handleCopyFormatted = () => {
    if (!aiResult) return;
    const lines: string[] = [];
    if (aiResult.summary) lines.push(`Summary: ${aiResult.summary}\n`);
    if (aiResult.rootCause) lines.push(`Primary Bottleneck: ${aiResult.rootCause}\n`);
    if (Array.isArray(aiResult.findings) && aiResult.findings.length > 0) {
      lines.push("Observations:");
      aiResult.findings.forEach((f: string) => lines.push(`- ${f}`));
      lines.push("");
    }
    if (Array.isArray(aiResult.recommendations) && aiResult.recommendations.length > 0) {
      lines.push("Recommendations:");
      aiResult.recommendations.forEach((r: string) => lines.push(`- ${r}`));
    }
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const facts = detail.aiContext?.facts ?? [];

  return (
    <SectionShell
      id={sectionDomId("ai")}
      title="AI analysis"
      description="Ask where this trace lost time and what to change."
      action={
        aiResult ? (
          <Button
            variant="secondary"
            className="h-8 gap-1.5"
            onClick={() => onRunAnalysis(selectedIntent, customQuestion || undefined)}
            disabled={analyzing}
          >
            <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} />
            {analyzing ? "Re-analyzing…" : "Run again"}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        {/* Quick action triggers */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
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
                  "flex flex-col items-start rounded-[var(--radius)] border p-4 text-left transition-colors cursor-pointer",
                  isSelected
                    ? "border-[var(--ai)] bg-[var(--ai-bg)]/40  ring-1 ring-[var(--ai)]/30"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--ai)]/50 hover:bg-[var(--bg2)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-[4px]",
                      isSelected ? "bg-[var(--ai)] text-[var(--ai-fg)]" : "bg-[var(--bg2)] text-[var(--text2)]",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--text)]">
                    {item.label}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--text3)]">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom prompt bar */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2.5">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Ask a specific question about this trace (e.g. 'Why did database queries take 120ms?')..."
            className="h-10 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-4 text-[13px] text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--ai)] transition-colors"
          />
          <Button
            type="submit"
            variant="primary"
            className="h-10 gap-2 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90 px-4"
            disabled={analyzing}
          >
            <Sparkles className={cn("size-4", analyzing && "animate-spin")} />
            {analyzing ? "Investigating…" : "Investigate"}
          </Button>
        </form>

        {/* AI Result Card */}
        {aiResult ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--ai)]/30 bg-[var(--ai-bg)]/20 p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ai)]/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-[var(--ai)] text-[var(--ai-fg)]">
                  <Brain className="size-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">
                    Findings
                  </h3>
                  <div className="text-[11.5px] text-[var(--text3)]">
                    Model: {aiResult.model || "pulse-analyzer"} · Telemetry Analyzed
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyFormatted}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg2)] transition-colors cursor-pointer"
              >
                {copied ? <Check className="size-3.5 text-[var(--green)]" /> : <Copy className="size-3.5 text-[var(--text3)]" />}
                {copied ? "Copied" : "Copy report"}
              </button>
            </div>

            {/* Summary */}
            {aiResult.summary && (
              <div className="mt-4 text-[14px] leading-relaxed text-[var(--text)]">
                {aiResult.summary}
              </div>
            )}

            {/* Root cause / Bottleneck */}
            {aiResult.rootCause && (
              <div className="mt-4 rounded-[var(--radius)] border border-[var(--amber)]/30 bg-[var(--amber-bg)]/30 p-4 text-[13px] text-[var(--text)]">
                <div className="text-[12px] font-medium text-[var(--amber)]">
                  Likely cause
                </div>
                <div className="mt-1 font-medium font-[family-name:var(--mono)] leading-relaxed">
                  {aiResult.rootCause}
                </div>
              </div>
            )}

            {/* Findings list */}
            {Array.isArray(aiResult.findings) && aiResult.findings.length > 0 && (
              <div className="mt-5">
                <div className="text-[12px] font-medium text-[var(--text3)]">
                  Observations
                </div>
                <ul className="mt-2 space-y-2 pl-5 text-[13px] text-[var(--text2)] list-disc leading-relaxed">
                  {aiResult.findings.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(aiResult.recommendations) && aiResult.recommendations.length > 0 && (
              <div className="mt-5 border-t border-[var(--ai)]/20 pt-4">
                <div className="text-[12px] font-medium text-[var(--text3)]">
                  Recommendations
                </div>
                <ul className="mt-2 space-y-2 pl-5 text-[13px] text-[var(--text)] list-disc leading-relaxed">
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
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-5">
              <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text3)]">
                <Brain className="size-3.5 text-[var(--ai)]" />
                Trace Context Facts Assembled ({facts.length})
              </div>
              <ul className="mt-3 space-y-1.5 pl-5 text-[12.5px] text-[var(--text2)] list-disc">
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
