import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
  loading = false,
}: InfiniteTableProps<T>) {
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const query = useInfiniteQuery({
    // `items.length` is part of the key so the list refetches once the page's
    // own data query resolves (items goes from 0 -> N), avoiding a stale empty cache.
    queryKey: ["infinite-table", ...queryKey, items.length],
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { root, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage, rows.length]);

  const gridTemplate = columns.map((c) => c.width ?? "1fr").join(" ");

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      <div
        className="grid shrink-0 gap-3 border-b border-[var(--border)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((c) => (
          <span key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.header}</span>
        ))}
      </div>

      <div ref={scrollRef} className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
        {query.isLoading || loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {columns.map((c) => (
                  <Skeleton key={c.key} className={cn("h-4", c.align === "right" ? "ml-auto w-1/2" : "w-3/4")} />
                ))}
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[var(--text3)]">{emptyMessage}</div>
        ) : (
          <>
            {rows.map((item) => (
              <div
                key={getKey(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(
                  "grid items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--text)] last:border-0",
                  onRowClick && "cursor-pointer transition-colors hover:bg-[var(--bg2)]"
                )}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {columns.map((c) => (
                  <div key={c.key} className={cn("min-w-0 truncate", c.align === "right" && "text-right")}>{c.cell(item)}</div>
                ))}
              </div>
            ))}
            <div ref={sentinelRef} />
            <div className="flex h-12 items-center justify-center text-[12px] text-[var(--text3)]">
              {query.isFetchingNextPage ? (
                <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading more…</span>
              ) : query.hasNextPage ? (
                <span>Scroll for more</span>
              ) : (
                <span>{total} total · end of results</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
