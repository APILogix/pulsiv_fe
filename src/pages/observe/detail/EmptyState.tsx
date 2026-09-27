import { SearchX } from "lucide-react";

export function EmptyState({ title, description = "There is no data to show for this event." }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)]/50 p-8 text-center shadow-xs">
      <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--bg2)] text-[var(--text3)]">
        <SearchX className="size-5" />
      </div>
      <div>
        <div className="text-[14px] font-semibold text-[var(--text)]">{title}</div>
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-[var(--text3)]">{description}</p>
      </div>
    </div>
  );
}

