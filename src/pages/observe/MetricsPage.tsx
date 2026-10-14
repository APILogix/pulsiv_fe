import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search } from "lucide-react";
import {
  PageHeader, TimeRangePicker, useTimeRangeParams, useTimeWindow, ReadoutBand, Panel, EmptyNote,
  Timestamp, formatCompact, MUTED_DASH,
} from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import { cn } from "@/lib/utils";
import { useMetricCatalog, useMetricEvents, useMetricSeries, useMetricStats } from "./hooks/usePerformanceApi";
import type { Aggregate, MetricCatalogEntry } from "./hooks/usePerformanceApi";
import { TimeSeriesChart } from "./components/TimeSeriesChart";

const AGGREGATES: { value: Aggregate; label: string }[] = [
  { value: "avg", label: "Avg" },
  { value: "max", label: "Max" },
  { value: "min", label: "Min" },
  { value: "sum", label: "Sum" },
  { value: "count", label: "Count" },
];

function defaultAggregate(type: string | null | undefined): Aggregate {
  const t = String(type ?? "").toLowerCase();
  return t === "counter" || t === "sum" ? "sum" : "avg";
}

function formatValue(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 10_000) return formatCompact(v);
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function Catalog({
  entries,
  loading,
  selected,
  onSelect,
}: {
  entries: MetricCatalogEntry[];
  loading: boolean;
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [showRuntime, setShowRuntime] = useState(false);
  const runtimeCount = entries.filter((e) => e.name.startsWith("runtime.")).length;
  const visible = entries
    .filter((e) => showRuntime || !e.name.startsWith("runtime."))
    .filter((e) => !filter || e.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Panel title="Metrics" description={loading ? undefined : `${visible.length} of ${entries.length} names in this window`} flush className="flex min-h-0 flex-col xl:sticky xl:top-0">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] p-3">
        <label className="relative block">
          <span className="sr-only">Filter metrics</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text3)]" aria-hidden="true" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name…"
            className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] pl-8 pr-2 text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--text3)]"
          />
        </label>
        {runtimeCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--text2)]">
            <input type="checkbox" checked={showRuntime} onChange={(e) => setShowRuntime(e.target.checked)} className="accent-[var(--text)]" />
            Include {runtimeCount} runtime metrics
          </label>
        )}
      </div>
      <div className="sidebar-scroll max-h-[640px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-1.5 p-3">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-9 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-3">
            <EmptyNote title={entries.length ? "No names match" : "No custom metrics yet"}>
              {entries.length
                ? "Try a shorter filter or include runtime metrics."
                : "Record counters, gauges, and histograms with the Pulse SDK metrics API and they appear here by name."}
            </EmptyNote>
          </div>
        ) : (
          <ul role="listbox" aria-label="Metric names">
            {visible.map((e) => {
              const active = e.name === selected;
              return (
                <li key={`${e.name}-${e.type}`} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => onSelect(e.name)}
                    className={cn(
                      "flex w-full cursor-pointer flex-col gap-0.5 border-b border-[var(--border)] px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]",
                      active ? "bg-[var(--bg3)]" : "hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]",
                    )}
                  >
                    <span className={cn("truncate font-[family-name:var(--mono)] text-[12px]", active ? "text-[var(--text)]" : "text-[var(--text2)]")} title={e.name}>{e.name}</span>
                    <span className="flex items-center gap-2 text-[11px] text-[var(--text3)]">
                      <span className="capitalize">{e.type ?? "metric"}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-[family-name:var(--mono)] tabular-nums">{formatCompact(e.samples)}</span> samples
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}

export default function MetricsPage() {
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const [params, setParams] = useSearchParams();
  const catalog = useMetricCatalog(window);
  const entries = catalog.data ?? [];

  const custom = entries.filter((e) => !e.name.startsWith("runtime."));
  const selected = params.get("metric") ?? custom[0]?.name ?? entries[0]?.name ?? null;
  const entry = entries.find((e) => e.name === selected);
  const [aggOverride, setAggOverride] = useState<Aggregate | null>(null);
  const agg = aggOverride ?? defaultAggregate(entry?.type);

  const series = useMetricSeries(selected, agg, window);
  const stats = useMetricStats(selected, window);
  const events = useMetricEvents(selected ?? "", window);

  const select = (name: string) => {
    setAggOverride(null);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("metric", name);
      return next;
    }, { replace: true });
  };

  const s = stats.data;
  const cells: ReadoutCell[] = [
    { label: "Samples", value: formatCompact(s?.count ?? 0), sub: entry?.lastSeen ? <>last <Timestamp value={entry.lastSeen} /></> : undefined },
    { label: "Average", value: formatValue(s?.avg) },
    { label: "p50", value: formatValue(s?.p50) },
    { label: "p95", value: formatValue(s?.p95) },
    { label: "p99", value: formatValue(s?.p99) },
    { label: "Range", value: s?.min != null && s?.max != null ? `${formatValue(s.min)} – ${formatValue(s.max)}` : "—", sub: "min to max" },
  ];

  const rows = events.data?.items ?? [];
  const unit = rows.find((r) => r.metricUnit)?.metricUnit as string | undefined;
  const totalNames = entries.length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Metrics"
        description="Custom counters, gauges, and histograms your services record. Pick a name to chart it and read its raw data points."
        actions={<TimeRangePicker />}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Catalog entries={entries} loading={catalog.isLoading} selected={selected} onSelect={select} />

        <div className="flex min-w-0 flex-col gap-4">
          {!catalog.isLoading && totalNames === 0 ? (
            <EmptyNote title="No metrics were recorded in this window">
              Metrics appear once a service sends them through the Pulse SDK. Widen the time range to look further back.
            </EmptyNote>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-[family-name:var(--mono)] text-[16px] font-medium text-[var(--text)]" title={selected ?? undefined}>{selected ?? "—"}</h2>
                  <p className="mt-1 text-[12px] text-[var(--text3)]">
                    <span className="capitalize">{entry?.type ?? "metric"}</span>
                    {unit ? <> · unit <span className="font-[family-name:var(--mono)] text-[var(--text2)]">{unit}</span></> : null}
                  </p>
                </div>
                <div role="radiogroup" aria-label="Aggregation" className="flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] p-0.5">
                  {AGGREGATES.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      role="radio"
                      aria-checked={agg === a.value}
                      onClick={() => setAggOverride(a.value)}
                      className={cn(
                        "h-7 cursor-pointer rounded-[4px] px-2.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)]",
                        agg === a.value ? "bg-[var(--bg3)] text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text)]",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <ReadoutBand cells={cells} loading={stats.isLoading} />

              <Panel title={`${AGGREGATES.find((a) => a.value === agg)?.label ?? "Avg"} per bucket`}>
                <TimeSeriesChart
                  window={window}
                  height={240}
                  format={(v) => formatValue(v)}
                  loading={series.isLoading}
                  series={[{ label: selected ?? "value", color: "var(--text)", points: series.data ?? [], area: true }]}
                />
              </Panel>

              <Panel title="Data points" description={rows.length ? `Latest ${rows.length} samples` : undefined} flush>
                {events.isLoading ? (
                  <div className="flex flex-col gap-1.5 p-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-8 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}</div>
                ) : rows.length === 0 ? (
                  <div className="p-5"><EmptyNote>No samples for this name in the window.</EmptyNote></div>
                ) : (
                  <div className="sidebar-scroll max-h-[420px] overflow-y-auto">
                    <div className="sticky top-0 grid grid-cols-[104px_110px_minmax(0,1fr)_110px_90px] gap-4 border-b border-[var(--border)] bg-[var(--bg1)] px-5 py-2.5 text-[12px] font-medium text-[var(--text3)]">
                      <span>Time</span><span className="text-right">Value</span><span>Service</span><span>Environment</span><span className="text-right">p95</span>
                    </div>
                    <ul className="divide-y divide-[var(--border)]">
                      {rows.slice(0, 100).map((r) => (
                        <li key={r.id}>
                          <Link
                            to={`/observability/metrics/${encodeURIComponent(r.id)}`}
                            className="grid grid-cols-[104px_110px_minmax(0,1fr)_110px_90px] items-center gap-4 px-5 py-2 text-[12px] transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                          >
                            <Timestamp value={r.occurredAt} />
                            <span className="text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text)]">{formatValue(Number(r.value))}</span>
                            <span className="truncate text-[var(--text2)]">{r.service ?? (r.endpoint || "—")}</span>
                            <span className="truncate text-[var(--text3)]">{r.environment ?? "—"}</span>
                            <span className="text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{r.p95 != null ? formatValue(Number(r.p95)) : MUTED_DASH}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
