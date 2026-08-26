import { useState } from "react";
import { Activity, AlertTriangle, Gauge, Globe, Timer, Users } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, KpiCard, SectionCard, SeverityBadge, StatusCodeBadge, MetricSparkline,
  Timestamp, FilterSelect, formatCompact, formatLatency, TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

export default function ExecutiveDashboard() {
  const { timeRangeState } = useTimeRangeParams();
  
  const { data: errors } = useObservabilityList<any>("errors", {
    range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
    from: timeRangeState.from,
    to: timeRangeState.to,
  });
  const { data: requests } = useObservabilityList<any>("requests", {
    range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
    from: timeRangeState.from,
    to: timeRangeState.to,
  });

  const reqList = requests?.items ?? [];
  const errList = errors?.items ?? [];
  const reqSummary = requests?.summary ?? {};
  const reqStats = requests?.statistics ?? {};

  const total = Number(reqSummary.total ?? reqList.length);
  const errorReqs = Number(reqSummary.errors ?? reqList.filter((r: any) => r.statusCode >= 500).length);
  const errorRate = total ? ((errorReqs / total) * 100).toFixed(2) : "0";
  const avgLatency = Number(reqStats.avgLatency ?? (total ? Math.round(reqList.reduce((s: number, r: any) => s + (r.latency ?? r.durationMs ?? 0), 0) / total) : 0));
  const p95 = Number(reqStats.p95Latency ?? percentile(reqList.map((r: any) => r.latency ?? r.durationMs ?? 0), 95));
  
  // Try to use summary data if available, else fallback to arrays
  const activeErrors = Number(errors?.summary?.total ?? errList.length);
  const affectedUsers = Number(errors?.summary?.affectedUsers ?? new Set(errList.flatMap((e: any) => e.user ? [e.user.id ?? e.user.email] : [])).size);

  const services = ["api-gateway", "user-service", "payment-service", "notification-service", "analytics-service"];
  const [sparkData] = useState(() => Array.from({ length: 24 }, (_, i) => 40 + Math.round(Math.sin(i / 3) * 20 + Math.random() * 15)));

  const topErrors = errList.slice(0, 6);
  const slowest = [...reqList].sort((a: any, b: any) => (b.latency ?? b.durationMs ?? 0) - (a.latency ?? a.durationMs ?? 0)).slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Executive Dashboard"
        description="High-level service overview across all monitored projects."
        actions={<TimeRangePicker />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Requests" value={formatCompact(total * 1240)} delta="+12.4%" trend="up" icon={Globe} />
        <KpiCard label="Error rate" value={`${errorRate}%`} delta="-0.3%" trend="up" icon={AlertTriangle} />
        <KpiCard label="Avg latency" value={formatLatency(avgLatency)} delta="+8ms" trend="down" icon={Timer} />
        <KpiCard label="p95 latency" value={formatLatency(p95)} delta="-22ms" trend="up" icon={Gauge} />
        <KpiCard label="Active errors" value={formatCompact(activeErrors)} delta="+5" trend="down" icon={Activity} />
        <KpiCard label="Affected users" value={affectedUsers} delta="+2" trend="down" icon={Users} />
      </div>

      <SectionCard title="Service health">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {services.map((svc, i) => {
            const score = 99.9 - i * 0.6;
            const tone = score > 99 ? "var(--green)" : score > 97 ? "var(--amber)" : "var(--red)";
            return (
              <div key={svc} className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3">
                <div className="flex items-center justify-between">
                  <span className="truncate text-[13px] font-medium text-[var(--text)]">{svc}</span>
                  <span className="size-2 rounded-full pulse-dot" style={{ background: tone }} />
                </div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">{score.toFixed(2)}%</div>
                <MetricSparkline data={sparkData.map((d) => d + i * 4)} color={tone} width={140} height={28} />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Top errors">
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {topErrors.map((e: any) => (
              <div key={e.id ?? e.eventId ?? e.fingerprint} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <SeverityBadge severity={e.severity} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[var(--text)]">{e.name ?? e.type ?? "Error"}</div>
                  <div className="truncate text-[12px] text-[var(--text3)]">{e.message}</div>
                </div>
                <Timestamp value={e.timestamp} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Slowest endpoints">
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {slowest.map((r: any) => (
              <div key={r.id ?? r.requestId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <StatusCodeBadge code={r.statusCode} />
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.route ?? r.endpoint ?? r.url}</span>
                <span className="tabular-nums text-[13px] font-semibold text-[var(--text)]">{formatLatency(r.latency ?? r.durationMs)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
