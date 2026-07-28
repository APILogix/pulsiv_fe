import { useState } from "react";
import {
  ActivitySquare,
  BookMarked,
  CheckCircle2,
  FileSearch,
  Gauge,
  ListTree,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { KeyValueGrid, Panel, Pill, Ring, type SurfaceTone } from "@/shared/ui/pulse";
import { EmptyState } from "@/shared/components/EmptyState";
import type { AiAnswer, EvidenceItem, LikelyCause } from "../types";
import { Markdown } from "./Markdown";

function confidenceTone(score: number): SurfaceTone {
  if (score >= 75) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function trustTone(trust: string): SurfaceTone {
  const t = trust.toLowerCase();
  if (t === "confirmed" || t === "high") return "green";
  if (t === "medium") return "amber";
  return "neutral";
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text)]">
          {item.type.replace(/_/g, " ")}
        </span>
        <Pill tone={trustTone(item.trust_level)}>{item.trust_level}</Pill>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text2)]">{item.excerpt_or_summary}</p>
      <div className="mt-2 flex items-center gap-3 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
        <span className="truncate" title={item.identifier}>
          {item.source} · {item.identifier}
        </span>
        <span className="ml-auto shrink-0 tabular-nums">
          relevance {(item.relevance * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function CauseCard({ cause }: { cause: LikelyCause }) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--brand-bg)] font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--brand)]">
            {cause.rank}
          </span>
          <span className="font-semibold text-[var(--text)]">{cause.cause}</span>
        </div>
        <Pill tone={confidenceTone(cause.confidence)}>{cause.confidence}%</Pill>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill tone="neutral">{cause.category}</Pill>
      </div>
      {cause.reasoning && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--text2)]">{cause.reasoning}</p>
      )}
      {cause.recommended_action && (
        <div className="mt-3 rounded-[8px] border border-[var(--brand)]/20 bg-[var(--brand-bg)] px-3 py-2 text-[12.5px] text-[var(--text)]">
          <span className="font-medium text-[var(--brand)]">Recommended: </span>
          {cause.recommended_action}
        </div>
      )}
      {cause.evidence.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {cause.evidence.map((ev) => (
            <EvidenceCard key={`${cause.rank}-${ev.identifier}-${ev.type}`} item={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TimelineEntry {
  at: string;
  label: string;
  detail?: string;
}

function extractTimeline(answer: AiAnswer): TimelineEntry[] {
  const raw = (answer.metadata?.timeline ?? answer.metadata?.event_timeline) as unknown;
  if (!Array.isArray(raw)) return [];
  const entries: TimelineEntry[] = [];
  for (const entry of raw) {
    const e = entry as Record<string, unknown>;
    const label = String(e.label ?? e.event ?? e.description ?? "");
    if (!label) continue;
    const item: TimelineEntry = { at: String(e.at ?? e.timestamp ?? e.time ?? ""), label };
    if (e.detail) item.detail = String(e.detail);
    entries.push(item);
  }
  return entries;
}

const FEEDBACK = { up: "up", down: "down" } as const;

export function InvestigationResult({
  answer,
  onFeedback,
}: {
  answer: AiAnswer;
  onFeedback?: (helpful: boolean) => Promise<void> | void;
}) {
  const [sent, setSent] = useState<null | "up" | "down">(null);
  const timeline = extractTimeline(answer);

  const handleFeedback = async (kind: keyof typeof FEEDBACK) => {
    if (sent) return;
    setSent(kind);
    try {
      await onFeedback?.(kind === "up");
      toast.success("Thanks for the feedback");
    } catch {
      setSent(null);
      toast.error("Couldn't record feedback");
    }
  };

  const meta = answer.metadata ?? {};
  const metaItems = [
    meta.model ? { label: "Model", value: String(meta.model) } : null,
    meta.latency_ms ? { label: "Latency", value: `${Math.round(Number(meta.latency_ms))} ms` } : null,
    answer.credit_action ? { label: "Credits", value: String(answer.credit_action.amount) } : null,
    { label: "Confidence", value: `${answer.confidence_score}%` },
  ].filter((x): x is { label: string; value: string } => x !== null);

  return (
    <div className="flex flex-col gap-4">
      {/* Overview + confidence */}
      <Panel title="Overview" icon={FileSearch} tone="ai">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Ring
              value={answer.confidence_score}
              max={100}
              label={`${answer.confidence_score}%`}
              sublabel="confidence"
              tone={confidenceTone(answer.confidence_score)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium leading-relaxed text-[var(--text)]">
              {answer.plain_language_summary}
            </p>
            {answer.business_impact && (
              <div className="mt-3 rounded-[8px] bg-[var(--bg2)] px-3 py-2 text-[13px] text-[var(--text2)]">
                <span className="font-medium text-[var(--text)]">Business impact: </span>
                {answer.business_impact}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {answer.safety_warnings.length > 0 && (
        <Panel title="Safety warnings" icon={ShieldAlert} tone="amber">
          <ul className="flex flex-col gap-1.5">
            {answer.safety_warnings.map((w, i) => (
              <li key={`sw-${i}`} className="text-[13px] text-[var(--amber)]">
                {w}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Root cause */}
      <Panel title="Root cause" icon={ActivitySquare} tone="ai">
        {answer.likely_causes.length === 0 ? (
          <EmptyState message="No probable causes were identified with sufficient confidence." />
        ) : (
          <div className="flex flex-col gap-3">
            {answer.likely_causes
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((cause) => (
                <CauseCard key={`cause-${cause.rank}`} cause={cause} />
              ))}
          </div>
        )}
      </Panel>

      {/* Technical analysis */}
      {answer.technical_analysis && (
        <Panel title="Technical analysis" icon={FileSearch}>
          <Markdown content={answer.technical_analysis} />
        </Panel>
      )}

      {/* Evidence */}
      <Panel title="Evidence" icon={ListTree}>
        {answer.evidence.length === 0 ? (
          <EmptyState message="No supporting evidence was attached to this analysis." />
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {answer.evidence.map((ev, i) => (
              <EvidenceCard key={`ev-${i}-${ev.identifier}`} item={ev} />
            ))}
          </div>
        )}
      </Panel>

      {/* Timeline */}
      <Panel title="Timeline" icon={ActivitySquare}>
        {timeline.length === 0 ? (
          <EmptyState message="No timeline data was returned for this investigation." />
        ) : (
          <ol className="relative ml-2 flex flex-col gap-4 border-l border-[var(--border)] pl-5">
            {timeline.map((entry, i) => (
              <li key={`tl-${i}`} className="relative">
                <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-[var(--brand)] ring-4 ring-[var(--bg1)]" />
                <div className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{entry.at}</div>
                <div className="text-[13px] font-medium text-[var(--text)]">{entry.label}</div>
                {entry.detail && <div className="text-[12.5px] text-[var(--text2)]">{entry.detail}</div>}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {/* Suggested fixes */}
      <Panel title="Suggested fixes" icon={Wrench} tone="green">
        {answer.suggested_fixes.length === 0 &&
        answer.verification_steps.length === 0 &&
        answer.prevention_recommendations.length === 0 ? (
          <EmptyState message="No fixes were suggested for this analysis." />
        ) : (
          <div className="flex flex-col gap-4">
            {answer.suggested_fixes.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                  Fixes
                </h4>
                <ol className="flex flex-col gap-2">
                  {answer.suggested_fixes.map((fix, i) => (
                    <li key={`fix-${i}`} className="flex gap-2 text-[13px] text-[var(--text2)]">
                      <span className="font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--green)]">
                        {i + 1}.
                      </span>
                      <Markdown content={fix} className="text-[var(--text2)]" />
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {answer.verification_steps.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                  Verify
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {answer.verification_steps.map((step, i) => (
                    <li key={`vs-${i}`} className="flex items-start gap-2 text-[13px] text-[var(--text2)]">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--green)]" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {answer.prevention_recommendations.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                  Prevent
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {answer.prevention_recommendations.map((rec, i) => (
                    <li key={`pr-${i}`} className="text-[13px] text-[var(--text2)]">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Related resources */}
      <Panel title="Related resources" icon={BookMarked}>
        {answer.citations.length === 0 ? (
          <EmptyState message="No related resources were cited." />
        ) : (
          <ul className="flex flex-col gap-2">
            {answer.citations.map((c, i) => (
              <li
                key={`cite-${i}-${c.source_id}`}
                className="flex items-start gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3"
              >
                <BookMarked className="mt-0.5 size-4 shrink-0 text-[var(--text3)]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[var(--text)]">{c.title}</span>
                    <Pill tone="neutral">{c.source_type}</Pill>
                  </div>
                  {c.why_cited && <p className="mt-0.5 text-[12px] text-[var(--text2)]">{c.why_cited}</p>}
                  <p className="mt-0.5 truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                    {c.url_or_reference}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {answer.missing_data.length > 0 && (
        <Panel title="Missing data" icon={FileSearch}>
          <p className="mb-2 text-[12.5px] text-[var(--text2)]">
            Providing the following would improve the confidence of this analysis:
          </p>
          <ul className="flex flex-col gap-1.5">
            {answer.missing_data.map((m, i) => (
              <li key={`md-${i}`} className="text-[13px] text-[var(--text2)]">
                · {m}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Footer: metadata + feedback */}
      <Panel title="Analysis details" icon={Gauge}>
        <KeyValueGrid items={metaItems} columns={2} />
        {onFeedback && (
          <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-4">
            <span className="text-[12.5px] text-[var(--text2)]">Was this analysis helpful?</span>
            <button
              type="button"
              onClick={() => handleFeedback(FEEDBACK.up)}
              disabled={sent !== null}
              className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)] disabled:opacity-50 aria-pressed:border-[var(--green)] aria-pressed:text-[var(--green)]"
              aria-pressed={sent === "up"}
            >
              <ThumbsUp className="size-3.5" /> Yes
            </button>
            <button
              type="button"
              onClick={() => handleFeedback(FEEDBACK.down)}
              disabled={sent !== null}
              className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--red)] hover:text-[var(--red)] disabled:opacity-50 aria-pressed:border-[var(--red)] aria-pressed:text-[var(--red)]"
              aria-pressed={sent === "down"}
            >
              <ThumbsDown className="size-3.5" /> No
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
