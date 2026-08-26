import { AlertTriangle, Rocket, RotateCcw } from "lucide-react";
import { Button } from "@/shared/observe";
import { cn } from "@/lib/utils";

interface DraftStateBannerProps {
  isDirty: boolean;
  hasErrors: boolean;
  diffCount: number;
  errorCount: number;
  onDiscard: () => void;
  onReviewPublish: () => void;
}

export function DraftStateBanner({
  isDirty,
  hasErrors,
  diffCount,
  errorCount,
  onDiscard,
  onReviewPublish,
}: DraftStateBannerProps) {
  if (!isDirty && !hasErrors) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-[16px] border border-[var(--border)] bg-[var(--bg1)]/90 px-5 py-3.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/10 dark:ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200">
        <div className="flex min-w-0 items-center gap-3">
          {hasErrors ? (
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <div className="text-[13px] font-bold text-red-400">
                  {errorCount} Validation Error{errorCount === 1 ? "" : "s"} Detected
                </div>
                <div className="text-[11px] text-[var(--text3)]">
                  Fix input range bounds before submitting revision.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/20 text-[13px] font-bold text-[var(--brand)] border border-[var(--brand)]/30">
                {diffCount}
              </span>
              <div>
                <div className="text-[13px] font-bold text-[var(--text)]">
                  {diffCount} Unsaved Change{diffCount === 1 ? "" : "s"} in Local Draft
                </div>
                <div className="text-[11px] text-[var(--text3)]">
                  Changes live in local buffer. Click Review & Publish to stage.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onDiscard}
            className="h-9 px-3 text-xs gap-1.5 text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
          >
            <RotateCcw className="size-3.5" />
            Discard
          </Button>

          <Button
            type="button"
            onClick={onReviewPublish}
            disabled={hasErrors}
            className={cn(
              "h-9 px-4 text-xs font-semibold gap-1.5 shadow-lg transition-all duration-200",
              hasErrors
                ? "bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
            )}
          >
            <Rocket className="size-3.5" />
            Review & Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
