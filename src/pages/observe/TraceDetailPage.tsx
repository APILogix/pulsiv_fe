import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useObservabilityDetail } from "./hooks/useObservabilityApi";
import { RelatedTab } from "./components/RelatedTab";
import { PageHeader, SectionCard, KpiCard, Tabs, JsonViewer, Button, CopyButton, formatLatency, DetailSkeleton } from "@/shared/observe";
import type { AggregatedSpanEvent } from "@/types/events";

const KIND_TONE: Record<string, string> = {
  server: "var(--get)", client: "var(--violet)", internal: "var(--green)",
  producer: "var(--amber)", consumer: "var(--blue)",
};

export default function TraceDetailPage() {
  const { traceId = "" } = useParams();
  const navigate = useNavigate();
  const { data: eventDetail, isLoading } = useObservabilityDetail<any>("traces", traceId);

  if (isLoading) return <DetailSkeleton />;
  const trace = eventDetail?.entity || eventDetail;
  if (!trace) return <div className="p-8 text-[var(--text2)]">Trace <code>{traceId}</code> not found.</div>;

  const rootSpan = trace.rootSpan ?? trace.spans_tree ?? null;
  const flat = rootSpan ? flatten(rootSpan, 0) : [];
  const maxEnd = flat.length > 0 ? Math.max(...flat.map((f) => f.span.endTime ?? f.span.duration ?? 0), 1) : 1;
  const totalDuration = trace.totalDurationMs ?? trace.totalDuration ?? trace.durationMs;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to traces</Button>
      <PageHeader
        title="Trace detail"
        breadcrumbs={[{ label: "Observe" }, { label: "Traces" }, { label: trace.traceId }]}
        actions={<CopyButton value={trace.traceId} label="Copy trace ID" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total duration" value={formatLatency(totalDuration)} />
        <KpiCard label="Spans" value={trace.spanCount} />
        <KpiCard label="Service" value={trace.service ?? trace.metadata?.service} />
        <KpiCard label="Status" value={trace.isPartial ? "Partial" : "Complete"} />
      </div>

      <Tabs
        tabs={[
          {
            id: "waterfall",
            label: "Waterfall",
            content: rootSpan ? (
              <SectionCard className="p-0">
                <div className="divide-y divide-[var(--border)]">
                  {flat.map(({ span, depth }) => {
                    const duration = span.duration ?? span.durationMs ?? 0;
                    const startTime = span.startTime ?? 0;
                    const left = (startTime / maxEnd) * 100;
                    const width = Math.max(1, (duration / maxEnd) * 100);
                    return (
                      <div key={span.spanId ?? Math.random()} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg2)]">
                        <div className="w-1/3 min-w-0" style={{ paddingLeft: depth * 16 }}>
                          <div className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={span.name}>{span.name}</div>
                          <div className="text-[11px] text-[var(--text3)]">{span.kind}</div>
                        </div>
                        <div className="relative h-5 flex-1 rounded bg-[var(--bg2)]">
                          <div className="absolute top-0 h-5 rounded" style={{ left: `${left}%`, width: `${width}%`, background: KIND_TONE[span.kind] ?? "var(--brand)", opacity: span.status === "error" ? 1 : 0.7 }} />
                        </div>
                        <span className="w-16 text-right text-[12px] tabular-nums text-[var(--text2)]">{duration}ms</span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            ) : <div className="p-4 text-[var(--text2)]">No span tree available for this trace.</div>,
          },
          {
            id: "tree",
            label: "Span tree",
            content: rootSpan ? (
              <SectionCard className="p-0">
                {flat.map(({ span, depth }) => (
                  <div key={span.spanId ?? Math.random()} className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2 last:border-0" style={{ paddingLeft: 16 + depth * 20 }}>
                    <span className="size-2 rounded-full" style={{ background: KIND_TONE[span.kind] }} />
                    <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{span.name}</span>
                    <span className="ml-auto text-[12px] tabular-nums text-[var(--text3)]">{span.duration ?? span.durationMs}ms · {span.status}</span>
                  </div>
                ))}
              </SectionCard>
            ) : <div className="p-4 text-[var(--text2)]">No span tree available.</div>,
          },
          { id: "related-spans", label: "Related Spans", content: <RelatedTab resource="traces" id={trace.id ?? trace.traceId} relation="spans" /> },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={eventDetail} /> },
        ]}
      />
    </div>
  );
}

function flatten(span: AggregatedSpanEvent | any, depth: number): { span: any; depth: number }[] {
  if (!span) return [];
  const children = span.children || [];
  return [{ span, depth }, ...children.flatMap((c: any) => flatten(c, depth + 1))];
}
