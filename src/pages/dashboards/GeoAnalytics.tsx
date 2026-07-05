import { Smartphone, Globe2 } from "lucide-react";
import { useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, FilterSelect,
  Table, Tr, Td, formatCompact, formatLatency,
} from "@/shared/observe";
import { Donut, BarList, Funnel, StatTile, ChartCard, HeroBand, ZoneLabel, CHART_COLORS } from "./widgets";
import { percentile, groupBy, uniqueBy, seededSeries } from "./lib";
import { WorldChoropleth, type CountryDatum } from "./WorldChoropleth";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

// Stable weighted traffic distribution so the geo view is always fully populated,
// scaled by the live request volume in the selected range.
const COUNTRY_WEIGHTS: { code: string; name: string; flag: string; weight: number }[] = [
  { code: "US", name: "United States", flag: "🇺🇸", weight: 32 },
  { code: "IN", name: "India", flag: "🇮🇳", weight: 18 },
  { code: "DE", name: "Germany", flag: "🇩🇪", weight: 11 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", weight: 9 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", weight: 7 },
  { code: "JP", name: "Japan", flag: "🇯🇵", weight: 6 },
  { code: "FR", name: "France", flag: "🇫🇷", weight: 5 },
  { code: "CA", name: "Canada", flag: "🇨🇦", weight: 4 },
  { code: "AU", name: "Australia", flag: "🇦🇺", weight: 4 },
  { code: "SG", name: "Singapore", flag: "🇸🇬", weight: 4 },
];
const TOTAL_WEIGHT = COUNTRY_WEIGHTS.reduce((s, c) => s + c.weight, 0);

// Deterministic per-country jitter so latency/error figures are stable across renders
function hashJitter(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const t = (Math.abs(h) % 1000) / 1000;
  return min + t * (max - min);
}

export default function GeoAnalytics() {
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const requests = useRequestEvents();
  const reqList = requests.data ?? [];

  const totalReq = (reqList.length || 100) * 240;
  const baseP95 = percentile(reqList.map((r) => r.latency), 95) || 320;

  const countries: CountryDatum[] = COUNTRY_WEIGHTS.map((c) => ({
    code: c.code,
    name: c.name,
    flag: c.flag,
    share: c.weight / TOTAL_WEIGHT,
    requests: Math.round(totalReq * (c.weight / TOTAL_WEIGHT)),
    p95: baseP95 * hashJitter(c.code + "lat", 0.7, 1.9),
    errRate: hashJitter(c.code + "err", 0.05, 1.4),
  }));
  const topCountry = countries[0];

  const dau = uniqueBy(reqList.filter((r) => r.userId), (r) => r.userId!) || 125;
  const mau = Math.round(dau * 4.2);

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
          { label: "Countries", value: countries.length, delta: "Global reach", trend: "neutral" },
          { label: "Top region", value: topCountry.code, delta: `${Math.round(topCountry.share * 100)}% of traffic`, trend: "neutral" },
        ]}
      />

      <ZoneLabel>Global traffic</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Request volume by country"
          action={<Globe2 className="size-4 text-[var(--text3)]" />}
          headline={formatCompact(totalReq)}
          headlineLabel="total requests"
          className="lg:col-span-2"
        >
          <WorldChoropleth data={countries} formatRequests={formatCompact} />
          <div className="flex items-center justify-end gap-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--text3)]">
            <span>Low</span>
            <div className="flex h-2 w-24 overflow-hidden rounded-full">
              {[0.25, 0.4, 0.55, 0.7, 0.85, 1].map((o) => (
                <span key={o} className="h-full flex-1" style={{ background: "var(--brand)", opacity: o }} />
              ))}
            </div>
            <span>High</span>
          </div>
        </ChartCard>

        <ChartCard title="Top countries" headlineLabel="by share of traffic">
          <div className="flex flex-col gap-2.5">
            {countries.slice(0, 8).map((c, i) => (
              <div key={c.code} className="flex items-center gap-2.5">
                <span className="w-4 text-right text-[11px] tabular-nums text-[var(--text3)]">{i + 1}</span>
                <span className="text-base leading-none">{c.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-[var(--text)]">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-[11px] text-[var(--text2)]">{formatCompact(c.requests)} · {Math.round(c.share * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]">
                    <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(c.share / countries[0].share) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <SectionCard title="Country detail">
        <Table headers={["Country", "Requests", "% traffic", "Est. users", "P95 latency", "Error rate"]}>
          {countries.map((c) => (
            <Tr key={c.code}>
              <Td><span className="flex items-center gap-2">{c.flag} {c.name}</span></Td>
              <Td className="tabular-nums">{formatCompact(c.requests)}</Td>
              <Td className="tabular-nums">{Math.round(c.share * 100)}%</Td>
              <Td className="tabular-nums">{formatCompact(Math.round(dau * c.share * 3.4))}</Td>
              <Td><span style={{ color: c.p95 > 500 ? "var(--amber)" : "var(--green)" }} className="tabular-nums">{formatLatency(c.p95)}</span></Td>
              <Td className="tabular-nums">{c.errRate.toFixed(2)}%</Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <ZoneLabel>Devices &amp; platforms</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Browser breakdown" action={<Smartphone className="size-4 text-[var(--text3)]" />} legend={browsers.map((b) => ({ label: b.label, color: b.color }))}>
          <Donut segments={browsers} centerLabel={formatCompact(totalReq)} centerSub="requests" size={140} />
        </ChartCard>
        <ChartCard title="Operating system breakdown">
          <BarList items={os.map((o) => ({ label: o.label, value: o.value, color: o.color }))} />
        </ChartCard>
        <ChartCard title="Active users">
          <div className="flex flex-col gap-3">
            <StatTile label="New users today" value={formatCompact(Math.round(dau * 0.18))} />
            <StatTile label="Returning users" value={formatCompact(Math.round(dau * 0.82))} />
          </div>
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
