import { useMemo, useRef, useState } from "react";
import { formatCompact } from "@/shared/observe";
import { ChartTooltip, type ChartTooltipState } from "@/shared/ui/pulse/chart-tooltip";

export interface UsageChartPoint {
  bucket: string;
  [metric: string]: string | number;
}

export interface UsageChartSeries {
  key: string;
  label: string;
  color: string;
}

interface UsageTrendChartProps {
  points: UsageChartPoint[];
  series: UsageChartSeries[];
  ariaLabel: string;
  emptyMessage?: string;
  showTable?: boolean;
  tableSeries?: UsageChartSeries[];
}

const WIDTH = 900;
const HEIGHT = 260;
const PLOT = { left: 58, right: 18, top: 14, bottom: 38 };

// Below this many buckets every point is marked; above it only the hovered one,
// so a 90-day series reads as a line rather than a string of beads.
const MARK_ALL_POINTS_BELOW = 13;

function bucketLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Multi-series usage line chart (design/dashboards/DESIGN.md): hairline grid,
 * 11px mono axis labels, callers pass series colours (neutral data first,
 * state colours explicitly), a flat low-alpha fill under the lead series only.
 */
export function UsageTrendChart({
  points,
  series,
  ariaLabel,
  emptyMessage = "Not enough data to draw a trend.",
  showTable = false,
  tableSeries,
}: UsageTrendChartProps) {
  const fallbackSeries = tableSeries ?? series;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    const ordered = [...points].sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime());
    const max = Math.max(1, ...ordered.flatMap((point) => series.map((item) => Number(point[item.key] ?? 0))));
    const plotWidth = WIDTH - PLOT.left - PLOT.right;
    const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
    const x = (index: number) => PLOT.left + (ordered.length === 1 ? plotWidth / 2 : (index / (ordered.length - 1)) * plotWidth);
    const y = (value: number) => PLOT.top + plotHeight - (value / max) * plotHeight;
    return { ordered, max, plotWidth, plotHeight, x, y };
  }, [points, series]);

  if (chart.ordered.length === 0) {
    return <p className="py-12 text-center text-[13px] text-[var(--text3)]">{emptyMessage}</p>;
  }

  const firstSeries = series[0];
  const firstPoints = firstSeries
    ? chart.ordered.map((point, index) => `${chart.x(index)},${chart.y(Number(point[firstSeries.key] ?? 0))}`).join(" ")
    : "";
  const markAllPoints = chart.ordered.length < MARK_ALL_POINTS_BELOW;

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    // Pointer is in screen px against the rendered box; convert to the
    // viewBox's own coordinate space before hit-testing against chart.x().
    const pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDistance = Infinity;
    chart.ordered.forEach((_, index) => {
      const distance = Math.abs(chart.x(index) - pointerX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    setHoverIndex(nearest);
  };

  const hoveredPoint = hoverIndex !== null ? chart.ordered[hoverIndex] : null;
  const tooltip: ChartTooltipState | null =
    hoveredPoint && hoverIndex !== null
      ? {
          x: `${(chart.x(hoverIndex) / WIDTH) * 100}%`,
          y: `${(chart.y(Math.max(...series.map((item) => Number(hoveredPoint[item.key] ?? 0)))) / HEIGHT) * 100}%`,
          title: bucketLabel(hoveredPoint.bucket),
          rows: series.map((item) => ({
            label: item.label,
            value: formatCompact(Number(hoveredPoint[item.key] ?? 0)),
            color: item.color,
          })),
        }
      : null;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Chart legend">
        {series.map((item) => (
          <li key={item.key} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text2)]">
            <span className="h-0.5 w-3 rounded-full" style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
      <div className="sidebar-scroll relative overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[260px] w-full min-w-[640px] cursor-crosshair font-[family-name:var(--mono)]"
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <title>{ariaLabel}</title>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PLOT.top + chart.plotHeight * ratio;
            return (
              <g key={ratio}>
                <line x1={PLOT.left} x2={WIDTH - PLOT.right} y1={y} y2={y} stroke="var(--border)" />
                <text x={PLOT.left - 8} y={y + 4} textAnchor="end" fill="var(--text3)" fontSize="11">
                  {formatCompact(Math.round(chart.max * (1 - ratio)))}
                </text>
              </g>
            );
          })}
          {firstSeries && (
            <polygon
              points={`${PLOT.left},${PLOT.top + chart.plotHeight} ${firstPoints} ${WIDTH - PLOT.right},${PLOT.top + chart.plotHeight}`}
              fill={firstSeries.color}
              opacity="0.06"
            />
          )}
          {hoverIndex !== null && (
            <line
              x1={chart.x(hoverIndex)}
              x2={chart.x(hoverIndex)}
              y1={PLOT.top}
              y2={PLOT.top + chart.plotHeight}
              stroke="var(--border2)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {series.map((item) => (
            <g key={item.key}>
              <polyline
                points={chart.ordered.map((point, index) => `${chart.x(index)},${chart.y(Number(point[item.key] ?? 0))}`).join(" ")}
                fill="none"
                stroke={item.color}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {chart.ordered.map((point, index) => {
                const isHovered = hoverIndex === index;
                if (!isHovered && !markAllPoints) return null;
                return (
                  <circle
                    key={point.bucket}
                    cx={chart.x(index)}
                    cy={chart.y(Number(point[item.key] ?? 0))}
                    r={isHovered ? 4 : 2.5}
                    fill={item.color}
                    stroke={isHovered ? "var(--bg1)" : "none"}
                    strokeWidth={isHovered ? 1.5 : 0}
                  />
                );
              })}
            </g>
          ))}
          <text x={PLOT.left} y={HEIGHT - 10} fill="var(--text3)" fontSize="11">
            {bucketLabel(chart.ordered[0].bucket)}
          </text>
          <text x={WIDTH - PLOT.right} y={HEIGHT - 10} textAnchor="end" fill="var(--text3)" fontSize="11">
            {bucketLabel(chart.ordered[chart.ordered.length - 1].bucket)}
          </text>
        </svg>
        <ChartTooltip state={tooltip} />
      </div>
      {showTable && (
        <details className="group rounded-[var(--radius-lg)] border border-[var(--border)]">
          <summary className="cursor-pointer rounded-[var(--radius-lg)] px-4 py-2.5 text-[12px] text-[var(--text2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border2)]">
            View chart data as a table
          </summary>
          <div className="sidebar-scroll max-h-64 overflow-auto border-t border-[var(--border)]">
            <table className="w-full text-left text-[12px]">
              <caption className="sr-only">{ariaLabel} data</caption>
              <thead className="sticky top-0 bg-[var(--bg1)]">
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="px-4 py-2 font-normal text-[var(--text3)]">
                    Bucket
                  </th>
                  {fallbackSeries.map((item) => (
                    <th key={item.key} scope="col" className="px-4 py-2 text-right font-normal text-[var(--text3)]">
                      {item.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.ordered.map((point) => (
                  <tr key={point.bucket} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-2 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                      {bucketLabel(point.bucket)}
                    </td>
                    {fallbackSeries.map((item) => (
                      <td
                        key={item.key}
                        className="px-4 py-2 text-right font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text)]"
                      >
                        {formatCompact(Number(point[item.key] ?? 0))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
