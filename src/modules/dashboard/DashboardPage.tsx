import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Radio,
  Search,
  Server,
  Shield,
  Sparkles,
} from "lucide-react";
import { useRequestEvents } from "@/hooks/useDummyData";
import { percentile, errorRate, seededSeries } from "@/pages/dashboards/lib";
import { formatCompact, formatLatency } from "@/shared/observe";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   TYPES & MOCK TELEMETRY
   ═══════════════════════════════════════════════════════════════ */

type TimeRange = "15m" | "1h" | "6h" | "24h" | "7d";
type EnvFilter = "all" | "production" | "staging";

interface ServiceStatus {
  id: string;
  name: string;
  uptime: number;
  latencyP95: number;
  requests24h: number;
  status: "operational" | "degraded" | "outage";
  errorRate: number;
}

const SERVICES: ServiceStatus[] = [
  { id: "srv-ingest", name: "ingest-gateway", uptime: 99.99, latencyP95: 38, requests24h: 840000, status: "operational", errorRate: 0.04 },
  { id: "srv-query", name: "query-engine", uptime: 99.97, latencyP95: 84, requests24h: 420000, status: "operational", errorRate: 0.12 },
  { id: "srv-alert", name: "alert-dispatcher", uptime: 98.41, latencyP95: 412, requests24h: 180000, status: "degraded", errorRate: 2.84 },
  { id: "srv-auth", name: "auth-service", uptime: 100.0, latencyP95: 22, requests24h: 310000, status: "operational", errorRate: 0.01 },
  { id: "srv-trace", name: "trace-collector", uptime: 99.95, latencyP95: 61, requests24h: 670000, status: "operational", errorRate: 0.08 },
];

interface EndpointMetric {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  service: string;
  volume24h: string;
  p95Latency: number;
  p99Latency: number;
  errorPct: number;
}

const ENDPOINTS: EndpointMetric[] = [
  { method: "GET", path: "/api/v1/events", service: "query-engine", volume24h: "812K", p95Latency: 96, p99Latency: 142, errorPct: 0.12 },
  { method: "POST", path: "/api/v1/ingest", service: "ingest-gateway", volume24h: "644K", p95Latency: 211, p99Latency: 380, errorPct: 1.31 },
  { method: "GET", path: "/api/v1/projects/:id/metrics", service: "query-engine", volume24h: "389K", p95Latency: 148, p99Latency: 220, errorPct: 0.09 },
  { method: "GET", path: "/api/v1/traces/:id", service: "trace-collector", volume24h: "271K", p95Latency: 176, p99Latency: 310, errorPct: 0.44 },
  { method: "POST", path: "/auth/sessions/refresh", service: "auth-service", volume24h: "184K", p95Latency: 64, p99Latency: 92, errorPct: 0.02 },
  { method: "POST", path: "/api/v1/alerts/evaluate", service: "alert-dispatcher", volume24h: "112K", p95Latency: 412, p99Latency: 680, errorPct: 3.42 },
];

const TIME_POINTS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

/* ═══════════════════════════════════════════════════════════════
   SVG PATH GENERATORS
   ═══════════════════════════════════════════════════════════════ */

function smoothLine(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length === 1 ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C${cx},${pts[i - 1][1]} ${cx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
  }
  return d;
}

function smoothArea(pts: [number, number][], baseY: number): string {
  if (pts.length < 2) return "";
  return `${smoothLine(pts)} L${pts[pts.length - 1][0]},${baseY} L${pts[0][0]},${baseY} Z`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const navigate = useNavigate();
  const openInvestigate = useAiDrawerStore((s) => s.openInvestigate);
  const openChat = useAiDrawerStore((s) => s.openChat);

  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [envFilter, setEnvFilter] = useState<EnvFilter>("production");
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const requestsQuery = useRequestEvents();
  const reqList = requestsQuery.data ?? [];

  const latencies = reqList.map((r) => r.latency ?? 45);
  const totalCalls = reqList.length ? reqList.length * 1420 : 1248000;
  const p95Val = percentile(latencies, 95) || 94;
  const p99Val = percentile(latencies, 99) || 188;
  const computedErrRate = errorRate(reqList) || 0.28;

  // Stable seeded time-series curves
  const volSeries = useMemo(() => seededSeries("monitra-vol-main", 24, 62000, 34000), []);
  const errSeries = useMemo(() => seededSeries("monitra-err-main", 24, 1200, 900), []);
  const p50Series = useMemo(() => seededSeries("monitra-p50-main", 24, 42, 12), []);
  const p95Series = useMemo(() => seededSeries("monitra-p95-main", 24, 118, 38), []);

  const degradedServices = SERVICES.filter((s) => s.status !== "operational");

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return ENDPOINTS;
    const q = searchQuery.toLowerCase();
    return ENDPOINTS.filter((e) => e.path.toLowerCase().includes(q) || e.service.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Operational Command Header ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Control Room</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Production Telemetry</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            API Health & Observability
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Continuous performance, traffic, error distribution, and automated anomaly detection.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Streaming Toggle */}
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[12px] font-[family-name:var(--mono)] transition-colors",
              isLive
                ? "border-[var(--success)]/30 bg-[var(--success-muted)] text-[var(--success)]"
                : "border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-tertiary)]"
            )}
          >
            <span className={cn("size-1.5 rounded-full", isLive ? "bg-[var(--success)] animate-pulse" : "bg-[var(--text-tertiary)]")} />
            {isLive ? "LIVE STREAM" : "PAUSED"}
          </button>

          {/* Environment Filter */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] p-0.5 text-[12px]">
            {(["production", "staging"] as EnvFilter[]).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvFilter(env)}
                className={cn(
                  "rounded-[4px] px-2.5 py-1 capitalize transition-colors font-medium",
                  envFilter === env
                    ? "bg-[var(--surface-3)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {env}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] p-0.5 text-[12px] font-[family-name:var(--mono)]">
            {(["15m", "1h", "6h", "24h", "7d"] as TimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={cn(
                  "rounded-[4px] px-2 py-1 transition-colors uppercase",
                  timeRange === range
                    ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Ask AI Copilot Button */}
          <button
            type="button"
            onClick={() => openChat("Analyze current system health and show any active bottlenecks.")}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--brand)] hover:text-white"
          >
            <Sparkles className="size-3.5 text-[var(--brand)]" />
            <span>Ask Monitra AI</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip (Linear-style divided strip) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        {/* KPI 1: Ingested Calls */}
        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span>Total Calls</span>
            <Activity className="size-3.5 opacity-60" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
              {formatCompact(totalCalls)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-[family-name:var(--mono)] text-[var(--success)]">
            <span>↑ 12.4%</span>
            <span className="text-[var(--text-tertiary)]">vs prev</span>
          </div>
        </div>

        {/* KPI 2: Global Error Rate */}
        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span>Error Rate</span>
            <span className={cn("size-2 rounded-full", computedErrRate > 1.0 ? "bg-[var(--error)] animate-pulse" : "bg-[var(--success)]")} />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className={cn(
              "text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
              computedErrRate > 1.0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
            )}>
              {computedErrRate.toFixed(2)}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            <span className="text-[var(--success)]">-0.08%</span>
            <span>within 1.0% SLO</span>
          </div>
        </div>

        {/* KPI 3: P95 Latency */}
        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span>P95 Latency</span>
            <Clock className="size-3.5 opacity-60" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
              {formatLatency(p95Val)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            <span>P99: <span className="text-[var(--text-secondary)]">{formatLatency(p99Val)}</span></span>
          </div>
        </div>

        {/* KPI 4: Fleet Availability */}
        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span>Availability</span>
            <CheckCircle2 className="size-3.5 text-[var(--success)]" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
              {degradedServices.length > 0 ? "99.41%" : "99.99%"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            <span className={degradedServices.length > 0 ? "text-[var(--warning)] font-medium" : "text-[var(--success)]"}>
              {degradedServices.length > 0 ? `${degradedServices.length} degraded` : "All normal"}
            </span>
          </div>
        </div>

        {/* KPI 5: Active Incidents */}
        <div className="p-4 col-span-2 md:col-span-1 flex flex-col justify-between bg-[var(--surface-2)]/30">
          <div className="flex items-center justify-between text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span>Active Incidents</span>
            <Shield className="size-3.5 opacity-60" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className={cn(
              "text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
              degradedServices.length > 0 ? "text-[var(--warning)]" : "text-[var(--text-primary)]"
            )}>
              {degradedServices.length}
            </span>
            <Link to="/alerts" className="text-[11px] text-[var(--brand)] hover:underline flex items-center gap-0.5">
              Triage <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)] truncate">
            {degradedServices.length > 0 ? "Queue backpressure" : "0 firing alerts"}
          </div>
        </div>
      </div>

      {/* ── 3. Main Telemetry Graphs ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Graph A: Throughput & Error Volume */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Throughput & Failures</h3>
              <p className="text-[11px] text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Requests/sec vs HTTP 5xx errors</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-[family-name:var(--mono)] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--brand)]" />
                <span>Volume</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--error)]" />
                <span>Errors</span>
              </span>
            </div>
          </div>

          <div className="py-4">
            <svg width="100%" height="180" viewBox="0 0 600 180" className="overflow-visible">
              {[30, 80, 130].map((y) => (
                <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              {(() => {
                const W = 600, H = 160;
                const pts = volSeries.map((v, i): [number, number] => [(i / (volSeries.length - 1)) * W, H - (v / 120000) * (H - 20)]);
                const errPts = errSeries.map((v, i): [number, number] => [(i / (errSeries.length - 1)) * W, H - (v / 6000) * (H - 20)]);
                return (
                  <>
                    <path d={smoothArea(pts, H)} fill="var(--brand)" fillOpacity="0.08" />
                    <path d={smoothLine(pts)} fill="none" stroke="var(--brand)" strokeWidth="1.75" />
                    <path d={smoothLine(errPts)} fill="none" stroke="var(--error)" strokeWidth="1.5" />
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-between pt-2 text-[10px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              {TIME_POINTS.map((tp) => (
                <span key={tp}>{tp}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Graph B: Latency Percentile Profiles */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Latency Percentiles</h3>
              <p className="text-[11px] text-[var(--text-tertiary)] font-[family-name:var(--mono)]">P50 median vs P95 tail latency in milliseconds</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-[family-name:var(--mono)] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--info)]" />
                <span>P50</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--warning)]" />
                <span>P95</span>
              </span>
            </div>
          </div>

          <div className="py-4">
            <svg width="100%" height="180" viewBox="0 0 600 180" className="overflow-visible">
              {[30, 80, 130].map((y) => (
                <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              {(() => {
                const W = 600, H = 160;
                const p50Pts = p50Series.map((v, i): [number, number] => [(i / (p50Series.length - 1)) * W, H - (v / 200) * (H - 20)]);
                const p95Pts = p95Series.map((v, i): [number, number] => [(i / (p95Series.length - 1)) * W, H - (v / 200) * (H - 20)]);
                return (
                  <>
                    <path d={smoothLine(p50Pts)} fill="none" stroke="var(--info)" strokeWidth="1.75" />
                    <path d={smoothLine(p95Pts)} fill="none" stroke="var(--warning)" strokeWidth="1.75" />
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-between pt-2 text-[10px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              {TIME_POINTS.map((tp) => (
                <span key={tp}>{tp}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Split Operational Canvas (Endpoints Table + Services & AI Sentinel) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (7 cols): High-Density Endpoints Performance */}
        <div className="lg:col-span-7 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Hot Endpoints Performance</h3>
              <p className="text-[11px] text-[var(--text-tertiary)]">Ranked by 24-hour call volume & latency impact</p>
            </div>
            
            {/* Table Search Input */}
            <div className="relative max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Filter route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] pl-7 pr-2.5 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-[12px] font-normal">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/40 text-[10px] font-[family-name:var(--mono)] uppercase tracking-wider text-[var(--text-tertiary)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Method & Route</th>
                  <th className="px-3 py-2.5 font-medium">Service</th>
                  <th className="px-3 py-2.5 text-right font-medium">Volume</th>
                  <th className="px-3 py-2.5 text-right font-medium">P95 Tail</th>
                  <th className="px-3 py-2.5 text-right font-medium">Err %</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-[family-name:var(--mono)]">
                {filteredEndpoints.map((ep) => (
                  <tr
                    key={ep.path}
                    onClick={() => navigate(`/observability/requests`)}
                    className="group cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase shrink-0",
                          ep.method === "GET" && "bg-[var(--info-muted)] text-[var(--info)]",
                          ep.method === "POST" && "bg-[var(--success-muted)] text-[var(--success)]",
                          ep.method === "PUT" && "bg-[var(--warning-muted)] text-[var(--warning)]",
                          ep.method === "DELETE" && "bg-[var(--error-muted)] text-[var(--error)]",
                        )}>
                          {ep.method}
                        </span>
                        <span className="font-medium text-[var(--text-primary)] truncate max-w-[220px]">
                          {ep.path}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle text-[var(--text-secondary)] text-[11px] truncate">
                      {ep.service}
                    </td>
                    <td className="px-3 py-3 align-middle text-right text-[var(--text-primary)] tabular-nums">
                      {ep.volume24h}
                    </td>
                    <td className="px-3 py-3 align-middle text-right tabular-nums text-[var(--text-secondary)]">
                      <span className={ep.p95Latency > 300 ? "text-[var(--warning)] font-medium" : ""}>
                        {ep.p95Latency}ms
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-right tabular-nums">
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[10.5px] font-medium",
                        ep.errorPct > 1.0
                          ? "bg-[var(--error-muted)] text-[var(--error)]"
                          : "text-[var(--text-secondary)]"
                      )}>
                        {ep.errorPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvestigate({ resourceType: "error", publicId: ep.path });
                        }}
                        className="opacity-0 group-hover:opacity-100 rounded px-2 py-0.5 text-[10px] text-[var(--brand)] hover:bg-[var(--brand-muted)] transition-all"
                      >
                        Diagnose →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-2)]/20 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
            <span>Showing top {filteredEndpoints.length} active routes</span>
            <Link to="/observability/requests" className="text-[var(--brand)] hover:underline flex items-center gap-1 font-medium">
              View all requests explorer <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Right Column (5 cols): AI Sentinel + Service Matrix */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* AI Autonomous Sentinel Card */}
          <div className="rounded-[var(--radius-md)] border border-[var(--brand-border)] bg-[var(--surface-1)] p-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--brand)]" />
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">Autonomous Sentinel</span>
              </div>
              <span className="rounded-full bg-[var(--brand-muted)] px-2 py-0.5 text-[10px] font-[family-name:var(--mono)] text-[var(--brand)] font-medium">
                94% Confidence
              </span>
            </div>
            
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">Tail latency spike on alert-dispatcher</strong>: P99 latency drifted to 680ms due to pg-boss queue lock contention on batch deliveries.
            </p>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => openInvestigate({ resourceType: "error", publicId: "alert-dispatcher" })}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
              >
                Inspect root cause report →
              </button>
              <button
                type="button"
                onClick={() => openChat("How can I resolve queue lock contention in alert-dispatcher?")}
                className="rounded-[4px] bg-[var(--surface-3)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-4)] transition-colors"
              >
                Ask Copilot
              </button>
            </div>
          </div>

          {/* Connected Services Matrix */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Server className="size-4 text-[var(--text-tertiary)]" />
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Service Mesh Health</h3>
              </div>
              <Link to="/services" className="text-[11px] text-[var(--brand)] hover:underline">
                Catalog →
              </Link>
            </div>

            <div className="mt-2 divide-y divide-[var(--border-subtle)] font-[family-name:var(--mono)]">
              {SERVICES.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 text-[12px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "size-2 rounded-full shrink-0",
                      s.status === "operational" ? "bg-[var(--success)]" : "bg-[var(--warning)] animate-pulse"
                    )} />
                    <span className="font-medium text-[var(--text-primary)] truncate">{s.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-right tabular-nums text-[11px]">
                    <span className="text-[var(--text-secondary)]">{s.uptime}%</span>
                    <span className={cn(
                      "w-12",
                      s.latencyP95 > 100 ? "text-[var(--warning)] font-semibold" : "text-[var(--text-tertiary)]"
                    )}>
                      {s.latencyP95}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Live Telemetry Stream Ticker (Bottom Section) ───── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-[var(--brand)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Live Ingestion & Signal Feed</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--success)] animate-ping" />
              <span>Real-time ingestion active</span>
            </span>
          </div>
        </div>

        <div className="mt-3 divide-y divide-[var(--border-subtle)] font-[family-name:var(--mono)] text-[11px]">
          {reqList.slice(0, 5).map((req, idx) => (
            <div
              key={req.eventId ?? idx}
              onClick={() => navigate(`/observability/requests`)}
              className="flex items-center justify-between py-2 cursor-pointer hover:bg-[var(--surface-2)]/50 px-2 rounded transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[var(--text-tertiary)]">{new Date(req.timestamp ?? Date.now()).toLocaleTimeString()}</span>
                <span className={cn(
                  "rounded px-1 text-[9.5px] font-semibold",
                  req.method === "GET" && "bg-[var(--info-muted)] text-[var(--info)]",
                  req.method === "POST" && "bg-[var(--success-muted)] text-[var(--success)]"
                )}>
                  {req.method ?? "GET"}
                </span>
                <span className="text-[var(--text-primary)] truncate max-w-[300px]">{req.route ?? req.url ?? "/api/v1/telemetry"}</span>
              </div>

              <div className="flex items-center gap-4 text-right tabular-nums">
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  (req.statusCode ?? 200) < 400 ? "text-[var(--success)] bg-[var(--success-muted)]" : "text-[var(--error)] bg-[var(--error-muted)]"
                )}>
                  {req.statusCode ?? 200}
                </span>
                <span className="text-[var(--text-tertiary)] w-14">{req.latency ?? 34}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
