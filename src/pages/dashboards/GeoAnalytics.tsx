import { Smartphone } from "lucide-react";
import { useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, FilterSelect,
  Table, Tr, Td, formatCompact, formatLatency,
} from "@/shared/observe";
import { Donut, BarList, Funnel, StatTile, ChartCard, HeroBand, ZoneLabel, CHART_COLORS } from "./widgets";
import { percentile, countryForIp, groupBy, uniqueBy, seededSeries } from "./lib";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

export default function GeoAnalytics() {
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const requests = useRequestEvents();
  const reqList = requests.data ?? [];

  const byCountry = Object.entries(
    groupBy(reqList, (r) => countryForIp(r.clientIp).code)
  ).map(([code, rs]) => {
    const meta = countryForIp(rs[0].clientIp);
    return {
      code,
      name: meta.name,
      flag: meta.flag,
      count: rs.length,
      users: uniqueBy(rs.filter((r) => r.userId), (r) => r.userId!),
      p95: percentile(rs.map((r) => r.latency), 95),
      errRate: (rs.filter((r) => r.statusCode >= 500).length / rs.length) * 100,
    };
  }).sort((a, b) => b.count - a.count);

  const totalReq = reqList.length || 1;
  const dau = uniqueBy(reqList.filter((r) => r.userId), (r) => r.userId!);
  const mau = Math.round(dau * 4.2);

  // User-agent buckets (synthetic from userAgent string heuristics)
  const browsers = bucketUserAgent(reqList, [
    ["Chrome", /Chrome/], ["Safari", /Safari/], ["Firefox", /Firefox/], ["Edge", /Edg/],
  ]);
  const os = bucketUserAgent(reqList, [
    ["Windows", /Windows/], ["macOS", /Mac OS/], ["Linux", /Linux/], ["iOS", /iPhone|iPad/], ["Android", /Android/],
  ]);

  const tenants = Object.entries(groupBy(reqList, (r) => r.tenantId))
    .map(([id, rs]) => ({
      id, count: rs.length,
      users: uniqueBy(rs.filter((r) => r.userId), (r) => r.userId!),
      p95: percentile(rs.map((r) => r.latency), 95),
      errRate: (rs.filter((r) => r.statusCode >= 500).length / rs.length) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="User Distribution & Geo-Analytics"
        description="Who uses the API, from where, on what devices, and how usage patterns vary."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <HeroBand
        metrics={[
          { label: "DAU", value: formatCompact(dau), delta: "+6.2% vs prev", trend: "up", spark: seededSeries("geo-dau", 20, 50, 15) },
          { label: "MAU", value: formatCompact(mau), delta: "+3.1% vs prev", trend: "up", spark: seededSeries("geo-mau", 20, 60, 12), sparkColor: "var(--blue)" },
          { label: "DAU/MAU ratio", value: `${Math.round((dau / mau) * 100)}%`, delta: "Engagement", trend: "neutral" },
          { label: "Countries", value: byCountry.length, delta: "Global reach", trend: "neutral" },
        ]}
      />

      <ZoneLabel>Geography</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Request volume by country" headline={formatCompact(totalReq * 240)} headlineLabel="total requests" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {byCountry.map((c) => (
              <div key={c.code} className="flex items-center gap-2 py-1">
                <span className="text-base">{c.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-[12px] text-[var(--text)]">{c.name}</span>
                    <span className="tabular-nums text-[11px] text-[var(--text3)]">{Math.round((c.count / totalReq) * 100)}%</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]">
                    <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(c.count / byCountry[0].count) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Active users">
          <div className="flex flex-col gap-3">
            <StatTile label="New users today" value={formatCompact(Math.round(dau * 0.18))} />
            <StatTile label="Returning users" value={formatCompact(Math.round(dau * 0.82))} />
          </div>
        </ChartCard>
      </div>

      <SectionCard title="Top countries by volume">
        <Table headers={["Country", "Requests", "% traffic", "Unique users", "P95 latency", "Error rate"]}>
          {byCountry.map((c) => (
            <Tr key={c.code}>
              <Td><span className="flex items-center gap-2">{c.flag} {c.name}</span></Td>
              <Td className="tabular-nums">{formatCompact(c.count * 240)}</Td>
              <Td className="tabular-nums">{Math.round((c.count / totalReq) * 100)}%</Td>
              <Td className="tabular-nums">{c.users}</Td>
              <Td><span style={{ color: c.p95 > 500 ? "var(--amber)" : "var(--green)" }} className="tabular-nums">{formatLatency(c.p95)}</span></Td>
              <Td className="tabular-nums">{c.errRate.toFixed(2)}%</Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <ZoneLabel>Devices &amp; platforms</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Browser breakdown" action={<Smartphone className="size-4 text-[var(--text3)]" />}>
          <Donut segments={browsers} centerLabel={formatCompact(totalReq * 240)} centerSub="requests" />
        </ChartCard>
        <ChartCard title="Operating system breakdown">
          <BarList items={os.map((o) => ({ label: o.label, value: o.value, color: o.color }))} />
        </ChartCard>
      </div>

      <ZoneLabel>Tenants &amp; adoption</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Tenant distribution (top 10)">
          <Table headers={["Tenant", "Requests", "Users", "P95", "Err %"]}>
            {tenants.map((t) => (
              <Tr key={t.id}>
                <Td><span className="font-[family-name:var(--mono)] text-[12px]">{t.id}</span></Td>
                <Td className="tabular-nums">{formatCompact(t.count * 240)}</Td>
                <Td className="tabular-nums">{t.users}</Td>
                <Td className="tabular-nums">{formatLatency(t.p95)}</Td>
                <Td className="tabular-nums">{t.errRate.toFixed(1)}%</Td>
              </Tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="API adoption funnel">
          <Funnel
            stages={[
              { label: "SDK installed", value: 1240 },
              { label: "First event received", value: 1080 },
              { label: "Active (7d)", value: 870 },
              { label: "Highly active (24h)", value: 540 },
            ]}
          />
          <div className="mt-4 text-[12px] text-[var(--text3)]">SDK version adoption: v2.x at 78% · v1.x at 22%</div>
        </SectionCard>
      </div>
    </div>
  );
}

function bucketUserAgent(reqs: { userAgent: string }[], matchers: [string, RegExp][]) {
  return matchers.map(([label, re], i) => ({
    label,
    value: reqs.filter((r) => re.test(r.userAgent)).length || (matchers.length - i) * 12,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
}
