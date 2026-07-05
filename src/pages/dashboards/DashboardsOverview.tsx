import { useNavigate } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, LineChart, AlertTriangle, Globe, Radar, ListTree,
  Database, ShieldAlert, Activity, BadgeDollarSign, ArrowUpRight,
} from "lucide-react";
import { useErrorGroups, useRequestEvents, useTraceEvents } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, KpiCard, MetricSparkline, formatCompact, formatLatency,
} from "@/shared/observe";
import { percentile, errorRate, seededSeries, uniqueBy, countryForIp } from "./lib";

interface MiniStat { label: string; value: string }
interface DashCard {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  to: string;
  color: string;
  stats: MiniStat[];
  spark: number[];
}

export default function DashboardsOverview() {
  const navigate = useNavigate();
  const requests = useRequestEvents();
  const errors = useErrorGroups();
  const traces = useTraceEvents();

  const reqList = requests.data ?? [];
  const groupList = errors.data ?? [];
  const traceList = traces.data ?? [];

  const total = reqList.length;
  const latencies = reqList.map((r) => r.latency);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const rate = errorRate(reqList);
  const availability = total ? (reqList.filter((r) => r.statusCode < 500).length / total) * 100 : 100;
  const latencyScore = Math.max(0, 100 - p95 / 10);
  const healthScore = Math.round(availability * 0.4 + (1 - rate / 100) * 100 * 0.35 + latencyScore * 0.25);

  const totalErrors = groupList.reduce((s, g) => s + g.count, 0);
  const affectedUsers = new Set(groupList.flatMap((g) => [...g.affectedUsers])).size;
  const authFails = reqList.filter((r) => r.statusCode === 401 || r.statusCode === 403).length;
  const rateLimited = reqList.filter((r) => r.statusCode === 429).length;
  const securityScore = Math.max(0, Math.min(100, 92 - authFails * 2 - rateLimited));
  const countries = uniqueBy(reqList, (r) => countryForIp(r.clientIp).code);
  const avgSpans = traceList.length ? Math.round(traceList.reduce((s, t) => s + t.spanCount, 0) / traceList.length) : 0;
  const avgTrace = traceList.length ? Math.round(traceList.reduce((s, t) => s + t.totalDuration, 0) / traceList.length) : 0;

  const cards: DashCard[] = [
    {
      id: "executive", title: "Executive Command Center", desc: "Single-pane portfolio health.",
      icon: LayoutDashboard, to: "/dashboards/executive", color: "var(--brand)",
      stats: [{ label: "Health", value: `${healthScore}` }, { label: "Error rate", value: `${rate.toFixed(2)}%` }, { label: "Availability", value: `${availability.toFixed(2)}%` }],
      spark: seededSeries("exec", 24, 70, 25),
    },
    {
      id: "performance", title: "Performance Deep Dive", desc: "Latency percentiles & slow paths.",
      icon: LineChart, to: "/dashboards/performance", color: "var(--blue)",
      stats: [{ label: "P95", value: formatLatency(p95) }, { label: "P99", value: formatLatency(p99) }, { label: "Requests", value: formatCompact(total) }],
      spark: seededSeries("perf", 24, 80, 40),
    },
    {
      id: "errors", title: "Error Triage", desc: "Grouped errors & regressions.",
      icon: AlertTriangle, to: "/dashboards/errors", color: "var(--red)",
      stats: [{ label: "Errors", value: formatCompact(totalErrors) }, { label: "Groups", value: `${groupList.length}` }, { label: "Users", value: formatCompact(affectedUsers) }],
      spark: seededSeries("err", 24, 40, 35),
    },
    {
      id: "geo", title: "Geo Analytics", desc: "Distribution, devices, funnel.",
      icon: Globe, to: "/dashboards/geo", color: "var(--violet)",
      stats: [{ label: "Countries", value: `${countries}` }, { label: "Sessions", value: formatCompact(total * 2) }, { label: "DAU", value: formatCompact(affectedUsers * 12 || 1240) }],
      spark: seededSeries("geo", 24, 60, 20),
    },
    {
      id: "realtime", title: "Real-time Traffic", desc: "Live RPS, status, top routes.",
      icon: Radar, to: "/dashboards/realtime", color: "var(--green)",
      stats: [{ label: "RPS", value: formatCompact(Math.round(total / 12)) }, { label: "5xx", value: `${reqList.filter((r) => r.statusCode >= 500).length}` }, { label: "Conns", value: formatCompact(total * 4) }],
      spark: seededSeries("rt", 24, 90, 30),
    },
    {
      id: "tracing", title: "Tracing & Dependency Map", desc: "Traces, service graph, DB calls.",
      icon: ListTree, to: "/dashboards/tracing", color: "var(--blue)",
      stats: [{ label: "Traces", value: `${traceList.length}` }, { label: "Avg spans", value: `${avgSpans}` }, { label: "Avg dur", value: formatLatency(avgTrace) }],
      spark: seededSeries("trace", 24, 50, 25),
    },
    {
      id: "infrastructure", title: "Infrastructure & Cost", desc: "Cost/1M, utilization, pools.",
      icon: Database, to: "/dashboards/infrastructure", color: "var(--amber)",
      stats: [{ label: "Cost/1M", value: "$4.12" }, { label: "CPU", value: "62%" }, { label: "Cache hit", value: "94%" }],
      spark: seededSeries("infra", 24, 55, 18),
    },
    {
      id: "security", title: "Security & Threats", desc: "Auth failures, anomalies, keys.",
      icon: ShieldAlert, to: "/dashboards/security", color: securityScore < 50 ? "var(--red)" : securityScore < 80 ? "var(--amber)" : "var(--green)",
      stats: [{ label: "Score", value: `${securityScore}` }, { label: "Failed auth", value: `${authFails}` }, { label: "429s", value: `${rateLimited}` }],
      spark: seededSeries("sec", 24, 30, 28),
    },
    {
      id: "releases", title: "Release Quality", desc: "Release comparison, DORA, canary.",
      icon: Activity, to: "/dashboards/releases", color: "var(--green)",
      stats: [{ label: "Latest", value: "v2.4.1" }, { label: "New errors", value: "7" }, { label: "Status", value: "Stable" }],
      spark: seededSeries("rel", 24, 75, 22),
    },
    {
      id: "business", title: "Business Metrics", desc: "Adoption, migration, revenue.",
      icon: BadgeDollarSign, to: "/dashboards/business", color: "var(--brand)",
      stats: [{ label: "MRR", value: "$48.2k" }, { label: "Adoption", value: "73%" }, { label: "Churn", value: "1.8%" }],
      spark: seededSeries("biz", 24, 65, 20),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="A single glance across every Pulse dashboard — jump into any view for the full picture."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Health score" value={healthScore} trend={healthScore > 80 ? "up" : "down"} delta={`${availability.toFixed(1)}% uptime`} icon={LayoutDashboard} />
        <KpiCard label="Requests (24h)" value={formatCompact(total * 1240)} trend="up" delta="+12.4%" icon={Globe} />
        <KpiCard label="Error rate" value={`${rate.toFixed(2)}%`} trend="up" delta="-0.08%" icon={AlertTriangle} />
        <KpiCard label="P95 latency" value={formatLatency(p95)} trend="up" delta="-22ms" icon={LineChart} />
        <KpiCard label="Security" value={securityScore} trend={securityScore > 80 ? "up" : "down"} delta={`${authFails} auth fails`} icon={ShieldAlert} />
        <KpiCard label="Traces" value={traceList.length} delta={`${avgSpans} avg spans`} icon={ListTree} />
      </div>

      <SectionCard title="All dashboards">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.to)}
                className="group flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-4 text-left transition-colors hover:border-[var(--input)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-[9px]" style={{ background: "color-mix(in oklab, " + card.color + " 14%, transparent)" }}>
                      <Icon className="size-5" style={{ color: card.color }} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-[var(--text)]">{card.title}</div>
                      <div className="truncate text-[11px] text-[var(--text3)]">{card.desc}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-[var(--text3)] transition-colors group-hover:text-[var(--brand)]" />
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div className="flex gap-4">
                    {card.stats.map((s) => (
                      <div key={s.label}>
                        <div className="text-[15px] font-semibold tabular-nums text-[var(--text)]">{s.value}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <MetricSparkline data={card.spark} color={card.color} width={88} height={32} />
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
