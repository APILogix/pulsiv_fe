import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ── Client-side infinite pagination (initial 20, auto-grow on scroll) ──
// Mirrors an Instagram-style feed: shows a page, fetches the next as the
// sentinel scrolls into view. Resets when the `resetKey` (filters) changes
// using the "adjust state during render" pattern — no effect-based reset.
export function useInfiniteScroll<T>(items: T[], resetKey: string, pageSize = 20) {
  const [count, setCount] = useState(pageSize);
  const [loading, setLoading] = useState(false);
  const [prevKey, setPrevKey] = useState(resetKey);

  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setCount(pageSize);
  }

  const total = items.length;
  const shown = Math.min(count, total);
  const visible = items.slice(0, shown);
  const hasMore = shown < total;

  const loadMore = () => {
    if (loading || shown >= total) return;
    setLoading(true);
    // Simulate a paged fetch.
    setTimeout(() => {
      setCount((c) => c + pageSize);
      setLoading(false);
    }, 350);
  };

  return { visible, hasMore, loading, loadMore, total, shown };
}

// IntersectionObserver sentinel — fires onLoadMore when scrolled near the end.
function Sentinel({ onLoadMore, loading, hasMore, footerNote }: {
  onLoadMore: () => void;
  loading: boolean;
  hasMore: boolean;
  footerNote?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onLoadMore);
  useEffect(() => {
    cb.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) cb.current(); },
      { rootMargin: "240px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="py-4 text-center text-[12px] text-[var(--text3)]">
      {hasMore ? (loading ? "Loading more…" : "Scroll to load more") : (footerNote ?? "End of results")}
    </div>
  );
}

// Infinite, internally-scrolling table with a sticky header. Fills its parent
// height (use inside a `flex-1 min-h-0` region) so the page header stays fixed.
export function InfiniteTable<T>({
  headers,
  items,
  renderRow,
  loadMore,
  hasMore,
  loading,
  footerNote,
}: {
  headers: string[];
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  footerNote?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--bg1)]">
            <tr className="border-b border-[var(--border)] text-left">
              {headers.map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{items.map((item, i) => renderRow(item, i))}</tbody>
        </table>
        <Sentinel onLoadMore={loadMore} loading={loading} hasMore={hasMore} footerNote={footerNote} />
      </div>
    </div>
  );
}

// Infinite, internally-scrolling region for non-table layouts (card lists).
export function InfiniteScrollArea({ children, loadMore, hasMore, loading, footerNote, className }: {
  children: React.ReactNode;
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  footerNote?: string;
  className?: string;
}) {
  return (
    <div className={cn("sidebar-scroll h-full min-h-0 overflow-y-auto pr-1", className)}>
      {children}
      <Sentinel onLoadMore={loadMore} loading={loading} hasMore={hasMore} footerNote={footerNote} />
    </div>
  );
}

// Fixed-header list page shell: header/toolbar stay put, body scrolls.
export function ListShell({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-4">{header}</div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
