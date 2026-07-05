import { useState } from "react";
import { useNavigate } from "react-router";
import { Siren } from "lucide-react";
import { useIncidents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, SeverityBadge, StatusBadge, Timestamp, FilterSelect, formatDuration,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Incident } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" }, { value: "investigating", label: "Investigating" }, { value: "resolved", label: "Resolved" },
];
const VIEWS = ["list", "kanban"] as const;
const COLUMNS = ["open", "investigating", "resolved"] as const;

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [view, setView] = useState<(typeof VIEWS)[number]>("list");
  const { data, isLoading } = useIncidents();
  let incidents = data ?? [];
  if (status) incidents = incidents.filter((i) => i.status === status);

  const open = (data ?? []).filter((i) => i.status === "open").length;
  const investigating = (data ?? []).filter((i) => i.status === "investigating").length;

  const columns: Column<Incident>[] = [
    { key: "severity", header: "Severity", width: "90px", cell: (i) => <SeverityBadge severity={i.severity} /> },
    { key: "title", header: "Title", width: "1fr", cell: (i) => <span className="truncate font-medium">{i.title}</span> },
    { key: "service", header: "Service", width: "150px", cell: (i) => <span className="text-[var(--text2)]">{i.service}</span> },
    { key: "status", header: "Status", width: "130px", cell: (i) => <StatusBadge status={i.status} /> },
    { key: "assignee", header: "Assignee", width: "140px", cell: (i) => <span className="truncate text-[var(--text2)]">{i.assignedToName}</span> },
    { key: "duration", header: "Duration", width: "100px", cell: (i) => <span className="tabular-nums text-[var(--text2)]">{formatDuration(i.duration)}</span> },
    { key: "started", header: "Started", width: "120px", cell: (i) => <Timestamp value={i.startedAt} /> },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Incidents"
        description="Incident center for triggered alerts and investigations."
        actions={
          <div className="flex gap-1 rounded-[8px] border border-[var(--border)] p-0.5">
            {VIEWS.map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("rounded-[6px] px-3 py-1 text-[12px] capitalize", view === v ? "bg-[var(--brand-bg)] text-[var(--brand)]" : "text-[var(--text3)]")}>{v}</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Open" value={open} icon={Siren} trend="down" />
        <KpiCard label="Investigating" value={investigating} />
        <KpiCard label="Resolved (7d)" value={(data ?? []).filter((i) => i.status === "resolved").length} trend="up" />
        <KpiCard label="MTTR" value="42m" />
      </div>

      {view === "list" ? (
        <>
          <div className="flex"><FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} label="Status" /></div>
          <InfiniteTable
            className="flex-1"
            loading={isLoading}
            items={incidents}
            queryKey={["incidents", status]}
            columns={columns}
            getKey={(i) => i.id}
            onRowClick={(i) => navigate(`/alerts/${i.id}`)}
          />
        </>
      ) : (
        <div className="sidebar-scroll grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-3">
              <div className="mb-2 text-sm font-semibold capitalize text-[var(--text)]">{col} ({(data ?? []).filter((i) => i.status === col).length})</div>
              <div className="flex flex-col gap-2">
                {(data ?? []).filter((i) => i.status === col).map((inc) => (
                  <div key={inc.id} onClick={() => navigate(`/alerts/${inc.id}`)} className="cursor-pointer rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] p-3 hover:border-[var(--input)]">
                    <div className="flex items-center justify-between"><SeverityBadge severity={inc.severity} /><Timestamp value={inc.startedAt} /></div>
                    <div className="mt-1.5 text-[13px] font-medium text-[var(--text)]">{inc.title}</div>
                    <div className="text-[12px] text-[var(--text3)]">{inc.service}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </FillPage>
  );
}
