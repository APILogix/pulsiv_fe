import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useObservabilityDetail } from "./hooks/useObservabilityApi";
import { PageHeader, SectionCard, EventTypeBadge, Tabs, JsonViewer,
  Button, CopyButton, formatAbsoluteTime, DetailSkeleton } from "@/shared/observe";

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const { data: eventDetail, isLoading } = useObservabilityDetail<any>("spans", eventId);

  if (isLoading) return <DetailSkeleton />;
  const event = eventDetail?.entity || eventDetail;
  if (!event) return <div className="p-8 text-[var(--text2)]">Span <code>{eventId}</code> not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back</Button>
      <PageHeader
        title={event.name ?? "Span"}
        description={event.message ?? event.description}
        breadcrumbs={[{ label: "Observe" }, { label: "Spans" }, { label: (event.id ?? event.spanId ?? event.eventId ?? eventId).slice(0, 16) }]}
        actions={<CopyButton value={event.id ?? event.spanId ?? event.eventId ?? eventId} label="Copy ID" />}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
        <EventTypeBadge type="span" />
        <span className="text-[13px] text-[var(--text2)]">{event.service ?? event.metadata?.service} · {event.environment ?? event.metadata?.environment}</span>
        <span className="ml-auto text-[13px] text-[var(--text3)]">{formatAbsoluteTime(event.timestamp ?? event.startTime)}</span>
      </div>

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Meta label="Service" value={event.service ?? event.metadata?.service ?? "—"} />
                <Meta label="Trace" value={event.traceId ?? "—"} />
                <Meta label="Duration" value={`${event.durationMs ?? event.duration ?? 0}ms`} />
                <Meta label="Status" value={event.status ?? "—"} />
                <Meta label="Kind" value={event.kind ?? "—"} />
              </div>
            ),
          },
          { id: "context", label: "Context", content: <JsonViewer data={event.context ?? event.attributes} /> },
          { id: "tags", label: "Tags", content: <JsonViewer data={event.tags} /> },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={eventDetail} /> },
        ]}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <SectionCard className="p-0">
      <div className="p-3">
        <div className="text-[11px] uppercase tracking-wider text-[var(--text3)]">{label}</div>
        <div className="mt-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={value}>{value}</div>
      </div>
    </SectionCard>
  );
}
