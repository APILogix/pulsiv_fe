import { ReadoutBand, Timestamp, formatCompact } from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import type { ErrorGroup, ErrorGroupDetail } from "../types/error-group";

export function ErrorOverviewCards({ group }: { group: ErrorGroup & Partial<ErrorGroupDetail> }) {
  const occurrences = Number(group.occurrences?.count ?? group.occurrenceCount ?? group.occurrence_count ?? 0);
  const firstSeen = group.occurrences?.firstSeenAt ?? group.firstSeenAt ?? group.firstSeen;
  const lastSeen = group.occurrences?.lastSeenAt ?? group.lastSeenAt ?? group.lastSeen;
  const regressions = Number(group.regression?.count ?? group.regressionCount ?? group.regression_count ?? 0);
  const users = group.affectedUsers;
  const release = group.release?.latest ?? group.latestRelease ?? null;
  const resolvedIn = group.release?.resolvedIn ?? group.resolvedRelease ?? null;

  const cells: ReadoutCell[] = [
    { label: "Events", value: formatCompact(occurrences), sub: "occurrences in this group", tone: occurrences > 0 ? "bad" : "neutral" },
    { label: "Affected users", value: users != null ? formatCompact(users) : "—", sub: group.affectedSessions != null ? `${formatCompact(group.affectedSessions)} sessions` : undefined },
    { label: "First seen", value: firstSeen ? <Timestamp value={firstSeen} /> : "—" },
    { label: "Last seen", value: lastSeen ? <Timestamp value={lastSeen} /> : "—" },
    { label: "Latest release", value: release ?? "—", sub: resolvedIn ? `resolved in ${resolvedIn}` : undefined },
    { label: "Regressions", value: String(regressions), sub: group.lastRegressedAt ? <>last <Timestamp value={group.lastRegressedAt} /></> : "reopened after a fix", tone: regressions > 0 ? "bad" : "neutral" },
  ];
  return <ReadoutBand cells={cells} />;
}
