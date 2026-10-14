import { useState } from "react";
import { Sparkles } from "lucide-react";
import { EmptyNote, Panel } from "@/shared/observe";
import { aiButtonClass } from "@/shared/observe/form";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { askObservabilityEvent, type AIIntent, type ObservabilityAIResult } from "@/pages/observe/hooks/useObservabilityApi";
import { AiAnalysisBody } from "@/pages/observe/components/detail-kit";
import { cn } from "@/lib/utils";
import type { ErrorGroup } from "../types/error-group";

const PROMPTS: { intent: AIIntent; label: string }[] = [
  { intent: "root_cause", label: "Likely root cause" },
  { intent: "explain", label: "Explain the error" },
  { intent: "optimization", label: "Suggest a fix" },
  { intent: "find_similar", label: "Find similar issues" },
];

/** Asks the model about the group's latest event, with its correlated telemetry. */
export function AskAICard({ group }: { group: ErrorGroup }) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const eventId = group.latestEvent?.publicId ?? null;
  const [intent, setIntent] = useState<AIIntent>("root_cause");
  const [result, setResult] = useState<ObservabilityAIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (next: AIIntent) => {
    if (!orgId || !eventId) return;
    setIntent(next);
    setLoading(true);
    setError(null);
    try {
      setResult(await askObservabilityEvent(orgId, "errors", eventId, next));
    } catch (cause) {
      setError(cause instanceof Error ? `Analysis failed: ${cause.message}.` : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="AI analysis" description="Reads the latest event's stack, breadcrumbs, and request, then answers the question you pick.">
      {!eventId ? (
        <EmptyNote>This group has no latest event to analyze yet.</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {PROMPTS.map((p) => (
              <button
                key={p.intent}
                type="button"
                onClick={() => void run(p.intent)}
                disabled={loading}
                aria-pressed={intent === p.intent && result !== null}
                className={cn(
                  "h-8 cursor-pointer rounded-[var(--radius)] border px-3 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-d)] disabled:opacity-60",
                  intent === p.intent && result ? "border-[var(--ai-d)] bg-[var(--ai-bg)] text-[var(--ai)]" : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]",
                )}
              >
                {p.label}
              </button>
            ))}
            {loading && <span className="text-[12px] text-[var(--ai)]">Analyzing…</span>}
          </div>
          {error && <p role="alert" className="rounded-[var(--radius)] bg-[var(--red-bg)] px-3 py-2 text-[13px] text-[var(--red)]">{error}</p>}
          {result ? (
            <AiAnalysisBody
              parsed={{ summary: result.summary, rootCause: result.rootCause, recommendations: result.recommendations ?? [], confidence: result.confidence }}
              analyzing={loading}
              onAnalyze={() => void run(intent)}
              subject="issue"
              reads=""
            />
          ) : (
            !loading && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-[var(--text3)]">Pick a question above, or run the default root-cause pass.</p>
                <button type="button" className={aiButtonClass} onClick={() => void run("root_cause")}>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Analyze issue
                </button>
              </div>
            )
          )}
        </div>
      )}
    </Panel>
  );
}
