import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

/**
 * Per-row "Ask AI" action — used as the trailing column on every observe
 * table (traces, errors, logs, metrics, profiling, replay, crons, …).
 *
 * Navigates to the AI Assistant with the row's context prefilled as the
 * first question, rather than opening a second chat surface per page.
 */
export function AskAiButton({ question, className }: { question: string; className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate("/ai/assistant", { state: { prefillQuestion: question } });
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
