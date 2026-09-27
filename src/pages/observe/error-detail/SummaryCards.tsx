import { AlertOctagon, CheckCircle2, AlertCircle, ShieldAlert, FolderGit2, GitBranch } from "lucide-react";
import type { ErrorDetailResponse } from "./types";
import { displayValue } from "./helpers";

export function SummaryCards({ detail }: { detail: ErrorDetailResponse }) {
  const issueId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const traceId = detail.trace?.publicId ?? detail.related?.trace?.publicId;
  const isHandled = detail.error?.handled ?? true;

  const items = [
    {
      label: "Exception Class",
      value: detail.error?.name ?? "Error",
      icon: AlertOctagon,
      subtext: "Categorized Exception",
      accent: "text-[var(--red)]",
    },
    {
      label: "Handling Status",
      value: detail.error?.handled == null ? "Unknown" : isHandled ? "Handled" : "Unhandled",
      icon: isHandled ? CheckCircle2 : AlertCircle,
      subtext: isHandled ? "Caught gracefully" : "Fatal unhandled exception",
      accent: isHandled ? "text-[var(--green)]" : "text-[var(--red)]",
    },
    {
      label: "Severity",
      value: (detail.error?.severity ?? "error").toUpperCase(),
      icon: ShieldAlert,
      subtext: "Telemetry level",
      accent: "text-[var(--amber)]",
    },
    {
      label: "Issue Group",
      value: displayValue(issueId),
      icon: FolderGit2,
      subtext: issueId ? "Grouped fingerprint" : "No issue group",
      accent: issueId ? "text-[var(--brand)]" : "text-[var(--text3)]",
    },
    {
      label: "Correlated Trace",
      value: displayValue(traceId),
      icon: GitBranch,
      subtext: traceId ? "Distributed trace attached" : "No trace linked",
      accent: traceId ? "text-[var(--violet)]" : "text-[var(--text3)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="group relative flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs transition-all hover:border-[var(--border2)] hover:bg-[var(--bg1)]/80"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                {item.label}
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--text3)] group-hover:text-[var(--text)] transition-colors">
                <Icon className="size-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div
                className={`truncate font-[family-name:var(--mono)] text-[19px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${item.accent}`}
                title={item.value}
              >
                {item.value}
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--text3)] leading-none truncate">
                {item.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
