// ============================================================
// Detail sheet primitives for every Observe detail-by-id page
// (design/observe/DESIGN.md). Header on the canvas, readout band,
// sticky underline section tabs, hairline panels, label-left
// key/value rows.
// ============================================================
import { Link } from "react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./primitives";

export function DetailPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-24", className)}>{children}</div>;
}

export interface Crumb {
  label: string;
  to?: string;
  mono?: boolean;
}

export interface MetaItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export function DetailHeader({
  crumbs,
  title,
  lead,
  badges,
  meta,
  actions,
  description,
  copyId,
}: {
  crumbs: Crumb[];
  title: React.ReactNode;
  /** Element placed before the title on the same line (method badge, status dot). */
  lead?: React.ReactNode;
  badges?: React.ReactNode;
  meta?: (MetaItem | null | false | undefined)[];
  actions?: React.ReactNode;
  description?: React.ReactNode;
  copyId?: string;
}) {
  const visibleMeta = (meta ?? []).filter((m): m is MetaItem => Boolean(m) && m !== null && hasContent((m as MetaItem).value));
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-[12px] text-[var(--text3)]">
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
            {c.to ? (
              <Link to={c.to} className="rounded-[4px] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)]">
                {c.label}
              </Link>
            ) : (
              <span className={cn("truncate text-[var(--text2)]", c.mono && "font-[family-name:var(--mono)]")}>{c.label}</span>
            )}
          </span>
        ))}
        {copyId && <CopyButton value={copyId} label="" className="ml-1 h-6 w-6 justify-center border-0 p-0 text-[var(--text3)]" />}
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2.5">
            {lead}
            <h1 className="min-w-0 break-words text-[22px] font-semibold leading-[1.25] tracking-[-0.025em] text-[var(--text)]">{title}</h1>
          </div>
          {description && <p className="mt-2 max-w-[80ch] break-words text-[13px] leading-[1.6] text-[var(--text2)]">{description}</p>}
          {(badges || visibleMeta.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
              {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
              {visibleMeta.map((m) => (
                <span key={m.label} className="flex min-w-0 items-center gap-1.5">
                  <span className="text-[var(--text3)]">{m.label}</span>
                  <span className={cn("truncate text-[var(--text2)]", m.mono && "font-[family-name:var(--mono)]")}>{m.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

function hasContent(value: React.ReactNode) {
  return value !== null && value !== undefined && value !== "" && value !== false && value !== "—";
}

export interface SectionTab<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

/** Sticky underline tabs. Works for scroll-spy anchors or plain tab state. */
export function SectionTabs<T extends string>({
  items,
  activeId,
  onSelect,
  sticky = true,
  trailing,
  label = "Sections",
}: {
  items: readonly SectionTab<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  sticky?: boolean;
  trailing?: React.ReactNode;
  label?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "z-20 -mx-6 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg)] px-6",
        sticky && "sticky top-0",
      )}
    >
      <div className="sidebar-scroll flex min-w-0 items-center gap-5 overflow-x-auto">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "relative flex h-11 shrink-0 cursor-pointer items-center gap-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-[var(--radius-xs)]",
                active ? "font-medium text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text2)]",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">{item.count}</span>
              )}
              <span
                aria-hidden="true"
                className={cn("absolute inset-x-0 -bottom-px h-[2px] rounded-full transition-colors", active ? "bg-[var(--text)]" : "bg-transparent")}
              />
            </button>
          );
        })}
      </div>
      {trailing && <div className="hidden shrink-0 items-center gap-2 md:flex">{trailing}</div>}
    </nav>
  );
}

export function Panel({
  id,
  title,
  description,
  action,
  children,
  className,
  flush = false,
}: {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Drop body padding (tables, lists, code blocks that own their edges). */
  flush?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("min-w-0 scroll-mt-16 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}
    >
      {(title || description || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>}
            {description && <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text3)]">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export interface KeyValueItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  /** Raw text used for copy + title when `value` is a node. */
  text?: string;
}

function asText(value: React.ReactNode): string | null {
  if (value === null || value === undefined || value === "" || value === false) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

/** Label-left attribute rows divided by hairlines. */
export function KeyValueList({
  items,
  columns = 2,
  hideEmpty = false,
  labelWidth = 150,
}: {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3;
  hideEmpty?: boolean;
  labelWidth?: number;
}) {
  const rows = hideEmpty ? items.filter((i) => hasContent(i.value)) : items;
  if (rows.length === 0) return null;
  return (
    <dl
      className={cn(
        "grid gap-x-10",
        columns === 3 ? "md:grid-cols-2 xl:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : "grid-cols-1",
      )}
    >
      {rows.map((item) => {
        const text = item.text ?? asText(item.value);
        const empty = !hasContent(item.value);
        return (
          <div
            key={item.label}
            className="grid min-w-0 items-baseline gap-3 border-b border-[var(--border)] py-2.5"
            style={{ gridTemplateColumns: `minmax(0, ${labelWidth}px) minmax(0, 1fr)` }}
          >
            <dt className="truncate text-[12px] text-[var(--text3)]" title={item.label}>{item.label}</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "min-w-0 truncate text-[13px] text-[var(--text)]",
                  item.mono && "font-[family-name:var(--mono)] text-[12px] tabular-nums",
                  empty && "text-[var(--text3)]",
                )}
                title={text ?? undefined}
              >
                {empty ? "—" : typeof item.value === "boolean" ? (item.value ? "Yes" : "No") : item.value}
              </span>
              {item.copyable && text && !empty && (
                <CopyButton value={text} label="" className="h-5 w-5 justify-center border-0 p-0 text-[var(--text3)] hover:text-[var(--text)]" />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Empty state that names what would fill the space. */
export function EmptyNote({ title, children, action, className }: {
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-1.5 rounded-[var(--radius)] border border-dashed border-[var(--border2)] px-4 py-4 text-[13px]", className)}>
      {title && <div className="font-medium text-[var(--text2)]">{title}</div>}
      {children && <div className="max-w-[72ch] leading-[1.6] text-[var(--text3)]">{children}</div>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

/** Code / payload block with hairline frame. */
export function CodeBlock({ children, maxHeight = 480, className }: { children: React.ReactNode; maxHeight?: number; className?: string }) {
  return (
    <pre
      className={cn(
        "sidebar-scroll overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4 font-[family-name:var(--mono)] text-[12px] leading-[1.65] text-[var(--text)] selection:bg-[var(--text)]/20",
        className,
      )}
      style={{ maxHeight }}
    >
      {children}
    </pre>
  );
}

/** Not-found / failed-load state shared by every detail-by-id page. */
export function DetailNotFound({ kind, id, backTo, backLabel }: { kind: string; id: string; backTo: string; backLabel: string }) {
  return (
    <DetailPage className="max-w-[880px] pt-10">
      <Link to={backTo} className="inline-flex w-fit items-center gap-1.5 text-[12px] text-[var(--text3)] transition-colors hover:text-[var(--text)]">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {backLabel}
      </Link>
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--text)]">{kind} not found</h1>
        <p className="mt-2 text-[13px] leading-[1.6] text-[var(--text2)]">
          Nothing matched <code className="break-all font-[family-name:var(--mono)] text-[var(--text)]">{id}</code> in this organization. It may belong to another project, or it has aged out of retention.
        </p>
      </div>
      <EmptyNote>Check the ID, switch project from the header, or go back to the list and widen the time range.</EmptyNote>
    </DetailPage>
  );
}
