import { RotateCcw } from "lucide-react";
import type { ErrorGroupStatus } from "../types/error-group";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ErrorGroupStatus, { label: string; tone: string }> = {
  open: { label: "Open", tone: "bg-[var(--amber-bg)] text-[var(--amber)]" },
  resolved: { label: "Resolved", tone: "bg-[var(--green-bg)] text-[var(--green)]" },
  ignored: { label: "Ignored", tone: "bg-[var(--bg3)] text-[var(--text2)]" },
  archived: { label: "Archived", tone: "bg-[var(--bg3)] text-[var(--text3)]" },
};

export function ErrorGroupStatusBadge({ status }: { status: ErrorGroupStatus }) {
  const key = String(status ?? "open").toLowerCase() as ErrorGroupStatus;
  const conf = STATUS_STYLES[key] ?? STATUS_STYLES.open;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35]", conf.tone)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {conf.label}
    </span>
  );
}

export function RegressionBadge({ isRegression }: { isRegression: boolean }) {
  if (!isRegression) {
    return <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] bg-[var(--red-bg)] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35] text-[var(--red)]">
      <RotateCcw className="size-3" aria-hidden="true" />
      Regressed
    </span>
  );
}
