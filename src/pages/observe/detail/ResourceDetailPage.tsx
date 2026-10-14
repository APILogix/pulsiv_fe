import { useState } from "react";
import { Link } from "react-router";
import { BarChart3, GitBranch } from "lucide-react";
import {
  CodeBlock, DetailHeader, DetailNotFound, DetailPage, DetailSkeleton, EmptyNote, EnvironmentBadge,
  Panel, ReadoutBand, SectionTabs, SeverityBadge, SignalHistogram, StatusBadge, Timestamp,
  formatAbsoluteTime, formatDuration, formatCompact, TRACE_CHIP,
} from "@/shared/observe";
import type { HistogramBar, ReadoutCell } from "@/shared/observe";
import { ghostButtonClass } from "@/shared/observe/form";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";
import { askObservabilityEvent, useObservabilityDetail, type AIIntent, type ObservabilityEventDetail } from "../hooks/useObservabilityApi";
import {
  COMMON_FIELDS, DETAIL_RESOURCES, RESOURCE_FIELDS, arrayValue, asRecord, detailId, hasValue, numberValue, pick, stringValue,
  type DetailResource, type JsonRecord,
} from "./detail-contract";
import { AIInvestigationPanel, AttributesPanels, CorrelationList, FieldList, RelatedResources } from "./detail-panels";

const LIST: Record<DetailResource, { label: string; to: string; noun: string }> = {
  errors: { label: "Errors", to: "/observability/errors", noun: "Error" },
  requests: { label: "Requests", to: "/observability/requests", noun: "Request" },
  traces: { label: "Traces", to: "/observability/traces", noun: "Trace" },
  spans: { label: "Traces", to: "/observability/traces", noun: "Span" },
  logs: { label: "Logs", to: "/observability/logs", noun: "Log line" },
  metrics: { label: "Metrics", to: "/observability/metrics", noun: "Metric sample" },
  profiles: { label: "Profiling", to: "/observability/profiling", noun: "Profile" },
  crons: { label: "Cron check-ins", to: "/observability/crons", noun: "Check-in" },
};

const s = (e: JsonRecord, keys: string[]) => stringValue(pick(e, keys));
const n = (e: JsonRecord, keys: string[]) => numberValue(pick(e, keys));
const fmtNum = (v: number | null) => (v === null ? "—" : Math.abs(v) >= 10_000 ? formatCompact(v) : v.toLocaleString(undefined, { maximumFractionDigits: 3 }));

function titleFor(resource: DetailResource, e: JsonRecord): string {
  switch (resource) {
    case "logs": return s(e, ["loggerName", "logger", "name"]) ?? "Log line";
    case "metrics": return s(e, ["metricName", "metric_name"]) ?? "Metric sample";
    case "profiles": return `${s(e, ["profileType", "profile_type"]) ?? "CPU"} profile`;
    case "crons": return s(e, ["monitorSlug", "monitor_slug", "monitorName"]) ?? "Check-in";
    case "spans": return s(e, ["name"]) ?? "Span";
    default: return s(e, ["name", "message"]) ?? LIST[resource].noun;
  }
}

function cellsFor(resource: DetailResource, e: JsonRecord, profile: ProfileSummary | null): ReadoutCell[] {
  const dur = n(e, ["durationMs", "duration_ms"]);
  switch (resource) {
    case "logs":
      return [
        { label: "Level", value: s(e, ["level", "severity"]) ?? "info", tone: /error|fatal/.test(s(e, ["level", "severity"]) ?? "") ? "bad" : /warn/.test(s(e, ["level", "severity"]) ?? "") ? "warn" : "neutral" },
        { label: "Category", value: s(e, ["logCategory", "log_category"]) ?? "—", sub: s(e, ["logSource", "log_source"]) ?? undefined },
        { label: "Status", value: s(e, ["statusCode", "status_code"]) ?? "—", tone: (n(e, ["statusCode"]) ?? 0) >= 500 ? "bad" : (n(e, ["statusCode"]) ?? 0) >= 400 ? "warn" : "neutral" },
        { label: "Duration", value: dur !== null ? formatDuration(dur) : "—" },
        { label: "Service", value: s(e, ["service"]) ?? "—" },
      ];
    case "metrics": {
      const unit = s(e, ["metricUnit", "metric_unit", "unit"]);
      return [
        { label: "Value", value: fmtNum(n(e, ["value"])), sub: unit ?? "no unit" },
        { label: "Type", value: s(e, ["metricType", "metric_type"]) ?? "—", sub: s(e, ["aggregationType"]) ?? undefined },
        { label: "p50", value: fmtNum(n(e, ["p50"])) },
        { label: "p95", value: fmtNum(n(e, ["p95"])) },
        { label: "p99", value: fmtNum(n(e, ["p99"])) },
        { label: "Samples", value: fmtNum(n(e, ["count"])), sub: n(e, ["sum"]) !== null ? `sum ${fmtNum(n(e, ["sum"]))}` : undefined },
      ];
    }
    case "profiles":
      return [
        { label: "Type", value: s(e, ["profileType", "profile_type"]) ?? "—" },
        { label: "Capture window", value: dur !== null ? formatDuration(dur) : "—" },
        { label: "Samples", value: profile ? fmtNum(profile.totalSamples) : "—" },
        { label: "Functions", value: profile ? fmtNum(profile.functions.length) : "—" },
        { label: "Hottest function", value: profile?.functions[0]?.name ?? "—", sub: profile?.functions[0] ? `${profile.functions[0].selfPct.toFixed(1)}% self time` : undefined },
      ];
    case "crons": {
      const status = s(e, ["status"]) ?? "unknown";
      return [
        { label: "Status", value: status.replace(/_/g, " "), tone: status === "ok" ? "good" : status === "in_progress" ? "neutral" : "bad" },
        { label: "Runtime", value: dur !== null ? formatDuration(dur) : "—" },
        { label: "Check-in type", value: s(e, ["checkinType", "checkin_type"]) ?? "—", sub: s(e, ["scheduleType", "schedule_type"]) ?? undefined },
        { label: "Started", value: hasValue(pick(e, ["startedAt", "started_at"])) ? <Timestamp value={pick(e, ["startedAt", "started_at"]) as string} /> : "—" },
        { label: "Finished", value: hasValue(pick(e, ["finishedAt", "finished_at"])) ? <Timestamp value={pick(e, ["finishedAt", "finished_at"]) as string} /> : "—" },
      ];
    }
    case "spans": {
      const self = n(e, ["exclusiveDurationMs", "exclusive_duration_ms"]);
      return [
        { label: "Duration", value: dur !== null ? formatDuration(dur) : "—", tone: (dur ?? 0) >= 1000 ? "bad" : (dur ?? 0) >= 500 ? "warn" : "neutral" },
        { label: "Self time", value: self !== null ? formatDuration(self) : "—", sub: self !== null && dur ? `${((self / dur) * 100).toFixed(0)}% of span` : undefined },
        { label: "Kind", value: s(e, ["spanKind", "span_kind", "kind"]) ?? "—", sub: s(e, ["spanType", "span_type"]) ?? undefined },
        { label: "Status", value: s(e, ["spanStatus", "span_status", "status"]) ?? "—", tone: /error/.test(s(e, ["spanStatus", "status"]) ?? "") ? "bad" : "neutral" },
        { label: "Depth", value: s(e, ["depth"]) ?? "—", sub: "in the span tree" },
      ];
    }
    default:
      return [];
  }
}

// ── Profiles: V8 cpuprofile summary ─────────────────────────

interface ProfileFunction { name: string; file: string; selfSamples: number; selfPct: number }
interface ProfileSummary { totalSamples: number; functions: ProfileFunction[] }

function summarizeProfile(detail: ObservabilityEventDetail): ProfileSummary | null {
  const payload = asRecord(detail.payload) ?? {};
  const profile = asRecord(pick(payload, ["profile", "profileData", "profile_data"])) ?? asRecord(pick(asRecord(detail.attributes) ?? {}, ["profile"]));
  if (!profile) return null;
  const nodes = arrayValue(profile.nodes).map(asRecord).filter((x): x is JsonRecord => x !== null);
  if (nodes.length === 0) return null;
  const counts = new Map<number, number>();
  for (const sample of arrayValue(profile.samples)) {
    const id = typeof sample === "number" ? sample : numberValue(asRecord(sample)?.nodeId ?? asRecord(sample)?.node_id);
    if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const byFn = new Map<string, ProfileFunction>();
  let total = 0;
  for (const node of nodes) {
    const id = numberValue(node.id);
    const hits = numberValue(node.hitCount) ?? (id !== null ? counts.get(id) ?? 0 : 0);
    if (!hits) continue;
    const frame = asRecord(node.callFrame) ?? node;
    const name = stringValue(frame.functionName) || "(anonymous)";
    total += hits;
    const file = [stringValue(frame.url), numberValue(frame.lineNumber) !== null ? Number(frame.lineNumber) + 1 : null].filter(Boolean).join(":");
    const key = `${name}@${file}`;
    const entry = byFn.get(key) ?? { name, file, selfSamples: 0, selfPct: 0 };
    entry.selfSamples += hits;
    byFn.set(key, entry);
  }
  if (total === 0) return null;
  const functions = [...byFn.values()]
    .map((f) => ({ ...f, selfPct: (f.selfSamples / total) * 100 }))
    .sort((a, b) => b.selfSamples - a.selfSamples);
  return { totalSamples: total, functions };
}

function ProfileFunctions({ summary }: { summary: ProfileSummary | null }) {
  if (!summary) {
    return (
      <Panel title="Hot functions">
        <EmptyNote>This profile did not include call-frame data the console can read. Profiles in V8 cpuprofile format (nodes, samples) show a function breakdown here.</EmptyNote>
      </Panel>
    );
  }
  const top = summary.functions.slice(0, 20);
  const max = Math.max(1, ...top.map((f) => f.selfPct));
  return (
    <Panel title="Hot functions" description={`Self time across ${summary.totalSamples.toLocaleString()} samples. Idle and GC frames are listed as the runtime reports them.`} flush>
      <div className="grid grid-cols-[minmax(0,1fr)_200px_72px] gap-4 border-b border-[var(--border)] px-5 py-2.5 text-[12px] font-medium text-[var(--text3)]">
        <span>Function</span><span>Self time</span><span className="text-right">Samples</span>
      </div>
      <ol className="divide-y divide-[var(--border)]">
        {top.map((f) => (
          <li key={`${f.name}@${f.file}`} className="grid grid-cols-[minmax(0,1fr)_200px_72px] items-center gap-4 px-5 py-2">
            <span className="min-w-0">
              <span className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{f.name}</span>
              {f.file && <span className="block truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]" title={f.file}>{f.file}</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true">
                <span className={cn("block h-full rounded-full", f.selfPct >= 20 ? "bg-[var(--amber)]" : "bg-[var(--text2)]")} style={{ width: `${(f.selfPct / max) * 100}%` }} />
              </span>
              <span className="w-12 text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">{f.selfPct.toFixed(1)}%</span>
            </span>
            <span className="text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{f.selfSamples.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// ── Crons: execution + monitor history ──────────────────────

function CronExecution({ entity, detail }: { entity: JsonRecord; detail: ObservabilityEventDetail }) {
  const started = pick(entity, ["startedAt", "started_at"]);
  const finished = pick(entity, ["finishedAt", "finished_at"]);
  const occurred = pick(entity, ["occurredAt", "occurred_at"]);
  const timeline = detail.timeline ?? [];
  const bars: HistogramBar[] = timeline.map((b, i) => {
    const start = new Date(b.bucket).getTime();
    const next = timeline[i + 1] ? new Date(timeline[i + 1].bucket).getTime() : start + 3_600_000;
    return { start, end: next, count: Number(b.count) || 0, errorCount: Number(b.errorCount) || 0 };
  });
  return (
    <>
      <Panel title="Execution" description="When the job started, reported in, and finished.">
        <ol className="grid gap-4 sm:grid-cols-3">
          {[["Started", started], ["Checked in", occurred], ["Finished", finished]].map(([label, value]) => (
            <li key={label as string} className="flex flex-col gap-1 border-t border-[var(--border)] pt-3">
              <span className="text-[12px] text-[var(--text3)]">{label as string}</span>
              <span className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{hasValue(value) ? formatAbsoluteTime(value as string) : "—"}</span>
            </li>
          ))}
        </ol>
      </Panel>
      {bars.length > 1 && (
        <Panel title="Monitor history" description="Every check-in from this monitor around this run, failures in red." flush>
          <SignalHistogram bars={bars} countLabel="Check-ins" errorLabel="Failed" height={72} className="px-5 pb-4 pt-4" />
        </Panel>
      )}
    </>
  );
}

// ── Page ────────────────────────────────────────────────────

type TabId = "details" | "related" | "ai";

export default function ResourceDetailPage({ resource, id }: { resource: DetailResource; id: string }) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const decoded = decodeURIComponent(id);
  const { data: detail, isLoading, error } = useObservabilityDetail<ObservabilityEventDetail>(resource, decoded);
  const [tab, setTab] = useState<TabId>("details");
  const [showRaw, setShowRaw] = useState(false);
  const list = LIST[resource];

  if (isLoading) {
    return (
      <DetailPage>
        <DetailSkeleton />
      </DetailPage>
    );
  }

  const entity = detail?.entity ?? null;
  if (error || !detail || !entity) {
    return <DetailNotFound kind={list.noun} id={decoded} backTo={list.to} backLabel={list.label} />;
  }

  const canonicalId = detailId(detail, decoded);
  const publicId = s(entity, ["publicId", "public_id"]) ?? canonicalId;
  const profile = resource === "profiles" ? summarizeProfile(detail) : null;
  const relatedCount = Object.values(detail.counts ?? {}).reduce((sum, c) => sum + (typeof c === "number" ? c : 0), 0) + (detail.trace ? 1 : 0);
  const traceRef = s(entity, ["tracePublicId", "traceId", "trace_id"]) ?? stringValue(detail.correlations?.traceId);
  const level = s(entity, ["level", "severity"]);
  const status = s(entity, ["status", "spanStatus", "span_status"]);
  const message = s(entity, ["message", "msg"]);
  const statement = s(entity, ["dbStatement", "db_statement"]);
  const metricName = resource === "metrics" ? s(entity, ["metricName", "metric_name"]) : null;

  const crumbs = [
    { label: "Observe", to: "/observability" },
    { label: list.label, to: list.to },
    ...(resource === "spans" && traceRef ? [{ label: traceRef, to: `/observability/traces/${encodeURIComponent(traceRef)}`, mono: true }] : []),
    { label: publicId, mono: true },
  ];

  return (
    <DetailPage>
      <DetailHeader
        crumbs={crumbs}
        copyId={publicId}
        title={<span className={cn(resource !== "profiles" && "font-[family-name:var(--mono)] text-[20px] tracking-[-0.01em]")}>{titleFor(resource, entity)}</span>}
        badges={
          <>
            {level && <SeverityBadge severity={level} />}
            {status && resource !== "logs" && <StatusBadge status={status.toLowerCase()} />}
            {s(entity, ["environment"]) && <EnvironmentBadge environment={s(entity, ["environment"])} />}
            {traceRef && resource !== "spans" && (
              <Link to={`/observability/traces/${encodeURIComponent(traceRef)}`} className={TRACE_CHIP}>
                <GitBranch className="size-3" aria-hidden="true" />
                {traceRef.length > 16 ? `${traceRef.slice(0, 16)}…` : traceRef}
              </Link>
            )}
          </>
        }
        meta={[
          hasValue(pick(entity, ["occurredAt", "occurred_at"])) ? { label: "At", value: <span title={formatAbsoluteTime(pick(entity, ["occurredAt"]) as string)}><Timestamp value={pick(entity, ["occurredAt", "occurred_at"]) as string} /></span> } : null,
          s(entity, ["service"]) ? { label: "Service", value: s(entity, ["service"]) } : null,
          s(entity, ["endpoint", "route"]) ? { label: "Endpoint", value: s(entity, ["endpoint", "route"]), mono: true } : null,
          s(entity, ["release"]) ? { label: "Release", value: s(entity, ["release"]), mono: true } : null,
        ]}
        actions={
          <>
            {metricName && (
              <Link to={`/observability/metrics?metric=${encodeURIComponent(metricName)}`} className={ghostButtonClass}>
                <BarChart3 className="size-3.5" aria-hidden="true" />
                Chart this metric
              </Link>
            )}
            {resource === "spans" && traceRef && (
              <Link to={`/observability/traces/${encodeURIComponent(traceRef)}`} className={ghostButtonClass}>
                <GitBranch className="size-3.5" aria-hidden="true" />
                Open waterfall
              </Link>
            )}
          </>
        }
      />

      <ReadoutBand cells={cellsFor(resource, entity, profile)} />

      <SectionTabs<TabId>
        label={`${list.noun} sections`}
        items={[
          { id: "details", label: "Details" },
          { id: "related", label: "Related", count: relatedCount },
          { id: "ai", label: "AI analysis" },
        ]}
        activeId={tab}
        onSelect={setTab}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {tab === "details" && (
            <>
              {resource === "logs" && (
                <Panel title="Message" action={message ? <button type="button" className={ghostButtonClass} onClick={() => navigator.clipboard?.writeText(message)}>Copy</button> : undefined}>
                  {message ? <CodeBlock className="whitespace-pre-wrap break-words">{message}</CodeBlock> : <EmptyNote>This log line has no message text.</EmptyNote>}
                </Panel>
              )}
              {resource === "spans" && statement && (
                <Panel title="Statement" description={s(entity, ["dbSystem", "db_system"]) ?? undefined}>
                  <CodeBlock className="whitespace-pre-wrap break-words">{statement}</CodeBlock>
                </Panel>
              )}
              {resource === "profiles" && <ProfileFunctions summary={profile} />}
              {resource === "crons" && <CronExecution entity={entity} detail={detail} />}

              <Panel title={resource === "metrics" ? "Values" : "Fields"}>
                {FieldList({ fields: RESOURCE_FIELDS[resource].filter((f) => f.label !== "Message"), entity, columns: 2 }) ?? <EmptyNote>No structured fields were recorded.</EmptyNote>}
              </Panel>

              <AttributesPanels detail={detail} />

              <Panel
                title="Raw event"
                description="The payload as stored, for debugging SDK output."
                action={<button type="button" className={ghostButtonClass} onClick={() => setShowRaw((v) => !v)} aria-expanded={showRaw}>{showRaw ? "Hide" : "Show"}</button>}
              >
                {showRaw ? (
                  <CodeBlock maxHeight={520}>{JSON.stringify(detail.payload ?? entity, null, 2)}</CodeBlock>
                ) : (
                  <p className="text-[12px] text-[var(--text3)]">Hidden. Show it to inspect every field the SDK sent.</p>
                )}
              </Panel>
            </>
          )}
          {tab === "related" && <RelatedResources detail={detail} />}
          {tab === "ai" && (
            <AIInvestigationPanel
              detail={detail}
              resource={resource}
              id={canonicalId}
              ask={(intent: AIIntent, question?: string) => {
                if (!activeOrgId) throw new Error("No active organization.");
                return askObservabilityEvent(activeOrgId, resource, canonicalId, intent, question);
              }}
            />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-14">
          <Panel title="Context">
            {FieldList({ fields: COMMON_FIELDS.filter((f) => !["Organization", "Project", "Tenant", "API key", "Ingested", "Created"].includes(f.label)), entity, columns: 1 }) ?? <EmptyNote>No context fields.</EmptyNote>}
          </Panel>
          <CorrelationList entity={entity} detail={detail} />
        </aside>
      </div>
    </DetailPage>
  );
}

export { DETAIL_RESOURCES };
