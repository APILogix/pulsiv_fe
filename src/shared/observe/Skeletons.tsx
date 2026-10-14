import { Skeleton } from "@/components/ui/skeleton";

/**
 * Content-shaped skeletons (sentinel-design.md §9 — skeleton blocks, never
 * page spinners). Radii come from --radius / --radius-lg so both themes stay
 * structurally identical.
 */

/** Mirrors the detail sheet: breadcrumb + headline, readout band, tabs, panels. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-[min(520px,80%)]" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5 bg-[var(--bg1)] px-4 py-3.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="flex gap-5 border-b border-[var(--border)] pb-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-[220px] w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-[160px] w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-4 w-full mt-2" />
      <Skeleton className="h-4 w-5/6" />
      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
