import { cn } from "@/lib/utils";

/**
 * Shared hover-tooltip primitives for the SVG charts across the app.
 *
 * Charts render their own hit-testing (nearest point / cell), then hand this
 * a position + rows to draw. Kept dependency-free so every chart stays a
 * plain inline SVG instead of pulling in a charting library.
 */

export interface ChartTooltipRow {
  label: string;
  value: string;
  color?: string;
}

export interface ChartTooltipState {
  /** CSS length for the anchor point — percentage strings and px both work. */
  x: string | number;
  y: string | number;
  title?: string;
  rows: ChartTooltipRow[];
}

export function ChartTooltip({ state, className }: { state: ChartTooltipState | null; className?: string }) {
  if (!state) return null;
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute z-30 rounded-[10px] border border-[var(--border)] bg-[var(--bg1)]/95 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur-sm",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        className,
      )}
      style={{ left: state.x, top: state.y, transform: "translate(-50%, calc(-100% - 10px))" }}
    >
      {state.title && (
        <p className="mb-1 whitespace-nowrap font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--text3)]">
          {state.title}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {state.rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-center gap-2 whitespace-nowrap text-[12px]">
            {row.color && <span className="size-1.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />}
            <span className="text-[var(--text2)]">{row.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-[var(--text)]">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dashed vertical guide line drawn in an SVG's own viewBox coordinate space. */
export function ChartCrosshair({
  x,
  height,
  color = "var(--border2)",
}: {
  x: number;
  height: number;
  color?: string;
}) {
  return (
    <line
      x1={x}
      x2={x}
      y1={0}
      y2={height}
      stroke={color}
      strokeWidth="1"
      strokeDasharray="3 3"
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
    />
  );
}
