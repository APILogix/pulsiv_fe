import { useNavigate } from "react-router";
import { TrendingDown } from "lucide-react";
import { useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, FilterSelect,
  Table, Tr, Td, MonospaceText, formatCompact, formatLatency,
} from "@/shared/observe";
import { BarList, StackedBars, Funnel, MultiLineChart, StatTile, ChartCard, HeroBand, ZoneLabel, CHART_COLORS } from "./widgets";
import { percentile, groupBy, uniqueBy, seededSeries } from "./lib";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

function lifecycle(count: number, errRate: number): { label: string; tone: string } {
  if (count > 200 && errRate < 1) return { label: "Stable", tone: "var(--green)" };
  if (count < 40) return { label: "Deprecated", tone: "var(--text3)" };
  return { label: "Beta", tone: "var(--amber)" };
}

export default function BusinessMetrics() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const requests = useRequestEvents();
  const reqList = requests.data ?? [];
  const total = reqList.length || 1;

  const byEndpoint = Object.entries(groupBy(reqList, (r) => r.route))
    .map(([route, rs]) => {
      const errRate = (rs.filter((r) => r.statusCode >= 400).length / rs.length) * 100;
      return { route, count: rs.length, users: uniqueBy(rs.filter((r) => r.userId), (r) => r.userId!), errRate, life: lifecycle(rs.length, errRate) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const c4xx = reqList.filter((r) => r.statusCode >= 400 && r.statusCode < 500).length;
  const c5xx = reqList.filter((r) => r.statusCode >= 500).length;

  const tenants = Object.entries(groupBy(reqList, (r) => r.tenantId))
    .map(([id, rs]) => ({
      id, count: rs.length,
      users: uniqueBy(rs.filter((r) => r.userId), (r) => r.userId!),
      errRate: (rs.filter((r) => r.statusCode >= 500).length / rs.length) * 100,
      p95: percentile(rs.map((r) => r.latency), 95),
      growth: (((id.charCodeAt(id.length - 1) % 30) - 10)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="API Business Metrics"
        description="Treat the API as a product — measure adoption, friction, and value."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <HeroBand
        metrics={[
          { label: "Billable API calls", value: formatCompact(total * 1240), delta: "+9.4% MoM", trend: "up", spark: seededSeries("bm-calls", 20, 50, 15) },
          { label: "API revenue (est.)", value: `$${formatCompact(total * 1240 * 0.0004)}`, delta: "+12% MoM", trend: "up", spark: seededSeries("bm-rev", 20, 40, 12), sparkColor: "var(--green)" },
          { label: "4xx rate", value: `${((c4xx / total) * 100).toFixed(1)}%`, delta: "client-side", trend: "neutral", spark: seededSeries("bm-4xx", 20, 20, 8), sparkColor: "var(--amber)" },
          { label: "5xx rate", value: `${((c5xx / total) * 100).toFixed(2)}%`, delta: "server-side", trend: "down", spark: seededSeries("bm-5xx", 20, 8, 5), sparkColor: "var(--red)" },
        ]}
      />

      <ZoneLabel>Adoption</ZoneLabel>

      <SectionCard title="API endpoint adoption">
        <Table headers={["Endpoint", "Calls", "Unique users", "Error rate", "Lifecycle"]} maxHeight="26rem">
          {byEndpoint.map((e) => (
            <Tr key={e.route} onClick={() => navigate("/observability/requests")}>
              <Td><MonospaceText value={e.route} className="max-w-[300px]" /></Td>
              <Td className="tabular-nums">{formatCompact(e.count * 240)}</Td>
              <Td className="tabular-nums">{e.users}</Td>
              <Td className="tabular-nums">{e.errRate.toFixed(1)}%</Td>
              <Td><span className="rounded-[5px] px-2 py-0.5 text-[11px] font-medium" style={{ color: e.life.tone, background: "var(--bg2)" }}>{e.life.label}</span></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <ZoneLabel>Developer experience</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Developer error rate — 4xx vs 5xx"
          legend={[
            { label: "4xx — docs/integration friction", color: "var(--amber)" },
            { label: "5xx — infra failures", color: "var(--red)" },
          ]}
          timeAxis="14 days ago"
        >
          <StackedBars
            groups={Array.from({ length: 14 }, (_, i) => ({
              label: `${i}d`,
              segments: [
                { value: 20 + (i % 4) * 6, color: "var(--amber)" },
                { value: 4 + (i % 3) * 2, color: "var(--red)" },
              ],
            }))}
          />
        </ChartCard>

        <ChartCard title="Time to first 200 OK" headline="52 min" headlineLabel="median · target < 1h">
          <Funnel
            stages={[
              { label: "Account created", value: 1000 },
              { label: "First API key generated", value: 840 },
              { label: "First request received", value: 690 },
              { label: "First 200 OK", value: 610 },
            ]}
          />
        </ChartCard>
      </div>

      <ZoneLabel>Lifecycle &amp; retention</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="API version migration"
          legend={[
            { label: "v1", color: CHART_COLORS[4] },
            { label: "v2", color: CHART_COLORS[2] },
            { label: "v3", color: CHART_COLORS[0] },
          ]}
          timeAxis="30 days ago"
        >
          <MultiLineChart
            series={[
              { label: "v1", color: CHART_COLORS[4], data: seededSeries("v1", 30, 60, 20).map((v, i) => Math.max(5, v - i)) },
              { label: "v2", color: CHART_COLORS[2], data: seededSeries("v2", 30, 30, 15).map((v, i) => v + i) },
              { label: "v3", color: CHART_COLORS[0], data: seededSeries("v3", 30, 5, 10).map((v, i) => v + i * 2) },
            ]}
          />
          <div className="mt-3 rounded-[8px] bg-[var(--amber-bg)] px-3 py-2 text-[12px] text-[var(--amber)]">v1 deprecated in 45 days — 22% of traffic still using it.</div>
        </ChartCard>

        <ChartCard title="Customer churn signal" action={<TrendingDown className="size-4 text-[var(--text3)]" />}>
          <div className="flex flex-col gap-2">
            {[
              { tenant: "tenant-acme", state: "Churned", days: 30, tone: "var(--red)" },
              { tenant: "tenant-globex", state: "At risk", days: 9, tone: "var(--amber)" },
              { tenant: "tenant-initech", state: "At risk", days: 7, tone: "var(--amber)" },
              { tenant: "tenant-umbrella", state: "Active", days: 1, tone: "var(--green)" },
            ].map((c) => (
              <div key={c.tenant} className="flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
                <span className="size-2 rounded-full" style={{ background: c.tone }} />
                <span className="flex-1 font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{c.tenant}</span>
                <span className="text-[12px]" style={{ color: c.tone }}>{c.state}</span>
                <span className="text-[11px] text-[var(--text3)]">{c.days}d idle</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ZoneLabel>Revenue</ZoneLabel>

      <SectionCard title="Top API consumers (tenants)">
        <Table headers={["Tenant", "Calls", "% traffic", "Users", "Err %", "P95", "Growth WoW"]}>
          {tenants.map((t) => (
            <Tr key={t.id} onClick={() => navigate(`/dashboards/geo`)}>
              <Td><MonospaceText value={t.id} /></Td>
              <Td className="tabular-nums">{formatCompact(t.count * 240)}</Td>
              <Td className="tabular-nums">{Math.round((t.count / total) * 100)}%</Td>
              <Td className="tabular-nums">{t.users}</Td>
              <Td className="tabular-nums">{t.errRate.toFixed(1)}%</Td>
              <Td className="tabular-nums">{formatLatency(t.p95)}</Td>
              <Td><span style={{ color: t.growth >= 0 ? "var(--green)" : "var(--red)" }} className="tabular-nums">{t.growth >= 0 ? "+" : ""}{t.growth}%</span></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <SectionCard title="API revenue attribution">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Total billable" value={formatCompact(total * 1240)} />
          <StatTile label="Overage charges" value="$2,140" tone="var(--amber)" />
          <StatTile label="Top endpoint rev" value="$8,420" />
          <StatTile label="Q3 forecast" value="$142k" tone="var(--green)" />
        </div>
        <div className="mt-4">
          <BarList
            items={byEndpoint.slice(0, 6).map((e) => ({ label: e.route, value: Math.round(e.count * 240 * 0.0004 * 100), color: CHART_COLORS[0] }))}
            valueFormat={(v) => `$${(v / 100).toFixed(2)}`}
          />
        </div>
      </SectionCard>
    </div>
  );
}
