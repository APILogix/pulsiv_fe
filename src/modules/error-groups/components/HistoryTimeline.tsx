import { CheckCircle2, EyeOff, GitMerge, RotateCcw, Activity, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyNote, Panel, Timestamp } from "@/shared/observe";
import { cn } from "@/lib/utils";
import type { ErrorGroupHistoryItem } from "../types/error-group";

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "none";
  if (typeof val === "object") {
    const v = val as Record<string, unknown>;
    if (v.status) return String(v.status).toLowerCase();
    if (v.comment) return `“${String(v.comment)}”`;
    return Object.entries(v).map(([k, x]) => `${k}: ${String(x)}`).join(", ");
  }
  return String(val).toLowerCase();
}

function actionMeta(action: string): { icon: LucideIcon; tone: string; label: string } {
  switch (action.toLowerCase()) {
    case "marked_resolved":
    case "resolved":
      return { icon: CheckCircle2, tone: "text-[var(--green)]", label: "Resolved" };
    case "ignored":
      return { icon: EyeOff, tone: "text-[var(--text3)]", label: "Ignored" };
    case "reopened":
      return { icon: RotateCcw, tone: "text-[var(--amber)]", label: "Reopened" };
    case "merged":
      return { icon: GitMerge, tone: "text-[var(--violet)]", label: "Merged" };
    case "regression_detected":
    case "regressed":
      return { icon: AlertTriangle, tone: "text-[var(--red)]", label: "Regressed" };
    default: {
      const l = action.replace(/_/g, " ");
      return { icon: Activity, tone: "text-[var(--text2)]", label: l.charAt(0).toUpperCase() + l.slice(1) };
    }
  }
}

export function HistoryTimeline({ history }: { history: ErrorGroupHistoryItem[] }) {
  return (
    <Panel title="History" description="Every status change, regression, and merge on this issue, newest first." flush>
      {!history || history.length === 0 ? (
        <div className="p-5"><EmptyNote>No status changes have been recorded for this issue yet.</EmptyNote></div>
      ) : (
        <ol className="divide-y divide-[var(--border)]">
          {history.map((item) => {
            const meta = actionMeta(item.action);
            const Icon = meta.icon;
            const oldVal = item.oldValue ?? item.old_value;
            const newVal = item.newValue ?? item.new_value;
            const extra = item.metadata && typeof item.metadata === "object" ? Object.entries(item.metadata) : [];
            return (
              <li key={item.id} className="grid grid-cols-[20px_minmax(0,1fr)_96px] gap-3 px-5 py-3">
                <Icon className={cn("mt-0.5 size-4", meta.tone)} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--text)]">
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-[var(--text3)]"> by </span>
                    <span>{item.actor || "System"}</span>
                  </p>
                  {(oldVal !== undefined || newVal !== undefined) && (
                    <p className="mt-1 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                      {oldVal !== undefined && <span className="text-[var(--text3)] line-through">{formatValue(oldVal)}</span>}
                      {oldVal !== undefined && newVal !== undefined && <span className="text-[var(--text3)]"> → </span>}
                      {newVal !== undefined && <span className="text-[var(--text)]">{formatValue(newVal)}</span>}
                    </p>
                  )}
                  {(item.reason || extra.length > 0) && (
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--text3)]">
                      {item.reason && <span>{item.reason}</span>}
                      {extra.map(([k, v]) => (
                        <span key={k} className="font-[family-name:var(--mono)]">{k}: <span className="text-[var(--text2)]">{String(v)}</span></span>
                      ))}
                    </p>
                  )}
                </div>
                <span className="text-right"><Timestamp value={item.timestamp} /></span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
