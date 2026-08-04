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

function bucketLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

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
    return <p className="py-12 text-center text-[12.5px] text-[var(--text3)]">{emptyMessage}</p>;
  }

  const firstSeries = series[0];
  const firstPoints = firstSeries
    ? chart.ordered.map((point, index) => `${chart.x(index)},${chart.y(Number(point[firstSeries.key] ?? 0))}`).join(" ")
    : "";

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
      <div className="flex flex-wrap items-center gap-4" aria-label="Chart legend">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text2)]">
            <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
      <div className="relative overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[260px] min-w-[640px] w-full cursor-crosshair"
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
                <text x={PLOT.left - 8} y={y + 4} textAnchor="end" fill="var(--text3)" fontSize="10">
                  {formatCompact(Math.round(chart.max * (1 - ratio)))}
                </text>
              </g>
            );
          })}
          {firstSeries && (
            <polygon
              points={`${PLOT.left},${PLOT.top + chart.plotHeight} ${firstPoints} ${WIDTH - PLOT.right},${PLOT.top + chart.plotHeight}`}
              fill={firstSeries.color}
              opacity="0.1"
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
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {chart.ordered.map((point, index) => {
                const isHovered = hoverIndex === index;
                return (
                  <circle
                    key={point.bucket}
                    cx={chart.x(index)}
                    cy={chart.y(Number(point[item.key] ?? 0))}
                    r={isHovered ? 4.5 : 3}
                    fill={item.color}
                    stroke={isHovered ? "var(--bg1)" : "none"}
                    strokeWidth={isHovered ? 1.5 : 0}
                    className="transition-[r] duration-150"
                  />
                );
              })}
            </g>
          ))}
          <text x={PLOT.left} y={HEIGHT - 10} fill="var(--text3)" fontSize="10">{bucketLabel(chart.ordered[0].bucket)}</text>
          <text x={WIDTH - PLOT.right} y={HEIGHT - 10} textAnchor="end" fill="var(--text3)" fontSize="10">
            {bucketLabel(chart.ordered[chart.ordered.length - 1].bucket)}
          </text>
        </svg>
        <ChartTooltip state={tooltip} />
      </div>
      {showTable && (
        <details className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)]">
          <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-[var(--text2)]">View chart data as a table</summary>
          <div className="max-h-64 overflow-auto border-t border-[var(--border)]">
            <table className="w-full text-left text-[11.5px]">
              <caption className="sr-only">{ariaLabel} data</caption>
              <thead className="sticky top-0 bg-[var(--bg1)] text-[var(--text3)]">
                <tr><th className="px-3 py-2 font-medium">Bucket</th>{fallbackSeries.map((item) => <th key={item.key} className="px-3 py-2 text-right font-medium">{item.label}</th>)}</tr>
              </thead>
              <tbody>
                {chart.ordered.map((point) => (
                  <tr key={point.bucket} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap px-3 py-2 text-[var(--text2)]">{bucketLabel(point.bucket)}</td>
                    {fallbackSeries.map((item) => <td key={item.key} className="px-3 py-2 text-right tabular-nums text-[var(--text)]">{formatCompact(Number(point[item.key] ?? 0))}</td>)}
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