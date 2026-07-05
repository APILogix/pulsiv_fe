import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardSkeleton } from "./Skeletons";

interface InfiniteCardsProps<T> {
  items: T[];
  queryKey: unknown[];
  getKey: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  pageSize?: number;
  gridClassName?: string;
  className?: string;
  loading?: boolean;
}

// Infinite-scrolling card grid (initial 20, auto-fetch next page on scroll).
export function InfiniteCards<T>({
  items,
  queryKey,
  getKey,
  renderCard,
  pageSize = 20,
  gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  className,
  loading = false,
}: InfiniteCardsProps<T>) {
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const query = useInfiniteQuery({
    queryKey: ["infinite-cards", ...queryKey, items.length],
    queryFn: async ({ pageParam }) => {
      await new Promise((r) => setTimeout(r, 280));
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
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      },
      { root, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage, rows.length]);

  return (
    <div ref={scrollRef} className={cn("sidebar-scroll min-h-0 flex-1 overflow-y-auto", className)}>
      {query.isLoading || loading ? (
        <div className={gridClassName}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className={gridClassName}>
            {rows.map((item) => <div key={getKey(item)}>{renderCard(item)}</div>)}
          </div>
          <div ref={sentinelRef} />
          <div className="flex h-12 items-center justify-center text-[12px] text-[var(--text3)]">
            {query.isFetchingNextPage ? (
              <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading more…</span>
            ) : query.hasNextPage ? <span>Scroll for more</span> : <span>{total} total · end of results</span>}
          </div>
        </>
      )}
    </div>
  );
}
