/*
 * DASHBOARDS — direction contract (seed 712c8ad6)
 *
 * THESIS: every dashboard is a departure board for one role's question. The
 * page leads with a ranked ledger of the things that can fail (services,
 * endpoints, error groups, releases, countries…), worst first, each row lit by
 * a state lamp. It refuses the category default: a grid of KPI tiles and
 * floating chart cards with no order of attention.
 * OWN-WORLD: the app's zinc Mono tokens. Ruled rows on --bg1, 1px hairlines,
 * fixed columns that never move, mono numerals in fixed cells, square state
 * lamps (green/amber/red, grey when idle), cyan only for model output. No
 * shadows, gradients, glows or icon chips.
 * STORY: the reader sees the verdict sentence, the worst row, and why — then
 * unfolds a row in place for the evidence, never leaving the page.
 * FIRST VIEWPORT: header + verdict line, one ruled readout strip, then the
 * lead ledger filling the rest of the viewport.
 * FORM: signal ledger (grounded candidate 6 of 7) fused with the split-flap
 * concourse board; seed 712c8ad6.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, DESIGN.md, and every shipping raster carrying
 * its provenance.
 */
import { Fragment, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiSpark, ConfidencePill } from "@/shared/ui/sentinel";
import type { State } from "./fixtures";

export type { State } from "./fixtures";

/* ── State law: one colour per meaning, everywhere ─────────────────────── */

export const STATE_COLOR: Record<State, string> = {
  ok: "var(--green)",
  warn: "var(--amber)",
  bad: "var(--red)",
  idle: "var(--border2)",
};

const STATE_RANK: Record<State, number> = { bad: 0, warn: 1, ok: 2, idle: 3 };

export const STATE_WORD: Record<State, string> = {
  ok: "Healthy",
  warn: "Degraded",
  bad: "Failing",
  idle: "Idle",
};

/** Text colour for a value that carries state. Healthy values stay neutral. */
export function stateText(state: State): string {
  if (state === "bad") return "var(--red)";
  if (state === "warn") return "var(--amber)";
  return "var(--text)";
}

export function Lamp({ state, className, label }: { state: State; className?: string; label?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-[2px]", className)}
      style={{ background: STATE_COLOR[state] }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/** Status word on a 4px-radius tint of its state colour. */
export function Tag({ state, children }: { state: State; children: ReactNode }) {
  const color = state === "idle" || state === "ok" ? "var(--text2)" : STATE_COLOR[state];
  const bg = state === "bad" ? "var(--red-bg)" : state === "warn" ? "var(--amber-bg)" : "var(--bg2)";
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-[4px] px-1.5 text-[11px] font-medium"
      style={{ color, background: bg }}
    >
      {state === "ok" && <Lamp state="ok" className="size-1.5" />}
      {children}
    </span>
  );
}

/* ── Flip: the one authored motion ─────────────────────────────────────── */

/**
 * A reading whose characters flip into place when it first renders or when a
 * character changes. Unchanged characters keep their key and stay still.
 */
export function Flip({ value, className }: { value: string; className?: string }) {
  const chars = Array.from(value);
  return (
    <span className={cn("inline-flex whitespace-pre", className)}>
      <span className="sr-only">{value}</span>
      {chars.map((ch, i) => (
        <span
          key={`${chars.length}-${i}-${ch}`}
          aria-hidden="true"
          className="board-flap"
          style={{ ["--flap-i" as string]: i }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/* ── Page shell ────────────────────────────────────────────────────────── */

export interface VerdictItem {
  state: State;
  text: string;
}

export function BoardPage({
  title,
  description,
  verdict,
  window = "Last 24 hours",
  actions,
  children,
  padded = false,
}: {
  title: string;
  description: string;
  verdict: VerdictItem[];
  window?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Home renders outside ModuleLayout and supplies its own gutter. */
  padded?: boolean;
}) {
  return (
    <div className={cn("board mx-auto flex w-full max-w-[1400px] flex-col gap-6", padded && "px-4 py-6 sm:px-6")}>
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--text)] [text-wrap:balance]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-[68ch] text-[13px] leading-[1.55] text-[var(--text2)]">{description}</p>
          <Verdict items={verdict} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] px-2.5 text-[12px] text-[var(--text2)]">
            {window}
          </span>
          <span
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-dashed border-[var(--border2)] px-2.5 text-[12px] text-[var(--text3)]"
            title="These figures are synthetic sample data. No API is called on this page."
          >
            Sample data
          </span>
          {actions}
        </div>
      </header>
      {children}
    </div>
  );
}

/** One-sentence answer to "is anything wrong?", lit by the worst state. */
export function Verdict({ items }: { items: VerdictItem[] }) {
  if (items.length === 0) return null;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium text-[var(--text)]" role="status">
      {items.map((v) => (
        <span key={v.text} className="inline-flex items-center gap-2">
          <Lamp state={v.state} />
          <span style={{ color: v.state === "ok" || v.state === "idle" ? "var(--text)" : STATE_COLOR[v.state] }}>
            {v.text}
          </span>
        </span>
      ))}
    </p>
  );
}

/* ── Readout strip: fixed cells, ruled like a board ────────────────────── */

export interface Reading {
  label: string;
  value: string;
  /** Signed change, e.g. "+12.4%". */
  delta?: string;
  /** Whether the change is good or bad. Decides colour, not direction. */
  verdict?: "good" | "bad" | "flat";
  note?: string;
  state?: State;
}

const VERDICT_COLOR = { good: "var(--green)", bad: "var(--red)", flat: "var(--text3)" } as const;

export function Readouts({ items, className }: { items: Reading[]; className?: string }) {
  const cols =
    items.length >= 6 ? "xl:grid-cols-6" : items.length === 5 ? "xl:grid-cols-5" : items.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3",
        cols,
        className,
      )}
    >
      {items.map((r) => (
        <div key={r.label} className="flex min-w-0 flex-col bg-[var(--bg1)] px-5 py-4">
          <dt className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--text2)]">
            {r.state && r.state !== "ok" && <Lamp state={r.state} label={STATE_WORD[r.state]} />}
            <span className="truncate">{r.label}</span>
          </dt>
          <dd
            className="mt-3 truncate font-mono text-[26px] font-medium leading-none tracking-[-0.02em]"
            style={{ color: r.state ? stateText(r.state) : "var(--text)" }}
          >
            <Flip value={r.value} />
          </dd>
          {(r.delta || r.note) && (
            <dd className="mt-2.5 flex min-w-0 items-baseline gap-1.5 text-[12px]">
              {r.delta && (
                <span className="font-mono" style={{ color: VERDICT_COLOR[r.verdict ?? "flat"] }}>
                  {r.delta}
                </span>
              )}
              {r.note && <span className="truncate text-[var(--text3)]">{r.note}</span>}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

/* ── Panel: secondary evidence on the sheet ────────────────────────────── */

export function Panel({
  title,
  meta,
  action,
  children,
  className,
  flush = false,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-1 pt-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
          {meta && <span className="truncate text-[12px] text-[var(--text3)]">{meta}</span>}
        </div>
        {action}
      </header>
      <div className={cn("flex-1", flush ? "pt-3" : "px-5 pb-4 pt-3")}>{children}</div>
    </section>
  );
}

/* ── Segmented control ─────────────────────────────────────────────────── */

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string; count?: number }[];
  value: V;
  onChange: (v: V) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--text)]",
              active ? "bg-[var(--bg3)] text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text)]",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="font-mono text-[11px] text-[var(--text3)]">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Ledger: the board itself ──────────────────────────────────────────── */

export interface LedgerColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Hide below this breakpoint so the board narrows by column priority. */
  hide?: "sm" | "md" | "lg" | "xl";
  className?: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => number | string;
}

const HIDE: Record<NonNullable<LedgerColumn<unknown>["hide"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

type SortState = { key: string; dir: "desc" | "asc" } | null;

export function Ledger<T>({
  id,
  title,
  meta,
  rows,
  rowId,
  rowState,
  primary,
  columns,
  detail,
  attention,
  ranked = true,
  filter = true,
  limit,
  action,
  emptyAttention = "Nothing needs attention. Every row is healthy.",
  className,
}: {
  /** Also the URL search param that deep-links the unfolded row. */
  id: string;
  title: string;
  meta?: ReactNode;
  rows: T[];
  rowId: (row: T) => string;
  rowState: (row: T) => State;
  primary: { header: string; cell: (row: T) => ReactNode; sub?: (row: T) => ReactNode };
  columns: LedgerColumn<T>[];
  detail?: (row: T) => ReactNode;
  /** Tie-break inside a state band; higher reads first. */
  attention?: (row: T) => number;
  ranked?: boolean;
  filter?: boolean;
  limit?: number;
  action?: ReactNode;
  emptyAttention?: string;
  className?: string;
}) {
  const [params, setParams] = useSearchParams();
  const openId = params.get(id);
  const [sort, setSort] = useState<SortState>(null);
  const [scope, setScope] = useState<"all" | "attention">("all");
  const [showAll, setShowAll] = useState(false);

  const needing = rows.filter((r) => {
    const s = rowState(r);
    return s === "bad" || s === "warn";
  }).length;

  const byAttention = [...rows].sort((a, b) => {
    const d = STATE_RANK[rowState(a)] - STATE_RANK[rowState(b)];
    if (d !== 0) return d;
    return (attention?.(b) ?? 0) - (attention?.(a) ?? 0);
  });

  const sortCol = sort ? columns.find((c) => c.key === sort.key) : undefined;
  const sorted = sortCol?.sortValue
    ? [...byAttention].sort((a, b) => {
        const va = sortCol.sortValue!(a);
        const vb = sortCol.sortValue!(b);
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sort!.dir === "asc" ? cmp : -cmp;
      })
    : byAttention;

  const scoped = scope === "attention" ? sorted.filter((r) => rowState(r) === "bad" || rowState(r) === "warn") : sorted;
  const visible = limit && !showAll ? scoped.slice(0, limit) : scoped;
  const colCount = columns.length + 1 + (ranked ? 1 : 0) + (detail ? 1 : 0);

  function toggle(rid: string) {
    const next = new URLSearchParams(params);
    if (openId === rid) next.delete(id);
    else next.set(id, rid);
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function cycleSort(key: string) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "desc" };
      if (s.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  const ariaSort = (key: string): "ascending" | "descending" | "none" =>
    sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <section className={cn("flex min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
          <span className="text-[12px] text-[var(--text3)]">
            {meta ?? (sort ? "Sorted by column" : "Worst first")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sort && (
            <button
              type="button"
              onClick={() => setSort(null)}
              className="h-8 rounded-[var(--radius)] px-2 text-[12px] text-[var(--text3)] outline-none transition-colors hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--text)]"
            >
              Reset to worst first
            </button>
          )}
          {filter && (
            <Segmented
              label={`Filter ${title}`}
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "All", count: rows.length },
                { value: "attention", label: "Needs attention", count: needing },
              ]}
            />
          )}
          {action}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-t border-[var(--border)] text-left text-[12px] text-[var(--text3)]">
              {ranked && (
                <th scope="col" className="w-10 py-2 pl-5 pr-0 font-normal">
                  <span className="sr-only">Rank</span>
                </th>
              )}
              <th scope="col" className={cn("py-2 pr-3 font-normal", ranked ? "pl-2" : "pl-5")}>
                {primary.header}
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={c.sortValue ? ariaSort(c.key) : undefined}
                  className={cn("px-3 py-2 font-normal", c.align === "right" && "text-right", c.hide && HIDE[c.hide], c.className)}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => cycleSort(c.key)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-[3px] outline-none transition-colors hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--text)]",
                        sort?.key === c.key && "text-[var(--text)]",
                      )}
                    >
                      {c.header}
                      {sort?.key === c.key && (
                        <ChevronDown className={cn("size-3", sort.dir === "asc" && "rotate-180")} aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
              {detail && (
                <th scope="col" className="w-10 pr-4 font-normal">
                  <span className="sr-only">Details</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr className="border-t border-[var(--border)]">
                <td colSpan={colCount} className="px-5 py-8 text-center text-[13px] text-[var(--text2)]">
                  <span className="inline-flex items-center gap-2">
                    <Lamp state="ok" />
                    {emptyAttention}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className="ml-3 text-[13px] text-[var(--text)] underline decoration-[var(--border2)] underline-offset-4 outline-none hover:decoration-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--text)]"
                  >
                    Show all rows
                  </button>
                </td>
              </tr>
            )}
            {visible.map((row, i) => {
              const rid = rowId(row);
              const state = rowState(row);
              const open = openId === rid;
              const detailId = `${id}-${rid}-detail`.replace(/[^a-zA-Z0-9_-]/g, "_");
              return (
                <Fragment key={rid}>
                  <tr
                    className={cn(
                      "group border-t border-[var(--border)] transition-colors duration-150",
                      detail && "cursor-pointer",
                      open ? "bg-[var(--bg2)]" : "hover:bg-[var(--bg2)]",
                      state === "bad" && !open && "bg-[color-mix(in_oklab,var(--red)_5%,var(--bg1))]",
                    )}
                    onClick={detail ? () => toggle(rid) : undefined}
                  >
                    {ranked && (
                      <td className="py-2.5 pl-5 pr-0 align-middle font-mono text-[11px] text-[var(--text3)]">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                    )}
                    <td className={cn("py-2.5 pr-3 align-middle", ranked ? "pl-2" : "pl-5")}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Lamp state={state} label={STATE_WORD[state]} />
                        <div className="min-w-0">
                          {detail ? (
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={detailId}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggle(rid);
                              }}
                              className="block max-w-full truncate rounded-[3px] text-left font-medium text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]"
                            >
                              {primary.cell(row)}
                            </button>
                          ) : (
                            <div className="truncate font-medium text-[var(--text)]">{primary.cell(row)}</div>
                          )}
                          {primary.sub && <div className="mt-0.5 truncate text-[12px] text-[var(--text3)]">{primary.sub(row)}</div>}
                        </div>
                      </div>
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-3 py-2.5 align-middle font-mono text-[13px] text-[var(--text2)]",
                          c.align === "right" && "text-right",
                          c.hide && HIDE[c.hide],
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                    {detail && (
                      <td className="py-2.5 pr-4 text-right align-middle">
                        <ChevronDown
                          aria-hidden="true"
                          className={cn(
                            "ml-auto size-4 text-[var(--text3)] transition-transform duration-200 group-hover:text-[var(--text)]",
                            open && "rotate-180 text-[var(--text)]",
                          )}
                        />
                      </td>
                    )}
                  </tr>
                  {detail && open && (
                    <tr className="bg-[var(--bg)]">
                      <td id={detailId} colSpan={colCount} className="border-t border-[var(--border)] p-0">
                        <div className="board-unfold px-5 py-5">{detail(row)}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {limit && scoped.length > limit && (
        <div className="border-t border-[var(--border)] px-5 py-2.5">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[12px] font-medium text-[var(--text2)] outline-none transition-colors hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--text)]"
          >
            {showAll ? "Show fewer" : `Show all ${scoped.length}`}
          </button>
        </div>
      )}
    </section>
  );
}

/* ── Inline cell visuals ───────────────────────────────────────────────── */

/** Value against a scale, with an optional threshold tick. Colour only on breach. */
export function Meter({
  value,
  max,
  threshold,
  state = "ok",
  label,
  className,
}: {
  value: number;
  max: number;
  threshold?: number;
  state?: State;
  label?: string;
  className?: string;
}) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = state === "bad" || state === "warn" ? STATE_COLOR[state] : "var(--text2)";
  return (
    <span
      className={cn("relative inline-block h-[3px] w-full min-w-12 overflow-visible rounded-full bg-[var(--bg3)] align-middle", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${w}%`, background: fill }} />
      {threshold !== undefined && (
        <span
          className="absolute -top-[3px] h-[9px] w-px bg-[var(--text3)]"
          style={{ left: `${Math.min(100, (threshold / max) * 100)}%` }}
        />
      )}
    </span>
  );
}

/** Inline 24h trace of the metric in the same row. Never decorative. */
export function Trend({ data, state = "ok", label, width = 88, height = 22 }: { data: number[]; state?: State; label: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => `${(i * step).toFixed(1)},${(height - 2 - ((d - min) / range) * (height - 4)).toFixed(1)}`).join(" ");
  const stroke = state === "bad" || state === "warn" ? STATE_COLOR[state] : "var(--text3)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block shrink-0 overflow-visible align-middle" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Small fact grid used inside unfolded rows. */
export function Facts({ items, className }: { items: { label: string; value: ReactNode; state?: State }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4", className)}>
      {items.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="truncate text-[12px] text-[var(--text3)]">{f.label}</dt>
          <dd className="mt-1 truncate font-mono text-[14px]" style={{ color: f.state ? stateText(f.state) : "var(--text)" }}>
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Model output: a separate, labelled channel ────────────────────────── */

export function ModelNote({
  title,
  children,
  confidence,
  action,
  className,
}: {
  title: string;
  children: ReactNode;
  confidence?: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn("rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3.5", className)}
      aria-label={`Model note: ${title}`}
    >
      <div className="flex items-start gap-2.5">
        <AiSpark size={14} className="mt-[3px] shrink-0 text-[var(--ai)]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-[1.45] text-[var(--text)]">
            <span className="mr-2 text-[12px] font-medium text-[var(--ai)]">Model</span>
            {title}
          </p>
          <div className="mt-1 text-[13px] leading-[1.6] text-[var(--text2)]">{children}</div>
          {(confidence !== undefined || action) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {confidence !== undefined ? <ConfidencePill value={confidence} /> : <span />}
              {action}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── Charts ────────────────────────────────────────────────────────────── */

export const SERIES = ["var(--text)", "var(--blue)", "var(--violet)", "var(--text3)"] as const;
const MONO = "'JetBrains Mono', ui-monospace, monospace";

export interface ChartSeries {
  label: string;
  color: string;
  data: number[];
  area?: boolean;
  dashed?: boolean;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/**
 * Time chart with labelled axes, an optional threshold, and a hover
 * crosshair whose readings replace the legend values (no floating tooltip).
 */
export function TimeChart({
  series,
  xLabels,
  format,
  height = 220,
  threshold,
  label,
  pointLabel,
  max: maxProp,
}: {
  series: ChartSeries[];
  xLabels: string[];
  format: (v: number) => string;
  height?: number;
  threshold?: { value: number; label: string; state?: State };
  label: string;
  /** Label for a hovered index, e.g. the hour. */
  pointLabel?: (i: number) => string;
  max?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = height;
  const PL = 48;
  const PR = 12;
  const PT = 10;
  const PB = 26;
  const CW = W - PL - PR;
  const CH = H - PT - PB;
  const n = Math.max(...series.map((s) => s.data.length), 2);
  const rawMax = Math.max(...series.flatMap((s) => s.data), threshold?.value ?? 0);
  const max = maxProp ?? niceMax(rawMax * 1.08);
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const x = (i: number) => PL + (i / (n - 1)) * CW;
  const y = (v: number) => PT + CH - (Math.min(v, max) / max) * CH;
  const idx = hover ?? n - 1;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PL) / CW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[12px] text-[var(--text2)]">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ background: s.dashed ? `repeating-linear-gradient(90deg, ${s.color} 0 3px, transparent 3px 5px)` : s.color }}
              aria-hidden="true"
            />
            {s.label}
            <span className="font-mono text-[var(--text)]">{s.data[idx] !== undefined ? format(s.data[idx]) : "–"}</span>
          </span>
        ))}
        <span className="ml-auto font-mono text-[11px] text-[var(--text3)]">
          {hover !== null && pointLabel ? pointLabel(hover) : hover === null ? "latest" : ""}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none select-none"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={PL - 8} y={y(t) + 3.5} textAnchor="end" fill="var(--text3)" fontSize={11} fontFamily={MONO}>
              {format(t)}
            </text>
          </g>
        ))}
        {threshold && (
          <g>
            <line
              x1={PL}
              x2={W - PR}
              y1={y(threshold.value)}
              y2={y(threshold.value)}
              stroke={threshold.state ? STATE_COLOR[threshold.state] : "var(--text3)"}
              strokeWidth={1}
              strokeDasharray="6 4"
            />
            <text
              x={W - PR}
              y={y(threshold.value) - 5}
              textAnchor="end"
              fill={threshold.state ? STATE_COLOR[threshold.state] : "var(--text3)"}
              fontSize={11}
              fontFamily={MONO}
            >
              {threshold.label}
            </text>
          </g>
        )}
        {series.map((s) => {
          const pts = s.data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
          return (
            <g key={s.label}>
              {s.area && (
                <polygon points={`${x(0)},${PT + CH} ${pts.join(" ")} ${x(s.data.length - 1)},${PT + CH}`} fill={s.color} fillOpacity={0.06} />
              )}
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          );
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={PT + CH} stroke="var(--border2)" strokeWidth={1} />
            {series.map((s) =>
              s.data[hover] !== undefined ? (
                <circle key={s.label} cx={x(hover)} cy={y(s.data[hover])} r={3} fill="var(--bg1)" stroke={s.color} strokeWidth={1.5} />
              ) : null,
            )}
          </g>
        )}
        {xLabels.map((l, i) => (
          <text
            key={`${l}-${i}`}
            x={PL + (i / Math.max(1, xLabels.length - 1)) * CW}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
            fill="var(--text3)"
            fontSize={11}
            fontFamily={MONO}
          >
            {l}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Stacked columns with a labelled y axis (e.g. responses by status class). */
export function Columns({
  buckets,
  keys,
  format,
  height = 220,
  label,
}: {
  buckets: { label: string; values: Record<string, number> }[];
  keys: { key: string; label: string; color: string }[];
  format: (v: number) => string;
  height?: number;
  label: string;
}) {
  const W = 760;
  const H = height;
  const PL = 48;
  const PR = 12;
  const PT = 10;
  const PB = 26;
  const CW = W - PL - PR;
  const CH = H - PT - PB;
  const totals = buckets.map((b) => keys.reduce((a, k) => a + (b.values[k.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 1) * 1.05);
  const ticks = [0, max / 2, max];
  const bw = CW / buckets.length;
  const barW = Math.min(36, bw * 0.56);
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {keys.map((k) => (
          <span key={k.key} className="flex items-center gap-1.5 text-[12px] text-[var(--text2)]">
            <span className="size-2 rounded-[2px]" style={{ background: k.color }} aria-hidden="true" />
            {k.label}
            <span className="font-mono text-[var(--text)]">{format(buckets.reduce((a, b) => a + (b.values[k.key] ?? 0), 0))}</span>
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label}>
        {ticks.map((t) => {
          const ty = PT + CH - (t / max) * CH;
          return (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={ty} y2={ty} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "2 4"} />
              <text x={PL - 8} y={ty + 3.5} textAnchor="end" fill="var(--text3)" fontSize={11} fontFamily={MONO}>
                {format(t)}
              </text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const cx = PL + i * bw + bw / 2;
          let acc = 0;
          return (
            <g key={b.label}>
              <title>{`${b.label}: ${keys.map((k) => `${k.label} ${format(b.values[k.key] ?? 0)}`).join(", ")}`}</title>
              {keys.map((k) => {
                const v = b.values[k.key] ?? 0;
                const h = (v / max) * CH;
                const yTop = PT + CH - acc - h;
                acc += h + (h > 0 ? 1 : 0);
                return <rect key={k.key} x={cx - barW / 2} y={yTop} width={barW} height={Math.max(0, h)} fill={k.color} />;
              })}
              <text x={cx} y={H - 6} textAnchor="middle" fill="var(--text3)" fontSize={11} fontFamily={MONO}>
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** One 100% bar plus a ruled legend: share of a whole, no donut. */
export function SplitBar({
  segments,
  format = (v) => v.toLocaleString("en-US"),
  label,
}: {
  segments: { label: string; value: number; color: string; state?: State }[];
  format?: (v: number) => string;
  label: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="min-w-0">
      <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-[var(--bg3)]" role="img" aria-label={label}>
        {segments.map((s) => (
          <span key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <ul className="mt-3 divide-y divide-[var(--border)]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 py-2 text-[13px]">
            <span className="size-2 shrink-0 rounded-[2px]" style={{ background: s.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[var(--text2)]">{s.label}</span>
            <span className="font-mono" style={{ color: s.state ? stateText(s.state) : "var(--text)" }}>
              {format(s.value)}
            </span>
            <span className="w-12 text-right font-mono text-[12px] text-[var(--text3)]">{((s.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked rows with a value rule under each label (Top N). */
export function RankList({
  items,
  format,
  label,
}: {
  items: { label: string; value: number; sub?: string; state?: State }[];
  format: (v: number) => string;
  label: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="flex flex-col" aria-label={label}>
      {items.map((it, i) => (
        <li key={it.label} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-baseline gap-x-2 border-t border-[var(--border)] py-2.5 first:border-t-0">
          <span className="font-mono text-[11px] text-[var(--text3)]">{String(i + 1).padStart(2, "0")}</span>
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="truncate font-mono text-[12px] text-[var(--text)]">{it.label}</span>
              {it.sub && <span className="truncate text-[11px] text-[var(--text3)]">{it.sub}</span>}
            </span>
            <Meter value={it.value} max={max} state={it.state} className="mt-2" />
          </span>
          <span className="font-mono text-[12px]" style={{ color: it.state ? stateText(it.state) : "var(--text)" }}>
            {format(it.value)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Timeline of events with a lamp on a hairline rail. */
export function Timeline({ items }: { items: { at: string; state: State; title: string; source: string; kind?: string }[] }) {
  return (
    <ol>
      {items.map((a, i) => {
        const last = i === items.length - 1;
        return (
          <li key={`${a.at}-${a.title}`} className="grid grid-cols-[44px_12px_minmax(0,1fr)] gap-x-3 px-5">
            <span className="pt-3 font-mono text-[12px] text-[var(--text3)]">{a.at}</span>
            <span className="relative flex justify-center" aria-hidden="true">
              <span className={cn("absolute w-px bg-[var(--border)]", i === 0 ? "top-[19px]" : "top-0", last ? "h-[19px]" : "bottom-0")} />
              <span className="relative mt-[15px] size-2 rounded-[2px] ring-2 ring-[var(--bg1)]" style={{ background: STATE_COLOR[a.state] }} />
            </span>
            <div className="min-w-0 py-2.5">
              <p className="text-[13px] font-medium leading-snug text-[var(--text)]">{a.title}</p>
              <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">
                {a.kind && (
                  <span style={{ color: a.state === "bad" || a.state === "warn" ? STATE_COLOR[a.state] : undefined }}>{a.kind} · </span>
                )}
                {a.source}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Small ghost button in the board's vocabulary. */
export function BoardButton({ children, onClick, title }: { children: ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] px-2.5 text-[12px] font-medium text-[var(--text2)] outline-none transition-colors duration-150 hover:border-[var(--border2)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--text)] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
