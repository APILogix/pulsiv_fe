import { useRef, useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedEmptyState, type EmptyIllustration } from "@/shared/motion";
import { VirtualList } from "./VirtualList";

export interface Column<T> {
  key: string;
  header: string;
  width?: string; // CSS grid track, e.g. "70px" or "1fr"
  align?: "left" | "right";
  cell: (item: T) => React.ReactNode;
}

interface InfiniteTableProps<T> {
  items: T[];
  queryKey: unknown[];
  columns: Column<T>[];
  getKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  /** Headline for the empty state. Falls back to `emptyMessage`. */
  emptyTitle?: string;
  /** Illustration keyed to the domain (Phase 5). */
  emptyIllustration?: EmptyIllustration;
  /** CTA rendered under the empty state — every empty screen should offer one. */
  emptyAction?: React.ReactNode;
  loading?: boolean;
}

// Instagram-style infinite list backed by TanStack Query useInfiniteQuery.
// Loads `pageSize` (default 20) rows, then auto-fetches the next page when the
// sentinel scrolls into view. Header is sticky; only the body scrolls.
export function InfiniteTable<T>({
  items,
  queryKey,
  columns,
  getKey,
  onRowClick,
  pageSize = 20,
  className,
  emptyMessage = "No results.",
  emptyTitle,
  emptyIllustration = "search",
  emptyAction,
  loading = false,
}: InfiniteTableProps<T>) {
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const itemsVersion = useMemo(
    () => items.map((item) => `${getKey(item)}:${JSON.stringify(item)}`).join("|"),
    [getKey, items],
  );

  const query = useInfiniteQuery({
    // `items.length` is part of the key so the list refetches once the page's
    // own data query resolves (items goes from 0 -> N), avoiding a stale empty cache.
    queryKey: ["infinite-table", ...queryKey, items.length, itemsVersion],
    queryFn: async ({ pageParam }) => {
      await new Promise((r) => setTimeout(r, 280)); // simulate network page fetch
      const all = itemsRef.current;
      const start = pageParam * pageSize;
      return { rows: all.slice(start, start + pageSize), page: pageParam, total: all.length };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => ((last.page + 1) * pageSize < last.total ? last.page + 1 : undefined),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = query.data?.pages[0]?.total ?? items.length;

  const gridTemplate = columns.map((c) => c.width ?? "1fr").join(" ");

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      {/* Sticky header row: --bg2, mono 10px uppercase --text3 (§7) */}
      <div
        className="grid shrink-0 gap-3 border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((c) => (
          <span key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.header}</span>
        ))}
      </div>

      {(query.isLoading || loading) && rows.length === 0 ? (
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="grid items-center gap-3 border-b border-[var(--border)] px-4 h-[44px] last:border-0"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {columns.map((c) => (
                  <Skeleton key={c.key} className={cn("h-4", c.align === "right" ? "ml-auto w-1/2" : "w-3/4")} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="sidebar-scroll min-h-0 flex-1 flex items-center justify-center">
          <AnimatedEmptyState
            illustration={emptyIllustration}
            title={emptyTitle ?? emptyMessage}
            description={emptyTitle ? emptyMessage : undefined}
            action={emptyAction}
            compact
          />
        </div>
      ) : (
        <VirtualList
          className="min-h-0 flex-1"
          height="fill"
          items={rows}
          rowHeight={44}
          getKey={getKey}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          renderRow={(item) => (
            <div
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(item); } } : undefined}
              className={cn(
                "grid h-full w-full items-center gap-3 border-b border-[var(--border)] px-4 text-[13px] text-[var(--text)]",
                onRowClick && "cursor-pointer transition-colors hover:bg-[var(--bg2)]"
              )}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map((c) => (
                <div key={c.key} className={cn("min-w-0 truncate", c.align === "right" && "text-right")}>{c.cell(item)}</div>
              ))}
            </div>
          )}
          footer={
            <div className="flex h-12 shrink-0 items-center justify-center border-t border-[var(--border)] font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
              {query.isFetchingNextPage ? (
                <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading more…</span>
              ) : query.hasNextPage ? (
                <span>Scroll for more</span>
              ) : (
                <span>{total} total · end of results</span>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
