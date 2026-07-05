// ============================================================
// Dashboard widget kit — dependency-free SVG charts + primitives.
// Pure functions (rules.md §1.2 — React Compiler memoizes automatically).
// No useEffect data fetching, no manual memoization, stable keys only.
// ============================================================
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared chart palette (CSS vars defined in theme).
export const CHART_COLORS = [
  "var(--brand)",
  "var(--blue)",
  "var(--green)",
  "var(--amber)",
  "var(--red)",
  "var(--violet)",
] as const;

export function toneForThreshold(value: number, good: number, warn: number, invert = false): string {
  if (invert) {
    if (value <= good) return "var(--green)";
    if (value <= warn) return "var(--amber)";
    return "var(--red)";
  }
  if (value >= good) return "var(--green)";
  if (value >= warn) return "var(--amber)";
  return "var(--red)";
}

// ── Circular gauge (0–max) ──
export function Gauge({
  value,
  max = 100,
  label,
  sublabel,
  color,
  size = 160,
}: {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // 270° sweep
  const dash = arc * pct;
  const tone = color ?? toneForThreshold(pct * 100, 90, 70);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[135deg]">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--bg3)" strokeWidth={stroke}
            strokeDasharray={`${arc} ${c}`} strokeLinecap="round"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={tone} strokeWidth={stroke}
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums text-[var(--text)]">{label ?? Math.round(value)}</span>
        </div>
      </div>
      {sublabel && (
        <span className="mt-2 max-w-[200px] text-center text-[11px] leading-snug text-[var(--text3)] line-clamp-2">{sublabel}</span>
      )}
    </div>
  );
}

// ── Donut / pie distribution ──
export interface DonutSegment { label: string; value: number; color: string }
export function Donut({ segments, centerLabel, centerSub, size = 160 }: {
  segments: DonutSegment[];
  centerLabel?: string;
  centerSub?: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Precompute arc length + cumulative offset purely (no mutation during render).
  const arcs = segments.reduce<{ seg: DonutSegment; len: number; offset: number }[]>((acc, seg) => {
    const len = (seg.value / total) * c;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
    acc.push({ seg, len, offset });
    return acc;
  }, []);
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {arcs.map(({ seg, len, offset }) => (
            <circle
              key={seg.label}
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
            />
          ))}
        </svg>
        {centerLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums text-[var(--text)]">{centerLabel}</span>
            {centerSub && <span className="text-[11px] text-[var(--text3)]">{centerSub}</span>}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-[12px]">
            <span className="size-2.5 rounded-[3px]" style={{ background: seg.color }} />
            <span className="flex-1 truncate text-[var(--text2)]">{seg.label}</span>
            <span className="tabular-nums font-medium text-[var(--text)]">{seg.value.toLocaleString()}</span>
            <span className="w-10 text-right tabular-nums text-[var(--text3)]">{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ranked horizontal bar list (Top N) ──
export interface BarListItem { label: string; value: number; sub?: string; color?: string; onClick?: () => void }
export function BarList({ items, valueFormat }: { items: BarListItem[]; valueFormat?: (v: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={cn("group relative block w-full overflow-hidden rounded-[7px] text-left", item.onClick && "cursor-pointer")}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-[7px] opacity-25 transition-all"
            style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? "var(--brand)" }}
          />
          <div className="relative flex items-center justify-between px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{item.label}</span>
            {item.sub && <span className="mr-3 shrink-0 text-[11px] text-[var(--text3)]">{item.sub}</span>}
            <span className="shrink-0 tabular-nums text-[12px] font-semibold text-[var(--text)]">
              {valueFormat ? valueFormat(item.value) : item.value.toLocaleString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Multi-line chart (percentiles, series over time) ──
export interface LineSeries { label: string; color: string; data: number[] }
export function MultiLineChart({ series, height = 200, logScale = false }: {
  series: LineSeries[];
  height?: number;
  logScale?: boolean;
}) {
  const width = 720;
  const pad = 8;
  const all = series.flatMap((s) => s.data);
  const transform = (v: number) => (logScale ? Math.log10(Math.max(1, v)) : v);
  const max = Math.max(...all.map(transform), 1);
  const min = Math.min(...all.map(transform), 0);
  const range = max - min || 1;
  const count = Math.max(...series.map((s) => s.data.length), 1);
  const step = (width - pad * 2) / (count - 1 || 1);
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={width} y1={height * g} y2={height * g} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s) => {
          const pts = s.data
            .map((d, i) => `${pad + i * step},${height - pad - ((transform(d) - min) / range) * (height - pad * 2)}`)
            .join(" ");
          return <polyline key={s.label} points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
            <span className="h-1 w-3 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Area chart (single series, gradient fill) — crisp at any width ──
export function AreaChart({ data, color = "var(--brand)", height = 220, label }: {
  data: number[];
  color?: string;
  height?: number;
  label?: string;
}) {
  const width = 720;
  const pad = 10;
  const gradId = `area-grad-${label?.replace(/\W/g, "") ?? "x"}`;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = (width - pad * 2) / (data.length - 1 || 1);
  const pts = data.map((d, i) => [pad + i * step, height - pad - ((d - min) / range) * (height - pad * 2)] as const);
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${pad + (data.length - 1) * step},${height - pad}`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} x2={width} y1={height * g} y2={height * g} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      ))}
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Dual-axis chart: bars (volume) + line (errors) ──
export function DualAxisChart({ bars, line, height = 220 }: { bars: number[]; line: number[]; height?: number }) {
  const width = 720;
  const pad = 8;
  const barMax = Math.max(...bars, 1);
  const lineMax = Math.max(...line, 1);
  const n = bars.length;
  const bw = (width - pad * 2) / n;
  const linePts = line
    .map((d, i) => `${pad + i * bw + bw / 2},${height - pad - (d / lineMax) * (height - pad * 2)}`)
    .join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full">
      {bars.map((b, i) => {
        const h = (b / barMax) * (height - pad * 2);
        return (
          <rect
            key={i}
            x={pad + i * bw + bw * 0.15}
            y={height - pad - h}
            width={bw * 0.7}
            height={h}
            rx={2}
            fill="var(--brand)"
            opacity={0.55}
          />
        );
      })}
      <polyline points={linePts} fill="none" stroke="var(--red)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Stacked bar chart (per-group severity/status stacks) ──
export interface StackGroup { label: string; segments: { value: number; color: string }[] }
export function StackedBars({ groups, horizontal = false }: { groups: StackGroup[]; horizontal?: boolean }) {
  const totals = groups.map((g) => g.segments.reduce((s, x) => s + x.value, 0));
  const max = Math.max(...totals, 1);
  if (horizontal) {
    return (
      <div className="flex flex-col gap-2.5">
        {groups.map((g, gi) => (
          <div key={g.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-[12px] text-[var(--text2)]">{g.label}</span>
            <div className="flex h-5 flex-1 overflow-hidden rounded-[5px] bg-[var(--bg3)]">
              {g.segments.map((seg, si) => (
                <div key={si} style={{ width: `${(seg.value / max) * 100}%`, background: seg.color }} />
              ))}
            </div>
            <span className="w-12 shrink-0 text-right tabular-nums text-[12px] font-medium text-[var(--text)]">{totals[gi].toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2" style={{ height: 200 }}>
      {groups.map((g) => {
        const total = g.segments.reduce((s, x) => s + x.value, 0);
        return (
          <div key={g.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-col-reverse overflow-hidden rounded-[5px]" style={{ height: `${(total / max) * 170}px` }}>
              {g.segments.map((seg, si) => (
                <div key={si} style={{ height: `${(seg.value / total) * 100}%`, background: seg.color }} />
              ))}
            </div>
            <span className="w-full truncate text-center text-[10px] text-[var(--text3)]">{g.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Time × bucket heatmap ──
export function Heatmap({ rows, columns }: { rows: { label: string; cells: number[] }[]; columns?: number }) {
  const max = Math.max(...rows.flatMap((r) => r.cells), 1);
  const cols = columns ?? Math.max(...rows.map((r) => r.cells.length), 1);
  return (
    <div className="flex flex-col gap-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-right font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{row.label}</span>
          <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {row.cells.map((cell, i) => {
              const intensity = cell / max;
              return (
                <div
                  key={i}
                  title={`${row.label}: ${cell.toLocaleString()}`}
                  className="h-5 rounded-[3px]"
                  style={{ background: `color-mix(in oklab, var(--brand) ${Math.round(intensity * 100)}%, var(--bg3))` }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Funnel chart ──
export interface FunnelStage { label: string; value: number }
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, i) => {
        const pct = (stage.value / max) * 100;
        const prev = i > 0 ? stages[i - 1].value : stage.value;
        const conv = prev ? Math.round((stage.value / prev) * 100) : 100;
        return (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate text-[12px] text-[var(--text2)]">{stage.label}</span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-[6px] bg-[var(--bg3)]">
              <div
                className="flex h-full items-center justify-end rounded-[6px] pr-2 text-[11px] font-semibold text-[var(--brand-fg)]"
                style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                {stage.value.toLocaleString()}
              </div>
            </div>
            <span className="w-12 shrink-0 text-right tabular-nums text-[11px] text-[var(--text3)]">{conv}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Alert / regression banner ──
const BANNER_TONE: Record<string, string> = {
  amber: "border-[var(--amber)]/40 bg-[var(--amber-bg)] text-[var(--amber)]",
  red: "border-[var(--red)]/40 bg-[var(--red-bg)] text-[var(--red)]",
  blue: "border-[var(--blue)]/40 bg-[var(--blue-bg)] text-[var(--blue)]",
  green: "border-[var(--green)]/40 bg-[var(--green-bg)] text-[var(--green)]",
};
export function Banner({ tone = "amber", icon: Icon, title, action }: {
  tone?: "amber" | "red" | "blue" | "green";
  icon?: LucideIcon;
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-[10px] border px-4 py-3 text-[13px]", BANNER_TONE[tone])}>
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="flex-1">{title}</span>
      {action}
    </div>
  );
}

// ── Chart card: title + inline legend + headline values, body, time axis ──
export interface ChartLegendItem { label: string; color: string; value?: string }
export function ChartCard({ title, legend, headline, headlineLabel, action, children, timeAxis, className }: {
  title: string;
  legend?: ChartLegendItem[];
  headline?: string;
  headlineLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  timeAxis?: string; // e.g. "24 hours ago"
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-[var(--text)]">{title}</h3>
            {action}
          </div>
          {legend && legend.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {legend.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
                  <span className="size-2 rounded-full" style={{ background: l.color }} />
                  {l.label}
                  {l.value && <strong className="tabular-nums font-semibold text-[var(--text)]">{l.value}</strong>}
                </span>
              ))}
            </div>
          )}
        </div>
        {headline && (
          <div className="text-right">
            <div className="text-xl font-semibold tabular-nums leading-tight text-[var(--text)]">{headline}</div>
            {headlineLabel && <div className="text-[11px] text-[var(--text3)]">{headlineLabel}</div>}
          </div>
        )}
      </div>
      <div className="flex-1 px-5 pb-2 pt-3">{children}</div>
      {timeAxis && (
        <div className="flex items-center justify-between px-5 pb-3 text-[10px] uppercase tracking-wider text-[var(--text3)]">
          <span>{timeAxis}</span>
          <span>Now</span>
        </div>
      )}
    </div>
  );
}

// ── Hero band: single card, divided KPI columns (Vercel-observability style) ──
export interface HeroMetric {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  spark?: number[];
  sparkColor?: string;
}
const HERO_TREND: Record<string, string> = {
  up: "text-[var(--green)]",
  down: "text-[var(--red)]",
  neutral: "text-[var(--text3)]",
};
export function HeroBand({ metrics }: { metrics: HeroMetric[] }) {
  return (
    <div className="grid grid-cols-2 divide-[var(--border)] overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] max-lg:gap-px max-lg:bg-[var(--border)] lg:grid-cols-none lg:auto-cols-fr lg:grid-flow-col lg:divide-x">
      {metrics.map((m) => (
        <div key={m.label} className="flex flex-col gap-1 bg-[var(--bg1)] px-5 py-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">{m.label}</span>
          <div className="flex items-end justify-between gap-2">
            <span className="text-[22px] font-semibold tabular-nums leading-none text-[var(--text)]">{m.value}</span>
            {m.spark && <MiniSpark data={m.spark} color={m.sparkColor ?? "var(--brand)"} />}
          </div>
          {m.delta && <span className={cn("text-[11px] font-medium", HERO_TREND[m.trend ?? "neutral"])}>{m.delta}</span>}
        </div>
      ))}
    </div>
  );
}

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const w = 64;
  const h = 22;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const pts = data.map((d, i) => `${i * step},${h - ((d - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible opacity-80">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Section label: uppercase divider between dashboard zones ──
export function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text3)]">{children}</span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

// ── Big stat with optional sparkline (count-up handled by caller) ──
export function StatTile({ label, value, delta, tone, footer }: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: tone ?? "var(--text)" }}>{value}</div>
      {delta && <div className="mt-1 text-[12px] text-[var(--text2)]">{delta}</div>}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
