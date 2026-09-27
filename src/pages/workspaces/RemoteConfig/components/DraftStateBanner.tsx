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
      <div className="pointer-events-auto flex w-full max-w-2xl flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg1)] px-5 py-3.5 shadow-[var(--shadow-toast)] animate-in fade-in slide-in-from-bottom-5 duration-200">
        <div className="flex min-w-0 items-center gap-3">
          {hasErrors ? (
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/40">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <div className="text-[13px] font-bold text-[var(--red)]">
                  {errorCount} Validation Error{errorCount === 1 ? "" : "s"} Detected
                </div>
                <div className="text-[11px] text-[var(--text3)]">
                  Input bounds violation. Correct before publishing.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[12px] font-bold text-[var(--brand-fg)] shadow-xs">
                {diffCount}
              </span>
              <div>
                <div className="text-[13px] font-bold text-[var(--text)]">
                  {diffCount} Unsaved Change{diffCount === 1 ? "" : "s"} in Local Buffer
                </div>
                <div className="text-[11px] text-[var(--text3)]">
                  Modifications are staged locally and not yet compiled.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-center justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onDiscard}
            className="h-8.5 px-3 text-xs gap-1.5 text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
          >
            <RotateCcw className="size-3.5" />
            Discard
          </Button>

          <Button
            type="button"
            onClick={onReviewPublish}
            disabled={hasErrors}
            className={cn(
              "h-8.5 px-3.5 text-xs font-semibold gap-1.5 transition-all shadow-xs",
              hasErrors
                ? "bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/30 cursor-not-allowed"
                : "bg-[var(--brand)] hover:bg-[var(--brand-d)] text-[var(--brand-fg)]"
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
