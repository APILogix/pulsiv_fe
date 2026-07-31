import { useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconChip, type SurfaceTone } from "./surfaces";
import { ChartTooltip } from "./chart-tooltip";

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
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium tabular-nums",
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
  labels,
  color = "var(--brand)",
  height = 36,
  fill = true,
  interactive = false,
  valueFormatter,
  className,
}: {
  data: number[];
  /** Optional per-point labels shown in the hover tooltip (e.g. dates). */
  labels?: string[];
  color?: string;
  height?: number;
  fill?: boolean;
  /** Enables hover crosshair + tooltip + a live dot on the nearest point. */
  interactive?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length < 2) return null;

  const width = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const xAt = (index: number) => index * step;
  const yAt = (value: number) => height - ((value - min) / range) * height;
  const points = data.map((value, index) => `${xAt(index).toFixed(2)},${yAt(value).toFixed(2)}`);
  const fmt = valueFormatter ?? ((value: number) => value.toLocaleString("en-US"));

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width;
    const index = Math.round(Math.max(0, Math.min(1, ratio)) * (data.length - 1));
    setHoverIndex(index);
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        height={height}
        className={cn("w-full", interactive && "cursor-crosshair", className)}
        aria-hidden="true"
        focusable="false"
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* §3 — chart fills are a flat low-alpha version of the series colour,
            never a gradient. */}
        {fill && (
          <polygon
            points={`0,${height} ${points.join(" ")} ${width},${height}`}
            fill={color}
            fillOpacity="0.14"
          />
        )}
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={interactive ? "transition-[stroke-width] duration-150" : undefined}
        />
        {interactive && hoverIndex !== null && (
          <>
            <line
              x1={xAt(hoverIndex)}
              x2={xAt(hoverIndex)}
              y1={0}
              y2={height}
              stroke="var(--border2)"
              strokeWidth="1"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={xAt(hoverIndex)}
              cy={yAt(data[hoverIndex])}
              r="2.5"
              fill={color}
              stroke="var(--bg1)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              className="animate-in zoom-in-50 duration-150"
            />
          </>
        )}
      </svg>
      {interactive && hoverIndex !== null && hovered !== null && (
        <ChartTooltip
          state={{
            x: `${(xAt(hoverIndex) / width) * 100}%`,
            y: 0,
            title: labels?.[hoverIndex],
            rows: [{ label: "Value", value: fmt(hovered), color }],
          }}
        />
      )}
    </div>
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
        "pulse-lift relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{label}</span>
          {icon && <IconChip icon={icon} tone={tone} size="sm" />}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-[family-name:var(--mono)] text-[26px] font-medium leading-none tabular-nums tracking-[-0.02em] text-[var(--text)]">
            {value}
          </span>
          {unit && <span className="font-[family-name:var(--mono)] text-[11px] font-medium text-[var(--text3)]">{unit}</span>}
          {trend && delta && <TrendPill trend={trend}>{delta}</TrendPill>}
        </div>
        {footnote && <p className="text-[12px] leading-snug text-[var(--text3)]">{footnote}</p>}
      </div>
      {series && series.length > 1 && (
        <div className="-mb-px">
          <Sparkline data={series} color={accent} height={38} interactive />
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
        <span className="text-[13px] font-medium text-[var(--text2)]">{label}</span>
        <span className="font-[family-name:var(--mono)] text-[12px] font-medium tabular-nums text-[var(--text)]">
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
        <p className="text-[12px] text-[var(--text3)]">{hint}</p>
      ) : (
        !unlimited && <p className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">{pct.toFixed(1)}% used</p>
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
          <span className="font-[family-name:var(--mono)] text-[17px] font-medium tabular-nums leading-none text-[var(--text)]">
            {label}
          </span>
        )}
        {sublabel && <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.09em] text-[var(--text3)]">{sublabel}</span>}
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
          <dt className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{item.label}</dt>
          <dd className="min-w-0 break-words text-[13px] text-[var(--text)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
