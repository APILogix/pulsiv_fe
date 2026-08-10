import { KpiCard, Timestamp, formatCompact } from "@/shared/observe";
import type { ErrorGroup } from "../types/error-group";
import { AlertTriangle, Clock, GitBranch, Layers, Shield, Cpu } from "lucide-react";

interface ErrorOverviewCardsProps {
  group: ErrorGroup;
}

export function ErrorOverviewCards({ group }: ErrorOverviewCardsProps) {
  const occurrenceCount = group.occurrenceCount || group.occurrence_count || 1;
  const firstSeen = group.firstSeen || group.first_seen_at || group.firstSeenAt;
  const lastSeen = group.lastSeen || group.last_seen_at || group.lastSeenAt;
  const latestRelease = group.latestRelease || group.latest_release || "v1.0.0";
  const environment = group.environment || "production";
  const sdkVersion = group.latestSdkVersion || group.latest_sdk_version || "1.0.0";
  const appVersion = group.latestApplicationVersion || group.latest_application_version || "1.0.0";
  const highestSeverity = (group.highestSeverity || group.highest_severity || "error").toUpperCase();
  const latestSeverity = (group.latestSeverity || group.latest_severity || "error").toUpperCase();
  const regressionCount = group.regressionCount ?? group.regression_count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label="Total Occurrences" value={formatCompact(occurrenceCount)} icon={Layers} />
      
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 shadow-sm">
        <div className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] flex items-center gap-1.5">
          <Clock className="size-3 text-[var(--brand)]" />
          First Seen
        </div>
        <div className="mt-2 text-[13px] font-medium text-[var(--text)]">
          <Timestamp value={firstSeen} />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 shadow-sm">
        <div className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)] flex items-center gap-1.5">
          <Clock className="size-3 text-[var(--green)]" />
          Last Seen
        </div>
        <div className="mt-2 text-[13px] font-medium text-[var(--text)]">
          <Timestamp value={lastSeen} />
        </div>
      </div>

      <KpiCard label="Latest Release" value={latestRelease} icon={GitBranch} />
      <KpiCard label="Environment" value={environment} icon={Shield} />
      <KpiCard label="Latest SDK" value={sdkVersion} icon={Cpu} />
      <KpiCard label="App Version" value={appVersion} />
      <KpiCard label="Highest Severity" value={highestSeverity} icon={AlertTriangle} />
      <KpiCard label="Latest Severity" value={latestSeverity} />
      <KpiCard label="Regression Count" value={regressionCount} />
    </div>
  );
}

