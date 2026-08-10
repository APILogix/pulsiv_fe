import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedEmptyState, type EmptyIllustration } from "@/shared/motion";
import { VirtualList } from "./VirtualList";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  width?: string; // CSS grid track, e.g. "70px" or "1fr"
  align?: "left" | "right";
  cell: (item: T) => React.ReactNode;
}

export interface TablePagination {
  nextCursor?: string | null;
  previousCursor?: string | null;
  hasNext?: boolean;
  hasPrevious?: boolean;
  limit?: number;
  direction?: string;
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
  emptyTitle?: string;
  emptyIllustration?: EmptyIllustration;
  emptyAction?: React.ReactNode;
  loading?: boolean;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectToggle?: (id: string) => void;
  onSelectAllToggle?: (ids: string[]) => void;
  pagination?: TablePagination;
  onNextPage?: (nextCursor: string) => void;
  onPreviousPage?: () => void;
}

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
  selectable = false,
  selectedKeys,
  onSelectToggle,
  onSelectAllToggle,
  pagination,
  onNextPage,
  onPreviousPage,
}: InfiniteTableProps<T>) {
  const [page, setPage] = useState(1);

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

  const visibleKeys = useMemo(() => {
    return visibleItems.map(getKey);
  }, [visibleItems, getKey]);

  const isAllSelected = useMemo(() => {
    if (!selectedKeys || visibleKeys.length === 0) return false;
    return visibleKeys.every((k) => selectedKeys.has(k));
  }, [selectedKeys, visibleKeys]);

  const hasMore = visibleItems.length < items.length;

  const handleEndReached = () => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const gridTemplate = useMemo(() => {
    const colWidths = columns.map((c) => c.width ?? "1fr").join(" ");
    return selectable ? `32px ${colWidths}` : colWidths;
  }, [columns, selectable]);

  // Sticky pagination footer — always visible, never scrolled away
  const paginationFooter = (onPreviousPage || onNextPage) ? (
    <div className="flex h-11 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg2)]/60 px-4 font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
      <div>
        <span>Showing {items.length} items</span>
        {pagination?.limit ? <span> · Limit {pagination.limit}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        {onPreviousPage && (
          <button
            type="button"
            disabled={!pagination?.hasPrevious}
            onClick={onPreviousPage}
            className="inline-flex items-center gap-1 rounded border border-[var(--border2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </button>
        )}
        {onNextPage && (
          <button
            type="button"
            disabled={!pagination?.hasNext || !pagination?.nextCursor}
            onClick={() => pagination?.nextCursor && onNextPage(pagination.nextCursor)}
            className="inline-flex items-center gap-1 rounded border border-[var(--border2)] bg-[var(--bg2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--border2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      {/* Sticky column header row */}
      <div
        className="grid shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] select-none"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {selectable && (
          <button
            type="button"
            onClick={() => onSelectAllToggle?.(visibleKeys)}
            aria-label="Select all rows"
            className={cn(
              "flex size-4 items-center justify-center rounded border transition-colors cursor-pointer",
              isAllSelected
                ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--bg)]"
                : "border-[var(--border2)] bg-[var(--bg1)] hover:border-[var(--text2)]"
            )}
          >
            {isAllSelected && <Check className="size-3 stroke-[3]" />}
          </button>
        )}
        {columns.map((c) => (
          <span key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.header}</span>
        ))}
      </div>

      {/* Scrollable body — fills all remaining space between the header and footer */}
      {loading && visibleItems.length === 0 ? (
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="grid items-center gap-3 border-b border-[var(--border)] px-4 h-[44px] last:border-0"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {selectable && <Skeleton className="size-4 rounded" />}
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
          renderRow={(item) => {
            const key = getKey(item);
            const selected = selectedKeys?.has(key) ?? false;
            const handleKeyDown = onRowClick
              ? (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick(item);
                  }
                }
              : undefined;

            return (
              <div
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={handleKeyDown}
                className={cn(
                  "grid h-full w-full items-center gap-3 border-b border-[var(--border)] px-4 text-[13px] text-[var(--text)] transition-colors",
                  selected && "bg-[var(--brand)]/5",
                  onRowClick && "cursor-pointer hover:bg-[var(--bg2)]"
                )}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {selectable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectToggle?.(key);
                    }}
                    aria-label={`Select row ${key}`}
                    className={cn(
                      "flex size-4 items-center justify-center rounded border transition-colors cursor-pointer",
                      selected
                        ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--bg)]"
                        : "border-[var(--border2)] bg-[var(--bg1)] hover:border-[var(--text2)]"
                    )}
                  >
                    {selected && <Check className="size-3 stroke-[3]" />}
                  </button>
                )}
                {columns.map((c) => (
                  <div key={c.key} className={cn("min-w-0 truncate", c.align === "right" && "text-right")}>{c.cell(item)}</div>
                ))}
              </div>
            );
          }}
        />
      )}

      {/* Always-visible pagination footer — never inside the scroll area */}
      {paginationFooter}
    </div>
  );
}
