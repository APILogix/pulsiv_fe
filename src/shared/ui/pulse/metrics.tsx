import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconChip, type SurfaceTone } from "./surfaces";

// ── module-level constants (rules.md §1.2) ──

const TREND_TONE: Record<string, string> = {
  up: "text-[var(--green)] bg-[var(--green-bg)]",
  down: "text-[var(--red)] bg-[var(--red-bg)]",
  flat: "text-[var(--text3)] bg-[var(--bg2)]",
};

const TREND_ICON: Record<string, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

export type Trend = "up" | "down" | "flat";

// ── Trend pill ───────────────────────────────────────────────

export function TrendPill({ trend, children }: { trend: Trend; children: React.ReactNode }) {
  const Icon = TREND_ICON[trend];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        TREND_TONE[trend]
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}

// ── Sparkline (SVG, no deps) ─────────────────────────────────
// Uses a viewBox so it scales with the card instead of a fixed pixel width.

export function Sparkline({
  data,
  color = "var(--brand)",
  height = 36,
  fill = true,
  className,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  className?: string;
}) {
  if (data.length < 2) return null;

  const width = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((value, index) => `${(index * step).toFixed(2)},${(height - ((value - min) / range) * height).toFixed(2)}`);
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}-${data.length}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      height={height}
      className={cn("w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill={`url(#${gradientId})`} />
        </>
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Stat card ────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  unit,
  icon,
  tone = "brand",
  trend,
  delta,
  footnote,
  series,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: SurfaceTone;
  trend?: Trend;
  delta?: string;
  footnote?: string;
  series?: number[];
  className?: string;
}) {
  const accent = tone === "neutral" ? "var(--text3)" : `var(--${tone})`;
  return (
    <div
      className={cn(
        "pulse-edge pulse-lift relative flex flex-col overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg1)]",
        className
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text3)]">{label}</span>
          {icon && <IconChip icon={icon} tone={tone} size="sm" />}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-[family-name:var(--display)] text-[26px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-[var(--text)]">
            {value}
          </span>
          {unit && <span className="text-[12px] font-medium text-[var(--text3)]">{unit}</span>}
          {trend && delta && <TrendPill trend={trend}>{delta}</TrendPill>}
        </div>
        {footnote && <p className="text-[12px] leading-snug text-[var(--text3)]">{footnote}</p>}
      </div>
      {series && series.length > 1 && (
        <div className="-mb-px">
          <Sparkline data={series} color={accent} height={38} />
        </div>
      )}
    </div>
  );
}

// ── Meter ────────────────────────────────────────────────────
// Labeled progress bar. Tone auto-derives from utilisation unless overridden.

export function Meter({
  label,
  used,
  limit,
  format,
  tone,
  hint,
  className,
}: {
  label: string;
  used: number;
  /** `null` or `-1` renders as unlimited. */
  limit: number | null | undefined;
  format?: (value: number) => string;
  tone?: SurfaceTone;
  hint?: string;
  className?: string;
}) {
  const unlimited = limit === null || limit === undefined || limit === -1;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
  const derived: SurfaceTone = tone ?? (pct >= 90 ? "red" : pct >= 75 ? "amber" : "brand");
  const accent = `var(--${derived})`;
  const fmt = format ?? ((value: number) => value.toLocaleString("en-US"));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-medium text-[var(--text2)]">{label}</span>
        <span className="text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
          {fmt(used)}
          <span className="ml-1 font-normal text-[var(--text3)]">/ {unlimited ? "∞" : fmt(limit)}</span>
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg3)]"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: accent }} />
      </div>
      {hint ? (
        <p className="text-[11.5px] text-[var(--text3)]">{hint}</p>
      ) : (
        !unlimited && <p className="text-[11.5px] tabular-nums text-[var(--text3)]">{pct.toFixed(1)}% used</p>
      )}
    </div>
  );
}

// ── Radial ring ──────────────────────────────────────────────

export function Ring({
  value,
  max = 100,
  size = 96,
  label,
  sublabel,
  tone,
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  sublabel?: string;
  tone?: SurfaceTone;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const derived: SurfaceTone = tone ?? (pct >= 0.9 ? "red" : pct >= 0.75 ? "amber" : "brand");
  const accent = `var(--${derived})`;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true" focusable="false">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {label && (
          <span className="font-[family-name:var(--display)] text-[17px] font-semibold tabular-nums leading-none text-[var(--text)]">
            {label}
          </span>
        )}
        {sublabel && <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text3)]">{sublabel}</span>}
      </div>
    </div>
  );
}

// ── Key/value definition rows ────────────────────────────────

export interface KeyValueItem {
  label: string;
  value: React.ReactNode;
}

export function KeyValueGrid({ items, columns = 2 }: { items: KeyValueItem[]; columns?: 1 | 2 | 3 }) {
  const grid = columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", grid)}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">{item.label}</dt>
          <dd className="min-w-0 break-words text-[13px] text-[var(--text)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
