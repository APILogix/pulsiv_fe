import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton primitives — the building blocks every page skeleton composes from.
 *
 * Deliberately CSS-only (no framer-motion): skeletons sit on the critical path
 * for perceived performance, so they must not pull animation JS in to render.
 * `.skeleton-block` carries both the entrance rise and the shimmer in a single
 * `animation` shorthand (see src/app/index.css) so a per-element
 * `animation-delay` can stagger both at once. Both are disabled under
 * `prefers-reduced-motion`.
 *
 * Rule from Phase 3: skeletons resemble the real layout. Never generic
 * rectangles standing in for a page whose shape we already know.
 */

/** Wrapper that announces the loading state once for the whole region. */
export function SkeletonShell({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex w-full flex-col gap-5", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A single shimmering block. `delay` staggers both the rise and the shimmer. */
export function Block({
  className,
  delay = 0,
  rounded = "sm",
  style,
}: {
  className?: string;
  delay?: number;
  rounded?: "sm" | "lg" | "full";
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-block",
        rounded === "full"
          ? "rounded-full"
          : rounded === "lg"
            ? "rounded-[var(--radius-lg)]"
            : "rounded-[var(--radius)]",
        className,
      )}
      style={
        delay
          ? { animationDelay: `${delay}ms, ${delay}ms`, ...style }
          : style
      }
    />
  );
}

/** An empty surface card — border + --bg1, matching the real Card primitive. */
export function SurfaceCard({
  children,
  className,
  delay = 0,
}: {
  children?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-rise rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4",
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** Page title + subtitle + optional actions and tab rail, matching PageHeader. */
export function SkeletonPageHeader({
  withActions = true,
  withTabs = false,
  withEyebrow = true,
}: {
  withActions?: boolean;
  withTabs?: boolean;
  withEyebrow?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {withEyebrow && <Block className="h-3 w-24" />}
          <Block className="h-7 w-[min(20rem,60vw)]" delay={24} />
          <Block className="h-4 w-[min(30rem,80vw)]" delay={48} />
        </div>
        {withActions && (
          <div className="flex shrink-0 items-center gap-2">
            <Block className="h-8 w-24" delay={48} />
            <Block className="h-8 w-28" delay={72} />
          </div>
        )}
      </div>
      {withTabs && (
        <div className="flex items-center gap-6 border-b border-[var(--border)] pb-2">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-4 w-20" delay={72 + i * 24} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Row of KPI stat tiles. */
export function SkeletonKpiRow({
  count = 4,
  baseDelay = 96,
}: {
  count?: number;
  baseDelay?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SurfaceCard key={i} delay={baseDelay + i * 24} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Block className="h-3 w-20" />
            <Block className="size-4" rounded="full" />
          </div>
          <Block className="h-7 w-24" />
          <Block className="h-3 w-16" />
        </SurfaceCard>
      ))}
    </div>
  );
}

const CHART_BARS = [38, 62, 45, 78, 55, 88, 64, 72, 48, 82, 58, 70];

/** Chart card with grid rails and column placeholders. */
export function SkeletonChartCard({
  className,
  delay = 0,
  height = "h-56",
  title = true,
  legend = true,
}: {
  className?: string;
  delay?: number;
  height?: string;
  title?: boolean;
  legend?: boolean;
}) {
  return (
    <SurfaceCard delay={delay} className={cn("flex flex-col gap-4", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Block className="h-4 w-32" />
            <Block className="h-3 w-44" />
          </div>
          <Block className="h-6 w-20" />
        </div>
      )}
      <div className={cn("relative w-full", height)}>
        {/* grid rails — makes the placeholder read as a chart, not a slab */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-px w-full bg-[var(--border)]/60" />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-[3%] px-1">
          {CHART_BARS.map((h, i) => (
            <Block
              key={i}
              className="flex-1"
              delay={i * 18}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      {legend && (
        <div className="flex items-center gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Block className="size-2" rounded="full" />
              <Block className="h-3 w-14" />
            </div>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}

const DEFAULT_COLUMNS = ["w-1/3", "w-20", "w-24", "w-16", "w-20"];

/** Table with a real header row, column rhythm and N body rows. */
export function SkeletonTable({
  rows = 8,
  columns = DEFAULT_COLUMNS,
  withToolbar = true,
  delay = 0,
}: {
  rows?: number;
  columns?: string[];
  withToolbar?: boolean;
  delay?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {withToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Block className="h-8 w-64" delay={delay} />
          <div className="flex items-center gap-2">
            <Block className="h-8 w-24" delay={delay + 24} />
            <Block className="h-8 w-24" delay={delay + 48} />
            <Block className="h-8 w-8" delay={delay + 72} />
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
        <div className="flex items-center gap-4 border-b border-[var(--border)] bg-[var(--bg2)]/50 px-4 py-2.5">
          {columns.map((width, i) => (
            <Block key={i} className={cn("h-3", width)} delay={delay + i * 18} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b border-[var(--border)] px-4 last:border-b-0"
            style={{ height: "var(--row-height)" }}
          >
            {columns.map((width, colIndex) => (
              <Block
                key={colIndex}
                className={cn("h-3.5", width)}
                delay={delay + 40 + rowIndex * 24 + colIndex * 8}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grid of content cards (projects, dashboards, integrations, templates). */
export function SkeletonCardGrid({
  count = 6,
  columns = "sm:grid-cols-2 xl:grid-cols-3",
  delay = 0,
  withIcon = true,
}: {
  count?: number;
  columns?: string;
  delay?: number;
  withIcon?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", columns)}>
      {Array.from({ length: count }).map((_, i) => (
        <SurfaceCard key={i} delay={delay + i * 30} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            {withIcon && <Block className="size-9 shrink-0" rounded="lg" />}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Block className="h-4 w-2/3" />
              <Block className="h-3 w-1/2" />
            </div>
            <Block className="h-5 w-14 shrink-0" rounded="full" />
          </div>
          <Block className="h-3 w-full" />
          <Block className="h-3 w-4/5" />
          <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] pt-3">
            <Block className="h-3 w-20" />
            <Block className="h-3 w-16" />
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

/** Settings-style form: sectioned rows of label + control + footer actions. */
export function SkeletonForm({
  sections = 2,
  fieldsPerSection = 3,
  delay = 0,
  className,
}: {
  sections?: number;
  fieldsPerSection?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full max-w-[720px] flex-col gap-5", className)}>
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <SurfaceCard
          key={sectionIndex}
          delay={delay + sectionIndex * 60}
          className="flex flex-col gap-4 p-5"
        >
          <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-4">
            <Block className="h-4 w-40" />
            <Block className="h-3 w-64" />
          </div>
          {Array.from({ length: fieldsPerSection }).map((_, fieldIndex) => (
            <div key={fieldIndex} className="flex flex-col gap-2">
              <Block className="h-3 w-28" delay={delay + sectionIndex * 60 + fieldIndex * 24} />
              <Block
                className="h-8 w-full"
                delay={delay + sectionIndex * 60 + fieldIndex * 24 + 12}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Block className="h-8 w-20" />
            <Block className="h-8 w-24" />
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

/** Avatar + two-line rows — members, sessions, audit actors. */
export function SkeletonPeopleList({ rows = 6, delay = 0 }: { rows?: number; delay?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0"
        >
          <Block className="size-8 shrink-0" rounded="full" delay={delay + i * 30} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Block className="h-3.5 w-40" delay={delay + i * 30 + 10} />
            <Block className="h-3 w-56" delay={delay + i * 30 + 20} />
          </div>
          <Block
            className="hidden h-5 w-20 shrink-0 sm:block"
            rounded="full"
            delay={delay + i * 30 + 30}
          />
          <Block className="h-8 w-8 shrink-0" delay={delay + i * 30 + 40} />
        </div>
      ))}
    </div>
  );
}

const LOG_WIDTHS = ["w-2/3", "w-1/2", "w-4/5", "w-3/5", "w-3/4", "w-2/5"];

/** Monospace log lines with a timestamp gutter and level chip. */
export function SkeletonLogStream({ rows = 14, delay = 0 }: { rows?: number; delay?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] font-mono">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)]/50 px-4 py-2.5">
        <Block className="h-3 w-28" delay={delay} />
        <Block className="h-3 w-20" delay={delay + 24} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-[7px]">
          <Block className="h-3 w-16 shrink-0" delay={delay + i * 22} />
          <Block className="h-3 w-12 shrink-0" rounded="full" delay={delay + i * 22 + 6} />
          <Block className={cn("h-3", LOG_WIDTHS[i % LOG_WIDTHS.length])} delay={delay + i * 22 + 12} />
        </div>
      ))}
    </div>
  );
}

/** Two-column detail layout: main panel + metadata rail. */
export function SkeletonDetailPanels({ delay = 0 }: { delay?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <SkeletonChartCard delay={delay} height="h-44" />
        <SurfaceCard delay={delay + 60} className="flex flex-col gap-3 p-5">
          <Block className="h-4 w-36" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Block key={i} className="h-3" style={{ width: `${90 - i * 9}%` }} delay={i * 24} />
          ))}
        </SurfaceCard>
      </div>
      <div className="flex flex-col gap-4">
        <SurfaceCard delay={delay + 30} className="flex flex-col gap-3">
          <Block className="h-3 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Block className="h-3 w-20" delay={i * 18} />
              <Block className="h-3 w-16" delay={i * 18 + 8} />
            </div>
          ))}
        </SurfaceCard>
        <SurfaceCard delay={delay + 90} className="flex flex-col gap-3">
          <Block className="h-3 w-28" />
          <Block className="h-8 w-full" />
          <Block className="h-8 w-full" />
        </SurfaceCard>
      </div>
    </div>
  );
}
