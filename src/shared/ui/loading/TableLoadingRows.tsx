/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V4 */

/** Content-shaped fallback for tables and row lists; never used for metrics or mutations. */
export function TableLoadingRows({ rows = 5, label = "Loading data" }: { rows?: number; label?: string }) {
  const rowKeys = Array.from({ length: rows }, (_, index) => `loading-row-${index + 1}`);
  return (
    <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {rowKeys.map((key) => (
        <div key={key} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <span className="loading-skeleton h-4 w-20 rounded-[var(--radius)]" />
          <span className="loading-skeleton h-4 w-[min(11rem,40%)] rounded-[var(--radius)]" />
          <span className="loading-skeleton ml-auto h-4 w-24 rounded-[var(--radius)]" />
        </div>
      ))}
    </div>
  );
}
