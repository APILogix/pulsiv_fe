// Panels for the generic detail page (logs, metrics, profiles, crons, spans).
import { useState } from "react";
import { Activity, Bug, Clock3, Gauge, GitBranch, Globe, ScrollText, Sparkles, Waypoints } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import {
  CopyButton, EmptyNote, KeyValueList, Panel, Timestamp, formatAbsoluteTime, formatBytes, formatDuration, formatLatency,
} from "@/shared/observe";
import type { KeyValueItem } from "@/shared/observe";
import { aiButtonClass } from "@/shared/observe/form";
import {
  CORRELATION_FIELDS, type FieldDescriptor, type JsonRecord, type DetailResource,
  arrayValue, asRecord, booleanValue, hasValue, labelize, numberValue, pick, stringValue,
} from "./detail-contract";
import { AiAnalysisBody, PairTable, toPairs } from "../components/detail-kit";
import type { AIIntent, ObservabilityEventDetail } from "../hooks/useObservabilityApi";

/** Resolve dotted keys such as `trace.publicId` as well as flat ones. */
export function pickDeep(entity: JsonRecord | null | undefined, keys: readonly string[]): unknown {
  if (!entity) return undefined;
  for (const key of keys) {
    const value = key.includes(".")
      ? key.split(".").reduce<unknown>((acc, part) => (asRecord(acc) ? (acc as JsonRecord)[part] : undefined), entity)
      : entity[key];
    if (hasValue(value)) return value;
  }
  return undefined;
}

export function renderFieldValue(value: unknown, kind: FieldDescriptor["kind"] = "text"): React.ReactNode {
  if (!hasValue(value)) return null;
  if (kind === "boolean") return booleanValue(value) ? "Yes" : "No";
  if (kind === "date") return <span title={formatAbsoluteTime(value as string)}>{formatAbsoluteTime(value as string)}</span>;
  const n = numberValue(value);
  if (kind === "duration" && n !== null) return formatDuration(n);
  if (kind === "bytes" && n !== null) return formatBytes(n);
  if (kind === "number" && n !== null) return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} items` : `${Object.keys(value as object).length} attributes`;
  return String(value);
}

/** Field descriptors rendered as label-left rows, empty ones hidden. */
export function FieldList({ fields, entity, columns = 2 }: { fields: readonly FieldDescriptor[]; entity: JsonRecord; columns?: 1 | 2 | 3 }) {
  const items: KeyValueItem[] = fields
    .filter((f) => !f.sensitive)
    .map((f) => {
      const raw = pickDeep(entity, f.keys);
      const text = hasValue(raw) && typeof raw !== "object" ? String(raw) : undefined;
      return {
        label: f.label,
        value: renderFieldValue(raw, f.kind),
        mono: f.kind === "id" || f.kind === "number" || f.kind === "duration" || f.kind === "bytes",
        copyable: f.kind === "id",
        text,
      };
    });
  const list = <KeyValueList items={items} columns={columns} hideEmpty />;
  return items.some((i) => i.value !== null && i.value !== undefined) ? list : null;
}

// ── Correlations sidebar ────────────────────────────────────

function correlationTarget(label: string, value: string, traceHint?: string | null): string | null {
  const v = encodeURIComponent(value);
  if (label === "Trace" || label === "Trace ID") return `/observability/traces/${v}`;
  if (label === "Request ID") return `/observability/requests/${v}`;
  if (label === "Error group") return `/observability/error-groups/${v}`;
  if ((label === "Span ID" || label === "Parent span") && traceHint) return `/observability/traces/${encodeURIComponent(traceHint)}/spans/${v}`;
  return null;
}

export function CorrelationList({ entity, detail }: { entity: JsonRecord; detail: ObservabilityEventDetail }) {
  const merged = { ...entity, ...(detail.correlations ?? {}) } as JsonRecord;
  const traceHint = stringValue(pickDeep(merged, ["tracePublicId", "traceId", "trace_id"]));
  const seen = new Set<string>();
  const rows = CORRELATION_FIELDS
    .map((f) => ({ label: f.label, value: stringValue(pickDeep(merged, f.keys)) }))
    .filter((r): r is { label: string; value: string } => {
      if (!r.value || seen.has(r.value)) return false;
      seen.add(r.value);
      return true;
    });
  if (rows.length === 0) return null;
  return (
    <Panel title="Correlation keys" flush>
      <ul className="divide-y divide-[var(--border)]">
        {rows.map((r) => {
          const to = correlationTarget(r.label, r.value, traceHint);
          return (
            <li key={r.label} className="group flex items-center gap-3 px-4 py-2.5">
              <span className="w-24 shrink-0 text-[12px] text-[var(--text3)]">{r.label}</span>
              {to ? (
                <Link to={to} className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)] underline-offset-2 hover:underline" title={r.value}>{r.value}</Link>
              ) : (
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={r.value}>{r.value}</span>
              )}
              <CopyButton value={r.value} label="" className="h-5 w-5 justify-center border-0 p-0 text-[var(--text3)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ── Related telemetry ───────────────────────────────────────

const RELATED_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  traces: { label: "Trace", icon: GitBranch, tone: "text-[var(--violet)]" },
  relatedErrors: { label: "Errors", icon: Bug, tone: "text-[var(--red)]" },
  relatedRequests: { label: "Requests", icon: Globe, tone: "text-[var(--blue)]" },
  logs: { label: "Logs", icon: ScrollText, tone: "text-[var(--text2)]" },
  spans: { label: "Spans", icon: Waypoints, tone: "text-[var(--violet)]" },
  metrics: { label: "Metrics", icon: Gauge, tone: "text-[var(--blue)]" },
  profiles: { label: "Profiles", icon: Activity, tone: "text-[var(--text2)]" },
  crons: { label: "Cron check-ins", icon: Clock3, tone: "text-[var(--text2)]" },
};

function relatedRoute(kind: string, item: JsonRecord, traceHint: string | null): string | null {
  const id = stringValue(pick(item, ["publicId", "public_id", "id", "eventId", "event_id"]));
  if (!id) return null;
  const v = encodeURIComponent(id);
  switch (kind) {
    case "traces": return `/observability/traces/${v}`;
    case "relatedErrors": return `/observability/errors/${v}`;
    case "relatedRequests": return `/observability/requests/${v}`;
    case "logs": return `/observability/logs/${v}`;
    case "metrics": return `/observability/metrics/${v}`;
    case "profiles": return `/observability/profiling/${v}`;
    case "crons": return `/observability/crons/${v}`;
    case "spans": {
      const trace = stringValue(pick(item, ["tracePublicId", "traceId", "trace_id"])) ?? traceHint;
      return trace ? `/observability/traces/${encodeURIComponent(trace)}/spans/${v}` : null;
    }
    default: return null;
  }
}

export function RelatedResources({ detail }: { detail: ObservabilityEventDetail }) {
  const traceHint = stringValue(detail.correlations?.traceId) ?? null;
  const groups = [
    { kind: "traces", items: detail.trace ? [detail.trace] : [] },
    { kind: "relatedErrors", items: detail.relatedErrors ?? [] },
    { kind: "relatedRequests", items: detail.relatedRequests ?? [] },
    { kind: "logs", items: detail.logs ?? [] },
    { kind: "spans", items: detail.spans ?? [] },
    { kind: "metrics", items: detail.metrics ?? [] },
    { kind: "profiles", items: detail.profiles ?? [] },
    { kind: "crons", items: detail.crons ?? [] },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <EmptyNote title="Nothing correlated">No trace, request, log, or error shares a correlation key with this event within ten minutes of it.</EmptyNote>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const meta = RELATED_META[g.kind];
        const Icon = meta.icon;
        const rows = g.items.map(asRecord).filter((r): r is JsonRecord => r !== null);
        return (
          <Panel key={g.kind} title={<span className="flex items-center gap-2"><Icon className={cn("size-3.5", meta.tone)} aria-hidden="true" />{meta.label} <span className="font-[family-name:var(--mono)] text-[11px] font-normal text-[var(--text3)]">{rows.length}</span></span>} flush>
            <ul className="sidebar-scroll max-h-[360px] divide-y divide-[var(--border)] overflow-y-auto">
              {rows.slice(0, 100).map((item, i) => {
                const to = relatedRoute(g.kind, item, traceHint);
                const title = stringValue(pick(item, ["message", "name", "rootSpanName", "metricName", "monitorSlug", "endpoint", "route"])) ?? "Event";
                const dur = numberValue(pick(item, ["durationMs", "duration_ms"]));
                const level = stringValue(pick(item, ["level", "severity", "status", "spanStatus"]));
                const body = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={title}>{title}</span>
                      <span className="mt-0.5 flex gap-2 text-[11px] text-[var(--text3)]">
                        {level && <span>{level}</span>}
                        {stringValue(pick(item, ["service"])) && <span>{stringValue(pick(item, ["service"]))}</span>}
                      </span>
                    </span>
                    {dur !== null && <span className="shrink-0 font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{formatLatency(dur)}</span>}
                    {hasValue(pick(item, ["occurredAt", "occurred_at"])) && <span className="w-20 shrink-0 text-right"><Timestamp value={pick(item, ["occurredAt", "occurred_at"]) as string} /></span>}
                  </>
                );
                const key = stringValue(pick(item, ["id", "publicId"])) ?? `${g.kind}-${i}`;
                return (
                  <li key={key}>
                    {to ? (
                      <Link to={to} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">{body}</Link>
                    ) : (
                      <div className="flex items-center gap-3 px-5 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

// ── Attributes ──────────────────────────────────────────────

export function AttributesPanels({ detail }: { detail: ObservabilityEventDetail }) {
  const attrs = toPairs(detail.attributes);
  const meta = toPairs(detail.metadata);
  if (attrs.length === 0 && meta.length === 0) return null;
  return (
    <Panel title="Attributes" description="Custom attributes and SDK metadata sent with this event.">
      <div className="grid gap-6 lg:grid-cols-2">
        <PairTable title="Custom attributes" rows={attrs} empty="None attached." />
        <PairTable title="SDK metadata" rows={meta} empty="None attached." />
      </div>
    </Panel>
  );
}

// ── AI ──────────────────────────────────────────────────────

const AI_INTENTS: AIIntent[] = ["explain", "root_cause", "performance", "security", "optimization", "incident_summary", "find_similar"];

export function AIInvestigationPanel({ detail, resource, ask }: {
  detail: ObservabilityEventDetail;
  resource: DetailResource;
  id: string;
  ask: (intent: AIIntent, question?: string) => Promise<unknown>;
}) {
  const available = detail.aiContext?.intents?.filter((v): v is AIIntent => AI_INTENTS.includes(v as AIIntent)) ?? AI_INTENTS;
  const [intent, setIntent] = useState<AIIntent>(available[0] ?? "explain");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = resource === "crons" ? "check-in" : resource.slice(0, -1);

  const run = async (next = intent) => {
    setLoading(true);
    setError(null);
    try {
      setResult(asRecord(await ask(question ? "ask" : next, question || undefined)));
    } catch (cause) {
      setError(cause instanceof Error ? `Analysis failed: ${cause.message}. Try again in a moment.` : "Analysis failed. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const findings = arrayValue(result?.findings).map(String);
  const facts = detail.aiContext?.facts ?? [];

  return (
    <Panel title="AI analysis" description={`Ask the model about this ${noun} with its correlated telemetry as context.`}>
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Question type" className="flex flex-wrap gap-1.5">
          {available.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={intent === value}
              onClick={() => setIntent(value)}
              className={cn(
                "h-7 cursor-pointer rounded-[var(--radius)] border px-2.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-d)]",
                intent === value ? "border-[var(--ai-d)] bg-[var(--ai-bg)] text-[var(--ai)]" : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]",
              )}
            >
              {labelize(value)}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <label className="sr-only" htmlFor="ai-question">Question</label>
          <input
            id="ai-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Optional: ask something specific about this ${noun}`}
            className="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--ai-d)]"
          />
          <button type="submit" className={aiButtonClass} disabled={loading}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            {loading ? "Analyzing…" : "Run"}
          </button>
        </form>
        {error && <p role="alert" className="rounded-[var(--radius)] bg-[var(--red-bg)] px-3 py-2 text-[13px] text-[var(--red)]">{error}</p>}
        {result ? (
          <>
            <AiAnalysisBody
              parsed={{
                summary: stringValue(result.summary) ?? stringValue(result.answer),
                rootCause: stringValue(result.rootCause),
                recommendations: arrayValue(result.recommendations).map(String),
                confidence: numberValue(result.confidence),
              }}
              analyzing={loading}
              onAnalyze={() => void run()}
              subject={noun}
              reads=""
            />
            {findings.length > 0 && (
              <div>
                <h3 className="text-[13px] font-medium text-[var(--text)]">Observations</h3>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-[1.6] text-[var(--text2)]">
                  {findings.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
          </>
        ) : facts.length > 0 ? (
          <div>
            <h3 className="text-[12px] text-[var(--text3)]">Context the model will read</h3>
            <ul className="mt-1.5 flex flex-col gap-1 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
              {facts.slice(0, 8).map((f) => <li key={f} className="truncate" title={f}>{f}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
