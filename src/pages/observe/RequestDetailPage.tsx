import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useObservabilityDetail } from "./hooks/useObservabilityApi";
import { RelatedTab } from "./components/RelatedTab";
import { PageHeader, SectionCard, MethodBadge, StatusCodeBadge, Tabs, JsonViewer,
  CopyButton, Button, formatLatency, formatBytes, formatAbsoluteTime, DetailSkeleton } from "@/shared/observe";

export default function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();
  const { data: eventDetail, isLoading } = useObservabilityDetail<any>("requests", requestId);

  if (isLoading) return <DetailSkeleton />;
  const req = eventDetail?.entity || eventDetail;
  if (!req) return <div className="p-8 text-[var(--text2)]">Request <code>{requestId}</code> not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back</Button>
      <PageHeader
        title="Request detail"
        breadcrumbs={[{ label: "Observe" }, { label: "Requests" }, { label: req.id ?? req.requestId }]}
        actions={<CopyButton value={req.id ?? req.requestId} label="Copy ID" />}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
        <MethodBadge method={req.method} />
        <code className="font-[family-name:var(--mono)] text-sm text-[var(--text)]">{req.endpoint ?? req.url}</code>
        <StatusCodeBadge code={req.statusCode} />
        <span className="ml-auto text-sm text-[var(--text2)]">{formatLatency(req.durationMs ?? req.latency)} · {formatBytes(req.responseSize)} · {formatAbsoluteTime(req.timestamp)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label="Service" value={req.service ?? req.metadata?.service} />
        <Meta label="Environment" value={req.environment ?? req.metadata?.environment} />
        <Meta label="Tenant" value={req.tenantId} />
        <Meta label="Request ID" value={req.requestId} />
      </div>

      <Tabs
        tabs={[
          { id: "headers", label: "Headers", content: <JsonViewer data={req.headers ?? req.attributes?.headers} /> },
          { id: "query", label: "Query", content: <JsonViewer data={req.query ?? req.attributes?.query ?? {}} /> },
          { id: "body", label: "Body", content: <JsonViewer data={req.body ?? req.attributes?.body ?? {}} /> },
          {
            id: "trace",
            label: "Linked trace",
            content: req.traceId ? (
              <SectionCard>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[var(--text2)]">Trace</div>
                    <code className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{req.traceId}</code>
                  </div>
                  <Link to={`/observability/traces/${req.traceId}`} className="text-sm text-[var(--brand)] hover:underline">View trace →</Link>
                </div>
              </SectionCard>
            ) : <div className="p-4 text-[var(--text2)]">No linked trace.</div>,
          },
          { id: "related-errors", label: "Errors", content: <RelatedTab resource="requests" id={req.id ?? req.requestId} relation="errors" /> },
          { id: "related-logs", label: "Logs", content: <RelatedTab resource="requests" id={req.id ?? req.requestId} relation="logs" /> },
          { id: "related-spans", label: "Spans", content: <RelatedTab resource="requests" id={req.id ?? req.requestId} relation="spans" /> },
          { id: "related-metrics", label: "Metrics", content: <RelatedTab resource="requests" id={req.id ?? req.requestId} relation="metrics" /> },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={eventDetail} /> },
        ]}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-3">
      <div className="text-[11px] uppercase tracking-wider text-[var(--text3)]">{label}</div>
      <div className="mt-1 truncate text-[13px] font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}
