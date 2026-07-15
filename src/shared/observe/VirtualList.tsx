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

  const viewport = typeof height === "number" ? height : measured;
  const total = items.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewport / rowHeight) + overscan * 2;
  const endIndex = Math.min(total, startIndex + visibleCount);
  const slice = items.slice(startIndex, endIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    if (onEndReached && el.scrollHeight - el.scrollTop - el.clientHeight < rowHeight * 6) {
      onEndReached();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("sidebar-scroll overflow-y-auto", className)}
      style={{ height: typeof height === "number" ? height : "100%" }}
    >
      <div style={{ height: total * rowHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${startIndex * rowHeight}px)`, position: "absolute", top: 0, left: 0, right: 0 }}>
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
