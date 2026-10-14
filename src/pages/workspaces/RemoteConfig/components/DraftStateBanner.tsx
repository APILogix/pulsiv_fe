import { Button as UiButton } from "@/components/ui/button";

interface DraftStateBannerProps {
  isDirty: boolean;
  hasErrors: boolean;
  diffCount: number;
  errorCount: number;
  onDiscard: () => void;
  onReviewPublish: () => void;
}

/**
 * Sticky bar at the foot of the editor while the draft differs from the
 * published revision. One hairline, no shadow (design/workspaces/DESIGN.md).
 */
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
    <div
      role="region"
      aria-label="Unpublished changes"
      className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg1)] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="min-w-0" aria-live="polite">
        {hasErrors ? (
          <>
            <p className="text-[13px] font-medium text-[var(--red)]">
              <span className="font-[family-name:var(--mono)] tabular-nums">{errorCount}</span> validation{" "}
              {errorCount === 1 ? "error" : "errors"}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--text3)]">Fix them before publishing. Values outside the allowed range are rejected.</p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-medium text-[var(--text)]">
              <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--amber)]">{diffCount}</span> unpublished{" "}
              {diffCount === 1 ? "change" : "changes"}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--text3)]">Edits stay in this draft until you publish a new revision.</p>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <UiButton variant="ghost" size="lg" onClick={onDiscard}>
          Discard
        </UiButton>
        <UiButton size="lg" onClick={onReviewPublish} disabled={hasErrors}>
          Review and publish
        </UiButton>
      </div>
    </div>
  );
}
