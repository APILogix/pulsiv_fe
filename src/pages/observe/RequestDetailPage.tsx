import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useRequestEvent } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, MethodBadge, StatusCodeBadge, Tabs, JsonViewer,
  CopyButton, Button, formatLatency, formatBytes, formatAbsoluteTime,
} from "@/shared/observe";

export default function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();
  const { data: req, isLoading } = useRequestEvent(requestId);

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading request…</div>;
  if (!req) return <div className="p-8 text-[var(--text2)]">Request <code>{requestId}</code> not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back</Button>
      <PageHeader
        title="Request detail"
        breadcrumbs={[{ label: "Observe" }, { label: "Requests" }, { label: req.requestId }]}
        actions={<CopyButton value={req.requestId} label="Copy ID" />}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
        <MethodBadge method={req.method} />
        <code className="font-[family-name:var(--mono)] text-sm text-[var(--text)]">{req.url}</code>
        <StatusCodeBadge code={req.statusCode} />
        <span className="ml-auto text-sm text-[var(--text2)]">{formatLatency(req.latency)} · {formatBytes(req.responseSize)} · {formatAbsoluteTime(req.timestamp)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label="Service" value={req.metadata.service} />
        <Meta label="Environment" value={req.metadata.environment} />
        <Meta label="Tenant" value={req.tenantId} />
        <Meta label="Client IP" value={req.clientIp} />
      </div>

      <Tabs
        tabs={[
          { id: "headers", label: "Headers", content: <JsonViewer data={req.headers} /> },
          { id: "query", label: "Query", content: <JsonViewer data={req.query ?? {}} /> },
          { id: "body", label: "Body", content: <JsonViewer data={req.body ?? {}} /> },
          {
            id: "trace",
            label: "Linked trace",
            content: (
              <SectionCard>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[var(--text2)]">Trace</div>
                    <code className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{req.traceId}</code>
                  </div>
                  <Link to={`/observability/traces/${req.traceId}`} className="text-sm text-[var(--brand)] hover:underline">View trace →</Link>
                </div>
              </SectionCard>
            ),
          },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={req} /> },
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
