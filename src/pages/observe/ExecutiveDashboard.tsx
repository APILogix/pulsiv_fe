import { Link, useNavigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, TimeRangePicker, useTimeRangeParams, useTimeWindow, rangeParams, useSignalTimeline,
  SignalHistogram, ReadoutBand, Panel, EmptyNote, SeverityBadge, Timestamp, StatusBadge,
  formatCompact, formatLatency,
} from "@/shared/observe";
import type { ReadoutCell, TimeWindow } from "@/shared/observe";
import { useEndpointsAnalytics, useServicesAnalytics } from "@/modules/analytics/hooks/useAnalyticsV2";
import type { AnalyticsQueryParams } from "@/modules/analytics/api/analytics-v2.api";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useErrorGroupsList } from "@/modules/error-groups/hooks/useErrorGroups";
import { BarList } from "@/pages/dashboards/widgets";
import { cn } from "@/lib/utils";

function analyticsWindow(w: TimeWindow): AnalyticsQueryParams {
  const bucket: AnalyticsQueryParams["window"] =
    w.ms <= 3_600_000 ? "1m" : w.ms <= 86_400_000 ? "5m" : w.ms <= 7 * 86_400_000 ? "1h" : "1d";
  return { from: w.from.toISOString(), to: w.to.toISOString(), window: bucket };
}

interface SignalRow {
  label: string;
  to: string;
  value: string;
  detail: string;
  tone?: "bad" | "warn" | "good";
  loading: boolean;
}

const TONE: Record<string, string> = {
  bad: "text-[var(--red)]",
  warn: "text-[var(--amber)]",
  good: "text-[var(--green)]",
};

/** One row per Observe signal: what it holds right now, one click to open it. */
function SignalIndex({ rows }: { rows: SignalRow[] }) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map((r) => (
        <li key={r.label}>
          <Link
            to={r.to}
            className="group grid grid-cols-[120px_88px_minmax(0,1fr)_16px] items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
          >
            <span className="text-[13px] text-[var(--text)]">{r.label}</span>
            {r.loading ? (
              <span className="h-4 w-12 animate-pulse rounded-[4px] bg-[var(--bg3)]" />
            ) : (
              <span className="text-right font-[family-name:var(--mono)] text-[14px] tabular-nums text-[var(--text)]">{r.value}</span>
            )}
            <span className={cn("truncate text-[12px]", r.tone ? TONE[r.tone] : "text-[var(--text3)]")}>{r.loading ? "" : r.detail}</span>
            <ArrowUpRight className="size-3.5 text-[var(--text3)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const project = useOrgStore((s) => s.activeProjectSlug) ?? undefined;
  const scope = { project, ...rangeParams(timeRangeState) };
  const overrides = analyticsWindow(window);

  const requests = useObservabilityList<Record<string, unknown>>("requests", { ...scope, limit: 1 });
  const errors = useObservabilityList<Record<string, unknown>>("errors", { ...scope, limit: 1 });
  const traces = useObservabilityList<Record<string, unknown>>("traces", { ...scope, limit: 1 });
  const logs = useObservabilityList<Record<string, unknown>>("logs", { ...scope, limit: 1 });
  const crons = useObservabilityList<Record<string, unknown>>("crons", { ...scope, limit: 1 });
  const replays = useObservabilityList<Record<string, unknown>>("replays", { ...scope, limit: 1 });
  const traffic = useSignalTimeline("requests", scope, window, 72);
  const services = useServicesAnalytics({ ...overrides, limit: 12 });
  const endpoints = useEndpointsAnalytics({ ...overrides, limit: 50 });
  const groups = useErrorGroupsList({
    status: "open", severity: "", isRegression: "", environment: "", release: "", sdkVersion: "", appVersion: "",
    minOccurrences: "", search: "", project, range: scope.range, from: scope.from, to: scope.to,
  });

  const rq = requests.data?.summary ?? {};
  const rs = requests.data?.statistics ?? {};
  const total = Number(rq.total ?? 0);
  const failed = Number(rq.errors ?? 0);
  const errorRate = rs.errorRate != null ? Number(rs.errorRate) : total ? failed / total : 0;
  const es = errors.data?.summary ?? {};
  const errorEvents = Number(es.total ?? 0);
  const users = Number(es.affectedUsers ?? 0);
  const cs = crons.data?.summary ?? {};
  const cronFailed = Number(cs.failed ?? 0);
  const openGroups = groups.groups.length;

  const cells: ReadoutCell[] = [
    { label: "Requests", value: formatCompact(total), sub: `${formatCompact(total / Math.max(1, window.ms / 60_000))} per minute` },
    { label: "Error rate", value: `${(errorRate * 100).toFixed(2)}%`, sub: `${formatCompact(failed)} failed requests`, tone: errorRate >= 0.05 ? "bad" : errorRate >= 0.01 ? "warn" : "good" },
    { label: "p95 latency", value: rs.p95 != null ? formatLatency(Number(rs.p95)) : "—", sub: rs.p50 != null ? `p50 ${formatLatency(Number(rs.p50))}` : undefined, tone: Number(rs.p95 ?? 0) >= 1000 ? "bad" : Number(rs.p95 ?? 0) >= 500 ? "warn" : "neutral" },
    { label: "Error events", value: formatCompact(errorEvents), sub: `${formatCompact(Number(es.uniqueFingerprints ?? 0))} distinct groups`, tone: errorEvents > 0 ? "bad" : "good" },
    { label: "Affected users", value: formatCompact(users), sub: "saw at least one error" },
  ];

  const signals: SignalRow[] = [
    { label: "Requests", to: "/observability/requests", value: formatCompact(total), detail: total ? `${(errorRate * 100).toFixed(2)}% errors · p99 ${rs.p99 != null ? formatLatency(Number(rs.p99)) : "—"}` : "no traffic", tone: errorRate >= 0.05 ? "bad" : undefined, loading: requests.isLoading },
    { label: "Errors", to: "/observability/errors", value: formatCompact(errorEvents), detail: `${formatCompact(Number(es.fatal ?? 0))} fatal`, tone: Number(es.fatal ?? 0) > 0 ? "bad" : undefined, loading: errors.isLoading },
    { label: "Error groups", to: "/observability/error-groups", value: formatCompact(openGroups), detail: "open issues seen in window", tone: openGroups > 0 ? "warn" : undefined, loading: groups.isLoading },
    { label: "Traces", to: "/observability/traces", value: formatCompact(Number(traces.data?.summary?.total ?? 0)), detail: traces.data?.statistics?.p95 != null ? `p95 ${formatLatency(Number(traces.data.statistics.p95))}` : "distributed traces", loading: traces.isLoading },
    { label: "Logs", to: "/observability/logs", value: formatCompact(Number(logs.data?.summary?.total ?? 0)), detail: `${formatCompact(Number(logs.data?.summary?.errorLogs ?? 0))} error lines`, tone: Number(logs.data?.summary?.errorLogs ?? 0) > 0 ? "warn" : undefined, loading: logs.isLoading },
    { label: "Cron check-ins", to: "/observability/crons", value: formatCompact(Number(cs.total ?? 0)), detail: cronFailed ? `${cronFailed} failed` : `${formatCompact(Number(cs.uniqueMonitors ?? 0))} monitors healthy`, tone: cronFailed > 0 ? "bad" : Number(cs.total ?? 0) > 0 ? "good" : undefined, loading: crons.isLoading },
    { label: "Replays", to: "/observability/replay", value: formatCompact(Number(replays.data?.summary?.uniqueSessions ?? 0)), detail: "recorded sessions", loading: replays.isLoading },
  ];

  const serviceRows = services.data?.data?.table?.rows ?? [];
  const slowest = [...(endpoints.data?.data?.table?.rows ?? [])].sort((a, b) => (b.p95Ms ?? 0) - (a.p95Ms ?? 0)).slice(0, 6);
  const topGroups = [...groups.groups]
    .sort((a, b) => Number(b.occurrences?.count ?? b.occurrenceCount ?? 0) - Number(a.occurrences?.count ?? a.occurrenceCount ?? 0))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Overview"
        description="Traffic, failures, and latency across every monitored service, with a jump into each signal."
        actions={<TimeRangePicker />}
      />

      <ReadoutBand cells={cells} loading={requests.isLoading && !requests.data} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
        <Panel title="Traffic" description="Requests per bucket, with the failed share stacked in red." flush>
          <SignalHistogram bars={traffic.bars} loading={traffic.isLoading} height={132} countLabel="Requests" errorLabel="Errors" className="px-5 pb-4 pt-4" />
        </Panel>
        <Panel title="Signals" flush>
          <SignalIndex rows={signals} />
        </Panel>
      </div>

      <Panel title="Services" description="Health per service from the analytics rollups." flush>
        {services.isLoading ? (
          <div className="flex flex-col gap-1.5 p-5">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-8 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}</div>
        ) : serviceRows.length === 0 ? (
          <div className="p-5"><EmptyNote>No service rollups for this window yet. Services appear once requests are ingested and the analytics workers have run.</EmptyNote></div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[minmax(0,1fr)_96px_90px_90px_100px_100px] gap-4 border-b border-[var(--border)] px-5 py-2.5 text-[12px] font-medium text-[var(--text3)]">
                <span>Service</span><span className="text-right">Requests</span><span className="text-right">Errors</span><span className="text-right">p95</span><span className="text-right">Availability</span><span>Status</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {serviceRows.map((s) => {
                  const err = s.errorRatePct ?? 0;
                  const avail = s.availabilityPct;
                  return (
                    <li key={s.service} className="grid grid-cols-[minmax(0,1fr)_96px_90px_90px_100px_100px] items-center gap-4 px-5 py-2.5 text-[12px]">
                      <span className="truncate font-[family-name:var(--mono)] text-[var(--text)]">{s.service}</span>
                      <span className="text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{formatCompact(s.requests)}</span>
                      <span className={cn("text-right font-[family-name:var(--mono)] tabular-nums", err >= 5 ? "text-[var(--red)]" : err >= 1 ? "text-[var(--amber)]" : "text-[var(--text2)]")}>{s.errorRatePct != null ? `${err.toFixed(2)}%` : "—"}</span>
                      <span className={cn("text-right font-[family-name:var(--mono)] tabular-nums", (s.p95Ms ?? 0) >= 1000 ? "text-[var(--red)]" : (s.p95Ms ?? 0) >= 500 ? "text-[var(--amber)]" : "text-[var(--text2)]")}>{s.p95Ms != null ? formatLatency(s.p95Ms) : "—"}</span>
                      <span className={cn("text-right font-[family-name:var(--mono)] tabular-nums", avail == null ? "text-[var(--text3)]" : avail >= 99.9 ? "text-[var(--green)]" : avail >= 99 ? "text-[var(--amber)]" : "text-[var(--red)]")}>{avail != null ? `${avail.toFixed(2)}%` : "—"}</span>
                      <span>{s.status ? <StatusBadge status={s.status} /> : <span className="text-[var(--text3)]">—</span>}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Open issues" description="Most frequent open error groups in the window." action={<Link to="/observability/error-groups" className="text-[12px] text-[var(--text2)] hover:text-[var(--text)]">All groups</Link>} flush>
          {groups.isLoading ? (
            <div className="flex flex-col gap-1.5 p-5">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}</div>
          ) : topGroups.length === 0 ? (
            <div className="p-5"><EmptyNote title="No open issues">No open error group was seen in this window.</EmptyNote></div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {topGroups.map((g) => {
                const id = g.publicId ?? g.id;
                return (
                  <li key={id}>
                    <Link to={`/observability/error-groups/${encodeURIComponent(id)}`} className="grid grid-cols-[76px_minmax(0,1fr)_64px_88px] items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">
                      <SeverityBadge severity={g.severity?.highest ?? g.highestSeverity ?? "error"} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-[var(--text)]">{g.latestEvent?.errorName ?? g.lastErrorName ?? "Error"}</span>
                        <span className="block truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{g.latestEvent?.message ?? g.lastErrorMessage}</span>
                      </span>
                      <span className="text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">{formatCompact(Number(g.occurrences?.count ?? g.occurrenceCount ?? 0))}</span>
                      <span className="text-right"><Timestamp value={g.occurrences?.lastSeenAt ?? g.lastSeenAt} /></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Slowest endpoints" description="Ranked by p95 latency." action={<Link to="/observability/latency" className="text-[12px] text-[var(--text2)] hover:text-[var(--text)]">Latency</Link>}>
          {endpoints.isLoading ? (
            <div className="flex flex-col gap-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-9 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}</div>
          ) : slowest.length === 0 ? (
            <EmptyNote>No endpoint rollups for this window yet.</EmptyNote>
          ) : (
            <BarList
              items={slowest.map((e) => ({
                label: e.endpoint,
                value: e.p95Ms ?? 0,
                sub: `${formatCompact(e.requests)} req`,
                color: (e.p95Ms ?? 0) >= 1000 ? "var(--red)" : (e.p95Ms ?? 0) >= 500 ? "var(--amber)" : "var(--text2)",
                onClick: () => navigate("/observability/latency"),
              }))}
              valueFormat={(v) => formatLatency(v)}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
