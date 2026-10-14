import { Readouts, type Readout } from "@/modules/projects/components/project-page";
import { formatAbsoluteTime, formatNumber, formatRelativeTime } from "@/shared/observe";

interface RemoteConfigOverviewProps {
  environmentName: string;
  currentRevision: number;
  revisionHash: string;
  /** ISO timestamp of the published revision. */
  publishedAt?: string | null;
  isDraft: boolean;
  diffCount: number;
  hasErrors: boolean;
  errorCount?: number;
}

/** The editor's readout band: scope, published revision, draft state, age. */
export function RemoteConfigOverview({
  environmentName,
  currentRevision,
  revisionHash,
  publishedAt,
  isDraft,
  diffCount,
  hasErrors,
  errorCount = 0,
}: RemoteConfigOverviewProps) {
  const cells: Readout[] = [
    {
      label: "Environment",
      value: <span className="font-[family-name:var(--sans)]">{environmentName}</span>,
      title: environmentName,
      sub: "Configuration scope",
    },
    {
      label: "Published revision",
      value: `#${currentRevision}`,
      sub: <span className="font-[family-name:var(--mono)]">{revisionHash}</span>,
      title: revisionHash,
    },
    {
      label: "Draft changes",
      value: formatNumber(isDraft ? diffCount : 0),
      sub: hasErrors
        ? `${formatNumber(errorCount)} validation ${errorCount === 1 ? "error" : "errors"}`
        : isDraft
          ? "Not published yet"
          : "Matches the published revision",
      tone: hasErrors ? "bad" : isDraft ? "warn" : "neutral",
    },
    {
      label: "Last published",
      value: publishedAt ? formatRelativeTime(publishedAt) : "Never",
      title: publishedAt ? formatAbsoluteTime(publishedAt) : undefined,
      sub: publishedAt ? formatAbsoluteTime(publishedAt) : "Not published yet",
    },
  ];

  return <Readouts cells={cells} label="Configuration status" />;
}
