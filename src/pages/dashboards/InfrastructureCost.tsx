import { DollarSign, Cpu, Database, HardDrive } from "lucide-react";
import { useMetricEvents, useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, KpiCard, FilterSelect,
  Table, Tr, Td, formatCompact, formatBytes,
} from "@/shared/observe";
import { Gauge, Donut, MultiLineChart, BarList, MultiLineChart as Area, StatTile, CHART_COLORS } from "./widgets";
import { seededSeries } from "./lib";

const TIME_OPTIONS = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
];

const SERVICES = ["api-gateway", "user-service", "payment-service", "analytics-service"];
const QUEUES = [
  { name: "Event ingestion", depth: 240, rate: 1850, lag: 2 },
  { name: "Dead letter queue", depth: 18, rate: 4, lag: 0 },
  { name: "Background jobs", depth: 1240, rate: 320, lag: 74 },
];

export default function InfrastructureCost() {
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const metrics = useMetricEvents();
  const requests = useRequestEvents();

  const reqCount = (requests.data?.length ?? 0) * 1240 || 1_200_000;
  const infraCost = 504; // $/period (synthetic)
  const costPerMillion = (infraCost / (reqCount / 1_000_000)).toFixed(2);

  const connActive = 78;
  const connMax = 100;
  const connPct = (connActive / connMax) * 100;

  const cacheHits = 9240;
  const cacheMiss = 760;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Infrastructure & Cost Optimization"
        description="Optimize spend and infrastructure utilization · auto-refresh 5m."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Cost / 1M requests" value={`$${costPerMillion}`} delta="-$0.04 WoW" trend="up" icon={DollarSign} />
        <KpiCard label="Total requests" value={formatCompact(reqCount)} delta="this period" trend="neutral" />
        <KpiCard label="Infra spend" value={`$${infraCost}`} delta="+2.1% WoW" trend="down" />
        <KpiCard label="Metric series" value={metrics.data?.length ?? 0} delta="ingested" trend="neutral" />
      </div>

      <SectionCard title="Resource utilization by service" action={<Cpu className="size-4 text-[var(--text3)]" />}>
        <MultiLineChart
          series={SERVICES.map((svc, i) => ({ label: `${svc} CPU%`, color: CHART_COLORS[i % CHART_COLORS.length], data: seededSeries(svc + "cpu", 32, 45 + i * 8, 25) }))}
        />
        <div className="mt-2 text-[11px] text-[var(--text3)]">Threshold lines at 80% CPU / 85% memory. Color: emerald healthy · amber warning · rose critical.</div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="DB connection pool" action={<Database className="size-4 text-[var(--text3)]" />}>
          <div className="flex items-center gap-4">
            <Gauge value={connPct} label={`${Math.round(connPct)}%`} sublabel={`${connActive}/${connMax} active`} size={130} color={connPct > 95 ? "var(--red)" : connPct > 80 ? "var(--amber)" : "var(--green)"} />
            <div className="flex flex-1 flex-col gap-2 text-[12px]">
              <StatTile label="Avg wait time" value="12ms" />
              <StatTile label="Acquire failures/min" value={connPct > 80 ? "3" : "0"} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Cache hit / miss ratio">
          <Donut
            segments={[{ label: "Hits", value: cacheHits, color: "var(--green)" }, { label: "Misses", value: cacheMiss, color: "var(--amber)" }]}
            centerLabel={`${Math.round((cacheHits / (cacheHits + cacheMiss)) * 100)}%`}
            centerSub="hit rate"
            size={140}
          />
          <div className="mt-2 text-[11px] text-[var(--text3)]">Target &gt; 90% · Redis / CDN / query cache layers.</div>
        </SectionCard>

        <SectionCard title="Serverless cold starts">
          <BarList
            items={[
              { label: "payment-handler", value: 42, sub: "12% billed", color: "var(--red)" },
              { label: "auth-verify", value: 28, sub: "8% billed", color: "var(--amber)" },
              { label: "health-check", value: 9, sub: "3% billed", color: "var(--green)" },
              { label: "image-resize", value: 16, sub: "6% billed", color: "var(--amber)" },
            ]}
            valueFormat={(v) => `${v}/min`}
          />
          <div className="mt-2 text-[11px] text-[var(--text3)]">Suggestion: increase provisioned concurrency for payment-handler.</div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Queue depth & processing lag">
          <Table headers={["Queue", "Depth", "Rate/s", "Lag", "Status"]}>
            {QUEUES.map((q) => {
              const alert = q.depth > 1000 || q.lag > 60;
              return (
                <Tr key={q.name}>
                  <Td className="font-medium">{q.name}</Td>
                  <Td className="tabular-nums">{q.depth.toLocaleString()}</Td>
                  <Td className="tabular-nums">{q.rate.toLocaleString()}</Td>
                  <Td className="tabular-nums">{q.lag}s</Td>
                  <Td><span style={{ color: alert ? "var(--red)" : "var(--green)" }}>{alert ? "Alert" : "OK"}</span></Td>
                </Tr>
              );
            })}
          </Table>
          <div className="mt-3"><Area series={[{ label: "Event ingestion depth", color: "var(--brand)", data: seededSeries("queue", 32, 240, 200) }]} height={120} /></div>
        </SectionCard>

        <SectionCard title="Storage growth projection" action={<HardDrive className="size-4 text-[var(--text3)]" />}>
          <Area
            series={[
              { label: "Events", color: CHART_COLORS[0], data: seededSeries("st-events", 32, 120, 60).map((v, i) => v + i * 4) },
              { label: "Logs", color: CHART_COLORS[1], data: seededSeries("st-logs", 32, 80, 40).map((v, i) => v + i * 3) },
              { label: "Traces", color: CHART_COLORS[3], data: seededSeries("st-traces", 32, 60, 30).map((v, i) => v + i * 2) },
            ]}
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatTile label="Current usage" value={formatBytes(412 * 1024 * 1024 * 1024)} />
            <StatTile label="30-day forecast" value={formatBytes(680 * 1024 * 1024 * 1024)} />
            <StatTile label="Projected cost" value="$1,240" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
