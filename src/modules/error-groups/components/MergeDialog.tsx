import { useState } from "react";
import { X, GitMerge } from "lucide-react";
import type { ErrorGroup } from "../types/error-group";

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroup: ErrorGroup;
  allGroups: ErrorGroup[];
  onMerge?: (targetGroupId: string) => Promise<void> | void;
}

export function MergeDialog({
  isOpen,
  onClose,
  currentGroup,
  allGroups,
  onMerge,
}: MergeDialogProps) {
  const [targetId, setTargetId] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targets = allGroups.filter((g) => g.id !== currentGroup.id);
  const selectedTarget = targets.find((g) => g.id === targetId);

  const handleMerge = async () => {
    if (!targetId) return;
    setIsSubmitting(true);
    try {
      if (onMerge) {
        await onMerge(targetId);
      }
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        onClose();
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-[500px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <GitMerge className="size-4 text-[var(--brand)]" />
            <h3 className="text-[15px] font-semibold text-[var(--text)]">Merge Error Group</h3>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)] cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-[13px] text-[var(--text2)]">
          Merge <strong className="text-[var(--text)]">{currentGroup.lastErrorName}</strong> into another error group. All future occurrences will be grouped into the target.
        </p>

        <div className="space-y-2">
          <label className="text-[12px] font-medium text-[var(--text2)]">Select Target Group</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-2.5 text-[13px] text-[var(--text)] outline-none"
          >
            <option value="">Select target error group...</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.lastErrorName}: {t.lastErrorMessage.slice(0, 45)}... ({t.occurrenceCount} occurrences)
              </option>
            ))}
          </select>
        </div>

        {selectedTarget && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-[12px] space-y-1">
            <div className="font-semibold text-[var(--brand)]">Target Preview</div>
            <div className="text-[var(--text)]">{selectedTarget.lastErrorName}</div>
            <div className="text-[var(--text3)]">{selectedTarget.lastErrorMessage}</div>
            <div className="text-[var(--text3)] font-[family-name:var(--mono)]">
              Combined occurrences: {currentGroup.occurrenceCount + selectedTarget.occurrenceCount}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--text2)] hover:bg-[var(--bg2)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!targetId || isDone || isSubmitting}
            onClick={handleMerge}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-medium text-[var(--bg)] hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            {isDone ? "Merged!" : "Merge Groups"}
          </button>
        </div>
      </div>
    </div>
  );
}
