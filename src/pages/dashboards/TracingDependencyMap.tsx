import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useTraceEvents, useSpanEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, FilterSelect,
  Table, Tr, Td, StatusBadge, MonospaceText, Timestamp, formatDuration, formatLatency,
} from "@/shared/observe";
import { BarList, StackedBars, Banner, StatTile, ChartCard, HeroBand, ZoneLabel } from "./widgets";
import { ServiceTopologyGraph, buildTopology } from "./ServiceTopologyGraph";
import { percentile, groupBy, seededSeries } from "./lib";
import type { SpanEvent } from "@/types/events";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

export default function TracingDependencyMap() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const traces = useTraceEvents();
  const spans = useSpanEvents();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const traceList = traces.data ?? [];
  const spanList = spans.data ?? [];

  const partial = traceList.filter((t) => t.isPartial);
  const errorTraces = traceList.filter((t) => t.rootSpan?.status === "error").length;

  // Service dependency nodes (live span stats)
  const services = [...new Set(spanList.map((s) => s.metadata.service))];
  const nodes = services.map((svc) => {
    const svcSpans = spanList.filter((s) => s.metadata.service === svc);
    const errRate = svcSpans.length ? (svcSpans.filter((s) => s.status === "error").length / svcSpans.length) * 100 : 0;
    const p95 = percentile(svcSpans.map((s) => s.duration), 95);
    return { svc, count: svcSpans.length, errRate, p95 };
  }).sort((a, b) => b.count - a.count);

  const topology = useMemo(() => buildTopology(nodes), [spanList.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedMeta = selectedNode ? topology.nodes.find((n) => n.id === selectedNode) : null;
  const selectedEdges = selectedNode ? topology.edges.filter((e) => e.from === selectedNode || e.to === selectedNode) : [];

  // DB queries
  const dbSpans = spanList.filter((s) => attr(s, "db.system") || /pg\.|prisma|mongo|redis|query/.test(s.name));
  const dbGroups = Object.entries(groupBy(dbSpans, (s) => normalizeQuery(s)))
    .map(([pattern, ss]) => ({
      pattern,
      op: opType(pattern),
      system: String(attr(ss[0], "db.system") ?? guessSystem(ss[0].name)),
      avg: ss.reduce((a, s) => a + s.duration, 0) / ss.length,
      p95: percentile(ss.map((s) => s.duration), 95),
      count: ss.length,
      errRate: (ss.filter((s) => s.status === "error").length / ss.length) * 100,
    }))
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 12);

  // External calls
  const extSpans = spanList.filter((s) => s.kind === "client" && (attr(s, "http.url") || /http|GET|POST/.test(s.name)));
  const extByHost = Object.entries(groupBy(extSpans, (s) => hostOf(s)))
    .map(([host, ss]) => ({ label: host, value: Math.round(percentile(ss.map((s) => s.duration), 95)), color: percentile(ss.map((s) => s.duration), 95) > 200 ? "var(--red)" : "var(--green)" }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Trace error rate by service (stacked)
  const errStacks = nodes.slice(0, 6).map((n) => {
    const ss = spanList.filter((s) => s.metadata.service === n.svc);
    return {
      label: n.svc,
      segments: [
        { value: ss.filter((s) => s.status === "ok").length + 10, color: "var(--green)" },
        { value: ss.filter((s) => s.status === "error").length + 2, color: "var(--red)" },
        { value: ss.filter((s) => s.status === "unset").length + 1, color: "var(--bg3)" },
      ],
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Distributed Tracing & Dependency Map"
        description="Visualize request flow across services and identify bottleneck dependencies."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      {partial.length > 0 && (
        <Banner tone="amber" icon={AlertTriangle} title={<><strong>{partial.length} partial traces detected</strong> — root spans may be missing due to timeout or dropped packets.</>} />
      )}

      <HeroBand
        metrics={[
          { label: "Traces", value: traceList.length, delta: "in range", trend: "neutral", spark: seededSeries("tr-traces", 20, 40, 15) },
          { label: "Spans", value: spanList.length, delta: "across services", trend: "neutral", spark: seededSeries("tr-spans", 20, 80, 20), sparkColor: "var(--blue)" },
          { label: "Error traces", value: errorTraces, delta: `${((errorTraces / (traceList.length || 1)) * 100).toFixed(1)}%`, trend: "down", spark: seededSeries("tr-err", 20, 10, 6), sparkColor: "var(--red)" },
          { label: "Partial traces", value: partial.length, delta: "orphan timeouts", trend: partial.length ? "down" : "up", sparkColor: "var(--amber)" },
        ]}
      />

      <ZoneLabel>Service topology</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Service dependency map" className="xl:col-span-2">
          <ServiceTopologyGraph
            nodes={topology.nodes}
            edges={topology.edges}
            selected={selectedNode}
            onSelect={setSelectedNode}
          />
        </SectionCard>

        <SectionCard title={selectedMeta ? selectedMeta.label : "Node inspector"}>
          {selectedMeta ? (
            <div className="flex h-full flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[8px] bg-[var(--bg2)] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Throughput</div>
                  <div className="text-[15px] font-semibold tabular-nums text-[var(--text)]">{selectedMeta.rps} rps</div>
                </div>
                <div className="rounded-[8px] bg-[var(--bg2)] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Error rate</div>
                  <div className="text-[15px] font-semibold tabular-nums" style={{ color: selectedMeta.errRate > 5 ? "var(--red)" : selectedMeta.errRate > 1 ? "var(--amber)" : "var(--green)" }}>{selectedMeta.errRate.toFixed(1)}%</div>
                </div>
                <div className="rounded-[8px] bg-[var(--bg2)] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text3)]">P95</div>
                  <div className="text-[15px] font-semibold tabular-nums" style={{ color: selectedMeta.p95 > 800 ? "var(--red)" : selectedMeta.p95 > 300 ? "var(--amber)" : "var(--text)" }}>{selectedMeta.p95}ms</div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Connections</div>
                <div className="flex flex-col gap-1.5">
                  {selectedEdges.map((e) => {
                    const other = e.from === selectedMeta.id ? e.to : e.from;
                    const dir = e.from === selectedMeta.id ? "→" : "←";
                    const tone = e.errRate > 5 ? "var(--red)" : e.errRate > 1 ? "var(--amber)" : "var(--green)";
                    return (
                      <button key={`${e.from}-${e.to}`} onClick={() => setSelectedNode(other)} className="flex items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-left hover:border-[var(--brand)]">
                        <span className="flex items-center gap-2 text-[12px] text-[var(--text)]">
                          <span className="text-[var(--text3)]">{dir}</span>
                          {other}
                        </span>
                        <span className="text-[11px] tabular-nums" style={{ color: tone }}>{e.errRate.toFixed(1)}% err</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => navigate("/observability/traces")} className="mt-auto rounded-[8px] border border-[var(--border)] px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:border-[var(--brand)]">
                View traces for {selectedMeta.label}
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
              <p className="text-[13px] text-[var(--text2)]">Select a node on the map</p>
              <p className="max-w-[220px] text-[12px] text-[var(--text3)]">Click any service, datastore, or external dependency to inspect throughput, errors, latency, and connections.</p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {topology.nodes.filter((n) => n.kind === "service").map((n) => {
          const tone = n.errRate > 5 ? "var(--red)" : n.errRate > 1 ? "var(--amber)" : "var(--green)";
          return (
            <button key={n.id} onClick={() => setSelectedNode(n.id)} className="flex flex-col rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-3 text-left hover:border-[var(--brand)]">
              <span className="flex items-center justify-between">
                <span className="truncate text-[12px] font-medium text-[var(--text)]">{n.label}</span>
                <span className="size-2 rounded-full" style={{ background: tone }} />
              </span>
              <span className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">{n.rps} <span className="text-[11px] font-normal text-[var(--text3)]">rps</span></span>
              <span className="text-[11px] tabular-nums text-[var(--text3)]">{n.errRate.toFixed(1)}% err · p95 {n.p95}ms</span>
            </button>
          );
        })}
      </div>

      <ZoneLabel>Traces &amp; bottlenecks</ZoneLabel>

      <SectionCard title="Trace list">
        <Table headers={["Trace ID", "Root span", "Duration", "Spans", "Status", "Started", "Service"]} maxHeight="28rem">
          {traceList.map((t) => (
            <Tr key={t.eventId} onClick={() => navigate(`/observability/traces/${t.traceId}`)}>
              <Td><MonospaceText value={t.traceId.slice(0, 8)} className="text-[var(--brand)]" /></Td>
              <Td><MonospaceText value={t.rootSpan?.name ?? "—"} className="max-w-[220px]" /></Td>
              <Td><span style={{ color: t.totalDuration > 1000 ? "var(--red)" : t.totalDuration > 300 ? "var(--amber)" : "var(--green)" }} className="tabular-nums font-semibold">{formatDuration(t.totalDuration)}</span></Td>
              <Td className="tabular-nums">{t.spanCount}</Td>
              <Td><StatusBadge status={t.isPartial ? "in_progress" : t.rootSpan?.status === "error" ? "error" : "ok"} /></Td>
              <Td><Timestamp value={t.rootSpan?.startTime ?? Date.now()} /></Td>
              <Td className="text-[var(--text2)]">{t.metadata.service}</Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="External API call latency (P95)">
          {extByHost.length ? <BarList items={extByHost} valueFormat={formatLatency} /> : <p className="text-[13px] text-[var(--text3)]">No external client spans in range.</p>}
        </ChartCard>
        <ChartCard
          title="Trace error rate by service"
          legend={[
            { label: "OK", color: "var(--green)" },
            { label: "Error", color: "var(--red)" },
            { label: "Unset", color: "var(--bg3)" },
          ]}
        >
          <StackedBars groups={errStacks} horizontal />
        </ChartCard>
      </div>

      <ZoneLabel>Data layer</ZoneLabel>

      <SectionCard title="Database query performance">
        {dbGroups.length ? (
          <Table headers={["Query pattern", "Op", "System", "Avg", "P95", "Calls", "Err %"]} maxHeight="26rem">
            {dbGroups.map((q) => (
              <Tr key={q.pattern} onClick={() => navigate("/observability/traces")}>
                <Td><MonospaceText value={q.pattern} className="max-w-[300px]" /></Td>
                <Td><span className="text-[12px] font-medium text-[var(--text2)]">{q.op}</span></Td>
                <Td className="text-[var(--text2)]">{q.system}</Td>
                <Td className="tabular-nums">{formatDuration(q.avg)}</Td>
                <Td><span style={{ color: q.p95 > 200 ? "var(--red)" : "var(--green)" }} className="tabular-nums font-semibold">{formatDuration(q.p95)}</span></Td>
                <Td className="tabular-nums">{q.count}</Td>
                <Td className="tabular-nums">{q.errRate.toFixed(1)}%</Td>
              </Tr>
            ))}
          </Table>
        ) : <p className="text-[13px] text-[var(--text3)]">No database spans in range.</p>}
      </SectionCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Avg trace duration" value={formatDuration(traceList.reduce((s, t) => s + t.totalDuration, 0) / (traceList.length || 1))} />
        <StatTile label="Avg spans/trace" value={Math.round(traceList.reduce((s, t) => s + t.spanCount, 0) / (traceList.length || 1))} />
        <StatTile label="DB query patterns" value={dbGroups.length} />
        <StatTile label="External deps" value={extByHost.length} />
      </div>
    </div>
  );
}

function attr(s: SpanEvent, key: string): unknown {
  return s.attributes?.[key];
}
function normalizeQuery(s: SpanEvent): string {
  const stmt = attr(s, "db.statement");
  if (typeof stmt === "string") return stmt.replace(/\d+/g, "?").slice(0, 60);
  return s.name;
}
function opType(pattern: string): string {
  const m = pattern.toUpperCase().match(/SELECT|INSERT|UPDATE|DELETE|GET|SET|FIND/);
  return m ? m[0] : "QUERY";
}
function guessSystem(name: string): string {
  if (/pg\.|postgres|prisma/.test(name)) return "postgresql";
  if (/mongo/.test(name)) return "mongodb";
  if (/redis/.test(name)) return "redis";
  return "unknown";
}
function hostOf(s: SpanEvent): string {
  const url = attr(s, "http.url");
  if (typeof url === "string") {
    try { return new URL(url).host; } catch { return url.slice(0, 30); }
  }
  return s.name.slice(0, 30);
}
