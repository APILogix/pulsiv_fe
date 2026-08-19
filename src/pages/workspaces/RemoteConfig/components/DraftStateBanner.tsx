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
      <div className="pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-1)] px-5 py-3 shadow-[var(--shadow-modal)] ring-1 ring-white/5 animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className="flex min-w-0 items-center gap-3">
          {hasErrors ? (
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--error-muted)] text-[var(--error)] border border-[var(--error-border)]">
                <AlertTriangle className="size-3.5" />
              </span>
              <div>
                <div className="text-[13px] font-medium text-[var(--error)]">
                  {errorCount} Validation Error{errorCount === 1 ? "" : "s"} Detected
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  Fix input range bounds before submitting revision.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-muted)] text-[12px] font-mono font-medium text-[var(--brand)] border border-[var(--brand-border)]">
                {diffCount}
              </span>
              <div>
                <div className="text-[13px] font-medium text-[var(--text-primary)]">
                  {diffCount} Unsaved Change{diffCount === 1 ? "" : "s"} in Local Draft
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  Changes stored in local buffer. Click Review & Publish to stage.
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
            className="h-8 px-2.5 text-[12px] gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
          >
            <RotateCcw className="size-3.5" />
            Discard
          </Button>

          <Button
            type="button"
            onClick={onReviewPublish}
            disabled={hasErrors}
            className={cn(
              "h-8 px-3.5 text-[12px] font-medium gap-1.5",
              hasErrors
                ? "bg-[var(--error-muted)] text-[var(--error)] border border-[var(--error-border)] cursor-not-allowed"
                : "bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white"
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

