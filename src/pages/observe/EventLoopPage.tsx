import { Link } from "react-router";
import {
  PageHeader, TimeRangePicker, useTimeRangeParams, useTimeWindow, ReadoutBand, Panel, EmptyNote, Timestamp,
} from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import { BarList } from "@/pages/dashboards/widgets";
import { useMetricEvents, useMetricSeries, useMetricStats } from "./hooks/usePerformanceApi";
import { TimeSeriesChart } from "./components/TimeSeriesChart";
import { RuntimeNotReporting, formatMs, formatPct, hasSamples, toPct } from "./components/perf";

const LAG = "runtime.eventloop.lag";
const ELU = "runtime.eventloop.utilization";
const BLOCKING_MS = 100;

type Sample = { id: string; v: number; service?: string; environment?: string; occurredAt?: string };

const BANDS = [
  { label: "Under 10 ms", test: (v: number) => v < 10, color: "var(--green)" },
  { label: "10 – 50 ms", test: (v: number) => v >= 10 && v < 50, color: "var(--text2)" },
  { label: "50 – 100 ms", test: (v: number) => v >= 50 && v < 100, color: "var(--amber)" },
  { label: "100 – 500 ms", test: (v: number) => v >= 100 && v < 500, color: "var(--red)" },
  { label: "500 ms and over", test: (v: number) => v >= 500, color: "var(--red)" },
];

const lagTone = (v: number | null | undefined) => (v == null ? "neutral" : v >= BLOCKING_MS ? "bad" : v >= 50 ? "warn" : "good");

export default function EventLoopPage() {
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);

  const lagAvg = useMetricSeries(LAG, "avg", window);
  const lagMax = useMetricSeries(LAG, "max", window);
  const elu = useMetricSeries(ELU, "avg", window);
  const sLag = useMetricStats(LAG, window);
  const sElu = useMetricStats(ELU, window);
  const samples = useMetricEvents(LAG, window);

  const loading = sLag.isLoading || sElu.isLoading;
  const reporting = hasSamples(sLag.data, sElu.data);
  const raw = (samples.data?.items ?? []).map((r): Sample => ({ ...r, v: Number(r.value) })).filter((r) => Number.isFinite(r.v));
  const blocked = raw.filter((r) => r.v >= BLOCKING_MS).length;
  const worst = [...raw].sort((a, b) => b.v - a.v).slice(0, 8);

  const cells: ReadoutCell[] = [
    { label: "Lag p50", value: formatMs(sLag.data?.p50), sub: "typical delay", tone: lagTone(sLag.data?.p50) },
    { label: "Lag p95", value: formatMs(sLag.data?.p95), tone: lagTone(sLag.data?.p95) },
    { label: "Lag p99", value: formatMs(sLag.data?.p99), tone: lagTone(sLag.data?.p99) },
    { label: "Worst stall", value: formatMs(sLag.data?.max), sub: "max single sample", tone: lagTone(sLag.data?.max) },
    {
      label: "Utilization",
      value: formatPct(sElu.data?.avg),
      sub: sElu.data?.max != null ? `peak ${formatPct(sElu.data.max)}` : "time spent busy",
      tone: sElu.data?.avg == null ? "neutral" : toPct(sElu.data.avg) >= 90 ? "bad" : toPct(sElu.data.avg) >= 70 ? "warn" : "neutral",
    },
    { label: "Samples", value: (sLag.data?.count ?? 0).toLocaleString(), sub: raw.length ? `${blocked} of the latest ${raw.length} over ${BLOCKING_MS} ms` : "lag readings" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Event loop"
        description="How long callbacks wait for the Node.js event loop, and how busy the loop is. Sustained lag over 100 ms means synchronous work is blocking requests."
        actions={<TimeRangePicker />}
      />

      <ReadoutBand cells={cells} loading={loading} />

      {!loading && !reporting ? (
        <RuntimeNotReporting what="event loop" metrics={[LAG, ELU]} />
      ) : (
        <>
          <Panel title="Event loop lag" description="Average and worst lag per bucket. Spikes above the dashed line are blocking stalls.">
            <TimeSeriesChart
              window={window}
              height={220}
              format={(v) => formatMs(v, 0)}
              loading={lagAvg.isLoading}
              threshold={{ value: BLOCKING_MS, label: `Blocking (${BLOCKING_MS} ms)`, color: "var(--red)" }}
              series={[
                { label: "Average", color: "var(--text)", points: lagAvg.data ?? [], area: true },
                { label: "Worst", color: "var(--amber)", points: lagMax.data ?? [] },
              ]}
            />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Panel title="Utilization" description="Share of wall time the loop spent running JavaScript rather than idle.">
              <TimeSeriesChart
                window={window}
                yMax={100}
                format={(v) => `${Math.round(v)}%`}
                loading={elu.isLoading}
                threshold={{ value: 90, label: "Saturated (90%)", color: "var(--amber)" }}
                series={[{ label: "Utilization", color: "var(--blue)", points: (elu.data ?? []).map((p) => ({ t: p.t, v: toPct(p.v) })), area: true }]}
              />
            </Panel>

            <Panel title="Lag distribution" description={raw.length ? `Latest ${raw.length} samples by band` : undefined}>
              {samples.isLoading ? (
                <div className="h-40 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
              ) : raw.length === 0 ? (
                <EmptyNote>No individual lag samples in this window.</EmptyNote>
              ) : (
                <BarList
                  items={BANDS.map((b) => ({ label: b.label, value: raw.filter((r) => b.test(r.v)).length, color: b.color }))}
                  valueFormat={(v) => `${v} · ${Math.round((v / raw.length) * 100)}%`}
                />
              )}
            </Panel>
          </div>

          <Panel title="Worst stalls" description="The largest single lag readings in the window. Open one to see the service and the requests around it." flush>
            {worst.length === 0 ? (
              <div className="p-5"><EmptyNote>No stalls recorded.</EmptyNote></div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {worst.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/observability/metrics/${encodeURIComponent(r.id)}`}
                      className="grid grid-cols-[88px_minmax(0,1fr)_110px] items-center gap-4 px-5 py-2.5 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                    >
                      <span className={`font-[family-name:var(--mono)] text-[13px] tabular-nums ${r.v >= BLOCKING_MS ? "text-[var(--red)]" : r.v >= 50 ? "text-[var(--amber)]" : "text-[var(--text)]"}`}>
                        {formatMs(r.v, 0)}
                      </span>
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
