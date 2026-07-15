import { useRequestEvents, useErrorEvents } from "@/hooks/useDummyData";
import {
  percentile, errorRate, seededSeries,
} from "@/pages/dashboards/lib";
import { formatCompact, formatLatency } from "@/shared/observe";

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — sections that lack a live API use stable fixtures.
   ═══════════════════════════════════════════════════════════════ */

const SERVICES = [
  { name: "ingest-gateway", uptime: 99.99, latency: 38, healthy: true },
  { name: "query-engine", uptime: 99.97, latency: 84, healthy: true },
  { name: "alert-dispatcher", uptime: 98.41, latency: 412, healthy: false },
  { name: "auth-service", uptime: 100, latency: 22, healthy: true },
  { name: "trace-collector", uptime: 99.95, latency: 61, healthy: true },
];

type Severity = "critical" | "warning" | "info";

const ACTIVITY: { sev: Severity; title: string; src: string; at: string }[] = [
  { sev: "critical", title: "Elevated 5xx on alert-dispatcher", src: "alert-dispatcher", at: "14:22" },
  { sev: "warning", title: "P99 latency spike on /api/v1/ingest", src: "ingest-gateway", at: "14:08" },
  { sev: "info", title: "Deploy v2.41.0 rolled out", src: "query-engine", at: "11:38" },
  { sev: "warning", title: "Rate limit threshold reached (org acme)", src: "ingest-gateway", at: "09:47" },
];

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/events", req: "812K", p95: "96ms", err: "0.12%", errHigh: false },
  { method: "POST", path: "/api/v1/ingest", req: "644K", p95: "211ms", err: "0.31%", errHigh: true },
  { method: "GET", path: "/api/v1/projects/:id/metrics", req: "389K", p95: "148ms", err: "0.09%", errHigh: false },
  { method: "GET", path: "/api/v1/traces/:id", req: "271K", p95: "176ms", err: "0.44%", errHigh: true },
  { method: "POST", path: "/auth/sessions/refresh", req: "184K", p95: "64ms", err: "0.02%", errHigh: false },
];

const STATUS_BUCKETS = [
  { t: "00:00", s2: 28000, s4: 1800, s5: 400 },
  { t: "04:00", s2: 22000, s4: 1200, s5: 200 },
  { t: "08:00", s2: 68000, s4: 4500, s5: 700 },
  { t: "12:00", s2: 118000, s4: 8200, s5: 1800 },
  { t: "16:00", s2: 135000, s4: 9500, s5: 2200 },
  { t: "20:00", s2: 85000, s4: 5000, s5: 900 },
];

const TIME_LABELS = [
  "00:00", "02:00", "04:00", "06:00", "08:00", "10:00",
  "12:00", "14:00", "16:00", "18:00", "20:00", "22:00",
];

const METHOD_CLR: Record<string, string> = {
  GET: "var(--get)", POST: "var(--green)", PUT: "var(--amber)", DELETE: "var(--red)",
};

const SEV_MAP: Record<Severity, { bg: string; fg: string; label: string }> = {
  critical: { bg: "rgba(239,68,68,0.15)", fg: "#ef4444", label: "CRITICAL" },
  warning: { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b", label: "WARNING" },
  info: { bg: "rgba(59,130,246,0.15)", fg: "#3b82f6", label: "Info" },
};

/* ═══════════════════════════════════════════════════════════════
   SVG PATH HELPERS — smooth cubic-bezier curves for charts
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

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;

/* ═══════════════════════════════════════════════════════════════
   SMALL PRESENTATIONAL COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/** Tiny inline sparkline-style trend indicator next to delta values. */
function TrendWave({ color }: { color: string }) {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" className="inline-block align-middle mr-1">
      <polyline
        points="0,8 5,5 10,7 16,3 22,1"
        fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function TopKpiRow({ total, rate, p95Val, degradedCount }: { total: number, rate: number, p95Val: number, degradedCount: number }) {
  return (
    <div className="flex flex-row overflow-x-auto rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* KPI 1 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)] font-[family-name:var(--mono)]">
          API CALLS (24H)
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[28px] font-bold tabular-nums leading-none text-[var(--text)]">
            {formatCompact(total * 1240)}
          </span>
          <TrendWave color="#34d399" />
        </div>
        <div className="mt-2 text-[12px] font-medium" style={{ color: "#34d399" }}>
          +12.4% vs prev
        </div>
      </div>
      {/* KPI 2 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)] font-[family-name:var(--mono)]">
          ERROR RATE
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[28px] font-bold tabular-nums leading-none text-[var(--text)]">
            {rate.toFixed(2)}%
          </span>
          <TrendWave color="#ef4444" />
        </div>
        <div className="mt-2 text-[12px] font-medium" style={{ color: "#34d399" }}>
          -0.08% vs prev
        </div>
      </div>
      {/* KPI 3 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)] font-[family-name:var(--mono)]">
          P95 LATENCY
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[28px] font-bold tabular-nums leading-none text-[var(--text)]">
            {formatLatency(p95Val)}
          </span>
          <TrendWave color="#8b5cf6" />
        </div>
        <div className="mt-2 text-[12px] font-medium" style={{ color: "#34d399" }}>
          -22ms vs prev
        </div>
      </div>
      {/* KPI 4 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)] font-[family-name:var(--mono)]">
          AVAILABILITY
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[28px] font-bold tabular-nums leading-none text-[var(--text)]">
            {degradedCount > 0 ? "77.20%" : "99.99%"}
          </span>
        </div>
        <div className="mt-2 text-[12px] font-medium" style={{ color: "#34d399" }}>
          +0.01%
        </div>
      </div>
      {/* KPI 5 */}
      <div className="flex-1 p-5 min-w-[200px]">
        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)] font-[family-name:var(--mono)]">
          REVENUE AT RISK
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[28px] font-bold tabular-nums leading-none text-[var(--text)]">
            $4,845
          </span>
        </div>
        <div className="mt-2 text-[12px] font-medium" style={{ color: "#ef4444" }}>
          17 failed payments
        </div>
      </div>
    </div>
  );
}

/** Generic chart wrapper card with title + optional right-aligned badge. */
function ChartCard({ title, badge, children }: {
  title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">{title}</h3>
        {badge && (
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text3)] font-[family-name:var(--mono)]">
            {badge}
          </span>
        )}
      </div>
      <div className="px-2 pb-3">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHART COMPONENTS — pure SVG, no external charting library
   ═══════════════════════════════════════════════════════════════ */

const Y_VOL = [0, 40, 80, 120, 160]; // thousands

function VolumeChart({ data, errData }: { data: number[]; errData: number[] }) {
  const W = 760, H = 240, PL = 42, PR = 8, PT = 10, PB = 28;
  const cw = W - PL - PR, ch = H - PT - PB;
  const max = 160000;
  const toY = (v: number) => PT + ch - (v / max) * ch;
  const toX = (i: number, len: number) => PL + (i / (len - 1)) * cw;
  const base = PT + ch;

  const pts = data.map((v, i): [number, number] => [toX(i, data.length), toY(v)]);
  const ePts = errData.map((v, i): [number, number] => [toX(i, errData.length), toY(v)]);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="dash-vol-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {/* Y-axis gridlines + labels */}
      {Y_VOL.map((k) => {
        const y = toY(k * 1000);
        return (
          <g key={k}>
            <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={PL - 6} y={y + 3} textAnchor="end" fill="var(--text3)" fontSize={10} style={MONO}>
              {k === 0 ? "0" : `${k}k`}
            </text>
          </g>
        );
      })}
      {/* Main volume area + line */}
      <path d={smoothArea(pts, base)} fill="url(#dash-vol-grad)" />
      <path d={smoothLine(pts)} fill="none" stroke="#34d399" strokeWidth={2} />
      {/* Error volume (red trace at the bottom) */}
      <path d={smoothArea(ePts, base)} fill="rgba(239,68,68,0.06)" />
      <path d={smoothLine(ePts)} fill="none" stroke="#ef4444" strokeWidth={1.5} />
      {/* X-axis time labels */}
      {TIME_LABELS.map((l, i) => (
        <text key={l} x={PL + (i / (TIME_LABELS.length - 1)) * cw} y={H - 5}
          textAnchor="middle" fill="var(--text3)" fontSize={10} style={MONO}>{l}</text>
      ))}
    </svg>
  );
}

function LatencyChart({ p50, p95, p99 }: { p50: number[]; p95: number[]; p99: number[] }) {
  const W = 760, H = 240, PL = 42, PR = 8, PT = 10, PB = 28;
  const cw = W - PL - PR, ch = H - PT - PB;
  const max = 600;
  const yVals = [0, 150, 300, 450, 600];
  const toY = (v: number) => PT + ch - (v / max) * ch;
  const toX = (i: number, len: number) => PL + (i / (len - 1)) * cw;
  const mkPts = (d: number[]): [number, number][] => d.map((v, i) => [toX(i, d.length), toY(v)]);

  const lines = [
    { data: p50, color: "#34d399", label: "p50" },
    { data: p95, color: "#818cf8", label: "p95" },
    { data: p99, color: "#f59e0b", label: "p99" },
  ];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
        {yVals.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PL - 6} y={y + 3} textAnchor="end" fill="var(--text3)" fontSize={10} style={MONO}>{v}</text>
            </g>
          );
        })}
        {lines.map((s) => (
          <path key={s.label} d={smoothLine(mkPts(s.data))} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
        {TIME_LABELS.map((l, i) => (
          <text key={l} x={PL + (i / (TIME_LABELS.length - 1)) * cw} y={H - 5}
            textAnchor="middle" fill="var(--text3)" fontSize={10} style={MONO}>{l}</text>
        ))}
      </svg>
      <div className="flex items-center gap-5 px-5 pt-1">
        {lines.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusCodesChart() {
  const W = 700, H = 280, PL = 42, PR = 8, PT = 10, PB = 28;
  const cw = W - PL - PR, ch = H - PT - PB;
  const max = 160000;
  const yVals = [0, 40, 80, 120, 160];
  const n = STATUS_BUCKETS.length;
  const bw = cw / n;
  const barW = bw * 0.55;
  const toY = (v: number) => PT + ch - (v / max) * ch;
  const base = PT + ch;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
        {yVals.map((k) => {
          const y = toY(k * 1000);
          return (
            <g key={k}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PL - 6} y={y + 3} textAnchor="end" fill="var(--text3)" fontSize={10} style={MONO}>
                {k === 0 ? "0" : `${k}k`}
              </text>
            </g>
          );
        })}
        {STATUS_BUCKETS.map((b, i) => {
          const cx = PL + i * bw + bw / 2;
          const x = cx - barW / 2;
          const h2 = (b.s2 / max) * ch;
          const h4 = (b.s4 / max) * ch;
          const h5 = (b.s5 / max) * ch;
          return (
            <g key={b.t}>
              {/* 2xx — green (base) */}
              <rect x={x} y={base - h2} width={barW} height={h2} fill="#34d399" rx={2} />
              {/* 4xx — amber (stacked) */}
              <rect x={x} y={base - h2 - h4} width={barW} height={h4} fill="#f59e0b" />
              {/* 5xx — red (top) */}
              <rect x={x} y={base - h2 - h4 - h5} width={barW} height={h5} fill="#ef4444" rx={2} />
              <text x={cx} y={H - 5} textAnchor="middle" fill="var(--text3)" fontSize={10} style={MONO}>
                {b.t}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-5 px-5 pt-1">
        {[
          { c: "#34d399", l: "2xx" },
          { c: "#f59e0b", l: "4xx" },
          { c: "#ef4444", l: "5xx" },
        ].map((x) => (
          <span key={x.l} className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: x.c }} />
            {x.l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDE PANELS
   ═══════════════════════════════════════════════════════════════ */

function ServiceHealthPanel() {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5">
      <h3 className="text-[14px] font-semibold text-[var(--text)] mb-4">Service health</h3>
      <div className="flex flex-col gap-3">
        {SERVICES.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ background: s.healthy ? "#34d399" : "#f59e0b" }}
            />
            <span className="flex-1 text-[13px] text-[var(--text)] font-[family-name:var(--mono)] truncate">
              {s.name}
            </span>
            <span className="text-[12px] tabular-nums text-[var(--text2)] w-14 text-right">
              {s.uptime === 100 ? "100%" : `${s.uptime.toFixed(2)}%`}
            </span>
            <span className="text-[12px] tabular-nums text-[var(--text3)] w-12 text-right">
              {s.latency}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivityPanel() {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5">
      <h3 className="text-[14px] font-semibold text-[var(--text)] mb-4">Recent activity</h3>
      <div className="flex flex-col gap-4">
        {ACTIVITY.map((a) => {
          const s = SEV_MAP[a.sev];
          return (
            <div key={`${a.title}-${a.at}`} className="flex gap-3">
              <span
                className="shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-snug mt-0.5"
                style={{ background: s.bg, color: s.fg }}
              >
                {s.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-[var(--text)] leading-snug">{a.title}</div>
                <div className="text-[11px] text-[var(--text3)] mt-0.5">
                  {a.src} · {a.at}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopEndpointsPanel() {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">Top endpoints</h3>
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text3)] font-[family-name:var(--mono)]">
          BY VOLUME
        </span>
      </div>
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_70px_60px] gap-2 px-5 pb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)] font-[family-name:var(--mono)]">
        <span>ENDPOINT</span>
        <span className="text-right">REQUESTS</span>
        <span className="text-right">P95</span>
        <span className="text-right">ERR %</span>
      </div>
      {/* Rows */}
      {ENDPOINTS.map((ep) => (
        <div
          key={ep.path}
          className="grid grid-cols-[1fr_80px_70px_60px] gap-2 items-center px-5 py-2.5 border-t border-[var(--border)] hover:bg-[var(--bg2)]/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[12px] font-bold font-[family-name:var(--mono)] shrink-0"
              style={{ color: METHOD_CLR[ep.method] ?? "var(--text2)" }}
            >
              {ep.method}
            </span>
            <span className="text-[13px] text-[var(--text)] font-[family-name:var(--mono)] truncate">
              {ep.path}
            </span>
          </div>
          <span className="text-[13px] tabular-nums text-[var(--text)] text-right">{ep.req}</span>
          <span className="text-[13px] tabular-nums text-[var(--text2)] text-right">{ep.p95}</span>
          <span
            className="text-[13px] tabular-nums text-right font-medium"
            style={{ color: ep.errHigh ? "#ef4444" : "var(--text2)" }}
          >
            {ep.err}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-[1400px] mx-auto w-full">
      <div className="h-14" />
      {/* TopKpiRow Skeleton */}
      <div className="flex flex-row gap-0 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`ks-${i}`} className="h-[140px] flex-1 border-r border-[var(--border)] animate-pulse bg-[var(--bg2)] min-w-[200px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[300px] animate-pulse rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]" />
        <div className="h-[300px] animate-pulse rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-[340px] animate-pulse rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]" />
        <div className="lg:col-span-2 h-[340px] animate-pulse rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const requests = useRequestEvents();
  const errors = useErrorEvents();

  if (requests.isLoading || errors.isLoading) {
    return <DashboardSkeleton />;
  }

  const reqList = requests.data ?? [];
  const latencies = reqList.map((r) => r.latency);
  const total = reqList.length;
  const p95Val = percentile(latencies, 95);
  const rate = errorRate(reqList);

  // Stable seeded chart series (no per-render randomness)
  const volumeData = seededSeries("dash-vol-24h", 24, 85000, 40000);
  const errorVolData = seededSeries("dash-err-24h", 24, 2000, 1500);
  const p50Data = seededSeries("dash-lat-p50", 24, 55, 15);
  const p95Data = seededSeries("dash-lat-p95", 24, 140, 40);
  const p99Data = seededSeries("dash-lat-p99", 24, 350, 180);

  const healthyCount = SERVICES.filter((s) => s.healthy).length;
  const degradedCount = SERVICES.length - healthyCount;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-[1400px] mx-auto w-full">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--text)]">Dashboard</h1>
        <p className="mt-1 text-[13px] text-[var(--text2)]">
          API monitoring overview across all connected services.
        </p>
      </div>

      {/* ── KPI Metrics ── */}
      <TopKpiRow 
        total={total} 
        rate={rate} 
        p95Val={p95Val} 
        degradedCount={degradedCount} 
      />

      {/* ── Request Volume + Latency Percentiles ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Request volume" badge="LAST 24H">
          <VolumeChart data={volumeData} errData={errorVolData} />
        </ChartCard>
        <ChartCard title="Latency percentiles" badge="MS · LAST 24H">
          <LatencyChart p50={p50Data} p95={p95Data} p99={p99Data} />
        </ChartCard>
      </div>

      {/* ── Status Codes / Top Endpoints + Service Health / Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column: charts & table */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <ChartCard title="Status codes" badge="LAST 24H">
            <StatusCodesChart />
          </ChartCard>
          <TopEndpointsPanel />
        </div>
        {/* Right column: health & activity */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <ServiceHealthPanel />
          <RecentActivityPanel />
        </div>
      </div>
    </div>
  );
}
