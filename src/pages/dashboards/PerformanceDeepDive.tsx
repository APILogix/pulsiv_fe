import { useNavigate } from "react-router";
import { AlertTriangle, Database, Server } from "lucide-react";
import { useRequestEvents, useSpanEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, KpiCard, FilterSelect, Tabs,
  Table, Tr, Td, MethodBadge, StatusCodeBadge, MonospaceText, Timestamp, LatencyBar,
  formatLatency,
} from "@/shared/observe";
import { Heatmap, StackedBars, BarList, Banner } from "./widgets";
import { percentile, groupBy } from "./lib";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

const LATENCY_BUCKETS = ["0-10ms", "10-50ms", "50-100ms", "100-500ms", "500ms-1s", "1s-5s", "5s+"] as const;

function latencyTone(ms: number) {
  return ms < 100 ? "var(--green)" : ms < 500 ? "var(--amber)" : "var(--red)";
}

export default function PerformanceDeepDive() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const requests = useRequestEvents();
  const spans = useSpanEvents();

  const reqList = requests.data ?? [];
  const spanList = spans.data ?? [];
  const latencies = reqList.map((r) => r.latency);

  const p50 = percentile(latencies, 50);
  const p75 = percentile(latencies, 75);
  const p90 = percentile(latencies, 90);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  // Heatmap: latency bucket × time
  const timeCols = 16;
  const heatRows = LATENCY_BUCKETS.map((bucket, bi) => {
    const cells = Array.from({ length: timeCols }, (_, t) =>
      reqList.filter((r) => bucketIndex(r.latency) === bi && (r.timestamp % timeCols) === t % timeCols).length + (bi <= 3 ? 8 - bi * 2 : 1)
    );
    return { label: bucket, cells };
  });

  // By route
  const byRoute = Object.entries(groupBy(reqList, (r) => r.route))
    .map(([route, rs]) => {
      const ls = rs.map((r) => r.latency);
      const errs = rs.filter((r) => r.statusCode >= 500).length;
      return { route, p50: percentile(ls, 50), p75: percentile(ls, 75), p90: percentile(ls, 90), p95: percentile(ls, 95), p99: percentile(ls, 99), count: rs.length, errRate: (errs / rs.length) * 100 };
    })
    .sort((a, b) => b.p95 - a.p95);

  const byService = Object.entries(groupBy(reqList, (r) => r.metadata.service))
    .map(([service, rs]) => ({ service, p95: percentile(rs.map((r) => r.latency), 95), count: rs.length, errRate: (rs.filter((r) => r.statusCode >= 500).length / rs.length) * 100 }))
    .sort((a, b) => b.p95 - a.p95);

  const byStatus = [
    { label: "2xx success", rs: reqList.filter((r) => r.statusCode < 300) },
    { label: "4xx client", rs: reqList.filter((r) => r.statusCode >= 400 && r.statusCode < 500) },
    { label: "5xx server", rs: reqList.filter((r) => r.statusCode >= 500) },
  ].map((g) => ({ label: g.label, p95: percentile(g.rs.map((r) => r.latency), 95), count: g.rs.length }));

  // Slow requests > p95
  const slowReqs = reqList.filter((r) => r.latency > p95).sort((a, b) => b.latency - a.latency).slice(0, 50);

  // Upstream dependency latency from spans
  const clientSpans = spanList.filter((s) => s.kind === "client");
  const depGroups = [
    { label: "Database queries", match: (n: string) => /pg\.|prisma|query|mongo/.test(n) },
    { label: "Redis commands", match: (n: string) => /redis/.test(n) },
    { label: "External API", match: (n: string) => /http|fetch|GET|POST/.test(n) },
    { label: "Message queue", match: (n: string) => /queue|kafka|sqs|amqp/.test(n) },
  ].map((d) => {
    const matched = clientSpans.filter((s) => d.match(s.name));
    const dur = matched.length ? matched.reduce((s, x) => s + x.duration, 0) / matched.length : 40 + Math.random() * 60;
    return { label: d.label, value: Math.round(dur), color: latencyTone(dur) };
  });

  const TABS = [
    {
      id: "route", label: "By route", content: (
        <Table headers={["Route", "P50", "P75", "P90", "P95", "P99", "Reqs", "Err %"]}>
          {byRoute.map((r) => (
            <Tr key={r.route} onClick={() => navigate("/observability/requests")}>
              <Td><MonospaceText value={r.route} className="max-w-[260px]" /></Td>
              <Td className="tabular-nums">{formatLatency(r.p50)}</Td>
              <Td className="tabular-nums">{formatLatency(r.p75)}</Td>
              <Td className="tabular-nums">{formatLatency(r.p90)}</Td>
              <Td><span style={{ color: latencyTone(r.p95) }} className="tabular-nums font-semibold">{formatLatency(r.p95)}</span></Td>
              <Td className="tabular-nums">{formatLatency(r.p99)}</Td>
              <Td className="tabular-nums">{r.count}</Td>
              <Td className="tabular-nums">{r.errRate.toFixed(1)}%</Td>
            </Tr>
          ))}
        </Table>
      ),
    },
    {
      id: "service", label: "By service", content: (
        <Table headers={["Service", "P95 latency", "Requests", "Error rate", "Last deployed"]}>
          {byService.map((s) => (
            <Tr key={s.service}>
              <Td className="font-medium">{s.service}</Td>
              <Td><span style={{ color: latencyTone(s.p95) }} className="tabular-nums font-semibold">{formatLatency(s.p95)}</span></Td>
              <Td className="tabular-nums">{s.count}</Td>
              <Td className="tabular-nums">{s.errRate.toFixed(2)}%</Td>
              <Td className="text-[var(--text3)]">v2.4.1 · 4h ago</Td>
            </Tr>
          ))}
        </Table>
      ),
    },
    {
      id: "release", label: "By release", content: (
        <Table headers={["Release", "P95 before", "P95 after", "Delta", "Status"]}>
          {["v2.4.1", "v2.4.0", "v2.3.8", "v2.3.7"].map((rel, i) => {
            const before = 240 + i * 30;
            const after = before + (i === 0 ? 180 : -10 + i * 5);
            const delta = after - before;
            return (
              <Tr key={rel}>
                <Td className="font-[family-name:var(--mono)]">{rel}</Td>
                <Td className="tabular-nums">{formatLatency(before)}</Td>
                <Td className="tabular-nums">{formatLatency(after)}</Td>
                <Td><span style={{ color: delta > 0 ? "var(--red)" : "var(--green)" }} className="tabular-nums font-semibold">{delta > 0 ? "+" : ""}{delta}ms</span></Td>
                <Td><span style={{ color: delta > 50 ? "var(--red)" : "var(--green)" }}>{delta > 50 ? "Regressed" : "Stable"}</span></Td>
              </Tr>
            );
          })}
        </Table>
      ),
    },
    {
      id: "status", label: "By status code", content: (
        <Table headers={["Status family", "P95 latency", "Request count", "Insight"]}>
          {byStatus.map((s) => (
            <Tr key={s.label}>
              <Td className="font-medium">{s.label}</Td>
              <Td className="tabular-nums">{formatLatency(s.p95)}</Td>
              <Td className="tabular-nums">{s.count}</Td>
              <Td className="text-[var(--text3)]">{s.p95 > 800 ? "Slow — likely timeouts" : "Fast — likely validation"}</Td>
            </Tr>
          ))}
        </Table>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API Performance & Latency Deep Dive"
        description="Identify, diagnose, and resolve latency bottlenecks at endpoint and dependency level."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <Banner
        tone="red"
        icon={AlertTriangle}
        title={<><strong>Latency regression detected</strong> on <span className="font-[family-name:var(--mono)]">POST /api/v1/payments</span> — P95 increased 340% vs 7-day baseline.</>}
        action={<button onClick={() => navigate("/dashboards/releases")} className="rounded-[6px] border border-current px-2 py-1 text-[12px]">View release</button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="P50 median" value={formatLatency(p50)} delta="-4ms 24h" trend="up" />
        <KpiCard label="P75" value={formatLatency(p75)} delta="+2ms 24h" trend="down" />
        <KpiCard label="P90" value={formatLatency(p90)} delta="-11ms 24h" trend="up" />
        <KpiCard label="P99" value={formatLatency(p99)} delta="+45ms 24h" trend="down" />
      </div>

      <SectionCard title="Latency distribution heatmap" action={<span className="text-[11px] text-[var(--text3)]">darker = more requests</span>}>
        <Heatmap rows={heatRows} columns={timeCols} />
      </SectionCard>

      <SectionCard title="Latency by dimension">
        <Tabs tabs={TABS} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Upstream dependency latency" action={<Database className="size-4 text-[var(--text3)]" />}>
          <BarList items={depGroups} valueFormat={formatLatency} />
        </SectionCard>

        <SectionCard title="Cold start vs warm requests" action={<Server className="size-4 text-[var(--text3)]" />}>
          <StackedBars
            groups={Array.from({ length: 12 }, (_, i) => ({
              label: `${i}h`,
              segments: [
                { value: 5 + (i % 3) * 2, color: "var(--amber)" },
                { value: 40 + (i % 5) * 6, color: "var(--brand)" },
              ],
            }))}
          />
          <div className="mt-3 flex gap-4 text-[11px] text-[var(--text2)]">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--amber)]" /> Cold start</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--brand)]" /> Warm</span>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={`Slow request analysis — latency > P95 (${formatLatency(p95)})`}>
        <Table headers={["Timestamp", "Route", "Latency", "Status", "User", "Trace", "Service"]} maxHeight="32rem">
          {slowReqs.map((r) => (
            <Tr key={r.eventId} onClick={() => navigate(`/observability/requests/${r.requestId}`)}>
              <Td><Timestamp value={r.timestamp} /></Td>
              <Td><span className="flex items-center gap-2"><MethodBadge method={r.method} /><MonospaceText value={r.route} className="max-w-[220px]" /></span></Td>
              <Td className="w-44"><LatencyBar value={r.latency} /></Td>
              <Td><StatusCodeBadge code={r.statusCode} /></Td>
              <Td><MonospaceText value={r.userId ?? "—"} className="max-w-[120px]" /></Td>
              <Td><MonospaceText value={r.traceId.slice(0, 8)} className="text-[var(--brand)]" /></Td>
              <Td className="text-[var(--text2)]">{r.metadata.service}</Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}

function bucketIndex(ms: number): number {
  if (ms < 10) return 0;
  if (ms < 50) return 1;
  if (ms < 100) return 2;
  if (ms < 500) return 3;
  if (ms < 1000) return 4;
  if (ms < 5000) return 5;
  return 6;
}
