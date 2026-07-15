import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useLogEvent } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, SeverityBadge, Tabs, JsonViewer, Button, CopyButton, formatAbsoluteTime, DetailSkeleton } from "@/shared/observe";

export default function LogDetailPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const { data: log, isLoading } = useLogEvent(eventId);

  if (isLoading) return <DetailSkeleton />;
  if (!log) return <div className="p-8 text-[var(--text2)]">Log <code>{eventId}</code> not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to logs</Button>
      <PageHeader
        title="Log entry"
        breadcrumbs={[{ label: "Observe" }, { label: "Logs" }, { label: log.eventId.slice(0, 16) }]}
        actions={<CopyButton value={log.eventId} label="Copy ID" />}
      />

      <SectionCard>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={log.level} />
          <span className="text-[13px] text-[var(--text3)]">{formatAbsoluteTime(log.timestamp)} · {log.metadata.service} · {log.metadata.environment}</span>
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
          { id: "args", label: "Arguments", content: <JsonViewer data={log.args ?? []} /> },
          { id: "metadata", label: "Metadata", content: <JsonViewer data={log.metadata} /> },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={log} /> },
          {
            id: "context",
            label: "Surrounding context",
            content: (
              <SectionCard className="p-0">
                <div className="p-4 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">
                  Adjacent log lines from the same request stream render here for in-context debugging.
                </div>
              </SectionCard>
            ),
          },
        ]}
      />
    </div>
  );
}
