import { Timestamp } from "@/shared/observe";
import type { ErrorGroupHistoryItem } from "../types/error-group";
import { CheckCircle2, AlertTriangle, EyeOff, GitMerge, RotateCcw, Activity, User, Info } from "lucide-react";

interface HistoryTimelineProps {
  history: ErrorGroupHistoryItem[];
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "none";
  if (typeof val === "object") {
    if (val.status) return String(val.status).toUpperCase();
    if (val.comment) return `Comment: "${val.comment}"`;
    return JSON.stringify(val);
  }
  return String(val).toUpperCase();
}

function getActionBadge(action: string) {
  const normalized = action.toLowerCase();
  switch (normalized) {
    case "marked_resolved":
    case "resolved":
      return { icon: CheckCircle2, color: "text-[var(--green)] bg-[var(--green-bg)] border-[var(--green-border,var(--green))]", label: "Resolved" };
    case "ignored":
      return { icon: EyeOff, color: "text-[var(--text3)] bg-[var(--bg2)] border-[var(--border)]", label: "Ignored" };
    case "reopened":
      return { icon: RotateCcw, color: "text-[var(--amber)] bg-[var(--amber-bg)] border-[var(--amber-border,var(--amber))]", label: "Reopened" };
    case "merged":
      return { icon: GitMerge, color: "text-[var(--violet)] bg-[var(--violet-bg)] border-[var(--violet-border,var(--violet))]", label: "Merged" };
    case "regression_detected":
    case "regressed":
      return { icon: AlertTriangle, color: "text-[var(--red)] bg-[var(--red-bg)] border-[var(--red-border,var(--red))]", label: "Regression" };
    default:
      return { icon: Activity, color: "text-[var(--brand)] bg-[var(--brand-bg,var(--bg2))]", label: action.replace(/_/g, " ") };
  }
}

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 text-center text-[13px] text-[var(--text3)]">
        No state transition history recorded for this error group yet.
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text)] flex items-center gap-2">
            <Activity className="size-4 text-[var(--brand)]" />
            Audit & History Timeline
          </h3>
          <p className="text-[12px] text-[var(--text3)] mt-0.5">
            Immutable audit log of state changes, regressions, and manual triage actions
          </p>
        </div>
        <span className="rounded-full bg-[var(--bg2)] px-2.5 py-0.5 font-[family-name:var(--mono)] text-[11px] font-medium text-[var(--text2)] border border-[var(--border)]">
          {history.length} {history.length === 1 ? "event" : "events"}
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
        {history.map((item) => {
          const badge = getActionBadge(item.action);
          const Icon = badge.icon;
          const oldVal = item.oldValue ?? item.old_value;
          const newVal = item.newValue ?? item.new_value;
          const meta = item.metadata;

          return (
            <div key={item.id} className="relative flex flex-col gap-1.5 text-[13px] transition-colors hover:bg-[var(--bg2)]/40 p-2.5 -ml-2.5 rounded-lg">
              <div className={`absolute -left-6 top-3 flex size-6 items-center justify-center rounded-full border bg-[var(--bg1)] ${badge.color}`}>
                <Icon className="size-3.5" />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--text)]">
                    <User className="size-3 text-[var(--text3)]" />
                    {item.actor || "System"}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-[family-name:var(--mono)] text-[11px] font-medium uppercase border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text3)] font-[family-name:var(--mono)]">
                  <Timestamp value={item.timestamp} />
                </div>
              </div>

              {(oldVal !== undefined || newVal !== undefined) && (
                <div className="flex items-center gap-2 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)] mt-0.5">
                  {oldVal !== undefined && (
                    <span className="line-through text-[var(--text3)] bg-[var(--bg2)] px-1.5 py-0.5 rounded">
                      {formatValue(oldVal)}
                    </span>
                  )}
                  {oldVal !== undefined && newVal !== undefined && (
                    <span className="text-[var(--text3)]">→</span>
                  )}
                  {newVal !== undefined && (
                    <span className="font-semibold text-[var(--green)] bg-[var(--green-bg)] px-1.5 py-0.5 rounded border border-[var(--green)]/20">
                      {formatValue(newVal)}
                    </span>
                  )}
                </div>
              )}

              {meta && Object.keys(meta).length > 0 && (
                <div className="mt-1 flex items-start gap-1.5 rounded-md bg-[var(--bg2)] p-2.5 font-[family-name:var(--mono)] text-[11px] text-[var(--text2)] border border-[var(--border)]/60">
                  <Info className="size-3.5 shrink-0 text-[var(--brand)] mt-0.5" />
                  <pre className="whitespace-pre-wrap break-all">
                    {typeof meta === "string" ? meta : JSON.stringify(meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

