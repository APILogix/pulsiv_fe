import { Link } from "react-router";
import {
  PageHeader, TimeRangePicker, useTimeRangeParams, useTimeWindow, ReadoutBand, Panel, EmptyNote, Timestamp, formatCompact,
} from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import { BarList } from "@/pages/dashboards/widgets";
import { useMetricEvents, useMetricSeries, useMetricStats } from "./hooks/usePerformanceApi";
import { TimeSeriesChart } from "./components/TimeSeriesChart";
import { RuntimeNotReporting, formatMs, hasSamples } from "./components/perf";

const GC = "runtime.gc.pause";
const LONG_MS = 100;

type Sample = { id: string; v: number; service?: string; environment?: string; occurredAt?: string };

const BANDS = [
  { label: "Under 5 ms", test: (v: number) => v < 5, color: "var(--green)" },
  { label: "5 – 25 ms", test: (v: number) => v >= 5 && v < 25, color: "var(--text2)" },
  { label: "25 – 100 ms", test: (v: number) => v >= 25 && v < 100, color: "var(--amber)" },
  { label: "100 ms and over", test: (v: number) => v >= 100, color: "var(--red)" },
];

const pauseTone = (v: number | null | undefined) => (v == null ? "neutral" : v >= LONG_MS ? "bad" : v >= 25 ? "warn" : "neutral");

export default function GcMonitoringPage() {
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);

  const pauseMax = useMetricSeries(GC, "max", window);
  const pauseAvg = useMetricSeries(GC, "avg", window);
  const pauseCount = useMetricSeries(GC, "count", window);
  const pauseSum = useMetricSeries(GC, "sum", window);
  const stats = useMetricStats(GC, window);
  const events = useMetricEvents(GC, window);

  const s = stats.data;
  const reporting = hasSamples(s);
  const raw = (events.data?.items ?? []).map((r): Sample => ({ ...r, v: Number(r.value) })).filter((r) => Number.isFinite(r.v));
  const long = raw.filter((r) => r.v >= LONG_MS).sort((a, b) => b.v - a.v);
  const totalPause = s?.avg != null ? s.avg * (s.count ?? 0) : null;
  const perMinute = s?.count ? s.count / Math.max(1, window.ms / 60_000) : 0;
  const pausedShare = totalPause !== null ? (totalPause / window.ms) * 100 : null;

  const cells: ReadoutCell[] = [
    { label: "Collections", value: formatCompact(s?.count ?? 0), sub: `${perMinute.toFixed(1)} per minute` },
    { label: "Pause p50", value: formatMs(s?.p50), sub: s?.avg != null ? `avg ${formatMs(s.avg)}` : undefined },
    { label: "Pause p95", value: formatMs(s?.p95), tone: pauseTone(s?.p95) },
    { label: "Pause p99", value: formatMs(s?.p99), tone: pauseTone(s?.p99) },
    { label: "Longest pause", value: formatMs(s?.max), sub: "stop-the-world", tone: pauseTone(s?.max) },
    {
      label: "Time paused",
      value: totalPause !== null ? formatMs(totalPause) : "—",
      sub: pausedShare !== null ? `${pausedShare < 0.01 ? "<0.01" : pausedShare.toFixed(2)}% of the window` : undefined,
      tone: pausedShare !== null && pausedShare >= 5 ? "bad" : pausedShare !== null && pausedShare >= 1 ? "warn" : "neutral",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="GC monitoring"
        description="V8 garbage collection pauses. Every pause stops JavaScript, so long or frequent collections show up directly as request latency."
        actions={<TimeRangePicker />}
      />

      <ReadoutBand cells={cells} loading={stats.isLoading} />

      {!stats.isLoading && !reporting ? (
        <RuntimeNotReporting what="GC" metrics={[GC]} />
      ) : (
        <>
          <Panel title="Pause duration" description="Longest and average pause per bucket. Pauses above the dashed line are long enough to stall requests.">
            <TimeSeriesChart
              window={window}
              height={220}
              format={(v) => formatMs(v, 0)}
              loading={pauseMax.isLoading}
              threshold={{ value: LONG_MS, label: `Long pause (${LONG_MS} ms)`, color: "var(--red)" }}
              series={[
                { label: "Longest", color: "var(--amber)", points: pauseMax.data ?? [] },
                { label: "Average", color: "var(--text)", points: pauseAvg.data ?? [], area: true },
              ]}
            />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Panel title="Collection pressure" description="Collections per bucket and the total time they paused the process.">
              <div className="flex flex-col gap-6">
                <TimeSeriesChart
                  window={window}
                  height={120}
                  format={(v) => formatCompact(Math.round(v))}
                  loading={pauseCount.isLoading}
                  series={[{ label: "Collections", color: "var(--blue)", points: pauseCount.data ?? [], area: true }]}
                />
                <TimeSeriesChart
                  window={window}
                  height={120}
                  format={(v) => formatMs(v, 0)}
                  loading={pauseSum.isLoading}
                  series={[{ label: "Time paused", color: "var(--violet)", points: pauseSum.data ?? [], area: true }]}
                />
              </div>
            </Panel>

            <Panel title="Pause distribution" description={raw.length ? `Latest ${raw.length} collections by pause length` : undefined}>
              {events.isLoading ? (
                <div className="h-40 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
              ) : raw.length === 0 ? (
                <EmptyNote>No individual collections in this window.</EmptyNote>
              ) : (
                <BarList
                  items={BANDS.map((b) => ({ label: b.label, value: raw.filter((r) => b.test(r.v)).length, color: b.color }))}
                  valueFormat={(v) => `${v} · ${Math.round((v / raw.length) * 100)}%`}
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Long pauses"
            description={`Collections of ${LONG_MS} ms or more among the latest samples. Open one for its GC type and heap before and after.`}
            flush
          >
            {long.length === 0 ? (
              <div className="p-5">
                <EmptyNote>{raw.length ? `None of the latest ${raw.length} collections reached ${LONG_MS} ms.` : "No collections recorded."}</EmptyNote>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {long.slice(0, 12).map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/observability/metrics/${encodeURIComponent(r.id)}`}
                      className="grid grid-cols-[88px_minmax(0,1fr)_110px] items-center gap-4 px-5 py-2.5 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                    >
                      <span className="font-[family-name:var(--mono)] text-[13px] tabular-nums text-[var(--red)]">{formatMs(r.v, 0)}</span>
                      <span className="truncate text-[12px] text-[var(--text2)]">{r.service ?? "unknown service"}{r.environment ? ` · ${r.environment}` : ""}</span>
                      <span className="text-right"><Timestamp value={r.occurredAt} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
