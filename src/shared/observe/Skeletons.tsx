import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Content-shaped skeletons (sentinel-design.md §9 — skeleton blocks, never
 * page spinners). Radii come from --radius / --radius-lg so both themes stay
 * structurally identical.
 */

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">
      <Button variant="ghost" disabled className="w-fit text-[var(--text3)]">
        <ArrowLeft className="size-4" /> Back
      </Button>

      {/* Page Header Mock */}
      <div className="flex flex-col gap-2 mb-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPI Cards Mock */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>

      {/* Tabs and Content Mock */}
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex gap-4 border-b border-[var(--border)] pb-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[300px] w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-[300px] w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
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
