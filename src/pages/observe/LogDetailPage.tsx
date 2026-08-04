import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useObservabilityDetail } from "./hooks/useObservabilityApi";
import { RelatedTab } from "./components/RelatedTab";
import { PageHeader, SectionCard, SeverityBadge, Tabs, JsonViewer, Button, CopyButton, formatAbsoluteTime, DetailSkeleton } from "@/shared/observe";

export default function LogDetailPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const { data: eventDetail, isLoading } = useObservabilityDetail<any>("logs", eventId);

  if (isLoading) return <DetailSkeleton />;
  const log = eventDetail?.entity || eventDetail;
  if (!log) return <div className="p-8 text-[var(--text2)]">Log <code>{eventId}</code> not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to logs</Button>
      <PageHeader
        title="Log entry"
        breadcrumbs={[{ label: "Observe" }, { label: "Logs" }, { label: (log.id ?? log.eventId)?.slice(0, 16) }]}
        actions={<CopyButton value={log.id ?? log.eventId} label="Copy ID" />}
      />

      <SectionCard>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={log.severity ?? log.level} />
          <span className="text-[13px] text-[var(--text3)]">{formatAbsoluteTime(log.timestamp)} · {log.service ?? log.metadata?.service} · {log.environment ?? log.metadata?.environment}</span>
        </div>
        <p className="mt-3 font-[family-name:var(--mono)] text-sm text-[var(--text)]">{log.message}</p>
        {(log.requestId || log.traceId) && (
          <div className="mt-3 flex gap-4 text-[12px]">
            {log.requestId && <span className="text-[var(--text3)]">request <code className="text-[var(--text2)]">{log.requestId}</code></span>}
            {log.traceId && <Link to={`/observability/traces/${log.traceId}`} className="text-[var(--brand)] hover:underline">view trace →</Link>}
          </div>
        )}
      </SectionCard>

      <Tabs
        tabs={[
          { id: "args", label: "Arguments", content: <JsonViewer data={log.attributes?.args ?? log.args ?? []} /> },
          { id: "metadata", label: "Metadata", content: <JsonViewer data={log.metadata} /> },
          { id: "related-requests", label: "Related Requests", content: <RelatedTab resource="logs" id={log.id ?? log.eventId} relation="requests" /> },
          { id: "related-traces", label: "Related Traces", content: <RelatedTab resource="logs" id={log.id ?? log.eventId} relation="traces" /> },
          { id: "related-errors", label: "Related Errors", content: <RelatedTab resource="logs" id={log.id ?? log.eventId} relation="errors" /> },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={eventDetail} /> },
        ]}
      />
    </div>
  );
}
