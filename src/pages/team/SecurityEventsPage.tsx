import { Fragment, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { Button as UiButton } from "@/components/ui/button";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { SecurityEvent, SecurityEventSeverity } from "@/modules/organizations/types/org.types";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { JsonViewer, Timestamp, formatAbsoluteTime, formatNumber } from "@/shared/observe";
import { Pill, SegmentedControl, type SegmentOption, type SurfaceTone } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

type SeverityFilter = "all" | SecurityEventSeverity;

const EVENT_LIMIT = 100;

const SEVERITY_SEGMENTS: SegmentOption<SeverityFilter>[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SEVERITY_TONE: Record<SecurityEventSeverity, SurfaceTone> = {
  critical: "red",
  high: "red",
  medium: "amber",
  low: "neutral",
};

const COLUMNS: SheetColumn[] = [
  { key: "event", header: "Event" },
  { key: "severity", header: "Severity", className: "w-[110px]" },
  { key: "actor", header: "Actor", className: `w-[220px] ${HIDE_BELOW_MD}` },
  { key: "ip", header: "IP address", className: `w-[150px] ${HIDE_BELOW_LG}` },
  { key: "outcome", header: "Outcome", className: `w-[110px] ${HIDE_BELOW_LG}` },
  { key: "time", header: "Time", className: "w-[140px]", align: "right" },
];

const MONO = "font-[family-name:var(--mono)] tabular-nums";

/** Event types that name a rejection; everything else reads as allowed. */
function isDenied(eventType: string) {
  return /fail|denied|lock|revoke|block/.test(eventType);
}

function EventDetail({ event }: { event: SecurityEvent }) {
  const facts: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Event ID", value: event.id, mono: true },
    { label: "Recorded", value: formatAbsoluteTime(event.createdAt), mono: true },
    { label: "Actor", value: event.userId ?? "System", mono: Boolean(event.userId) },
    { label: "IP address", value: event.ipAddress ?? "No IP recorded", mono: Boolean(event.ipAddress) },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-[12px] text-[var(--text3)]">{fact.label}</dt>
            <dd className={cn("mt-0.5 truncate text-[12px] text-[var(--text)]", fact.mono && MONO)} title={fact.value}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="min-w-0">
        <p className="mb-2 text-[12px] text-[var(--text3)]">Raw payload</p>
        <JsonViewer data={event.metadata} maxHeight={360} />
      </div>
    </div>
  );
}

export default function SecurityEventsPage() {
  const { activeOrgId } = useOrganizations();
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: orgQueryKeys.securityEvents(activeOrgId!),
    queryFn: () => orgApi.listSecurityEvents(activeOrgId!, { limit: EVENT_LIMIT }),
    enabled: !!activeOrgId,
  });

  const events = data?.data ?? [];
  const hasMore = data?.meta?.hasMore ?? false;
  const ready = Boolean(data);
  const critical = events.filter((event) => event.severity === "critical" || event.severity === "high").length;
  const failedLogins = events.filter((event) => event.eventType.includes("failed_login")).length;
  const uniqueIps = new Set(events.flatMap((event) => (event.ipAddress ? [event.ipAddress] : []))).size;

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

  const clearFilters = () => {
    setSearch("");
    setSeverity("all");
  };

  const toggle = (id: string) => setSelectedId((current) => (current === id ? null : id));

  const scope = `In the latest ${EVENT_LIMIT} events`;
  const readouts: Readout[] = [
    {
      label: "Events loaded",
      value: ready ? formatNumber(events.length) : "—",
      sub: hasMore ? `Latest ${EVENT_LIMIT}; older events exist` : `Up to the latest ${EVENT_LIMIT}`,
    },
    {
      label: "High or critical",
      value: ready ? formatNumber(critical) : "—",
      sub: scope,
      tone: !ready ? "neutral" : critical > 0 ? "bad" : "good",
    },
    {
      label: "Failed sign-ins",
      value: ready ? formatNumber(failedLogins) : "—",
      sub: scope,
      tone: ready && failedLogins > 0 ? "warn" : "neutral",
    },
    {
      label: "Source addresses",
      value: ready ? formatNumber(uniqueIps) : "—",
      sub: "Distinct IP addresses loaded",
    },
  ];

  const toolbar = (
    <>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search event type, actor, or IP"
        label="Search security events"
      />
      <SegmentedControl value={severity} onChange={setSeverity} options={SEVERITY_SEGMENTS} ariaLabel="Filter by severity" />
      {ready && (
        <ToolbarCount>
          {formatNumber(filtered.length)} of {formatNumber(events.length)}
        </ToolbarCount>
      )}
    </>
  );

  let body: ReactNode;
  if (isLoading || (!data && !isError)) {
    body = <SheetLoading rows={6} label="Loading security events" />;
  } else if (isError) {
    body = (
      <SheetError
        title="Could not load security events"
        message={apiErrorMessage(error, "The security events request failed.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (events.length === 0) {
    body = (
      <SheetEmpty
        title="No security events yet"
        description="Failed sign-ins, MFA changes, session activity, and privilege escalations appear here when they happen."
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No events match these filters"
        description="Try a different severity or search term."
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Security events. Expand an event for its raw payload." minWidth={420}>
        {filtered.map((event) => {
          const expanded = event.id === selectedId;
          const detailId = `security-event-${event.id}`;
          const denied = isDenied(event.eventType);
          return (
            <Fragment key={event.id}>
              <SheetRow onActivate={() => toggle(event.id)} className={cn(expanded && "bg-[var(--bg2)]/40")}>
                <SheetCell>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    onClick={() => toggle(event.id)}
                    className="group flex min-w-0 max-w-full items-center gap-2 rounded-[2px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0 text-[var(--text3)] transition-transform duration-150 group-hover:text-[var(--text)]",
                        expanded && "rotate-90",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className={cn("block truncate text-[12px] text-[var(--text)]", MONO)} title={event.eventType}>
                        {event.eventType}
                      </span>
                      {/* Actor and IP columns drop on small screens; keep the reading. */}
                      <span className={cn("mt-0.5 block truncate text-[11.5px] text-[var(--text3)] lg:hidden", MONO)}>
                        {[event.userId ?? "System", event.ipAddress].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </SheetCell>
                <SheetCell>
                  <Pill tone={SEVERITY_TONE[event.severity] ?? "neutral"} dot={event.severity === "critical"}>
                    {event.severity}
                  </Pill>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  {event.userId ? (
                    <span className={cn("block truncate text-[12px] text-[var(--text2)]", MONO)} title={event.userId}>
                      {event.userId}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">System</span>
                  )}
                </SheetCell>
                <SheetCell className={HIDE_BELOW_LG}>
                  <span className={cn("text-[12px] text-[var(--text2)]", MONO)}>{event.ipAddress ?? "—"}</span>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_LG}>
                  <Pill tone={denied ? "red" : "green"}>{denied ? "Denied" : "Allowed"}</Pill>
                </SheetCell>
                <SheetCell align="right">
                  <span className={cn("whitespace-nowrap text-[12px] text-[var(--text2)]", MONO)}>
                    <Timestamp value={event.createdAt} />
                  </span>
                </SheetCell>
              </SheetRow>
              {expanded && (
                <tr id={detailId} className="border-b border-[var(--border)] bg-[var(--bg2)]/20 last:border-b-0">
                  <td colSpan={COLUMNS.length} className="px-5 py-4">
                    <EventDetail event={event} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Security monitoring"
        description="Authentication, session, and privilege activity captured for this organization. Expand an event to inspect its raw payload."
      />

      <Readouts cells={readouts} loading={isLoading} label="Security summary" />

      <Sheet
        label="Security events"
        toolbar={toolbar}
        footer={
          ready && events.length > 0 ? (
            <span>
              {hasMore
                ? `Showing the latest ${EVENT_LIMIT} events. Older events are not loaded on this page.`
                : `All ${formatNumber(events.length)} recorded events are loaded.`}
            </span>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
