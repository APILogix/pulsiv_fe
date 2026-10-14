import { Link } from "react-router";
import { Bug, GitBranch, RefreshCw, ScrollText, Sparkles } from "lucide-react";
import {
  CopyButton,
  MethodBadge,
  Timestamp,
  formatAbsoluteTime,
  formatBytes,
  formatLatency,
} from "@/shared/observe";
import { aiButtonClass, ghostButtonClass } from "@/shared/observe/form";
import { cn } from "@/lib/utils";
import { normalizeAiResponse, sectionDomId } from "./helpers";
import { EmptyInline, KeyValueGrid, SectionShell } from "./ui";
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
    <SectionShell id={sectionDomId("overview")} title="Overview" description="Identity, routing, and where this request ran.">
      <KeyValueGrid
        columns={2}
        items={[
          { label: "Method", value: header.method, mono: true },
          { label: "URL", value: http.url ?? header.endpoint, mono: true, copyable: true },
          { label: "Route", value: header.endpoint, mono: true, copyable: true },
          { label: "Occurred", value: header.timestamp ? formatAbsoluteTime(header.timestamp) : null, mono: true },
          { label: "Environment", value: header.environment },
          { label: "Service", value: header.service, copyable: true },
          { label: "Release", value: header.release, mono: true, copyable: true },
          { label: "Project", value: header.project },
          { label: "Request ID", value: header.publicId, mono: true, copyable: true },
          { label: "Trace", value: header.tracePublicId, mono: true, copyable: true },
        ]}
      />
    </SectionShell>
  );
}

function entries(raw: unknown): Array<{ key: string; value: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

function PairTable({ title, rows, empty }: { title: string; rows: { key: string; value: string }[]; empty: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-medium text-[var(--text)]">
          {title} <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{rows.length}</span>
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="border-t border-[var(--border)] py-2.5 text-[12px] text-[var(--text3)]">{empty}</p>
      ) : (
        <dl className="sidebar-scroll max-h-72 overflow-y-auto border-t border-[var(--border)]">
          {rows.map((r) => (
            <div key={r.key} className="group grid grid-cols-[minmax(0,200px)_minmax(0,1fr)_20px] items-baseline gap-3 border-b border-[var(--border)] py-2">
              <dt className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]" title={r.key}>{r.key}</dt>
              <dd className="break-all font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{r.value}</dd>
              <CopyButton value={r.value} label="" className="h-5 w-5 justify-center border-0 p-0 text-[var(--text3)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function HttpSection({ http }: { http: RequestHttpDetail }) {
  const url = http.url ?? http.endpoint ?? "—";
  return (
    <SectionShell id={sectionDomId("http")} title="HTTP" description="Request line, query string, and headers as captured by the SDK.">
      <div className="flex flex-col gap-6">
        <div className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3">
          <MethodBadge method={http.method} />
          <code className="min-w-0 flex-1 break-all font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{url}</code>
          {url !== "—" && <CopyButton value={url} label="" className="h-6 w-6 justify-center border-0 p-0 text-[var(--text3)]" />}
        </div>
        <PairTable title="Query parameters" rows={entries(http.queryParameters)} empty="No query string on this request." />
        <div className="grid gap-6 lg:grid-cols-2">
          <PairTable title="Request headers" rows={entries(http.requestHeaders)} empty="No request headers were captured." />
          <PairTable title="Response headers" rows={entries(http.responseHeaders)} empty="No response headers were captured." />
        </div>
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
  const total = performance.totalDuration;
  return (
    <SectionShell
      id={sectionDomId("performance")}
      title="Performance"
      description="Where the time went. The span waterfall lives on the trace."
      action={
        performance.isSlow ? (
          <span className="rounded-[4px] bg-[var(--amber-bg)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--amber)]">Flagged slow</span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        {total != null && (
          <div>
            <div className="flex items-baseline justify-between text-[12px] text-[var(--text3)]">
              <span>Duration against a 1 s budget</span>
              <span className={cn("font-[family-name:var(--mono)] tabular-nums", total >= 1000 ? "text-[var(--red)]" : total >= 500 ? "text-[var(--amber)]" : "text-[var(--text)]")}>
                {formatLatency(total)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, (total / 1000) * 100)}%`, background: total >= 1000 ? "var(--red)" : total >= 500 ? "var(--amber)" : "var(--text2)" }}
              />
            </div>
          </div>
        )}
        <KeyValueGrid
          columns={3}
          items={[
            { label: "Duration", value: total == null ? null : formatLatency(total), mono: true },
            { label: "Request body", value: summary.requestSize == null ? null : formatBytes(summary.requestSize), mono: true },
            { label: "Response body", value: summary.responseSize == null ? null : formatBytes(summary.responseSize), mono: true },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p className="text-[13px] text-[var(--text2)]">
            {tracePublicId ? "Database queries, outbound calls, and internal spans for this request are on its trace." : "No distributed trace was correlated with this request."}
          </p>
          {tracePublicId && (
            <Link to={`/observability/traces/${encodeURIComponent(tracePublicId)}`} className={ghostButtonClass}>
              <GitBranch className="size-3.5 text-[var(--violet)]" aria-hidden="true" />
              Open span waterfall
            </Link>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

export function ContextSection({ context }: { context: RequestContextDetail }) {
  const geo = [context.geo?.country, context.geo?.region, context.geo?.asn != null ? `ASN ${context.geo.asn}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <SectionShell id={sectionDomId("context")} title="Client and runtime" description="Who called, from where, and what served it.">
      <KeyValueGrid
        columns={2}
        items={[
          { label: "User", value: context.user, mono: true, copyable: true },
          { label: "Session", value: context.session, mono: true, copyable: true },
          { label: "Tenant", value: context.tenant, mono: true, copyable: true },
          { label: "SDK", value: context.sdk, mono: true },
          { label: "Release", value: context.release, mono: true },
          { label: "Server", value: context.server, mono: true },
          { label: "Browser", value: context.browser },
          { label: "Operating system", value: context.os },
          { label: "Device", value: context.device },
          { label: "Location", value: geo || null },
        ]}
      />
    </SectionShell>
  );
}

export function MetadataSection({ metadata }: { metadata: RequestMetadataDetail }) {
  const attrs = entries(metadata?.attributes ?? {});
  const meta = entries(metadata?.metadata ?? {});

  return (
    <SectionShell id={sectionDomId("metadata")} title="Attributes" description="Custom key-value attributes and SDK metadata attached to this event.">
      {attrs.length === 0 && meta.length === 0 ? (
        <EmptyInline message="No custom attributes or SDK metadata were attached to this request." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PairTable title="Custom attributes" rows={attrs} empty="None attached." />
          <PairTable title="SDK metadata" rows={meta} empty="None attached." />
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
      title="AI analysis"
      description="Root cause and next steps from the request, its trace, and correlated telemetry."
      action={
        parsed ? (
          <button type="button" className={ghostButtonClass} onClick={onAnalyze} disabled={analyzing}>
            <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} aria-hidden="true" />
            {analyzing ? "Analyzing…" : "Run again"}
          </button>
        ) : undefined
      }
    >
      {!parsed ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[60ch] text-[13px] leading-[1.6] text-[var(--text2)]">
            No analysis yet. The model reads timing, status, payload sizes, and the correlated trace, then suggests a likely cause.
          </p>
          <button type="button" className={aiButtonClass} onClick={onAnalyze} disabled={analyzing}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            {analyzing ? "Analyzing…" : "Analyze request"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {parsed.summary && <p className="max-w-[80ch] text-[14px] leading-[1.65] text-[var(--text)]">{parsed.summary}</p>}
          {parsed.rootCause && (
            <div className="rounded-[var(--radius)] bg-[var(--amber-bg)] px-4 py-3">
              <h3 className="text-[12px] font-medium text-[var(--amber)]">Likely cause</h3>
              <p className="mt-1 text-[13px] leading-[1.6] text-[var(--text)]">{parsed.rootCause}</p>
            </div>
          )}
          {parsed.recommendations.length > 0 && (
            <div>
              <h3 className="text-[13px] font-medium text-[var(--text)]">Recommendations</h3>
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[13px] leading-[1.6] text-[var(--text2)] marker:font-[family-name:var(--mono)] marker:text-[var(--text3)]">
                {parsed.recommendations.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--text3)]">
            {parsed.confidence != null && (
              <span>
                Confidence{" "}
                <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--ai)]">
                  {Math.round(parsed.confidence <= 1 ? parsed.confidence * 100 : parsed.confidence)}%
                </span>
              </span>
            )}
            {parsed.generatedAt && <span>Generated <Timestamp value={parsed.generatedAt} /></span>}
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function RelatedRow({ icon: Icon, tone, label, primary, secondary, href }: {
  icon: typeof GitBranch;
  tone: string;
  label: string;
  primary: string;
  secondary?: string | null;
  href: string | null;
}) {
  const body = (
    <>
      <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden="true" />
      <span className="w-24 shrink-0 text-[12px] text-[var(--text3)]">{label}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{primary}</span>
        {secondary && <span className="block truncate text-[12px] text-[var(--text3)]">{secondary}</span>}
      </span>
    </>
  );
  return href ? (
    <Link to={href} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">{body}</Link>
  ) : (
    <div className="flex items-center gap-3 px-5 py-2.5">{body}</div>
  );
}

export function RelatedSection({ related }: { related: RequestRelatedDetail }) {
  return (
    <section id={sectionDomId("related")} className="min-w-0 scroll-mt-16 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      <div className="border-b border-[var(--border)] px-5 py-3.5">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Related</h2>
        <p className="mt-0.5 text-[12px] text-[var(--text3)]">The trace, errors, and logs from the same execution.</p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        <RelatedRow
          icon={GitBranch}
          tone="text-[var(--violet)]"
          label="Trace"
          primary={related.trace.publicId ?? "None correlated"}
          href={related.trace.publicId ? `/observability/traces/${encodeURIComponent(related.trace.publicId)}` : null}
        />
        {related.errors.length === 0 ? (
          <RelatedRow icon={Bug} tone="text-[var(--green)]" label="Errors" primary="None thrown" href={null} />
        ) : (
          related.errors.map((error) => (
            <RelatedRow
              key={error.publicId}
              icon={Bug}
              tone="text-[var(--red)]"
              label="Error"
              primary={error.publicId}
              secondary={error.message}
              href={`/observability/errors/${encodeURIComponent(error.publicId)}`}
            />
          ))
        )}
        <RelatedRow
          icon={ScrollText}
          tone="text-[var(--text2)]"
          label="Logs"
          primary={`${related.logs.count.toLocaleString()} ${related.logs.count === 1 ? "line" : "lines"}`}
          secondary={related.logs.count ? "in the same execution context" : null}
          href={related.logs.count ? "/observability/logs" : null}
        />
      </div>
    </section>
  );
}

export function TagsSection({ tags }: { tags: RequestTag[] }) {
  return (
    <SectionShell id={sectionDomId("tags")} title="Tags" description="Indexed tags. Select one to copy it as a search term.">
      {tags.length === 0 ? (
        <EmptyInline message="No tags were recorded for this request." />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={`${tag.key}:${tag.value}`}
              type="button"
              title={`Copy ${tag.key}:${tag.value}`}
              onClick={() => navigator.clipboard?.writeText(`${tag.key}:${tag.value}`)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[12px] transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)]"
            >
              <span className="text-[var(--text3)]">{tag.label}</span>
              <span className="font-[family-name:var(--mono)] text-[var(--text)]">{tag.value}</span>
            </button>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

