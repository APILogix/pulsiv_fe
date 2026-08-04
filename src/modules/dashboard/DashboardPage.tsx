import { useRequestEvents, useErrorEvents } from "@/hooks/useDummyData";
import {
  percentile, errorRate, seededSeries,
} from "@/pages/dashboards/lib";
import { formatCompact, formatLatency } from "@/shared/observe";
import { AiActionButton, AiInsightCard, AiWatchingDot } from "@/shared/ui/sentinel";

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
  GET: "var(--blue)", POST: "var(--green)", PUT: "var(--amber)", DELETE: "var(--red)",
};

const SEV_MAP: Record<Severity, { bg: string; fg: string; label: string }> = {
  critical: { bg: "var(--red-bg)", fg: "var(--red)", label: "critical" },
  warning: { bg: "var(--amber-bg)", fg: "var(--amber)", label: "warning" },
  info: { bg: "var(--blue-bg)", fg: "var(--blue)", label: "info" },
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
    <div className="flex flex-row overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* KPI 1 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
          API calls (24h)
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-[family-name:var(--mono)] text-[28px] font-medium tabular-nums leading-none tracking-[-0.02em] text-[var(--text)]">
            {formatCompact(total * 1240)}
          </span>
          <TrendWave color="var(--green)" />
        </div>
        <div className="mt-2 font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums" style={{ color: "var(--green)" }}>
          +12.4% vs prev
        </div>
      </div>
      {/* KPI 2 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
          Error rate
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-[family-name:var(--mono)] text-[28px] font-medium tabular-nums leading-none tracking-[-0.02em] text-[var(--text)]">
            {rate.toFixed(2)}%
          </span>
          <TrendWave color="var(--red)" />
        </div>
        <div className="mt-2 font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums" style={{ color: "var(--green)" }}>
          -0.08% vs prev
        </div>
      </div>
      {/* KPI 3 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
          P95 latency
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-[family-name:var(--mono)] text-[28px] font-medium tabular-nums leading-none tracking-[-0.02em] text-[var(--text)]">
            {formatLatency(p95Val)}
          </span>
          <TrendWave color="var(--violet)" />
        </div>
        <div className="mt-2 font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums" style={{ color: "var(--green)" }}>
          -22ms vs prev
        </div>
      </div>
      {/* KPI 4 */}
      <div className="flex-1 p-5 border-r border-[var(--border)] min-w-[200px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
          Availability
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-[family-name:var(--mono)] text-[28px] font-medium tabular-nums leading-none tracking-[-0.02em] text-[var(--text)]">
            {degradedCount > 0 ? "77.20%" : "99.99%"}
          </span>
        </div>
        <div className="mt-2 font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums" style={{ color: "var(--green)" }}>
          +0.01%
        </div>
      </div>
      {/* KPI 5 */}
      <div className="flex-1 p-5 min-w-[200px]">
        <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
          Revenue at risk
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-[family-name:var(--mono)] text-[28px] font-medium tabular-nums leading-none tracking-[-0.02em] text-[var(--text)]">
            $4,845
          </span>
        </div>
        <div className="mt-2 font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums" style={{ color: "var(--red)" }}>
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">{title}</h3>
        {badge && (
          <span className="text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
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
      {/* Request volume is the product's own data → brand channel (§2.7),
          with a flat low-alpha fill (§3). Green is reserved for verdicts. */}
      <path d={smoothArea(pts, base)} fill="var(--brand)" fillOpacity={0.16} />
      <path d={smoothLine(pts)} fill="none" stroke="var(--brand)" strokeWidth={2} />
      {/* Error volume — the truth channel reporting facts. */}
      <path d={smoothArea(ePts, base)} fill="var(--red-bg)" />
      <path d={smoothLine(ePts)} fill="none" stroke="var(--red)" strokeWidth={1.5} />
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

  // Measured percentiles are product data, not verdicts and not model output:
  // brand → blue → amber. Cyan stays reserved for the AI channel (§2.4, §11.3).
  const lines = [
    { data: p50, color: "var(--brand)", label: "p50" },
    { data: p95, color: "var(--blue)", label: "p95" },
    { data: p99, color: "var(--amber)", label: "p99" },
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
              <rect x={x} y={base - h2} width={barW} height={h2} fill="var(--green)" rx={2} />
              {/* 4xx — amber (stacked) */}
              <rect x={x} y={base - h2 - h4} width={barW} height={h4} fill="var(--amber)" />
              {/* 5xx — red (top) */}
              <rect x={x} y={base - h2 - h4 - h5} width={barW} height={h5} fill="var(--red)" rx={2} />
              <text x={cx} y={H - 5} textAnchor="middle" fill="var(--text3)" fontSize={10} style={MONO}>
                {b.t}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-5 px-5 pt-1">
        {[
          { c: "var(--green)", l: "2xx" },
          { c: "var(--amber)", l: "4xx" },
          { c: "var(--red)", l: "5xx" },
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
      <h3 className="text-[14px] font-semibold text-[var(--text)] mb-4">Service health</h3>
      <div className="flex flex-col gap-3">
        {SERVICES.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ background: s.healthy ? "var(--green)" : "var(--amber)" }}
            />
            <span className="flex-1 text-[13px] text-[var(--text)] font-[family-name:var(--mono)] truncate">
              {s.name}
            </span>
            <span className="w-14 text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
              {s.uptime === 100 ? "100%" : `${s.uptime.toFixed(2)}%`}
            </span>
            <span className="w-12 text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
      <h3 className="text-[14px] font-semibold text-[var(--text)] mb-4">Recent activity</h3>
      <div className="flex flex-col gap-4">
        {ACTIVITY.map((a) => {
          const s = SEV_MAP[a.sev];
          return (
            <div key={`${a.title}-${a.at}`} className="flex gap-3">
              <span
                className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] leading-snug"
                style={{ background: s.bg, color: s.fg }}
              >
                {s.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-[var(--text)] leading-snug">{a.title}</div>
                <div className="mt-0.5 font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--text3)]">
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">Top endpoints</h3>
        <span className="text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
          By volume
        </span>
      </div>
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_70px_60px] gap-2 px-5 pb-2 text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] font-[family-name:var(--mono)]">
        <span>Endpoint</span>
        <span className="text-right">Requests</span>
        <span className="text-right">P95</span>
        <span className="text-right">Err %</span>
      </div>
      {/* Rows */}
      {ENDPOINTS.map((ep) => (
        <div
          key={ep.path}
          className="grid grid-cols-[1fr_80px_70px_60px] gap-2 items-center px-5 py-2.5 border-t border-[var(--border)] hover:bg-[var(--bg2)]/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] font-medium uppercase tracking-[0.08em] font-[family-name:var(--mono)] shrink-0"
              style={{ color: METHOD_CLR[ep.method] ?? "var(--text2)" }}
            >
              {ep.method}
            </span>
            <span className="text-[12px] text-[var(--text)] font-[family-name:var(--mono)] truncate">
              {ep.path}
            </span>
          </div>
          <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)] text-right">{ep.req}</span>
          <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)] text-right">{ep.p95}</span>
          <span
            className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-right font-medium"
            style={{ color: ep.errHigh ? "var(--red)" : "var(--text2)" }}
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
      <div className="flex flex-row gap-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`ks-${i}`} className="loading-skeleton h-[140px] flex-1 border-r border-[var(--border)] bg-[var(--bg2)] min-w-[200px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="loading-skeleton h-[300px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]" />
        <div className="loading-skeleton h-[300px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="loading-skeleton lg:col-span-3 h-[340px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]" />
        <div className="loading-skeleton lg:col-span-2 h-[340px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]" />
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--display)] text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)]">Dashboard</h1>
          <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text2)]">
            API monitoring overview across all connected services.
          </p>
        </div>
        <AiWatchingDot />
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
        <ChartCard title="Request volume" badge="Last 24h">
          <VolumeChart data={volumeData} errData={errorVolData} />
        </ChartCard>
        <ChartCard title="Latency percentiles" badge="ms · last 24h">
          <LatencyChart p50={p50Data} p95={p95Data} p99={p99Data} />
        </ChartCard>
      </div>

      {/* ── Status Codes / Top Endpoints + Service Health / Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column: charts & table */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <ChartCard title="Status codes" badge="Last 24h">
            <StatusCodesChart />
          </ChartCard>
          <TopEndpointsPanel />
        </div>
        {/* Right column: AI insights rail, health & activity (§5.2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <AiInsightCard
            title="Latency anomaly on alert-dispatcher"
            confidence={94}
            action={<AiActionButton>Apply fix</AiActionButton>}
          >
            P99 on alert-dispatcher has drifted {degradedCount > 0 ? "4.9×" : "1.2×"} above its
            30-day baseline since 14:05. The pattern matches queue backpressure, not a code
            regression.
          </AiInsightCard>
          <ServiceHealthPanel />
          <RecentActivityPanel />
        </div>
      </div>
    </div>
  );
}
