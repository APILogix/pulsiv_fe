import { useNavigate } from "react-router";
import { useTraceEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, formatLatency,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { TraceEvent } from "@/types/events";

export default function TracesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useTraceEvents();
  const traces = data ?? [];
  const avgSpans = traces.length ? Math.round(traces.reduce((s, t) => s + t.spanCount, 0) / traces.length) : 0;
  const avgDur = traces.length ? Math.round(traces.reduce((s, t) => s + t.totalDuration, 0) / traces.length) : 0;

  const columns: Column<TraceEvent>[] = [
    { key: "id", header: "Trace ID", width: "1fr", cell: (t) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--brand)]">{t.traceId}</span> },
    { key: "root", header: "Root span", width: "1fr", cell: (t) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{t.rootSpan.name}</span> },
    { key: "service", header: "Service", width: "130px", cell: (t) => t.metadata.service },
    { key: "spans", header: "Spans", width: "70px", align: "right", cell: (t) => <span className="tabular-nums">{t.spanCount}</span> },
    { key: "dur", header: "Duration", width: "100px", align: "right", cell: (t) => <span className="tabular-nums">{formatLatency(t.totalDuration)}</span> },
    { key: "status", header: "Status", width: "110px", cell: (t) => <StatusBadge status={t.isPartial ? "degraded" : "ok"} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Traces" description="Distributed traces across services and spans." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Traces" value={traces.length} />
        <KpiCard label="Avg spans" value={avgSpans} />
        <KpiCard label="Avg duration" value={formatLatency(avgDur)} />
        <KpiCard label="Partial" value={traces.filter((t) => t.isPartial).length} />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={traces}
        queryKey={["traces"]}
        columns={columns}
        getKey={(t) => t.eventId}
        onRowClick={(t) => navigate(`/observability/traces/${t.traceId}`)}
      />
    </FillPage>
  );
}
