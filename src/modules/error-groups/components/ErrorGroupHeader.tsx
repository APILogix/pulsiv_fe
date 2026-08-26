import { CheckCircle2, EyeOff, GitMerge, RotateCcw } from "lucide-react";
import { SeverityBadge, EnvironmentBadge, PageHeader, formatCompact } from "@/shared/observe";
import type { ErrorGroup } from "../types/error-group";
import { ErrorGroupStatusBadge, RegressionBadge } from "./ErrorGroupStatusBadge";

interface ErrorGroupHeaderProps {
  group: ErrorGroup;
  onResolve: () => void;
  onIgnore: () => void;
  onMerge: () => void;
}

export function ErrorGroupHeader({
  group,
  onResolve,
  onIgnore,
  onMerge,
}: ErrorGroupHeaderProps) {
  const title = group.lastErrorName || group.last_error_name || "Error";
  const description = group.lastErrorMessage || group.last_error_message || group.fingerprint;
  const status = group.status || "OPEN";
  const severity = group.latestSeverity || group.highest_severity || "error";
  const isRegression = Boolean(group.isRegression || group.is_regression);
  const environment = group.environment || "production";
  const occurrences = group.occurrenceCount || group.occurrence_count || 1;
  const normalizedStatus = String(status).toLowerCase();

  return (
    <div className="space-y-3">
      <PageHeader
        breadcrumbs={[
          { label: "Observability", to: "/observability" },
          { label: "Error Groups", to: "/observability/error-groups" },
          { label: title },
        ]}
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResolve}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-[12px] font-semibold transition-all shadow-sm cursor-pointer ${
                normalizedStatus === "resolved"
                  ? "border-[var(--amber)]/40 bg-[var(--amber-bg)] text-[var(--amber)] hover:bg-[var(--amber)]/20"
                  : "border-[var(--green)]/40 bg-[var(--green-bg)] text-[var(--green)] hover:bg-[var(--green)]/20"
              }`}
            >
              {normalizedStatus === "resolved" ? (
                <>
                  <RotateCcw className="size-3.5" />
                  Reopen Issue
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Mark Resolved
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onIgnore}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
            >
              <EyeOff className="size-3.5" />
              Ignore
            </button>
            <button
              type="button"
              onClick={onMerge}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-3 py-1.5 font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/20 cursor-pointer"
            >
              <GitMerge className="size-3.5" />
              Merge Group
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 bg-[var(--bg1)] p-3 rounded-lg border border-[var(--border)]">
        <ErrorGroupStatusBadge status={status} />
        <SeverityBadge severity={severity} />
        <RegressionBadge isRegression={isRegression} />
        <EnvironmentBadge environment={environment} />
        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)] border-l border-[var(--border)] pl-2.5">
          Fingerprint: <strong className="text-[var(--text2)]">{group.fingerprint}</strong>
        </span>
        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)] border-l border-[var(--border)] pl-2.5">
          Total Occurrences: <strong className="text-[var(--text)]">{formatCompact(occurrences)}</strong>
        </span>
      </div>
    </div>
  );
}

