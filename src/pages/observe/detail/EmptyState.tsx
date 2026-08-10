import { SearchX } from "lucide-react";

export function EmptyState({ title, description = "There is no data to show for this event." }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border2)] bg-[var(--bg2)]/45 p-6 text-center">
      <svg aria-hidden="true" className="size-10 text-[var(--text3)]" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d="M15 20h10M20 15v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text2)]"><SearchX className="size-3.5" />{title}</div>
      <p className="max-w-sm text-[12px] leading-relaxed text-[var(--text3)]">{description}</p>
    </div>
  );
}
