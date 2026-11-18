import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  rowHeight: number;
  /** Pixel height, or "fill" to size to the parent (use inside flex-1 min-h-0). */
  height?: number | "fill";
  overscan?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  className?: string;
  /** Fired when scrolled near the bottom — used for infinite pagination. */
  onEndReached?: () => void;
  footer?: React.ReactNode;
}

// In-house windowed list (rules.md §7 — virtualize >100 rows).
// Renders only the visible slice + overscan; no external dependency.
export function VirtualList<T>({
  items,
  rowHeight,
  height = 560,
  overscan = 8,
  renderRow,
  getKey,
  className,
  onEndReached,
  footer,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measured, setMeasured] = useState(typeof height === "number" ? height : 560);

  // Animation frame and scroll coordination refs
  const rafIdRef = useRef<number | null>(null);
  const latestScrollTopRef = useRef(0);
  const lastStartIndexRef = useRef(0);
  const endReachedTriggeredRef = useRef(false);

  // Keep callback/prop refs synchronized without triggering effect re-attachments
  const onEndReachedRef = useRef(onEndReached);
  useEffect(() => {
    onEndReachedRef.current = onEndReached;
  }, [onEndReached]);

  const rowHeightRef = useRef(rowHeight);
  useEffect(() => {
    rowHeightRef.current = rowHeight;
  }, [rowHeight]);

  const overscanRef = useRef(overscan);
  useEffect(() => {
    overscanRef.current = overscan;
  }, [overscan]);

  // Reset end-reached guard whenever items collection changes or grows
  useEffect(() => {
    endReachedTriggeredRef.current = false;
  }, [items.length]);

  // Defensive scroll clamping if items shrink (e.g. search filter applied)
  useEffect(() => {
    const el = containerRef.current;
    if (el && items.length > 0 && el.scrollTop > items.length * rowHeight) {
      el.scrollTop = 0;
      latestScrollTopRef.current = 0;
      lastStartIndexRef.current = 0;
      setScrollTop(0);
    }
  }, [items.length, rowHeight]);

  // Measure available height when filling a flex parent.
  useEffect(() => {
    if (height !== "fill") return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => setMeasured(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  // High-performance passive scroll listener with RAF scheduling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      // 1. Capture the immediate DOM scroll offset synchronously
      latestScrollTopRef.current = el.scrollTop;

      // 2. Schedule a single frame update if not already queued
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const currentScroll = latestScrollTopRef.current;
          const currentHeight = rowHeightRef.current;
          const currentOverscan = overscanRef.current;

          // 3. Batch all DOM layout reads together before any React state updates
          const scrollHeight = el.scrollHeight;
          const clientHeight = el.clientHeight;
          const distanceToBottom = scrollHeight - currentScroll - clientHeight;
          const isNearEnd = distanceToBottom < currentHeight * 6;

          // 4. Handle guarded end-reached callback to prevent runaway pagination
          if (onEndReachedRef.current) {
            if (isNearEnd && !endReachedTriggeredRef.current) {
              endReachedTriggeredRef.current = true;
              onEndReachedRef.current();
            } else if (!isNearEnd && distanceToBottom > currentHeight * 8) {
              endReachedTriggeredRef.current = false;
            }
          }

          // 5. Coalesce React state update: only commit if startIndex has changed
          const newStartIndex = Math.max(0, Math.floor(currentScroll / currentHeight) - currentOverscan);
          if (newStartIndex !== lastStartIndexRef.current) {
            lastStartIndexRef.current = newStartIndex;
            setScrollTop(currentScroll);
          }
        });
      }
    };

    // Attach passive listener directly to the DOM element
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const viewport = typeof height === "number" ? height : measured;
  const total = items.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewport / rowHeight) + overscan * 2;
  const endIndex = Math.min(total, startIndex + visibleCount);
  const slice = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className={cn("sidebar-scroll overflow-y-auto", className)}
      style={{ height: typeof height === "number" ? height : "100%" }}
    >
      <div style={{ height: total * rowHeight, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${startIndex * rowHeight}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            willChange: "transform",
          }}
        >
          {slice.map((item, i) => {
            const index = startIndex + i;
            return (
              <div key={getKey(item, index)} style={{ height: rowHeight }}>
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
      {footer}
    </div>
  );
}
