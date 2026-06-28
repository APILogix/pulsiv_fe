import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useErrorEvents } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, SeverityBadge, EventTypeBadge, Tabs, JsonViewer,
  Button, CopyButton, formatAbsoluteTime,
} from "@/shared/observe";

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useErrorEvents();
  const event = (data ?? []).find((e) => e.eventId === eventId);

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading event…</div>;
  if (!event) return <div className="p-8 text-[var(--text2)]">Event <code>{eventId}</code> not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back</Button>
      <PageHeader
        title={event.name}
        description={event.message}
        breadcrumbs={[{ label: "Observe" }, { label: "Events" }, { label: event.eventId.slice(0, 16) }]}
        actions={<CopyButton value={event.eventId} label="Copy ID" />}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
        <EventTypeBadge type={event.type} />
        <SeverityBadge severity={event.severity} />
        <span className="text-[13px] text-[var(--text2)]">{event.metadata.service} · {event.metadata.environment} · {event.metadata.release}</span>
        <span className="ml-auto text-[13px] text-[var(--text3)]">{formatAbsoluteTime(event.timestamp)}</span>
      </div>

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Meta label="Mechanism" value={event.mechanism} />
                <Meta label="Server" value={event.metadata.serverName} />
                <Meta label="SDK" value={`${event.metadata.sdkName} ${event.metadata.sdkVersion}`} />
                <Meta label="Trace" value={event.traceId ?? "—"} />
                <Meta label="User" value={event.user?.email ?? "anonymous"} />
                <Meta label="Request" value={event.requestId ?? "—"} />
              </div>
            ),
          },
          { id: "context", label: "Context", content: <JsonViewer data={event.context} /> },
          { id: "tags", label: "Tags", content: <JsonViewer data={event.tags} /> },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={event} /> },
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
