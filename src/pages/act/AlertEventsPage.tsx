/**
 * Alert events — `GET/POST /organizations/:orgId/alerting/events`.
 *
 * This is the incident center: every fired alert rule (or hand-ingested
 * event) lands here as an `AlertEvent`. Operators acknowledge, resolve, or
 * silence directly from the list. Status values come straight from the
 * backend `AlertEventStatusSchema` — pending/processing/firing/resolved/
 * acknowledged/suppressed/silenced/error.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { Siren } from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, SeverityBadge, Timestamp, FilterSelect,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { useAlertEvents, useAlertEventStats } from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { EventStatusPill, withAllOption } from "@/modules/alerting/components/alerting-ui";
import { ALERT_EVENT_STATUSES, ALERT_SEVERITIES, type AlertEvent, type AlertEventStatus } from "@/modules/alerting/api/types";
import { cn } from "@/lib/utils";

const STATUS_OPTS = withAllOption(ALERT_EVENT_STATUSES, "All statuses");
const SEVERITY_OPTS = withAllOption(ALERT_SEVERITIES, "All severities");
const VIEWS = ["list", "kanban"] as const;
const COLUMNS: AlertEventStatus[] = ["firing", "acknowledged", "resolved"];

export default function AlertEventsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [view, setView] = useState<(typeof VIEWS)[number]>("list");

  const query = {
    ...(status ? { status: status as AlertEventStatus } : {}),
    ...(severity ? { severity: severity as AlertEvent["severity"] } : {}),
    limit: 100,
  };
  const { data, isLoading, error } = useAlertEvents(query);
  const { data: stats } = useAlertEventStats();
  const events = data?.data ?? [];

  if (error) toast.error(apiErrorMessage(error, "Could not load alert events."));

  const firing = events.filter((e) => e.status === "firing").length;
  const acknowledged = events.filter((e) => e.status === "acknowledged").length;
  const resolved = events.filter((e) => e.status === "resolved").length;

  const columns: Column<AlertEvent>[] = [
    { key: "severity", header: "Severity", width: "90px", cell: (e) => <SeverityBadge severity={e.severity} /> },
    { key: "source", header: "Source", width: "1fr", cell: (e) => <span className="truncate font-medium">{e.source}</span> },
    { key: "fingerprint", header: "Fingerprint", width: "160px", cell: (e) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{e.fingerprint}</span> },
    { key: "status", header: "Status", width: "130px", cell: (e) => <EventStatusPill status={e.status} /> },
    { key: "duplicates", header: "Duplicates", width: "100px", cell: (e) => <span className="tabular-nums text-[var(--text2)]">{e.duplicateCount}</span> },
    { key: "started", header: "Started", width: "120px", cell: (e) => <Timestamp value={e.startedAt} /> },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Alert events"
        description="Incident center for triggered alerts, hand-ingested events, and their lifecycle."
        actions={
          <div className="flex gap-1 rounded-[8px] border border-[var(--border)] p-0.5">
            {VIEWS.map((v) => (
              <button type="button" key={v} onClick={() => setView(v)} className={cn("rounded-[6px] px-3 py-1 text-[12px] capitalize", view === v ? "bg-[var(--brand-bg)] text-[var(--brand)]" : "text-[var(--text3)]")}>{v}</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Firing" value={firing} icon={Siren} trend={firing > 0 ? "down" : "neutral"} />
        <KpiCard label="Acknowledged" value={acknowledged} />
        <KpiCard label="Resolved" value={resolved} trend="up" />
        <KpiCard label="Total (period)" value={stats ? String(Object.values(stats).length) : events.length} />
      </div>

      {view === "list" ? (
        <>
          <div className="flex gap-3">
            <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} label="Status" />
            <FilterSelect value={severity} onChange={setSeverity} options={SEVERITY_OPTS} label="Severity" />
          </div>
          <InfiniteTable
            className="flex-1"
            loading={isLoading}
            items={events}
            queryKey={["alert-events", status, severity]}
            columns={columns}
            getKey={(e) => e.id}
            onRowClick={(e) => navigate(`/alerts/${e.id}`)}
            emptyMessage="No alert events match these filters."
          />
        </>
      ) : (
        <div className="sidebar-scroll grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-3">
              <div className="mb-2 text-sm font-semibold capitalize text-[var(--text)]">{col} ({events.filter((e) => e.status === col).length})</div>
              <div className="flex flex-col gap-2">
                {events.flatMap((e) => e.status === col ? [(
                  <div key={e.id} role="button" tabIndex={0} onClick={() => navigate(`/alerts/${e.id}`)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/alerts/${e.id}`); } }} className="cursor-pointer rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] p-3 hover:border-[var(--input)]">
                    <div className="flex items-center justify-between"><SeverityBadge severity={e.severity} /><Timestamp value={e.startedAt} /></div>
                    <div className="mt-1.5 text-[13px] font-medium text-[var(--text)]">{e.source}</div>
                    <div className="truncate text-[12px] text-[var(--text3)]">{e.fingerprint}</div>
                  </div>
                )] : [])}
              </div>
            </div>
          ))}
        </div>
      )}
    </FillPage>
  );
}
