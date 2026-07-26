/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const GRID_X = [32, 88, 144, 200, 256, 312];
const GRID_Y = [24, 56, 88, 120];
const BARS = [28, 46, 34, 66, 52, 78, 58, 88];

export function MetricLoader({ label = "Loading metric data", detail = "Synchronizing telemetry windows", className }: { label?: string; detail?: string; className?: string }) {
  return (
    <div className={cn("metric-loader flex min-h-[320px] w-full flex-col items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-6", className)} role="status" aria-live="polite" aria-busy="true">
      <svg viewBox="0 0 344 144" className="h-auto w-full max-w-[344px]" aria-hidden="true">
        <defs><linearGradient id="metric-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".26"/><stop offset="1" stopColor="var(--brand)" stopOpacity="0"/></linearGradient></defs>
        {GRID_X.map((x) => <line key={`x-${x}`} x1={x} x2={x} y1="16" y2="128" className="metric-loader-grid" />)}
        {GRID_Y.map((y) => <line key={`y-${y}`} x1="16" x2="328" y1={y} y2={y} className="metric-loader-grid" />)}
        <path d="M16 116 C50 110 60 82 94 88 S140 104 168 70 S220 84 244 48 S286 66 328 28 L328 128 L16 128 Z" fill="url(#metric-area)" />
        <path d="M16 116 C50 110 60 82 94 88 S140 104 168 70 S220 84 244 48 S286 66 328 28" className="metric-loader-trace" />
        {[94, 168, 244, 328].map((x, index) => <circle key={x} cx={x} cy={[88, 70, 48, 28][index]} r="4" className="metric-loader-node" style={{ animationDelay: `${index * 180}ms` }} />)}
        {BARS.map((height, index) => <rect key={height} x={20 + index * 18} y={128 - height / 3} width="8" height={height / 3} rx="2" className="metric-loader-bar" style={{ animationDelay: `${index * 90}ms` }} />)}
      </svg>
      <p className="mt-5 font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text2)]">{label}</p>
      <p className="mt-2 text-center text-[12px] text-[var(--text3)]">{detail}</p>
    </div>
  );
}

export function MetricRouteBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<MetricLoader className="min-h-[calc(100dvh-var(--header-height)-3rem)] border-0 bg-transparent" />}>{children}</Suspense>;
}
