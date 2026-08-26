import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";

export function AskAiButton({ question, className }: { question: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        useAiDrawerStore.getState().openChat(question);
      }}
      title="Ask AI about this row"
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border border-[var(--ai)]/30 bg-[var(--ai-bg)] px-2.5 text-[11px] font-medium text-[var(--ai)] transition-colors hover:border-[var(--ai)] hover:bg-[var(--ai)]/15",
        className,
      )}
    >
      <Sparkles className="size-3" />
      Ask AI
    </button>
  );
}
