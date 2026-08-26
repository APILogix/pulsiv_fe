import type { ErrorGroupStatus } from "../types/error-group";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ErrorGroupStatus, { label: string; tone: string }> = {
  open: { label: "OPEN", tone: "bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber)]/30" },
  resolved: { label: "RESOLVED", tone: "bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30" },
  ignored: { label: "IGNORED", tone: "bg-[var(--bg3)] text-[var(--text2)] border-[var(--border2)]" },
  archived: { label: "ARCHIVED", tone: "bg-[var(--violet-bg)] text-[var(--violet)] border-[var(--violet)]/30" },
};

export function ErrorGroupStatusBadge({ status }: { status: ErrorGroupStatus }) {
  const conf = STATUS_STYLES[status] ?? STATUS_STYLES.open;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-semibold uppercase tracking-wider",
        conf.tone
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {conf.label}
    </span>
  );
}

export function RegressionBadge({ isRegression }: { isRegression: boolean }) {
  if (!isRegression) {
    return <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--amber)]/40 bg-[var(--amber-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-semibold text-[var(--amber)]">
      ⚠ Regression
    </span>
  );
}
