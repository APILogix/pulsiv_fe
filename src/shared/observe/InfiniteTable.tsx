import { useState, useRef, useEffect, useMemo } from "react";
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
  const [page, setPage] = useState(1);

  // Reset page pagination state when query key changes
  const keyString = JSON.stringify(queryKey);
  const prevKeyRef = useRef(keyString);
  useEffect(() => {
    if (prevKeyRef.current !== keyString) {
      prevKeyRef.current = keyString;
      setPage(1);
    }
  }, [keyString]);

  const visibleItems = useMemo(() => {
    return items.slice(0, page * pageSize);
  }, [items, page, pageSize]);

  const hasMore = visibleItems.length < items.length;

  const handleEndReached = () => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  };

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

      {loading && visibleItems.length === 0 ? (
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
      ) : visibleItems.length === 0 ? (
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
          items={visibleItems}
          rowHeight={44}
          getKey={getKey}
          onEndReached={handleEndReached}
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
              {hasMore ? (
                <span>Scroll for more</span>
              ) : (
                <span>{items.length} total · end of results</span>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
