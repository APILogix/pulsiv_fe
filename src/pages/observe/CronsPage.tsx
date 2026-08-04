import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput, FilterSelect,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable, formatDuration,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { CronCheckInEvent, CronStatus } from "@/types/events";

const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "ok", label: "OK" },
  { value: "error", label: "Error" },
  { value: "in_progress", label: "In progress" },
];

const STATUS_ICON: Record<CronStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="size-3.5 text-[var(--green)]" />,
  error: <XCircle className="size-3.5 text-[var(--red)]" />,
  in_progress: <Loader2 className="size-3.5 animate-spin text-[var(--amber)]" />,
};

export default function CronsPage() {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useObservabilityList<any>("crons", { status, search: query });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  const ok = Number(summary.ok ?? rows.filter((c: any) => c.status === "ok").length);
  const failing = Number(summary.error ?? rows.filter((c: any) => c.status === "error").length);
  const monitors = Number(summary.monitors ?? new Set(rows.map((c: any) => c.monitorSlug)).size);
  const total = Number(summary.total ?? rows.length);

  const columns: Column<CronCheckInEvent>[] = [
    { key: "status", header: "Status", width: "90px", cell: (c) => <span className="inline-flex items-center gap-1.5 text-[12px] capitalize text-[var(--text2)]">{STATUS_ICON[c.status]}{(c.status || "").replace("_", " ")}</span> },
    { key: "slug", header: "Monitor", width: "1fr", cell: (c) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{c.monitorSlug ?? (c as any).name}</span> },
    { key: "duration", header: "Duration", width: "100px", align: "right", cell: (c) => <span className="tabular-nums">{c.duration ? formatDuration(c.duration) : "—"}</span> },
    { key: "time", header: "Check-in", width: "120px", cell: (c) => <Timestamp value={c.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (c) => <EnvironmentBadge environment={c.environment ?? (c as any).metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (c) => <AskAiButton question={`Investigate cron monitor "${c.monitorSlug ?? (c as any).name}" — last check-in status was ${c.status}.`} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Crons" description="Scheduled job check-ins and missed-execution monitoring." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Monitors" value={monitors} />
        <KpiCard label="OK check-ins" value={ok} trend="up" />
        <KpiCard label="Failing" value={failing} trend={failing > 0 ? "down" : "neutral"} />
        <KpiCard label="Total check-ins" value={total} />
      </div>

      <FilterBar onClear={() => { setStatus(""); setQuery(""); }}>
        <SearchInput placeholder="Search monitor slug…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["crons-page", status, query]}
        columns={columns}
        getKey={(c) => c.id ?? c.eventId ?? Math.random().toString()}
      />
    </FillPage>
  );
}
