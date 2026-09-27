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

/** Table with a real header row, column rhythm and N body rows. Supports normal and compact/dense modes. */
export function SkeletonTable({
  rows = 8,
  columns = DEFAULT_COLUMNS,
  withToolbar = true,
  delay = 0,
  compact = false,
  dense = false,
  className,
}: {
  rows?: number;
  columns?: string[] | number;
  withToolbar?: boolean;
  delay?: number;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const isCompact = compact || dense;
  const colList = typeof columns === "number"
    ? Array.from({ length: columns }, (_, i) => (i === 0 ? "w-1/3" : "w-24"))
    : columns;

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
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
        <div className={cn("flex items-center gap-4 border-b border-[var(--border)] bg-[var(--bg2)]/50 px-4", isCompact ? "py-2" : "py-2.5")}>
          {colList.map((width, i) => (
            <Block key={i} className={cn(isCompact ? "h-2.5" : "h-3", width)} delay={delay + i * 18} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "flex items-center gap-4 border-b border-[var(--border)] px-4 last:border-b-0",
              isCompact ? "h-9" : ""
            )}
            style={isCompact ? undefined : { height: "var(--row-height)" }}
          >
            {colList.map((width, colIndex) => (
              <Block
                key={colIndex}
                className={cn(isCompact ? "h-3" : "h-3.5", width)}
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

/* ──────────────── Reusable Atomic Primitives (Section 22) ──────────────── */

/**
 * Universal polymorphic Skeleton block.
 * Can be used as a standalone rectangle, line, circle, or custom shaped placeholder.
 */
export function Skeleton({
  className,
  delay = 0,
  rounded = "sm",
  circle = false,
  width,
  height,
  style,
  ...props
}: {
  className?: string;
  delay?: number;
  rounded?: "sm" | "lg" | "full";
  circle?: boolean;
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
  [key: string]: any;
}) {
  const customStyle: CSSProperties = {
    ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    ...style,
  };
  return (
    <Block
      className={cn(circle && "rounded-full shrink-0 aspect-square", className)}
      delay={delay}
      rounded={circle ? "full" : rounded}
      style={customStyle}
      {...props}
    />
  );
}

/** Multi-line or heading text placeholder. */
export function SkeletonText({
  lines = 2,
  gap = "gap-2",
  lineHeight = "h-3.5",
  lastLineWidth = "60%",
  heading = false,
  className,
  delay = 0,
}: {
  lines?: number;
  gap?: string;
  lineHeight?: string;
  lastLineWidth?: string;
  heading?: boolean;
  className?: string;
  delay?: number;
}) {
  if (heading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Block className="h-6 w-[min(18rem,70%)]" delay={delay} />
        {lines > 1 && <Block className="h-3.5 w-[min(26rem,90%)]" delay={delay + 20} />}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col", gap, className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Block
          key={i}
          className={cn(lineHeight, i === lines - 1 && lines > 1 ? "" : "w-full")}
          style={i === lines - 1 && lines > 1 ? { width: lastLineWidth } : undefined}
          delay={delay + i * 18}
        />
      ))}
    </div>
  );
}

/** Circle avatar/icon placeholder. */
export function SkeletonCircle({
  size = "size-8",
  className,
  delay = 0,
}: {
  size?: string;
  className?: string;
  delay?: number;
}) {
  return <Block rounded="full" className={cn("shrink-0", size, className)} delay={delay} />;
}

export const SkeletonAvatar = SkeletonCircle;

/** Button placeholder with standard SaaS sizes. */
export function SkeletonButton({
  size = "md",
  width = "w-24",
  className,
  delay = 0,
}: {
  size?: "sm" | "md" | "lg";
  width?: string;
  className?: string;
  delay?: number;
}) {
  const h = size === "sm" ? "h-7" : size === "lg" ? "h-10" : "h-8";
  return <Block className={cn(h, width, className)} rounded="sm" delay={delay} />;
}

/** Form text input placeholder (label + box). */
export function SkeletonInput({
  withLabel = true,
  labelWidth = "w-24",
  height = "h-8",
  className,
  delay = 0,
}: {
  withLabel?: boolean;
  labelWidth?: string;
  height?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {withLabel && <Block className={cn("h-3", labelWidth)} delay={delay} />}
      <Block className={cn("w-full", height)} rounded="sm" delay={delay + 16} />
    </div>
  );
}

/** Setting toggle switch placeholder (label + switch pill). */
export function SkeletonToggle({
  withLabel = true,
  labelWidth = "w-32",
  className,
  delay = 0,
}: {
  withLabel?: boolean;
  labelWidth?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {withLabel && (
        <div className="flex flex-col gap-1">
          <Block className={cn("h-3.5", labelWidth)} delay={delay} />
          <Block className="h-2.5 w-44 opacity-70" delay={delay + 12} />
        </div>
      )}
      <Block className="h-5 w-9 shrink-0" rounded="full" delay={delay + 24} />
    </div>
  );
}

/** Dropdown select placeholder (label + select box). */
export function SkeletonSelect({
  withLabel = true,
  labelWidth = "w-24",
  height = "h-8",
  className,
  delay = 0,
}: {
  withLabel?: boolean;
  labelWidth?: string;
  height?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {withLabel && <Block className={cn("h-3", labelWidth)} delay={delay} />}
      <Block className={cn("w-full", height)} rounded="sm" delay={delay + 16} />
    </div>
  );
}

/** Horizontal tabs strip placeholder. */
export function SkeletonTabs({
  count = 4,
  width = "w-20",
  className,
  delay = 0,
}: {
  count?: number;
  width?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("flex items-center gap-4 border-b border-[var(--border)] pb-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Block key={i} className={cn("h-4", width)} delay={delay + i * 20} />
      ))}
    </div>
  );
}

/** Standard page header skeleton alias. */
export const SkeletonHeader = SkeletonPageHeader;

/** Toolbar filter bar with search input and filter buttons. */
export function SkeletonFilters({
  withSearch = true,
  filterCount = 3,
  className,
  delay = 0,
}: {
  withSearch?: boolean;
  filterCount?: number;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      {withSearch && <Block className="h-8 w-64 max-w-full" delay={delay} />}
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: filterCount }).map((_, i) => (
          <Block key={i} className="h-8 w-24" delay={delay + 20 + i * 16} />
        ))}
      </div>
    </div>
  );
}

/** Versatile card skeleton with optional header, body content, and footer. */
export function SkeletonCard({
  children,
  className,
  delay = 0,
  withHeader = false,
  withFooter = false,
}: {
  children?: ReactNode;
  className?: string;
  delay?: number;
  withHeader?: boolean;
  withFooter?: boolean;
}) {
  return (
    <SurfaceCard delay={delay} className={cn("flex flex-col gap-4 p-5", className)}>
      {withHeader && (
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <Block className="h-4 w-32" />
          <Block className="h-6 w-16" />
        </div>
      )}
      {children ?? (
        <div className="flex flex-col gap-2.5">
          <Block className="h-3.5 w-3/4" />
          <Block className="h-3 w-full" />
          <Block className="h-3 w-5/6" />
        </div>
      )}
      {withFooter && (
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
          <Block className="h-3 w-20" />
          <Block className="h-7 w-20" />
        </div>
      )}
    </SurfaceCard>
  );
}

/** Chart skeleton alias / wrapper. */
export const SkeletonChart = SkeletonChartCard;

/** List placeholder for index/row views with avatar and details. */
export function SkeletonList({
  rows = 6,
  withAvatar = true,
  className,
  delay = 0,
}: {
  rows?: number;
  withAvatar?: boolean;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0"
        >
          {withAvatar && <Block className="size-8 shrink-0" rounded="full" delay={delay + i * 24} />}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Block className="h-3.5 w-1/3" delay={delay + i * 24 + 8} />
            <Block className="h-3 w-1/2" delay={delay + i * 24 + 16} />
          </div>
          <Block className="h-6 w-16 shrink-0" delay={delay + i * 24 + 24} />
        </div>
      ))}
    </div>
  );
}

/** Drawer loading skeleton preserving drawer dimensions throughout loading. */
export function SkeletonDrawer({
  title = "Details",
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col bg-[var(--bg1)] p-5 animate-pulse",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading {title}...</span>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex flex-col gap-1.5">
          <Block className="h-5 w-40" />
          <Block className="h-3 w-28" />
        </div>
        <Block className="size-7" rounded="sm" />
      </div>
      <div className="flex-1 overflow-y-auto py-5 space-y-5">
        <div className="space-y-2">
          <Block className="h-3 w-20" />
          <Block className="h-9 w-full" rounded="sm" />
        </div>
        <div className="space-y-2">
          <Block className="h-3 w-24" />
          <Block className="h-20 w-full" rounded="sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Block className="h-3 w-16" />
            <Block className="h-8 w-full" rounded="sm" />
          </div>
          <div className="space-y-2">
            <Block className="h-3 w-16" />
            <Block className="h-8 w-full" rounded="sm" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Block className="h-4 w-32" />
          <Block className="h-3 w-full" />
          <Block className="h-3 w-4/5" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
        <Block className="h-8 w-20" />
        <Block className="h-8 w-24" />
      </div>
    </div>
  );
}

/** Modal dialog loading skeleton preserving dialog shape throughout loading. */
export function SkeletonModal({
  title = "Dialog",
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-xl",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading {title}...</span>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <Block className="h-5 w-44" />
        <Block className="size-6" rounded="full" />
      </div>
      <div className="py-5 space-y-4">
        <Block className="h-3.5 w-3/4" />
        <Block className="h-3.5 w-full" />
        <div className="space-y-2 pt-2">
          <Block className="h-3 w-24" />
          <Block className="h-9 w-full" rounded="sm" />
        </div>
        <div className="space-y-2">
          <Block className="h-3 w-28" />
          <Block className="h-9 w-full" rounded="sm" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-4">
        <Block className="h-8 w-20" />
        <Block className="h-8 w-28" />
      </div>
    </div>
  );
}

