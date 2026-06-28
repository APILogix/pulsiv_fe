import { useNavigate } from "react-router";
import { Activity, Radio, Zap } from "lucide-react";
import { useErrorEvents, useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, KpiCard,
  Table, Tr, Td, MethodBadge, StatusCodeBadge, SeverityBadge, MonospaceText, Timestamp,
  MetricSparkline, formatCompact, formatLatency,
} from "@/shared/observe";
import { Gauge, Donut, Banner } from "./widgets";
import { percentile, seededSeries, groupBy } from "./lib";

const CONN_LIMITS = [
  { route: "Errors", max: 30, active: 18 },
  { route: "Requests", max: 50, active: 41 },
  { route: "Traces", max: 50, active: 22 },
  { route: "Metrics", max: 20, active: 9 },
  { route: "Logs", max: 20, active: 14 },
];

export default function RealtimeTraffic() {
  const navigate = useNavigate();
  const isLive = useTimeRangeStore((s) => s.isLive);
  const toggleLive = useTimeRangeStore((s) => s.toggleLive);
  const requests = useRequestEvents();
  const errors = useErrorEvents();

  const reqList = requests.data ?? [];
  const errList = errors.data ?? [];

  const rps = Math.round(reqList.length / 4 + 12);
  const peakRps = Math.round(rps * 1.4);
  const rpsSeries = seededSeries("rps", 40, rps, rps * 0.4);

  const statusSegments = [
    { label: "2xx", value: reqList.filter((r) => r.statusCode < 300).length || 80, color: "var(--green)" },
    { label: "3xx", value: reqList.filter((r) => r.statusCode >= 300 && r.statusCode < 400).length || 6, color: "var(--blue)" },
    { label: "4xx", value: reqList.filter((r) => r.statusCode >= 400 && r.statusCode < 500).length || 14, color: "var(--amber)" },
    { label: "5xx", value: reqList.filter((r) => r.statusCode >= 500).length || 4, color: "var(--red)" },
  ];

  const totalConn = CONN_LIMITS.reduce((s, c) => s + c.active, 0);
  const totalMax = CONN_LIMITS.reduce((s, c) => s + c.max, 0);
  const connPct = (totalConn / totalMax) * 100;

  const topRoutes = Object.entries(groupBy(reqList, (r) => r.route))
    .map(([route, rs]) => ({ route, rpm: rs.length * 14, errRate: (rs.filter((r) => r.statusCode >= 500).length / rs.length) * 100, p95: percentile(rs.map((r) => r.latency), 95) }))
    .sort((a, b) => b.rpm - a.rpm)
    .slice(0, 10);

  const rateLimitHits = reqList.filter((r) => r.statusCode === 429).length;
  const liveRows = [...reqList].sort((a, b) => b.timestamp - a.timestamp).slice(0, 40);
  const errorStream = [...errList].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Real-Time Traffic & Request Flow"
        description="Know exactly what is happening right now across all APIs."
        actions={
          <button
            onClick={toggleLive}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-sm font-medium text-[var(--text)]"
          >
            <span className={`size-2 rounded-full ${isLive ? "pulse-dot bg-[var(--green)]" : "bg-[var(--text3)]"}`} />
            {isLive ? "Live · last 15m" : "Paused"}
          </button>
        }
      />

      {rateLimitHits > 10 && (
        <Banner tone="amber" icon={Zap} title={<><strong>{rateLimitHits} rate-limit hits/min</strong> — 429 responses exceeding threshold.</>} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Live request rate" action={<Radio className="size-4 text-[var(--green)]" />}>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-semibold tabular-nums text-[var(--text)]">{rps}<span className="ml-1 text-sm font-normal text-[var(--text3)]">req/s</span></div>
              <div className="mt-1 text-[12px] text-[var(--text3)]">Peak {peakRps} req/s this window</div>
            </div>
          </div>
          <div className="mt-3"><MetricSparkline data={rpsSeries} color="var(--green)" width={320} height={48} /></div>
        </SectionCard>

        <SectionCard title="Status code distribution">
          <Donut segments={statusSegments} centerLabel={formatCompact(reqList.length * 14)} centerSub="req/min" size={140} />
        </SectionCard>

        <SectionCard title="Active connections">
          <div className="flex items-center gap-4">
            <Gauge value={connPct} label={`${Math.round(connPct)}%`} sublabel={`${totalConn} / ${totalMax} connections`} size={130} color={connPct > 90 ? "var(--red)" : connPct > 70 ? "var(--amber)" : "var(--green)"} />
            <div className="flex flex-1 flex-col gap-1.5">
              {CONN_LIMITS.map((c) => (
                <div key={c.route} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 text-[var(--text2)]">{c.route}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg3)]">
                    <div className="h-full rounded-full" style={{ width: `${(c.active / c.max) * 100}%`, background: c.active / c.max > 0.9 ? "var(--red)" : "var(--brand)" }} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-[var(--text3)]">{c.active}/{c.max}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Requests/min" value={formatCompact(reqList.length * 14)} delta="stable" trend="neutral" icon={Activity} />
        <KpiCard label="Rate-limit (429)/min" value={rateLimitHits} delta={rateLimitHits > 10 ? "over threshold" : "nominal"} trend={rateLimitHits > 10 ? "down" : "up"} icon={Zap} />
        <KpiCard label="Live errors" value={errList.length} delta="streaming" trend="neutral" />
        <KpiCard label="Avg latency" value={formatLatency(percentile(reqList.map((r) => r.latency), 50))} delta="p50" trend="neutral" />
      </div>

      <SectionCard title="Top routes right now">
        <Table headers={["#", "Route", "Req/min", "Error rate", "P95", "Trend"]}>
          {topRoutes.map((r, i) => (
            <Tr key={r.route} onClick={() => navigate("/observability/requests")}>
              <Td className="w-8 tabular-nums text-[var(--text3)]">{i + 1}</Td>
              <Td><MonospaceText value={r.route} className="max-w-[280px]" /></Td>
              <Td className="tabular-nums">{formatCompact(r.rpm)}</Td>
              <Td className="tabular-nums">{r.errRate.toFixed(1)}%</Td>
              <Td className="tabular-nums">{formatLatency(r.p95)}</Td>
              <Td><MetricSparkline data={seededSeries(r.route, 16, 50, 30)} color="var(--brand)" width={80} height={20} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Live traffic" className="lg:col-span-2">
          <Table headers={["When", "Method", "Route", "Status", "Latency", "Service"]} maxHeight="28rem">
            {liveRows.map((r) => (
              <Tr key={r.eventId} onClick={() => navigate(`/observability/requests/${r.requestId}`)}>
                <Td><Timestamp value={r.timestamp} /></Td>
                <Td><MethodBadge method={r.method} /></Td>
                <Td><MonospaceText value={r.route} className="max-w-[200px]" /></Td>
                <Td><StatusCodeBadge code={r.statusCode} /></Td>
                <Td className="tabular-nums">{formatLatency(r.latency)}</Td>
                <Td className="text-[var(--text2)]">{r.metadata.service}</Td>
              </Tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Error alert stream">
          <div className="flex max-h-[28rem] flex-col divide-y divide-[var(--border)] overflow-auto">
            {errorStream.map((e) => (
              <button key={e.eventId} onClick={() => navigate(`/observability/errors/${e.fingerprint}`)} className="flex items-start gap-2 py-2 text-left first:pt-0 hover:opacity-80">
                <SeverityBadge severity={e.severity} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-[var(--text)]">{e.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text3)]">
                    <span>{e.metadata.service}</span>·<Timestamp value={e.timestamp} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
