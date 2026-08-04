/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V4 */
import { cn } from "@/lib/utils";

/** Route-level skeleton (§9): skeleton blocks in --bg2, never a page spinner. */
export function RouteLoadingRegion({ className, label = "Loading page content" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex h-full w-full flex-col gap-6 p-4 sm:p-6", className)} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <div className="loading-skeleton h-8 w-[min(18rem,72%)] rounded-[var(--radius)]" />
        <div className="loading-skeleton h-4 w-[min(28rem,90%)] rounded-[var(--radius)]" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <div key={key} className="h-24 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="loading-skeleton h-3 w-2/3 rounded-[var(--radius)]" />
            <div className="loading-skeleton mt-4 h-7 w-1/2 rounded-[var(--radius)]" />
          </div>
        ))}
      </div>
      <div className="min-h-56 flex-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
        <div className="loading-skeleton h-4 w-32 rounded-[var(--radius)]" />
        <div className="loading-skeleton mt-6 h-[calc(100%-2.5rem)] min-h-40 w-full rounded-[var(--radius)]" />
      </div>
    </div>
  );
}
