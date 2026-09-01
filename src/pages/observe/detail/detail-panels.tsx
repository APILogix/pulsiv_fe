import { useMemo, useState } from "react";
import { Check, CircleAlert, Clock3, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button, CopyButton, EnvironmentBadge, EventTypeBadge, KpiCard, MetricSparkline, SectionCard, SeverityBadge, StatusBadge, Timestamp, formatAbsoluteTime, formatBytes, formatDuration, formatLatency } from "@/shared/observe";
import { VirtualList } from "@/shared/observe/VirtualList";
import { EmptyState } from "./EmptyState";
import { StructuredDataSection } from "./StructuredDataSection";
import { CORRELATION_FIELDS, COMMON_FIELDS, RESOURCE_FIELDS, type DetailResource, type FieldDescriptor, type JsonRecord, arrayValue, asRecord, booleanValue, hasValue, labelize, numberValue, pick, stringValue } from "./detail-contract";
import { resourceConfig } from "./detail-config";
import type { AIIntent, ObservabilityEventDetail } from "../hooks/useObservabilityApi";

function valueFor(entity: JsonRecord, field: FieldDescriptor): unknown {
  return pick(entity, field.keys);
}

function displayFieldValue(value: unknown, kind: FieldDescriptor["kind"] = "text"): string {
  if (!hasValue(value)) return "";
  if (kind === "boolean") return booleanValue(value) ? "Yes" : "No";
  if (kind === "duration") { const number = numberValue(value); return number === null ? String(value) : formatDuration(number); }
  if (kind === "bytes") { const number = numberValue(value); return number === null ? String(value) : formatBytes(number); }
  if (kind === "number") { const number = numberValue(value); return number === null ? String(value) : number.toLocaleString(); }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function renderFieldValue(value: unknown, kind: FieldDescriptor["kind"] = "text"): React.ReactNode {
  if (!hasValue(value)) return null;
  if (kind === "boolean") {
    const bool = booleanValue(value);
    return <span className={cn("inline-flex items-center gap-1.5", bool ? "text-[var(--green)]" : "text-[var(--red)]")}><span className="flex size-4 items-center justify-center rounded-full bg-current/10">{bool ? <Check className="size-3" /> : <CircleAlert className="size-3" />}</span>{bool ? "Yes" : "No"}</span>;
  }
  if (kind === "date") return <Timestamp value={value as string | number} />;
  if (kind === "duration") {
    const number = numberValue(value);
    return number === null ? String(value) : <span title={`${Math.round(number)} ms`}>{formatDuration(number)} <span className="text-[var(--text3)]">({Math.round(number)} ms)</span></span>;
  }
  if (kind === "bytes") {
    const number = numberValue(value);
    return number === null ? String(value) : <span title={`${number} bytes`}>{formatBytes(number)}</span>;
  }
  if (kind === "number") {
    const number = numberValue(value);
    return number === null ? String(value) : <span className="tabular-nums">{number.toLocaleString()}</span>;
  }
  return <span className={cn(kind === "id" && "font-[family-name:var(--mono)] text-[11px]")} title={String(value)}>{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>;
}

export function FieldGrid({ fields, entity, columns = 2 }: { fields: readonly FieldDescriptor[]; entity: JsonRecord; columns?: 1 | 2 | 3 }) {
  const visible = fields.filter((field) => hasValue(valueFor(entity, field)));
  if (visible.length === 0) return null;
  return <div className={cn("grid gap-x-6 gap-y-4", columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2")}>
    {visible.map((field) => {
      const value = valueFor(entity, field);
      return <div key={field.label} className="min-w-0"><div className="mb-1 font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">{field.label}</div><div className="break-words text-[13px] text-[var(--text)]">{renderFieldValue(value, field.kind)}</div>{field.sensitive && <div className="mt-1 text-[10px] text-[var(--text3)]">Sensitive field from telemetry</div>}</div>;
    })}
  </div>;
}

export function OverviewCards({ entity }: { entity: JsonRecord }) {
  const cards = useMemo(() => {
    const candidates: Array<{ label: string; keys: string[]; kind?: FieldDescriptor["kind"]; icon?: React.ComponentProps<typeof KpiCard>["icon"] }> = [
      { label: "Duration", keys: ["durationMs", "duration_ms", "latencyMs", "latency_ms", "totalDurationMs", "total_duration_ms"], kind: "duration", icon: Clock3 },
      { label: "Status code", keys: ["statusCode", "status_code", "httpStatusCode", "http_status_code"], kind: "number" },
      { label: "Status", keys: ["status", "spanStatus", "span_status", "rootSpanStatus", "root_span_status"] },
      { label: "Environment", keys: ["environment"] },
      { label: "Service", keys: ["service"] },
      { label: "Release", keys: ["release"] },
      { label: "SDK version", keys: ["sdkVersion", "sdk_version"] },
      { label: "Occurrences", keys: ["occurrenceCount", "occurrences", "count"], kind: "number" },
      { label: "Spans", keys: ["spanCount", "span_count"], kind: "number" },
      { label: "Value", keys: ["value"], kind: "number" },
      { label: "Profile duration", keys: ["durationMs", "duration_ms"], kind: "duration" },
      { label: "Cron status", keys: ["status"] },
    ];
    return candidates.map((candidate) => ({ ...candidate, value: pick(entity, candidate.keys) })).filter((candidate) => hasValue(candidate.value)).slice(0, 8);
  }, [entity]);
  if (cards.length === 0) return null;
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{cards.map((card) => {
    const text = displayFieldValue(card.value, card.kind);
    return <KpiCard key={card.label} label={card.label} value={text} icon={card.icon} />;
  })}</div>;
}

function targetFor(label: string, value: string): string | null {
  if (label === "Trace" || label === "Trace ID" || label === "Trace Public ID") return `/observability/traces/${encodeURIComponent(value)}`;
  if (label === "Request" || label === "Request ID" || label === "Request Public ID") return `/observability/requests/${encodeURIComponent(value)}`;
  if (label === "Span ID" || label === "Parent span") return `/observability/spans/${encodeURIComponent(value)}`;
  if (label === "Error group" || label === "Error Group Public ID") return `/observability/error-groups/${encodeURIComponent(value)}`;
  if (label === "Error" || label === "Error Public ID") return `/observability/errors/${encodeURIComponent(value)}`;
  return null;
}

export function CorrelationLinks({ entity, detail }: { entity: JsonRecord; detail: ObservabilityEventDetail }) {
  const merged = { ...entity, ...(detail.correlations ?? {}) } as JsonRecord;
  const visible = CORRELATION_FIELDS.map((field) => ({ field, value: stringValue(valueFor(merged, field)) })).filter((item) => item.value);
  if (visible.length === 0) return null;
  return <SectionCard title="Correlations"><div className="grid gap-3 sm:grid-cols-2">{visible.map(({ field, value }) => {
    const target = targetFor(field.label, value!);
    return <div key={field.label} className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius)] bg-[var(--bg2)] px-3 py-2"><div className="min-w-0"><div className="text-[11px] text-[var(--text3)]">{field.label}</div><div className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text)]">{value}</div></div><div className="flex items-center gap-1">{target && <Link to={target} className="rounded p-1 text-[var(--brand)] hover:bg-[var(--brand-bg)]" title={`Open ${field.label}`}><ExternalLink className="size-3.5" /></Link>}<CopyButton value={value!} /></div></div>;
  })}</div></SectionCard>;
}

function relatedRoute(resource: string, item: JsonRecord): string | null {
  const id = stringValue(pick(item, ["publicId", "public_id", "id", "eventId", "event_id", "tracePublicId", "trace_public_id", "traceId", "trace_id", "requestId", "request_id", "spanId", "span_id"]));
  if (!id) return null;
  if (resource === "errorGroups") return `/observability/error-groups/${encodeURIComponent(id)}`;
  const routeResource = resource === "relatedErrors" ? "errors" : resource === "relatedRequests" ? "requests" : resource;
  const pluralResource = routeResource === "trace" ? "traces" : routeResource === "span" ? "spans" : routeResource === "log" ? "logs" : routeResource === "metric" ? "metrics" : routeResource === "profile" ? "profiles" : routeResource === "cron" ? "crons" : routeResource;
  return `/observability/${pluralResource}/${encodeURIComponent(id)}`;
}

function RelatedList({ label, resource, items }: { label: string; resource: string; items: unknown[] }) {
  const rows = items.map(asRecord).filter((item): item is JsonRecord => item !== null);
  if (rows.length === 0) return null;
  return <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]"><div className="border-b border-[var(--border)] px-4 py-3 text-[13px] font-semibold text-[var(--text)]">{label}<span className="ml-2 font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">{rows.length}</span></div><div className="divide-y divide-[var(--border)]">{rows.slice(0, 100).map((item, index) => { const route = relatedRoute(resource, item); const title = stringValue(pick(item, ["message", "name", "rootSpanName", "root_span_name", "metricName", "metric_name", "monitorSlug", "monitor_slug", "endpoint", "route"])) ?? "Related event"; const time = pick(item, ["occurredAt", "occurred_at", "timestamp"]); const dur = numberValue(pick(item, ["durationMs", "duration_ms", "latencyMs", "latency_ms"])); return <div key={stringValue(pick(item, ["id", "eventId", "event_id"])) ?? `${label}-${index}`} className="flex items-center gap-3 px-4 py-2.5"><EventTypeBadge type={resource === "relatedErrors" ? "error" : resource === "relatedRequests" ? "request" : resource === "crons" ? "cron_checkin" : resource.slice(0, -1)} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] text-[var(--text)]">{route ? <Link to={route} className="hover:text-[var(--brand)] hover:underline">{title}</Link> : title}</div><div className="mt-0.5 flex gap-2 font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]"><span>{stringValue(pick(item, ["service"])) ?? ""}</span>{hasValue(time) && <Timestamp value={time as string | number} />}</div></div><span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">{dur !== null ? formatLatency(Math.round(dur)) : ""}</span></div>; })}</div></div>;
}

export function RelatedResources({ detail }: { detail: ObservabilityEventDetail }) {
  const lists = [
    { label: "Related trace", resource: "traces", items: detail.trace ? [detail.trace] : [] },
    { label: "Related errors", resource: "relatedErrors", items: detail.relatedErrors },
    { label: "Related requests", resource: "relatedRequests", items: detail.relatedRequests },
    { label: "Related logs", resource: "logs", items: detail.logs },
    { label: "Related spans", resource: "spans", items: detail.spans },
    { label: "Related metrics", resource: "metrics", items: detail.metrics },
    { label: "Related profiles", resource: "profiles", items: detail.profiles },
    { label: "Related cron check-ins", resource: "crons", items: detail.crons },
  ];
  const visible = lists.filter((item) => item.items.length > 0);
  if (visible.length === 0) return <EmptyState title="No related resources" description="No correlated telemetry was returned for this event window." />;
  return <div className="grid gap-4 xl:grid-cols-2">{visible.map((item) => <RelatedList key={item.resource} {...item} />)}</div>;
}

export function TimelinePanel({ timeline }: { timeline: ObservabilityEventDetail["timeline"] }) {
  const values = timeline.map((bucket) => numberValue(bucket.count) ?? 0);
  if (timeline.length === 0 || values.every((value) => value === 0)) return <EmptyState title="No timeline data" description="This resource does not have a returned occurrence timeline." />;
  const max = Math.max(...values, 1);
  return <SectionCard title="Timeline"><div className="overflow-x-auto"><div className="min-w-[540px]"><MetricSparkline data={values} color="var(--brand)" width={760} height={100} /><div className="mt-2 flex justify-between gap-3 font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]"><span>{formatAbsoluteTime(timeline[0]?.bucket)}</span><span>{formatAbsoluteTime(timeline[timeline.length - 1]?.bucket)}</span></div></div></div><div className="mt-4 flex flex-wrap gap-3 text-[11px] text-[var(--text3)]"><span>Total buckets: {timeline.length}</span><span>Peak: {max.toLocaleString()}</span><span>Errors: {timeline.reduce((sum, bucket) => sum + (numberValue(bucket.errorCount) ?? 0), 0).toLocaleString()}</span></div></SectionCard>;
}

function flattenTree(node: unknown, depth = 0): Array<{ node: JsonRecord; depth: number }> {
  const record = asRecord(node);
  if (!record) return [];
  const children = arrayValue(pick(record, ["children"]));
  return [{ node: record, depth }, ...children.flatMap((child) => flattenTree(child, depth + 1))];
}

export function SpanTreePanel({ detail }: { detail: ObservabilityEventDetail }) {
  const tree = detail.spanTree ?? detail.trace?.spanTree ?? detail.trace?.spans_tree;
  const flat = flattenTree(tree);
  const rows = flat.length > 0 ? flat : detail.spans.map((span) => ({ node: span, depth: numberValue(pick(span, ["depth"])) ?? 0 }));
  if (rows.length === 0) return <EmptyState title="No span tree" description="The trace did not return a span tree or correlated spans." />;
  const renderRow = ({ node, depth }: { node: JsonRecord; depth: number }) => { const duration = numberValue(pick(node, ["durationMs", "duration_ms", "duration"])); const status = stringValue(pick(node, ["status", "spanStatus", "span_status"])); return <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 last:border-0" style={{ paddingLeft: `${16 + depth * 20}px` }}><span className={cn("size-2 rounded-full", status === "error" ? "bg-[var(--red)]" : "bg-[var(--violet)]")} /><div className="min-w-0 flex-1"><div className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{stringValue(pick(node, ["name", "rootSpanName", "root_span_name"])) ?? "Unnamed span"}</div><div className="text-[10px] text-[var(--text3)]">{stringValue(pick(node, ["kind", "spanKind", "span_kind"])) ?? "internal"}</div></div>{duration !== null && <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text2)]">{formatLatency(duration)}</span>}</div>; };
  return <SectionCard title="Span tree"><div className="max-h-[560px] overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]">{rows.length > 100 ? <VirtualList items={rows} rowHeight={58} height={520} getKey={(row, index) => stringValue(pick(row.node, ["spanId", "span_id", "id"])) ?? `span-${index}`} renderRow={renderRow} /> : rows.map((row, index) => <div key={stringValue(pick(row.node, ["spanId", "span_id", "id"])) ?? `span-${index}`}>{renderRow(row)}</div>)}</div></SectionCard>;
}

const AI_INTENTS: AIIntent[] = ["explain", "root_cause", "performance", "security", "optimization", "incident_summary", "find_similar", "ask"];

export function AIInvestigationPanel({ detail, resource, id, ask }: { detail: ObservabilityEventDetail; resource: DetailResource; id: string; ask: (intent: AIIntent, question?: string) => Promise<unknown> }) {
  const [intent, setIntent] = useState<AIIntent>((detail.aiContext?.intents?.[0] as AIIntent) ?? "explain");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = (detail.aiContext?.intents?.filter((value): value is AIIntent => AI_INTENTS.includes(value as AIIntent)) ?? AI_INTENTS);
  const run = async (nextIntent = intent) => { setLoading(true); setError(null); try { const response = await ask(nextIntent, question || undefined); setResult(asRecord(response)); } catch (cause) { setError(cause instanceof Error ? cause.message : "AI investigation failed."); } finally { setLoading(false); } };
  return <SectionCard title="Ask AI" action={<UiBadge variant="ai"><Sparkles className="size-3" /> Investigation</UiBadge>}><div className="flex flex-wrap gap-2">{available.map((value) => <button key={value} type="button" onClick={() => { setIntent(value); void run(value); }} className={cn("rounded-[var(--radius)] border px-2.5 py-1.5 text-[11px] transition-colors", intent === value ? "border-[var(--ai)] bg-[var(--ai-bg)] text-[var(--ai)]" : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:border-[var(--ai)] hover:text-[var(--ai)]")}>{labelize(value)}</button>)}</div><div className="mt-3 flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this event…" className="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 text-[12px] text-[var(--text)] outline-none focus:border-[var(--ai)]" /><Button variant="primary" className="bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90" onClick={() => void run()} disabled={loading}>{loading ? "Investigating…" : "Run"}</Button></div>{error && <div className="mt-3 rounded-[var(--radius)] bg-[var(--red-bg)] p-3 text-[12px] text-[var(--red)]">{error}</div>}{result && <div className="mt-4 rounded-[var(--radius)] border border-[var(--ai)]/25 bg-[var(--ai-bg)]/35 p-4"><div className="flex items-start justify-between gap-3"><div className="text-[13px] leading-relaxed text-[var(--text)]">{stringValue(result.summary) ?? stringValue(result.answer) ?? "No summary returned."}</div><CopyButton value={JSON.stringify(result, null, 2)} label="Copy" /></div>{arrayValue(result.findings).length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] text-[var(--text2)]">{arrayValue(result.findings).map((finding, index) => <li key={index}>{String(finding)}</li>)}</ul>}{stringValue(result.rootCause) && <div className="mt-3 border-t border-[var(--ai)]/20 pt-3 text-[12px] text-[var(--text2)]"><strong className="text-[var(--text)]">Likely root cause:</strong> {String(result.rootCause)}</div>}{arrayValue(result.recommendations).length > 0 && <div className="mt-3 border-t border-[var(--ai)]/20 pt-3 text-[12px] text-[var(--text2)]"><strong className="text-[var(--text)]">Recommendations</strong><ul className="mt-1 list-disc space-y-1 pl-5">{arrayValue(result.recommendations).map((item, index) => <li key={index}>{String(item)}</li>)}</ul></div>}</div>}{!result && detail.aiContext?.facts?.length > 0 && <div className="mt-4 text-[11px] text-[var(--text3)]">Context ready: {detail.aiContext.facts.length} backend facts assembled for {resource} {id.slice(0, 8)}.</div>}</SectionCard>;
}

export function StructuredSections({ detail }: { detail: ObservabilityEventDetail }) {
  return <div className="flex flex-col gap-5"><StructuredDataSection title="Attributes" data={detail.attributes} /><StructuredDataSection title="Metadata" data={detail.metadata} /><StructuredDataSection title="Payload" data={detail.payload} /></div>;
}

export function MetadataSidebar({ resource, entity, detail }: { resource: DetailResource; entity: JsonRecord; detail: ObservabilityEventDetail }) {
  const fields = [...COMMON_FIELDS, ...RESOURCE_FIELDS[resource]].filter((field, index, all) => all.findIndex((candidate) => candidate.label === field.label) === index);
  const hasContext = fields.some((field) => hasValue(valueFor(entity, field)));
  const hasCorrelations = CORRELATION_FIELDS.some((field) => hasValue(valueFor({ ...entity, ...(detail.correlations ?? {}) }, field)));
  if (!hasContext && !hasCorrelations) return null;
  return <aside className="h-fit lg:sticky lg:top-5">{hasContext && <SectionCard title="Event context"><FieldGrid fields={fields} entity={entity} columns={1} /></SectionCard>}{hasCorrelations && <div className="mt-4"><CorrelationLinks entity={entity} detail={detail} /></div>}</aside>;
}

export function InvestigationHeader({ resource, entity, detail, id }: { resource: DetailResource; entity: JsonRecord; detail: ObservabilityEventDetail; id: string }) {
  const config = resourceConfig(resource); const Icon = config.icon; const title = stringValue(pick(entity, resource === "errors" ? ["errorName", "error_name", "name", "message"] : resource === "requests" ? ["endpoint", "url", "route", "name"] : resource === "traces" ? ["rootSpanName", "root_span_name", "name"] : resource === "metrics" ? ["metricName", "metric_name"] : resource === "profiles" ? ["profileType", "profile_type"] : resource === "crons" ? ["monitorName", "monitor_name", "monitorSlug", "monitor_slug"] : ["name", "message"])) ?? config.singular; const subtitle = stringValue(pick(entity, ["message", "description", "endpoint", "route"])); const status = stringValue(pick(entity, ["status", "spanStatus", "span_status", "rootSpanStatus", "root_span_status"])); const severity = stringValue(pick(entity, ["severity", "level"])); const share = async () => { const shareData = { title, text: `${config.singular}: ${title}`, url: window.location.href }; if (navigator.share) await navigator.share(shareData); else await navigator.clipboard.writeText(window.location.href); };
  return <header className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><EventTypeBadge type={resource === "crons" ? "cron_checkin" : resource.slice(0, -1)} /><EnvironmentBadge environment={stringValue(pick(entity, ["environment"]))} />{stringValue(pick(entity, ["service"])) && <UiBadge variant="secondary">{stringValue(pick(entity, ["service"]))}</UiBadge>}{status && <StatusBadge status={status} />}{severity && <SeverityBadge severity={severity} />}</div><div className="flex items-start gap-3"><div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)]" style={{ color: config.accent }}><Icon className="size-5" /></div><div className="min-w-0"><h1 className="break-words font-[family-name:var(--display)] text-[26px] font-semibold tracking-[-0.025em] text-[var(--text)]">{title}</h1>{subtitle && <p className="mt-1 max-w-3xl break-words text-[13px] leading-relaxed text-[var(--text2)]">{subtitle}</p>}<div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text3)]"><span className="font-[family-name:var(--mono)]">{id}</span><CopyButton value={id} label="Copy ID" /><Timestamp value={pick(entity, ["occurredAt", "occurred_at", "timestamp"]) as string | number} /></div></div></div></div><div className="flex flex-wrap items-center gap-2 xl:max-w-sm xl:justify-end"><Button variant="outline" onClick={() => void share()}>Share</Button></div></div></header>;
}
