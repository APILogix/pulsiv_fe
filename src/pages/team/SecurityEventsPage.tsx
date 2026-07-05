import { useQuery } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { SecurityEvent } from "@/modules/organizations/types/org.types";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, SeverityBadge, Timestamp,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";

export default function SecurityEventsPage() {
  const { activeOrgId } = useOrganizations();

  const { data, isLoading } = useQuery({
    queryKey: orgQueryKeys.securityEvents(activeOrgId!),
    queryFn: () => orgApi.listSecurityEvents(activeOrgId!, { limit: 100 }),
    enabled: !!activeOrgId,
  });

  const events = data?.data ?? [];
  const critical = events.filter((e) => e.severity === "critical" || e.severity === "high").length;
  const riskScore = Math.min(100, 30 + critical * 3);

  const columns: Column<SecurityEvent>[] = [
    { key: "type", header: "Type", width: "1fr", cell: (e) => <span className="truncate font-[family-name:var(--mono)] text-[12px]">{e.eventType}</span> },
    { key: "severity", header: "Severity", width: "100px", cell: (e) => <SeverityBadge severity={e.severity} /> },
    { key: "user", header: "User ID", width: "1fr", cell: (e) => <span className="truncate text-[var(--text2)] font-[family-name:var(--mono)] text-[12px]">{e.userId || "System"}</span> },
    { key: "ip", header: "IP", width: "130px", cell: (e) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{e.ipAddress || "-"}</span> },
    { key: "time", header: "Time", width: "130px", cell: (e) => <Timestamp value={new Date(e.createdAt).getTime()} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Security Events" description="Security event review for the organization." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Events (30d)" value={events.length} />
        <KpiCard label="High / critical" value={critical} trend={critical > 0 ? "up" : "down"} />
        <KpiCard label="Risk score" value={riskScore} />
        <KpiCard label="Failed logins" value={events.filter((e) => e.eventType.includes("failed_login")).length} />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={events}
        queryKey={["securityEvents-table", activeOrgId]}
        columns={columns}
        getKey={(e) => e.id}
      />
    </FillPage>
  );
}
