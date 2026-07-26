import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Fingerprint, Globe, ShieldAlert, ShieldX, Siren } from "lucide-react";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { SecurityEvent } from "@/modules/organizations/types/org.types";
import {
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  SegmentedControl,
  StatCard,
  Toolbar,
  type HeroFact,
  type SegmentOption,
} from "@/shared/ui/pulse";
import {
  InfiniteTable,
  JsonViewer,
  SearchInput,
  SeverityBadge,
  Timestamp,
  formatAbsoluteTime,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";

const SEVERITY_SEGMENTS: SegmentOption<SeverityFilter>[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const DAY_MS = 86_400_000;
const SERIES_DAYS = 14;

/** Buckets ISO timestamps into per-day counts for the trailing `days` window. */
function dailySeries(timestamps: string[], days: number): number[] {
  const buckets = new Array<number>(days).fill(0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  for (const value of timestamps) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) continue;
    const offset = Math.floor((startOfToday.getTime() - time) / DAY_MS);
    const index = days - 1 - offset;
    if (index >= 0 && index < days) buckets[index] += 1;
  }
  return buckets;
}

function readableType(eventType: string) {
  return eventType.replace(/[._]/g, " ");
}

export default function SecurityEventsPage() {
  const { activeOrgId } = useOrganizations();
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: orgQueryKeys.securityEvents(activeOrgId!),
    queryFn: () => orgApi.listSecurityEvents(activeOrgId!, { limit: 100 }),
    enabled: !!activeOrgId,
  });

  const events = data?.data ?? [];
  const critical = events.filter((event) => event.severity === "critical" || event.severity === "high").length;
  const failedLogins = events.filter((event) => event.eventType.includes("failed_login")).length;
  const uniqueIps = new Set(events.flatMap((event) => (event.ipAddress ? [event.ipAddress] : []))).size;
  const series = dailySeries(events.map((event) => event.createdAt), SERIES_DAYS);

  const query = search.trim().toLowerCase();
  const filtered = events.filter((event) => {
    if (severity !== "all" && event.severity !== severity) return false;
    if (query.length === 0) return true;
    return (
      event.eventType.toLowerCase().includes(query) ||
      (event.userId ?? "").toLowerCase().includes(query) ||
      (event.ipAddress ?? "").toLowerCase().includes(query)
    );
  });

  const selected = filtered.find((event) => event.id === selectedId) ?? null;

  const facts: HeroFact[] = [
    { label: "Events captured", value: events.length, icon: Activity },
    { label: "High or critical", value: critical, tone: critical > 0 ? "red" : "green", icon: Siren },
    { label: "Failed sign-ins", value: failedLogins, tone: failedLogins > 0 ? "amber" : "neutral", icon: ShieldX },
    { label: "Source addresses", value: uniqueIps, icon: Globe },
  ];

  const columns: Column<SecurityEvent>[] = [
    {
      key: "time",
      header: "Time",
      width: "150px",
      cell: (event) => (
        <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
          <Timestamp value={event.createdAt} />
        </span>
      ),
    },
    { key: "severity", header: "Severity", width: "110px", cell: (event) => <SeverityBadge severity={event.severity} /> },
    {
      key: "type",
      header: "Event",
      width: "minmax(200px, 1.2fr)",
      cell: (event) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={event.eventType}>
          {event.eventType}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      width: "minmax(160px, 1fr)",
      cell: (event) =>
        event.userId ? (
          <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={event.userId}>
            {event.userId}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--text3)]">System</span>
        ),
    },
    {
      key: "ip",
      header: "IP address",
      width: "140px",
      cell: (event) => (
        <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
          {event.ipAddress ?? "—"}
        </span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      width: "120px",
      cell: (event) => {
        const denied = /fail|denied|lock|revoke|block/.test(event.eventType);
        return (
          <Pill tone={denied ? "red" : "green"} dot>
            {denied ? "Denied" : "Allowed"}
          </Pill>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Security monitoring"
        title="Security events"
        description="Authentication, session, and privilege activity captured for this organization. Select a row to inspect the raw event payload."
        icon={ShieldAlert}
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {isError && (
        <Notice tone="red" icon={ShieldAlert} title="Unable to load security events">
          {(error as Error)?.message ?? "Try again in a moment."}
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events captured" value={events.length} icon={Activity} tone="brand" series={series} footnote={`Last ${SERIES_DAYS} days of ingested events`} />
        <StatCard label="High or critical" value={critical} icon={Siren} tone={critical > 0 ? "red" : "green"} footnote="Severity high and above" />
        <StatCard label="Failed sign-ins" value={failedLogins} icon={ShieldX} tone={failedLogins > 0 ? "amber" : "neutral"} footnote="Credential rejections in window" />
        <StatCard label="Source addresses" value={uniqueIps} icon={Fingerprint} tone="blue" footnote="Distinct IP addresses seen" />
      </div>

      <Toolbar
        trailing={
          <SegmentedControl
            value={severity}
            onChange={setSeverity}
            options={SEVERITY_SEGMENTS}
            ariaLabel="Filter by severity"
          />
        }
      >
        <SearchInput placeholder="Search event type, actor, or IP…" defaultValue={search} onSearch={setSearch} />
      </Toolbar>

      <InfiniteTable
        className="h-[540px]"
        loading={isLoading}
        items={filtered}
        queryKey={["securityEvents-table", activeOrgId, severity, search]}
        columns={columns}
        getKey={(event) => event.id}
        onRowClick={(event) => setSelectedId(event.id === selectedId ? null : event.id)}
        emptyMessage="No security events match these filters."
      />

      {selected && (
        <Panel
          title={readableType(selected.eventType)}
          description={`${formatAbsoluteTime(selected.createdAt)} · ${selected.ipAddress ?? "no IP recorded"}`}
          icon={ShieldAlert}
          tone="ai"
          actions={<SeverityBadge severity={selected.severity} />}
        >
          <JsonViewer data={selected.metadata} />
        </Panel>
      )}
    </div>
  );
}
