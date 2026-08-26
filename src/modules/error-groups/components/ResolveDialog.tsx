import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import type { ErrorGroup, ErrorGroupStatus } from "../types/error-group";

interface ResolveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  group: ErrorGroup;
  initialStatus?: ErrorGroupStatus;
  onConfirm: (status: ErrorGroupStatus, reason?: string) => Promise<void> | void;
}

export function ResolveDialog({
  isOpen,
  onClose,
  group,
  initialStatus = "resolved",
  onConfirm,
}: ResolveDialogProps) {
  const [status, setStatus] = useState<ErrorGroupStatus>(initialStatus);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(status, reason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-[480px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[var(--green)]" />
            <h3 className="text-[15px] font-semibold text-[var(--text)]">Update Group Status</h3>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)] cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-[13px] text-[var(--text2)]">
          Update status for <strong className="text-[var(--text)]">{group.lastErrorName}</strong> ({group.occurrenceCount} occurrences).
        </p>

        <div className="space-y-2">
          <label className="text-[12px] font-medium text-[var(--text2)]">Target Status</label>
          <div className="grid grid-cols-3 gap-2 font-[family-name:var(--mono)] text-[12px]">
            {(["resolved", "ignored", "archived"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`rounded-lg border px-3 py-2 text-center capitalize transition-colors cursor-pointer ${
                  status === st
                    ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] font-semibold"
                    : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[12px] font-medium text-[var(--text2)]">Resolution / Change Reason (Optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Add note for audit log (e.g. Fixed null check in PR #412)..."
            rows={3}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-2.5 text-[13px] text-[var(--text)] outline-none resize-none"
          />
        </div>

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
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="rounded-lg bg-[var(--green)] px-4 py-2 text-[13px] font-medium text-[var(--bg)] hover:opacity-90 cursor-pointer"
          >
            Confirm Status Update
          </button>
        </div>
      </div>
    </div>
  );
}
