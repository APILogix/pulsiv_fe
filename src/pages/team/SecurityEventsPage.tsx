import { useSecurityEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, SeverityBadge, Timestamp,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { SecurityEvent } from "@/lib/dummy-data";

export default function SecurityEventsPage() {
  const { data, isLoading } = useSecurityEvents();
  const events = data ?? [];
  const critical = events.filter((e) => e.severity === "critical" || e.severity === "high").length;
  const riskScore = Math.min(100, 30 + critical * 3);

  const columns: Column<SecurityEvent>[] = [
    { key: "type", header: "Type", width: "1fr", cell: (e) => <span className="truncate font-[family-name:var(--mono)] text-[12px]">{e.type}</span> },
    { key: "severity", header: "Severity", width: "100px", cell: (e) => <SeverityBadge severity={e.severity} /> },
    { key: "user", header: "User", width: "1fr", cell: (e) => <span className="truncate text-[var(--text2)]">{e.user}</span> },
    { key: "location", header: "Location", width: "140px", cell: (e) => <span className="text-[var(--text2)]">{e.location}</span> },
    { key: "ip", header: "IP", width: "130px", cell: (e) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{e.ip}</span> },
    { key: "time", header: "Time", width: "130px", cell: (e) => <Timestamp value={e.timestamp} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Security Events" description="Security event review for the organization." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Events (30d)" value={events.length} />
        <KpiCard label="High / critical" value={critical} trend="down" />
        <KpiCard label="Risk score" value={riskScore} />
        <KpiCard label="Failed logins" value={events.filter((e) => e.type === "failed_login").length} />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={events}
        queryKey={["securityEvents"]}
        columns={columns}
        getKey={(e) => e.id}
      />
    </FillPage>
  );
}
