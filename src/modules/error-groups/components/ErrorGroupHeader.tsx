import { CheckCircle2, EyeOff, GitMerge, RotateCcw, Sparkles } from "lucide-react";
import { DetailHeader, EnvironmentBadge, SeverityBadge, Timestamp } from "@/shared/observe";
import { aiButtonClass, ghostButtonClass } from "@/shared/observe/form";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";
import type { ErrorGroup } from "../types/error-group";
import { ErrorGroupStatusBadge, RegressionBadge } from "./ErrorGroupStatusBadge";

interface ErrorGroupHeaderProps {
  group: ErrorGroup;
  onResolve: () => void;
  onIgnore: () => void;
  onMerge: () => void;
}

export function ErrorGroupHeader({ group, onResolve, onIgnore, onMerge }: ErrorGroupHeaderProps) {
  const title = group.latestEvent?.errorName || group.lastErrorName || group.last_error_name || "Error";
  const message = group.latestEvent?.message || group.lastErrorMessage || group.last_error_message || group.fingerprint;
  const status = String(group.status || "open").toLowerCase();
  const severity = group.severity?.highest || group.highestSeverity || group.highest_severity || "error";
  const regressed = Boolean((group.regression?.count ?? 0) > 0 || group.isRegression || group.is_regression);
  const id = group.publicId ?? group.id;
  const lastSeen = group.occurrences?.lastSeenAt ?? group.lastSeenAt ?? group.lastSeen;
  const release = group.release?.latest ?? group.latestRelease;

  return (
    <DetailHeader
      crumbs={[
        { label: "Observe", to: "/observability" },
        { label: "Error groups", to: "/observability/error-groups" },
        { label: id, mono: true },
      ]}
      copyId={id}
      title={<span className="text-[var(--red)]">{title}</span>}
      description={<span className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{message}</span>}
      badges={
        <>
          <ErrorGroupStatusBadge status={status as ErrorGroup["status"]} />
          <SeverityBadge severity={severity} />
          <RegressionBadge isRegression={regressed} />
          {group.environment && <EnvironmentBadge environment={group.environment} />}
        </>
      }
      meta={[
        lastSeen ? { label: "Last seen", value: <Timestamp value={lastSeen} /> } : null,
        group.service ? { label: "Service", value: group.service } : null,
        release ? { label: "Release", value: release, mono: true } : null,
        { label: "Fingerprint", value: group.fingerprint.length > 24 ? `${group.fingerprint.slice(0, 24)}…` : group.fingerprint, mono: true },
      ]}
      actions={
        <>
          <button type="button" onClick={onResolve} className={ghostButtonClass}>
            {status === "resolved" ? <RotateCcw className="size-3.5" aria-hidden="true" /> : <CheckCircle2 className="size-3.5 text-[var(--green)]" aria-hidden="true" />}
            {status === "resolved" ? "Reopen" : "Resolve"}
          </button>
          <button type="button" onClick={onIgnore} className={ghostButtonClass}>
            <EyeOff className="size-3.5" aria-hidden="true" />
            Ignore
          </button>
          <button type="button" onClick={onMerge} className={ghostButtonClass}>
            <GitMerge className="size-3.5" aria-hidden="true" />
            Merge
          </button>
          <button
            type="button"
            className={aiButtonClass}
            onClick={() => useAiDrawerStore.getState().openInvestigate({ resourceType: "error", publicId: group.latestEvent?.publicId ?? id })}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Investigate
          </button>
        </>
      }
    />
  );
}
