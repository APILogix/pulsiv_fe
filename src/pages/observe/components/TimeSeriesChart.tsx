// Time-positioned line chart for the performance pages. Points carry real
// timestamps (buckets may be sparse), so x is time, not index. One hover
// crosshair reads every series at the nearest bucket.
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TimeWindow } from "@/shared/observe";
import type { SeriesPoint } from "../hooks/usePerformanceApi";

export interface ChartSeries {
  label: string;
  color: string;
  points: SeriesPoint[];
  /** Fill under the line at low alpha (single-series charts only). */
  area?: boolean;
  dashed?: boolean;
}

export interface Threshold {
  value: number;
  label: string;
  color?: string;
}

const W = 720;
const TICK_FMT = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const FULL_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function tick(ms: number, span: number) {
  return span > 2 * 86_400_000 ? DAY_FMT.format(ms) : TICK_FMT.format(ms);
}

function nearest(points: SeriesPoint[], t: number): SeriesPoint | null {
  let best: SeriesPoint | null = null;
  let dist = Infinity;
  for (const p of points) {
    const d = Math.abs(p.t - t);
    if (d < dist) { dist = d; best = p; }
  }
  return best;
}

export function TimeSeriesChart({
  series,
  window,
  format,
  height = 180,
  threshold,
  loading,
  emptyLabel = "No samples in this window",
  yMax,
  className,
}: {
  series: ChartSeries[];
  window: TimeWindow;
  format: (v: number) => string;
  height?: number;
  threshold?: Threshold;
  loading?: boolean;
  emptyLabel?: string;
  /** Fixed ceiling (e.g. 100 for percentages). */
  yMax?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const from = window.from.getTime();
  const to = window.to.getTime();
  const span = Math.max(1, to - from);
  const all = series.flatMap((s) => s.points.map((p) => p.v));
  const empty = !loading && all.length === 0;
  const top = yMax ?? (Math.max(threshold?.value ?? 0, ...all, 0) * 1.15 || 1);
  const pad = 6;
  const x = (t: number) => ((t - from) / span) * W;
  const y = (v: number) => height - pad - (Math.min(v, top) / top) * (height - pad * 2);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || all.length === 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverT(from + ratio * span);
  };

  const readings = hoverT !== null ? series.map((s) => ({ s, p: nearest(s.points, hoverT) })) : [];
  const anchor = readings.find((r) => r.p)?.p ?? null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex min-h-[18px] flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s) => {
            const reading = readings.find((r) => r.s === s)?.p;
            return (
              <span key={s.label} className="flex items-center gap-1.5 text-[var(--text2)]">
                <span className={cn("h-0.5 w-3 rounded-full", s.dashed && "opacity-70")} style={{ background: s.color }} aria-hidden="true" />
                {s.label}
                {reading && <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text)]">{format(reading.v)}</span>}
              </span>
            );
          })}
          {threshold && (
            <span className="flex items-center gap-1.5 text-[var(--text3)]">
              <span className="h-0 w-3 border-t border-dashed" style={{ borderColor: threshold.color ?? "var(--amber)" }} aria-hidden="true" />
              {threshold.label}
            </span>
          )}
        </div>
        <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
          {anchor ? FULL_FMT.format(anchor.t) : ""}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex w-12 shrink-0 flex-col justify-between py-0.5 text-right font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]" style={{ height }}>
          <span>{empty || loading ? "" : format(top)}</span>
          <span>{empty || loading ? "" : format(top / 2)}</span>
          <span>{empty || loading ? "" : format(0)}</span>
        </div>
        <div
          ref={ref}
          className="relative min-w-0 flex-1"
          style={{ height }}
          onMouseMove={onMove}
          onMouseLeave={() => setHoverT(null)}
          role="img"
          aria-label={series.map((s) => `${s.label}: ${s.points.length} points`).join(", ")}
        >
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
          ) : (
            <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block overflow-visible">
              {[0, 0.5, 1].map((g) => (
                <line key={g} x1={0} x2={W} y1={pad + g * (height - pad * 2)} y2={pad + g * (height - pad * 2)} stroke="var(--border)" strokeWidth={1} strokeDasharray={g === 1 ? undefined : "3 4"} vectorEffect="non-scaling-stroke" />
              ))}
              {threshold && threshold.value <= top && (
                <line x1={0} x2={W} y1={y(threshold.value)} y2={y(threshold.value)} stroke={threshold.color ?? "var(--amber)"} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              )}
              {series.map((s) => {
                if (s.points.length === 0) return null;
                const line = s.points.map((p) => `${x(p.t)},${y(p.v)}`).join(" ");
                const first = s.points[0];
                const last = s.points[s.points.length - 1];
                return (
                  <g key={s.label}>
                    {s.area && s.points.length > 1 && (
                      <polygon points={`${x(first.t)},${height - pad} ${line} ${x(last.t)},${height - pad}`} fill={s.color} fillOpacity={0.07} />
                    )}
                    {s.points.length === 1 ? (
                      <circle cx={x(first.t)} cy={y(first.v)} r={2.5} fill={s.color} />
                    ) : (
                      <polyline points={line} fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "4 3" : undefined} vectorEffect="non-scaling-stroke" />
                    )}
                  </g>
                );
              })}
              {anchor && <line x1={x(anchor.t)} x2={x(anchor.t)} y1={0} y2={height} stroke="var(--text3)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
            </svg>
          )}
          {empty && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-[var(--text3)]">{emptyLabel}</span>
          )}
        </div>
      </div>

      <div className="ml-14 flex justify-between font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
        <span>{tick(from, span)}</span>
        <span className="hidden sm:inline">{tick(from + span / 2, span)}</span>
        <span>{tick(to, span)}</span>
      </div>
    </div>
  );
}
