/* Hallmark · component: metric-loader · genre: modern-minimal · theme: system
 * motion: transform + opacity only · ease-out-expo
 */

import { Suspense, type ReactNode } from "react";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricLoader({
  label = "Loading telemetry stream",
  detail = "Synchronizing live time-series buckets",
  className,
}: {
  label?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border border-border/80 bg-[var(--bg1)]/80 p-6 text-center backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex size-10 items-center justify-center rounded-lg border border-border bg-[var(--bg2)] text-[var(--brand)] shadow-sm">
        <Activity className="size-5 animate-pulse" />
        <span className="absolute -top-1 -right-1 flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand)] opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[var(--brand)]" />
        </span>
      </div>

      <div className="mt-3.5 flex items-center gap-1.5 font-mono text-xs font-medium tracking-tight text-[var(--text)]">
        <Loader2 className="size-3 animate-spin text-[var(--brand)]" />
        <span>{label}</span>
      </div>
      <p className="mt-1 max-w-xs text-xs text-[var(--text3)] leading-relaxed">
        {detail}
      </p>
    </div>
  );
}

export function MetricRouteBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[300px] w-full items-center justify-center p-6">
          <MetricLoader className="max-w-md border-0 bg-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
