/**
 * Workspace page anatomy (design/workspaces/DESIGN.md).
 *
 * Every workspace page (the projects list, project creation, and each tab of a
 * selected project) is assembled from these pieces, so every tab reads in the
 * same order: header on the canvas, one readout band, then the work surface.
 * Nothing here introduces a token; it composes the Mono world declared in
 * src/app/index.css.
 */
import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle, ArrowRight, ChevronRight, MoreHorizontal, Search, X } from "lucide-react";

import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fieldInputClass } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

// ── Frame ────────────────────────────────────────────────────

/** Centered data rail. The project shell applies it once around every tab. */
export const WORKSPACE_RAIL = "mx-auto w-full max-w-[1400px]";

/** Settings forms stay readable under a full-width header. */
export const SETTINGS_COLUMN = "w-full max-w-[880px]";

/** Wizards and single-task forms. */
export const FOCUS_COLUMN = "w-full max-w-[720px]";

/**
 * Height for tabs that pin their own chrome and scroll one inner region
 * (editors). It subtracts the app header, the project scope bar, and the
 * shell's vertical padding. `FillPage` only knows about the app header, so it
 * overflows inside the project shell.
 */
export const PROJECT_FILL_HEIGHT = "calc(100dvh - (var(--header-height) * 2) - 3rem)";

/** Root of every workspace page: the rail plus the 24px zone rhythm. */
export function WorkspacePage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(WORKSPACE_RAIL, "flex min-w-0 flex-col gap-6 pb-12", className)}>{children}</div>;
}

// ── Page header ──────────────────────────────────────────────

export interface HeaderMetaItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

/**
 * Title, one line of purpose, an optional quiet fact line, actions right.
 * Sits on the canvas: no card, no icon, no eyebrow.
 */
export interface HeaderCrumb {
  label: string;
  to?: string;
}

export function ProjectPageHeader({
  title,
  description,
  actions,
  meta,
  badges,
  crumbs,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Falsy entries are skipped, so callers can inline conditions. */
  meta?: Array<HeaderMetaItem | null | false | undefined>;
  /** State pills that sit on the title line. */
  badges?: ReactNode;
  /** Only for pages below a list (a detail, a wizard); tabs have the scope bar. */
  crumbs?: HeaderCrumb[];
  className?: string;
}) {
  const facts = (meta ?? []).filter((item): item is HeaderMetaItem => Boolean(item));

  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex min-w-0 flex-wrap items-center gap-1 text-[12px] text-[var(--text3)]">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
                {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="rounded-[2px] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="truncate text-[var(--text2)]">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h1 className="min-w-0 break-words text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--text)]">
            {title}
          </h1>
          {badges}
        </div>
        {description && (
          <p className="mt-1.5 max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">{description}</p>
        )}
        {facts.length > 0 && (
          <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
            {facts.map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-1.5">
                <dt className="shrink-0 text-[var(--text3)]">{item.label}</dt>
                <dd
                  className={cn(
                    "min-w-0 truncate text-[var(--text2)]",
                    item.mono && "font-[family-name:var(--mono)] tabular-nums",
                  )}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// ── Readout band ─────────────────────────────────────────────

export type ReadoutTone = "good" | "warn" | "bad" | "neutral";

export interface Readout {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Colour only when the value is healthy, degrading, or broken. */
  tone?: ReadoutTone;
  title?: string;
}

const READOUT_TONE: Record<ReadoutTone, string> = {
  good: "text-[var(--green)]",
  warn: "text-[var(--amber)]",
  bad: "text-[var(--red)]",
  neutral: "text-[var(--text)]",
};

// One explicit grid per cell count, so every breakpoint divides evenly or
// leaves the panel showing through, never a filler block of hairline colour.
const READOUT_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

/** Hairline-divided readings: 12px label, 22px mono value, 12px context. */
export function Readouts({
  cells,
  loading = false,
  label = "Summary",
  className,
}: {
  cells: Readout[];
  loading?: boolean;
  label?: string;
  className?: string;
}) {
  if (cells.length === 0) return null;
  const grid = READOUT_GRID[Math.min(cells.length, 6)];

  return (
    <section
      aria-label={label}
      aria-busy={loading || undefined}
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]",
        className,
      )}
    >
      {/* The grid overhangs by 1px, so the last row and column lose their
          dividers under the clip. */}
      <dl className={cn("-mb-px -mr-px grid", grid)}>
        {cells.map((cell) => (
          <div
            key={cell.label}
            title={cell.title}
            className="flex min-w-0 flex-col gap-2 border-b border-r border-[var(--border)] px-5 py-4"
          >
            <dt className="truncate text-[12px] text-[var(--text2)]">{cell.label}</dt>
            <dd
              className={cn(
                "truncate font-[family-name:var(--mono)] text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums",
                READOUT_TONE[cell.tone ?? "neutral"],
              )}
            >
              {loading ? <span aria-hidden="true" className="loading-skeleton block h-[22px] w-16 rounded-[4px]" /> : cell.value}
            </dd>
            {cell.sub !== undefined && cell.sub !== null && cell.sub !== false && (
              <dd className="truncate text-[12px] leading-[1.4] text-[var(--text3)]">{loading ? "\u00a0" : cell.sub}</dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

// ── Sheet ────────────────────────────────────────────────────

/**
 * The one container for a collection or a group of settings: optional title
 * row, toolbar row, body, footer. One hairline, no nested boxes.
 */
export function Sheet({
  title,
  description,
  actions,
  toolbar,
  footer,
  children,
  label,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Search, filters, and counts for the collection below. */
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Accessible name when the sheet has no visible title. */
  label?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = useId();
  const hasHead = Boolean(title || description || actions);

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      aria-label={title ? undefined : label}
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]",
        className,
      )}
    >
      {hasHead && (
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 max-w-[76ch] text-[12px] leading-[1.55] text-[var(--text2)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">{toolbar}</div>
      )}
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--border)] px-5 py-3 text-[12px] leading-[1.5] text-[var(--text3)]">
          {footer}
        </div>
      )}
    </section>
  );
}

// ── Table inside a sheet ─────────────────────────────────────

export interface SheetColumn {
  key: string;
  header: ReactNode;
  /** Width and responsive visibility, e.g. "w-[140px]" or HIDE_BELOW_MD. */
  className?: string;
  align?: "left" | "right";
  /** Keep the header for assistive tech only (the row actions column). */
  srOnly?: boolean;
}

/** Responsive column helpers. Pass the same class to the column and its cells. */
export const HIDE_BELOW_SM = "hidden sm:table-cell";
export const HIDE_BELOW_MD = "hidden md:table-cell";
export const HIDE_BELOW_LG = "hidden lg:table-cell";
export const HIDE_BELOW_XL = "hidden xl:table-cell";

/**
 * Semantic table that owns no border of its own (the sheet does) and never
 * scrolls vertically inside the page. Wide tables scroll sideways on phones.
 */
export function SheetTable({
  columns,
  children,
  caption,
  minWidth,
  className,
}: {
  columns: SheetColumn[];
  children: ReactNode;
  caption?: string;
  minWidth?: number;
  className?: string;
}) {
  return (
    <div className={cn("sidebar-scroll overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-[13px]" style={minWidth ? { minWidth } : undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "h-10 whitespace-nowrap px-3 text-[12px] font-normal text-[var(--text3)] first:pl-5 last:pr-5",
                  column.align === "right" && "text-right",
                  column.className,
                )}
              >
                {column.srOnly ? <span className="sr-only">{column.header}</span> : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Clicks that land on a control inside the row belong to that control.
const ROW_CONTROL_SELECTOR = "a, button, input, select, textarea, label, [role='menuitem'], [role='switch']";

export function SheetRow({
  children,
  muted = false,
  onActivate,
  className,
}: {
  children: ReactNode;
  /** Deleted, archived, or revoked rows recede but stay actionable. */
  muted?: boolean;
  /**
   * Pointer shortcut for the row's primary link. Keyboard and screen-reader
   * users reach the same destination through the link in the row itself.
   */
  onActivate?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={
        onActivate
          ? (event) => {
              const target = event.target as HTMLElement;
              if (target.closest(ROW_CONTROL_SELECTOR)) return;
              if (window.getSelection()?.toString()) return;
              onActivate();
            }
          : undefined
      }
      className={cn(
        "border-b border-[var(--border)] transition-colors duration-150 last:border-b-0 hover:bg-[var(--bg2)]/40",
        onActivate && "cursor-pointer hover:bg-[var(--bg2)]/60",
        muted && "[&>td:not(:last-child)]:opacity-60",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function SheetCell({
  children,
  className,
  align,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "h-[52px] px-3 py-2.5 align-middle first:pl-5 last:pr-5",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Identity cell: name (optionally a link), badges, and one quiet line under it. */
export function RowTitle({
  title,
  to,
  subtitle,
  subtitleMono = false,
  leading,
  badges,
}: {
  title: ReactNode;
  to?: string;
  subtitle?: ReactNode;
  subtitleMono?: boolean;
  leading?: ReactNode;
  badges?: ReactNode;
}) {
  const titleClass = "min-w-0 truncate text-[13px] font-medium text-[var(--text)]";

  return (
    <div className="flex min-w-0 items-center gap-3">
      {leading}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {to ? (
            <Link
              to={to}
              className={cn(
                titleClass,
                "rounded-[2px] decoration-[var(--border2)] underline-offset-[3px] hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]",
              )}
            >
              {title}
            </Link>
          ) : (
            <span className={titleClass}>{title}</span>
          )}
          {badges}
        </div>
        {subtitle && (
          <div
            className={cn(
              "mt-0.5 truncate text-[12px] text-[var(--text3)]",
              subtitleMono && "font-[family-name:var(--mono)] text-[11.5px]",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// ── List inside a sheet ──────────────────────────────────────
// For rows that are one link each, or free-form rows without columns.

export function SheetList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-[var(--border)]">
      {children}
    </ul>
  );
}

const LIST_ROW = "flex min-h-[56px] w-full min-w-0 items-center gap-4 px-5 py-3";

export function SheetListItem({
  children,
  to,
  muted = false,
  className,
}: {
  children: ReactNode;
  /** The whole row opens this path. */
  to?: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <li className={cn(muted && "opacity-60")}>
      {to ? (
        <Link
          to={to}
          className={cn(
            LIST_ROW,
            "transition-colors duration-150 hover:bg-[var(--bg2)]/60 focus-visible:bg-[var(--bg2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border2)]",
            className,
          )}
        >
          {children}
        </Link>
      ) : (
        <div className={cn(LIST_ROW, className)}>{children}</div>
      )}
    </li>
  );
}

// ── Sheet states ─────────────────────────────────────────────

/** Loading rows that keep the geometry of the rows they stand in for. */
export function SheetLoading({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-[var(--border)]">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-[52px] items-center gap-4 px-5">
          <span aria-hidden="true" className="loading-skeleton h-3 w-[min(40%,220px)] rounded-[4px]" />
          <span aria-hidden="true" className="loading-skeleton ml-auto h-3 w-20 rounded-[4px]" />
        </div>
      ))}
    </div>
  );
}

/** Empty state that teaches what fills the sheet and offers the next step. */
export function SheetEmpty({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-1.5 px-5 py-10", className)}>
      <p className="text-[14px] font-semibold text-[var(--text)]">{title}</p>
      {description && (
        <p className="max-w-[60ch] text-[13px] leading-[1.6] text-[var(--text2)]">{description}</p>
      )}
      {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** Failed load: names the problem and, when possible, the recovery. */
export function SheetError({
  message,
  title = "Could not load this list",
  onRetry,
  className,
}: {
  message: ReactNode;
  title?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-1.5 px-5 py-8", className)}>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--red)]">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      <p className="max-w-[72ch] break-words text-[13px] leading-[1.6] text-[var(--text2)]">{message}</p>
      {onRetry && (
        <UiButton variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </UiButton>
      )}
    </div>
  );
}

// ── Page tabs ────────────────────────────────────────────────

export interface PageTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Underline tabs for switching views inside one page. Arrow keys, Home, and
 * End move between tabs (roving tabindex). The hairline is an inset shadow so
 * the active underline can sit on it without negative margins, which would
 * widen the scroll region on phones.
 */
export function PageTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
  trailing,
  className,
}: {
  tabs: PageTab<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  /** Prefix for tab and panel ids. Pass the same value to `pageTabPanelProps`. */
  idBase: string;
  trailing?: ReactNode;
  className?: string;
}) {
  const focusTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    onChange(tab.value);
    document.getElementById(`${idBase}-tab-${tab.value}`)?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    focusTab(next);
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-end justify-between gap-4 shadow-[inset_0_-1px_0_0_var(--border)]",
        className,
      )}
    >
      <div role="tablist" aria-label={label} className="sidebar-scroll flex min-w-0 items-end gap-6 overflow-x-auto">
        {tabs.map((tab, index) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              id={`${idBase}-tab-${tab.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${idBase}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "relative flex h-10 shrink-0 items-center gap-1.5 rounded-t-[var(--radius)] text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border2)]",
                active ? "font-medium text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text2)]",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">{tab.count}</span>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 bottom-0 h-[2px] rounded-full transition-colors duration-150",
                  active ? "bg-[var(--text)]" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2 pb-1.5">{trailing}</div>}
    </div>
  );
}

/** Spread on the element that PageTabs controls. */
export function pageTabPanelProps(idBase: string, value: string) {
  return {
    id: `${idBase}-panel`,
    role: "tabpanel" as const,
    "aria-labelledby": `${idBase}-tab-${value}`,
  };
}

// ── Row actions ──────────────────────────────────────────────

/** One overflow menu per row for secondary and destructive actions. */
export function RowActions({
  label,
  children,
  disabled,
  width = "w-56",
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  width?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UiButton variant="ghost" size="icon-sm" aria-label={label} disabled={disabled}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </UiButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={width}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Links and toolbar pieces ─────────────────────────────────

/** Links are `--text` with a `--border2` underline, never brand-coloured. */
export function TextLink({
  to,
  children,
  arrow = false,
  size = "md",
  className,
}: {
  to: string;
  children: ReactNode;
  arrow?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1 rounded-[2px] text-[var(--text)] underline decoration-[var(--border2)] underline-offset-[3px] transition-[text-decoration-color] duration-150 hover:decoration-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]",
        size === "sm" ? "text-[12px]" : "text-[13px]",
        className,
      )}
    >
      {children}
      {arrow && <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />}
    </Link>
  );
}

/** Instant filter input with a leading glyph and a clear control. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Accessible name. Defaults to the placeholder. */
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-[200px] flex-1 sm:max-w-[320px]", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={cn(
          fieldInputClass,
          "pl-9 pr-8 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius)] text-[var(--text3)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Result count at the trailing edge of a toolbar. */
export function ToolbarCount({ children }: { children: ReactNode }) {
  return (
    <span className="ml-auto whitespace-nowrap text-[12px] tabular-nums text-[var(--text3)]" aria-live="polite">
      {children}
    </span>
  );
}
