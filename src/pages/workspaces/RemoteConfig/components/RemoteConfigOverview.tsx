import { Clock3, Globe2, Hash, History, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface RemoteConfigOverviewProps {
  environmentName: string;
  currentRevision: number;
  revisionHash: string;
  publishedAt: string;
  isDraft: boolean;
  diffCount: number;
  hasErrors: boolean;
}

export function RemoteConfigOverview({
  environmentName,
  currentRevision,
  revisionHash,
  publishedAt,
  isDraft,
  diffCount,
  hasErrors,
}: RemoteConfigOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Scope Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--text3)]">
          <span className="eyebrow">Environment</span>
          <Globe2 className="size-3.5" />
        </div>
        <div className="mt-2 truncate font-semibold text-[13px] text-[var(--text)]" title={environmentName}>
          {environmentName}
        </div>
      </div>

      {/* Revision Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--text3)]">
          <span className="eyebrow">Active Revision</span>
          <History className="size-3.5" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-[14px] font-bold text-[var(--text)]">#{currentRevision}</span>
          <span className="font-mono text-[11px] text-[var(--text3)] truncate" title={revisionHash}>
            ({revisionHash})
          </span>
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--text3)]">
          <span className="eyebrow">Config Status</span>
          {hasErrors ? (
            <TriangleAlert className="size-3.5 text-[var(--red)]" />
          ) : isDraft ? (
            <span className="size-2 rounded-full bg-[var(--amber)]" />
          ) : (
            <ShieldCheck className="size-3.5 text-[var(--green)]" />
          )}
        </div>
        <div className="mt-2">
          {hasErrors ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[12px] text-[var(--red)]">
              Validation Issues
            </span>
          ) : isDraft ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[12px] text-[var(--amber)]">
              {diffCount} Unsaved {diffCount === 1 ? "Change" : "Changes"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[12px] text-[var(--green)]">
              <span className="size-1.5 rounded-full bg-[var(--green)] pulse-dot" />
              Serving
            </span>
          )}
        </div>
      </div>

      {/* Last Deployed Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[var(--text3)]">
          <span className="eyebrow">Last Deployed</span>
          <Clock3 className="size-3.5" />
        </div>
        <div className="mt-2 truncate font-mono text-[12px] text-[var(--text)]" title={publishedAt}>
          {publishedAt || "Never"}
        </div>
      </div>
    </div>
  );
}
