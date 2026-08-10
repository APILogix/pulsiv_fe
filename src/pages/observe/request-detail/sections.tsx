import { Link } from "react-router";
import { Brain, ExternalLink, GitBranch, RefreshCw } from "lucide-react";
import {
  Button,
  MethodBadge,
  Timestamp,
  formatAbsoluteTime,
  formatBytes,
  formatLatency,
} from "@/shared/observe";
import { cn } from "@/lib/utils";
import { InteractiveJsonViewer } from "./InteractiveJsonViewer";
import { hasJsonValue, normalizeAiResponse, sectionDomId } from "./helpers";
import { CollapsibleBlock, EmptyInline, KeyValueGrid, SectionShell } from "./ui";
import type {
  RequestContextDetail,
  RequestDetailHeader,
  RequestDetailResponse,
  RequestHttpDetail,
  RequestMetadataDetail,
  RequestPerformanceDetail,
  RequestRelatedDetail,
  RequestTag,
} from "./types";

export function OverviewSection({ header, http }: { header: RequestDetailHeader; http: RequestHttpDetail }) {
  return (
    <SectionShell
      id={sectionDomId("overview")}
      title="Overview"
      description="Identity and routing for this request."
    >
      <KeyValueGrid
        columns={3}
        items={[
          { label: "Method", value: header.method, mono: true },
          { label: "URL", value: http.url, mono: true, copyable: true },
          { label: "Endpoint", value: header.endpoint, mono: true, copyable: true },
          { label: "Timestamp", value: header.timestamp ? formatAbsoluteTime(header.timestamp) : null, mono: true },
          { label: "Environment", value: header.environment },
          { label: "Service", value: header.service, copyable: true },
          { label: "Release", value: header.release, copyable: true },
          { label: "Project", value: header.project },
          { label: "Request public ID", value: header.publicId, mono: true, copyable: true },
          { label: "Trace public ID", value: header.tracePublicId, mono: true, copyable: true },
        ]}
      />
    </SectionShell>
  );
}

export function HttpSection({ http }: { http: RequestHttpDetail }) {
  return (
    <SectionShell
      id={sectionDomId("http")}
      title="HTTP"
      description="Request and response payload captured for this event."
      action={
        <div className="flex items-center gap-2">
          <MethodBadge method={http.method} />
          {http.endpoint && (
            <span className="max-w-[240px] truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
              {http.endpoint}
            </span>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Request</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MethodBadge method={http.method} />
              <span className="min-w-0 break-all font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                {http.url ?? http.endpoint ?? "—"}
              </span>
            </div>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Response</div>
            <div className="mt-2 text-[13px] text-[var(--text2)]">
              Body and headers are below. Status lives in the summary strip.
            </div>
          </div>
        </div>

        <CollapsibleBlock title="Request headers" empty={!hasJsonValue(http.requestHeaders)}>
          <InteractiveJsonViewer data={http.requestHeaders} />
        </CollapsibleBlock>
        <CollapsibleBlock title="Response headers" empty={!hasJsonValue(http.responseHeaders)}>
          <InteractiveJsonViewer data={http.responseHeaders} />
        </CollapsibleBlock>
        <CollapsibleBlock title="Query parameters" empty={!hasJsonValue(http.queryParameters)} defaultOpen={hasJsonValue(http.queryParameters)}>
          <InteractiveJsonViewer data={http.queryParameters} />
        </CollapsibleBlock>
        <CollapsibleBlock title="Route parameters" empty={!hasJsonValue(http.routeParameters)}>
          <InteractiveJsonViewer data={http.routeParameters} />
        </CollapsibleBlock>
        <CollapsibleBlock title="Request body" empty={!hasJsonValue(http.requestBody)} defaultOpen>
          <InteractiveJsonViewer data={http.requestBody} />
        </CollapsibleBlock>
        <CollapsibleBlock title="Response body" empty={!hasJsonValue(http.responseBody)} defaultOpen>
          <InteractiveJsonViewer data={http.responseBody} />
        </CollapsibleBlock>
      </div>
    </SectionShell>
  );
}

export function PerformanceSection({
  performance,
  summary,
  tracePublicId,
}: {
  performance: RequestPerformanceDetail;
  summary: RequestDetailResponse["summaryCards"];
  tracePublicId: string | null;
}) {
  return (
    <SectionShell
      id={sectionDomId("performance")}
      title="Performance"
      description="Request-level timing and size only. Spans and waterfalls live on Trace."
      action={
        performance.isSlow ? (
          <span className="rounded-full bg-[var(--amber-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--amber)]">
            Slow request
          </span>
        ) : undefined
      }
    >
      <KeyValueGrid
        columns={3}
        items={[
          {
            label: "Duration",
            value: performance.totalDuration == null ? null : formatLatency(performance.totalDuration),
            mono: true,
          },
          {
            label: "Request size",
            value: summary.requestSize == null ? null : formatBytes(summary.requestSize),
            mono: true,
          },
          {
            label: "Response size",
            value: summary.responseSize == null ? null : formatBytes(summary.responseSize),
            mono: true,
          },
        ]}
      />
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
        <GitBranch className="size-4 text-[var(--text3)]" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-[var(--text)]">Need the waterfall or span tree?</div>
          <div className="text-[12px] text-[var(--text3)]">Open the correlated trace for distributed timing.</div>
        </div>
        {tracePublicId ? (
          <Link
            to={`/observability/traces/${encodeURIComponent(tracePublicId)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] px-3 text-[13px] font-medium text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)]"
          >
            Open Trace
            <ExternalLink className="size-3.5" />
          </Link>
        ) : (
          <span className="text-[12px] text-[var(--text3)]">No trace linked</span>
        )}
      </div>
    </SectionShell>
  );
}

export function ContextSection({ context }: { context: RequestContextDetail }) {
  const geo = [context.geo.country, context.geo.region, context.geo.asn != null ? `ASN ${context.geo.asn}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <SectionShell id={sectionDomId("context")} title="Context" description="Who and where this request came from.">
      <KeyValueGrid
        columns={3}
        items={[
          { label: "User", value: context.user, mono: true, copyable: true },
          { label: "Session", value: context.session, mono: true, copyable: true },
          { label: "Tenant", value: context.tenant, mono: true, copyable: true },
          { label: "SDK", value: context.sdk },
          { label: "Release", value: context.release },
          { label: "Server", value: context.server },
          { label: "Browser", value: context.browser },
          { label: "OS", value: context.os },
          { label: "Device", value: context.device },
          { label: "Geo", value: geo || null },
        ]}
      />
    </SectionShell>
  );
}

export function MetadataSection({ metadata }: { metadata: RequestMetadataDetail }) {
  const hasAttrs = hasJsonValue(metadata.attributes);
  const hasMeta = hasJsonValue(metadata.metadata);

  return (
    <SectionShell id={sectionDomId("metadata")} title="Metadata" description="Custom attributes and SDK metadata.">
      {!hasAttrs && !hasMeta ? (
        <EmptyInline message="No attributes or metadata were returned for this request." />
      ) : (
        <div className="flex flex-col gap-4">
          {hasAttrs && <InteractiveJsonViewer data={metadata.attributes} title="Attributes" defaultExpanded />}
          {hasMeta && <InteractiveJsonViewer data={metadata.metadata} title="Metadata" defaultExpanded />}
        </div>
      )}
    </SectionShell>
  );
}

export function AISection({
  aiResponse,
  analyzing,
  onAnalyze,
}: {
  aiResponse: unknown;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  const parsed = normalizeAiResponse(aiResponse);

  return (
    <SectionShell
      id={sectionDomId("ai")}
      title="AI"
      description="Automated investigation for this request."
      action={
        parsed ? (
          <Button variant="secondary" className="h-8" onClick={onAnalyze} disabled={analyzing}>
            <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} />
            Re-run analysis
          </Button>
        ) : undefined
      }
    >
      {!parsed ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg)] px-6 py-10 text-center">
          <Brain className="size-8 text-[var(--text3)]" />
          <div>
            <div className="text-[14px] font-medium text-[var(--text)]">No AI analysis yet</div>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--text3)]">
              Generate a summary, likely root cause, and recommendations for this request.
            </p>
          </div>
          <Button variant="primary" onClick={onAnalyze} disabled={analyzing}>
            <Brain className="size-3.5" />
            {analyzing ? "Analyzing…" : "Analyze with AI"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {parsed.summary && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Summary</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text)]">{parsed.summary}</p>
            </div>
          )}
          {parsed.rootCause && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Root cause</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text)]">{parsed.rootCause}</p>
            </div>
          )}
          {parsed.recommendations.length > 0 && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Recommendations</div>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[var(--text)]">
                {parsed.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-4 border-t border-[var(--border)] pt-4 text-[12px] text-[var(--text3)]">
            {parsed.confidence != null && (
              <span>
                Confidence{" "}
                <span className="font-[family-name:var(--mono)] text-[var(--text2)]">
                  {Math.round(parsed.confidence <= 1 ? parsed.confidence * 100 : parsed.confidence)}%
                </span>
              </span>
            )}
            {parsed.generatedAt && (
              <span>
                Generated <Timestamp value={parsed.generatedAt} />
              </span>
            )}
          </div>
        </div>
      )}
    </SectionShell>
  );
}

export function RelatedSection({ related }: { related: RequestRelatedDetail }) {
  return (
    <SectionShell
      id={sectionDomId("related")}
      title="Related"
      description="Lightweight references — open each resource for full detail."
    >
      <div className="flex flex-col gap-3">
        <RelatedRow
          label="Trace"
          href={related.trace.publicId ? `/observability/traces/${encodeURIComponent(related.trace.publicId)}` : null}
          primary={related.trace.publicId ?? "No correlated trace"}
        />
        {related.errors.length === 0 ? (
          <RelatedRow label="Errors" href={null} primary="No related errors" />
        ) : (
          related.errors.map((error) => (
            <RelatedRow
              key={error.publicId}
              label="Error"
              href={`/observability/errors/${encodeURIComponent(error.publicId)}`}
              primary={error.publicId}
              secondary={error.message}
            />
          ))
        )}
        <RelatedRow
          label="Logs"
          href={related.trace.publicId ? `/observability/logs?trace=${encodeURIComponent(related.trace.publicId)}` : null}
          primary={related.logs.count === 1 ? "1 related log" : `${related.logs.count} related logs`}
        />
      </div>
    </SectionShell>
  );
}

function RelatedRow({
  label,
  primary,
  secondary,
  href,
}: {
  label: string;
  primary: string;
  secondary?: string;
  href: string | null;
}) {
  const content = (
    <>
      <div className="w-20 shrink-0 font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{primary}</div>
        {secondary && <div className="mt-0.5 truncate text-[12px] text-[var(--text3)]">{secondary}</div>}
      </div>
      {href && <ExternalLink className="size-3.5 shrink-0 text-[var(--text3)]" />}
    </>
  );

  if (!href) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      {content}
    </Link>
  );
}

export function TagsSection({ tags }: { tags: RequestTag[] }) {
  return (
    <SectionShell id={sectionDomId("tags")} title="Tags" description="Common attributes as filterable chips.">
      {tags.length === 0 ? (
        <EmptyInline message="No tags available for this request." />
      ) : (
        <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
            <button
              key={`${tag.key}:${tag.value}`}
              type="button"
              title={`Copy ${tag.label}`}
              onClick={() => navigator.clipboard?.writeText(`${tag.key}:${tag.value}`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[12px] transition-colors hover:border-[var(--text3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <span className="text-[var(--text3)]">{tag.label}</span>
              <span className="font-[family-name:var(--mono)] text-[var(--text)]">{tag.value}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-[var(--text3)]">Click a tag to copy its key:value pair.</p>
    </SectionShell>
  );
}
