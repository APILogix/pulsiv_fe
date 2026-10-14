/**
 * Charts for the project Analytics tab (design/dashboards/DESIGN.md): hairline
 * grid, neutral series first, state colours passed explicitly, mono axis text.
 */
import { useMemo, useRef, useState } from "react";

import type { UsageTimeSeriesPoint } from "@/modules/projects/api/types";
import { ChartTooltip, type ChartTooltipState } from "@/shared/ui/pulse";
import { formatCompact, formatNumber } from "@/shared/observe";
import { cn } from "@/lib/utils";

/** Draw order and colours for the volume chart. Errors are state, so red. */
export const VOLUME_SERIES = [
  { key: "totalEvents", label: "Events", color: "var(--text)" },
  { key: "requests", label: "Requests", color: "var(--blue)" },
  { key: "errors", label: "Errors", color: "var(--red)" },
] as const;

const WIDTH = 1000;
const HEIGHT = 220;

const BUCKET_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatBucket(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : BUCKET_FMT.format(date);
}

// ── volume chart ─────────────────────────────────────────────

export function VolumeChart({ points, label }: { points: UsageTimeSeriesPoint[]; label: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const max = Math.max(1, ...points.flatMap((point) => VOLUME_SERIES.map((series) => Number(point[series.key] ?? 0))));
    const step = WIDTH / (points.length - 1);
    const xAt = (index: number) => index * step;
    const yAt = (value: number) => HEIGHT - (value / max) * HEIGHT;
    const series = VOLUME_SERIES.map((item) => {
      const coords = points.map((point, index) => `${xAt(index).toFixed(2)},${yAt(Number(point[item.key] ?? 0)).toFixed(2)}`);
      return { ...item, line: coords.join(" "), area: `0,${HEIGHT} ${coords.join(" ")} ${WIDTH},${HEIGHT}` };
    });
    return { series, xAt, yAt, max };
  }, [points]);

  if (!chart) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--text3)]">
        Not enough data points in this range to draw a trend.
      </p>
    );
  }

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width;
    setHoverIndex(Math.round(Math.max(0, Math.min(1, ratio)) * (points.length - 1)));
  };

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltip: ChartTooltipState | null =
    hoveredPoint && hoverIndex !== null
      ? {
          x: `${(chart.xAt(hoverIndex) / WIDTH) * 100}%`,
          y: 0,
          title: formatBucket(hoveredPoint.bucket),
          rows: VOLUME_SERIES.map((series) => ({
            label: series.label,
            value: formatCompact(Number(hoveredPoint[series.key] ?? 0)),
            color: series.color,
          })),
        }
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Chart legend">
          {VOLUME_SERIES.map((series) => (
            <li key={series.key} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text2)]">
              <span className="h-0.5 w-3 rounded-full" style={{ background: series.color }} aria-hidden="true" />
              {series.label}
            </li>
          ))}
        </ul>
        <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
          Peak {formatCompact(chart.max)}
        </span>
      </div>
      <div className="relative h-[220px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full cursor-crosshair overflow-visible"
          role="img"
          aria-label={label}
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={0}
              x2={WIDTH}
              y1={HEIGHT * ratio}
              y2={HEIGHT * ratio}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* Flat low-alpha fill under the lead series only. */}
          <polygon points={chart.series[0].area} fill={chart.series[0].color} opacity="0.06" />
          {chart.series.map((series) => (
            <polyline
              key={series.key}
              points={series.line}
              fill="none"
              stroke={series.color}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hoverIndex !== null && (
            <line
              x1={chart.xAt(hoverIndex)}
              x2={chart.xAt(hoverIndex)}
              y1={0}
              y2={HEIGHT}
              stroke="var(--border2)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {/* Markers live in HTML: the SVG stretches to fill its box, so circles
            drawn inside it would squash into ellipses on narrow screens. */}
        {hoveredPoint &&
          hoverIndex !== null &&
          VOLUME_SERIES.map((series) => (
            <span
              key={series.key}
              aria-hidden="true"
              className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--bg1)]"
              style={{
                left: `${(chart.xAt(hoverIndex) / WIDTH) * 100}%`,
                top: `${(chart.yAt(Number(hoveredPoint[series.key] ?? 0)) / HEIGHT) * 100}%`,
                background: series.color,
              }}
            />
          ))}
        <ChartTooltip state={tooltip} />
      </div>
      <div className="flex justify-between gap-4 font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
        <span>{formatBucket(points[0].bucket)}</span>
        <span>{formatBucket(points[points.length - 1].bucket)}</span>
      </div>
    </div>
  );
}

// ── heatmap ──────────────────────────────────────────────────

const LEGEND_STEPS = [0, 30, 55, 85];

/** Neutral intensity: empty cells sit on --bg2, busy cells step toward --text. */
function cellBackground(share: number) {
  return share === 0 ? "var(--bg2)" : `color-mix(in srgb, var(--text) ${share}%, var(--bg2))`;
}

export function HeatmapGrid({
  cells,
  caption,
}: {
  cells: Array<{ x: string; y: string; value: number }>;
  caption: string;
}) {
  const [hovered, setHovered] = useState<{ x: string; y: string; value: number; left: number; top: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const grid = useMemo(() => {
    const yKeys = Array.from(new Set(cells.map((cell) => cell.y)));
    const xKeys = Array.from(new Set(cells.map((cell) => cell.x)));
    const lookup = new Map(cells.map((cell) => [`${cell.x}|${cell.y}`, cell.value]));
    const max = Math.max(1, ...cells.map((cell) => cell.value));
    return { yKeys, xKeys, lookup, max };
  }, [cells]);

  if (cells.length === 0) {
    return <p className="py-10 text-center text-[13px] text-[var(--text3)]">No activity recorded in this range.</p>;
  }

  const tooltip: ChartTooltipState | null = hovered
    ? {
        x: hovered.left,
        y: hovered.top,
        title: `${hovered.x} · ${hovered.y}`,
        rows: [{ label: "Events", value: formatNumber(hovered.value), color: "var(--text2)" }],
      }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div ref={gridRef} className="sidebar-scroll relative overflow-x-auto">
        <table className="border-separate border-spacing-[3px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <td className="p-0" />
              {grid.xKeys.map((xKey) => (
                <th key={xKey} scope="col" className="p-0">
                  <span className="sr-only">{xKey}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.yKeys.map((yKey) => (
              <tr key={yKey}>
                <th
                  scope="row"
                  className="whitespace-nowrap pr-2 text-right align-middle font-[family-name:var(--mono)] text-[11px] font-normal text-[var(--text3)]"
                >
                  {yKey}
                </th>
                {grid.xKeys.map((xKey) => {
                  const value = grid.lookup.get(`${xKey}|${yKey}`) ?? 0;
                  const share = value === 0 ? 0 : 12 + Math.round((value / grid.max) * 73);
                  const isHovered = hovered?.x === xKey && hovered?.y === yKey;
                  return (
                    <td key={xKey} className="p-0">
                      <div
                        onPointerEnter={(event) => {
                          const gridRect = gridRef.current?.getBoundingClientRect();
                          const cellRect = event.currentTarget.getBoundingClientRect();
                          if (!gridRect) return;
                          setHovered({
                            x: xKey,
                            y: yKey,
                            value,
                            left: cellRect.left - gridRect.left + cellRect.width / 2,
                            top: cellRect.top - gridRect.top,
                          });
                        }}
                        onPointerLeave={() => setHovered(null)}
                        className={cn(
                          "size-4 rounded-[3px] ring-1 ring-inset transition-shadow duration-150",
                          isHovered ? "ring-[var(--text2)]" : "ring-[var(--border)]",
                        )}
                        style={{ background: cellBackground(share) }}
                      >
                        <span className="sr-only">{formatNumber(value)} events</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <ChartTooltip state={tooltip} />
      </div>
      <div
        aria-hidden="true"
        className="flex items-center justify-end gap-1.5 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]"
      >
        <span>Less</span>
        {LEGEND_STEPS.map((step) => (
          <span
            key={step}
            className="size-3 rounded-[3px] ring-1 ring-inset ring-[var(--border)]"
            style={{ background: cellBackground(step) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
