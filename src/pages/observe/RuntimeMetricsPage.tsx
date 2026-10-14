import { Link } from "react-router";
import {
  PageHeader, TimeRangePicker, useTimeRangeParams, useTimeWindow, ReadoutBand, Panel, formatCompact,
} from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import { useMetricSeries, useMetricStats } from "./hooks/usePerformanceApi";
import { TimeSeriesChart } from "./components/TimeSeriesChart";
import { RuntimeNotReporting, formatMb, hasSamples, mbPoints, toMb } from "./components/perf";

const M = {
  heapUsed: "runtime.heap.used",
  heapTotal: "runtime.heap.total",
  external: "runtime.memory.external",
  rss: "runtime.memory.rss",
  handles: "runtime.handles.active",
};

export default function RuntimeMetricsPage() {
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);

  const heapUsed = useMetricSeries(M.heapUsed, "avg", window);
  const heapUsedMax = useMetricSeries(M.heapUsed, "max", window);
  const heapTotal = useMetricSeries(M.heapTotal, "avg", window);
  const rss = useMetricSeries(M.rss, "avg", window);
  const external = useMetricSeries(M.external, "avg", window);
  const handles = useMetricSeries(M.handles, "max", window);

  const sHeap = useMetricStats(M.heapUsed, window);
  const sTotal = useMetricStats(M.heapTotal, window);
  const sRss = useMetricStats(M.rss, window);
  const sExt = useMetricStats(M.external, window);
  const sHandles = useMetricStats(M.handles, window);

  const statsLoading = sHeap.isLoading || sTotal.isLoading || sRss.isLoading;
  const reporting = hasSamples(sHeap.data, sTotal.data, sRss.data, sExt.data, sHandles.data);

  const heapAvg = sHeap.data?.avg ?? null;
  const totalAvg = sTotal.data?.avg ?? null;
  const headroom = heapAvg !== null && totalAvg ? toMb(heapAvg) / toMb(totalAvg) : null;

  // Growth across the window: last bucket vs first bucket of heap used.
  const hp = heapUsed.data ?? [];
  const growth = hp.length > 1 ? toMb(hp[hp.length - 1].v) - toMb(hp[0].v) : null;

  const cells: ReadoutCell[] = [
    { label: "Heap used", value: formatMb(heapAvg), sub: sHeap.data?.p95 != null ? `p95 ${formatMb(sHeap.data.p95)}` : "average" },
    {
      label: "Heap in use",
      value: headroom !== null ? `${(headroom * 100).toFixed(0)}%` : "—",
      sub: totalAvg !== null ? `of ${formatMb(totalAvg)} allocated` : "used over total",
      tone: headroom === null ? "neutral" : headroom >= 0.9 ? "bad" : headroom >= 0.75 ? "warn" : "neutral",
    },
    {
      label: "Heap drift",
      value: growth !== null ? `${growth >= 0 ? "+" : "−"}${formatMb(Math.abs(growth))}` : "—",
      sub: "first to last bucket",
      tone: growth !== null && hp.length > 1 && growth > toMb(hp[0].v) * 0.25 ? "warn" : "neutral",
    },
    { label: "RSS", value: formatMb(sRss.data?.avg), sub: sRss.data?.max != null ? `peak ${formatMb(sRss.data.max)}` : "resident set" },
    { label: "External", value: formatMb(sExt.data?.avg), sub: "buffers and native memory" },
    { label: "Active handles", value: sHandles.data?.avg != null ? formatCompact(Math.round(sHandles.data.avg)) : "—", sub: sHandles.data?.max != null ? `peak ${formatCompact(sHandles.data.max)}` : "sockets, timers, files" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Runtime metrics"
        description="V8 and Node.js internals per service: heap, resident memory, native allocations, and open handles."
        actions={<TimeRangePicker />}
      />

      <ReadoutBand cells={cells} loading={statsLoading} />

      {!statsLoading && !reporting ? (
        <RuntimeNotReporting what="runtime" metrics={Object.values(M)} />
      ) : (
        <>
          <Panel
            title="Heap"
            description="Used heap against the heap V8 has allocated. A used line that climbs and never falls back after GC is the usual leak signature."
          >
            <TimeSeriesChart
              window={window}
              height={220}
              format={formatMb}
              loading={heapUsed.isLoading}
              series={[
                { label: "Used (avg)", color: "var(--text)", points: mbPoints(heapUsed.data), area: true },
                { label: "Used (max)", color: "var(--blue)", points: mbPoints(heapUsedMax.data) },
                { label: "Allocated", color: "var(--text3)", points: mbPoints(heapTotal.data), dashed: true },
              ]}
            />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Process memory" description="Resident set size and memory held outside the V8 heap.">
              <TimeSeriesChart
                window={window}
                format={formatMb}
                loading={rss.isLoading}
                series={[
                  { label: "RSS", color: "var(--text)", points: mbPoints(rss.data) },
                  { label: "External", color: "var(--violet)", points: mbPoints(external.data) },
                ]}
              />
            </Panel>
            <Panel title="Active handles" description="Peak open sockets, timers, and file descriptors per bucket. Steady growth means something is not being closed.">
              <TimeSeriesChart
                window={window}
                format={(v) => formatCompact(Math.round(v))}
                loading={handles.isLoading}
                series={[{ label: "Handles (max)", color: "var(--blue)", points: handles.data ?? [], area: true }]}
              />
            </Panel>
          </div>

          <p className="text-[12px] text-[var(--text3)]">
            Event loop lag and GC pauses have their own pages:{" "}
            <Link to="/observability/event-loop" className="text-[var(--text2)] underline-offset-2 hover:text-[var(--text)] hover:underline">Event loop</Link>
            {" · "}
            <Link to="/observability/gc-monitoring" className="text-[var(--text2)] underline-offset-2 hover:text-[var(--text)] hover:underline">GC monitoring</Link>
          </p>
        </>
      )}
    </div>
  );
}
