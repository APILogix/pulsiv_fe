import { Link } from "react-router";
import { Brain, ExternalLink, GitBranch, RefreshCw, ShieldCheck, Zap, Globe, Server, User, Tag } from "lucide-react";
import {
  Button,
  MethodBadge,
  StatusCodeBadge,
  Timestamp,
  formatAbsoluteTime,
  formatBytes,
  formatLatency,
} from "@/shared/observe";
import { cn } from "@/lib/utils";
import { hasJsonValue, normalizeAiResponse, sectionDomId } from "./helpers";
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
    <SectionShell
      id={sectionDomId("overview")}
      title="Request Overview"
      description="Identity, routing pattern, and runtime context for this HTTP transaction."
    >
      <KeyValueGrid
        columns={3}
        items={[
          { label: "HTTP Method", value: header.method, mono: true },
          { label: "Target URL", value: http.url ?? header.endpoint, mono: true, copyable: true },
          { label: "Route Pattern", value: header.endpoint, mono: true, copyable: true },
          { label: "Occurred At", value: header.timestamp ? formatAbsoluteTime(header.timestamp) : null, mono: true },
          { label: "Environment", value: header.environment },
          { label: "Target Service", value: header.service, copyable: true },
          { label: "Release Version", value: header.release, copyable: true },
          { label: "Project", value: header.project },
          { label: "Request Public ID", value: header.publicId, mono: true, copyable: true },
          { label: "Correlated Trace", value: header.tracePublicId, mono: true, copyable: true },
        ]}
      />
    </SectionShell>
  );
}

function parseHeaders(raw: unknown): Array<{ name: string; value: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).map(([name, value]) => ({
    name,
    value: typeof value === "string" ? value : String(value),
  }));
}

function parseQueryParams(raw: unknown): Array<{ key: string; value: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : String(value),
  }));
}

export function HttpSection({ http }: { http: RequestHttpDetail }) {
  const reqHeaders = parseHeaders(http.requestHeaders);
  const resHeaders = parseHeaders(http.responseHeaders);
  const queryParams = parseQueryParams(http.queryParameters);

  return (
    <SectionShell
      id={sectionDomId("http")}
      title="HTTP Transaction & Parameters"
      description="Structured HTTP transport attributes, query parameters, and negotiated headers."
      action={
        <div className="flex items-center gap-2">
          <MethodBadge method={http.method} />
          {http.endpoint && (
            <span className="max-w-[280px] truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
              {http.endpoint}
            </span>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Request line callout */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
            <span className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
              HTTP Target Endpoint
            </span>
            <span className="text-[11.5px] text-[var(--text3)]">Standard HTTP Protocol</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <MethodBadge method={http.method} />
            <span className="min-w-0 break-all font-[family-name:var(--mono)] text-[13.5px] font-semibold text-[var(--text)]">
              {http.url ?? http.endpoint ?? "—"}
            </span>
          </div>
        </div>

        {/* Query Parameters (Structured) */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
              Query Parameters ({queryParams.length})
            </span>
            <span className="text-[11px] text-[var(--text3)]">URL Query String</span>
          </div>

          {queryParams.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-[var(--text3)]">No query parameters attached to this request.</p>
          ) : (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {queryParams.map((param) => (
                <div
                  key={param.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-[12px]"
                >
                  <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text2)]">
                    {param.key}
                  </span>
                  <span className="truncate font-[family-name:var(--mono)] text-[var(--text)]" title={param.value}>
                    {param.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Headers Summary & Structured Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Request Headers */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                Inbound Headers ({reqHeaders.length})
              </span>
              <span className="text-[11px] text-[var(--text3)]">Client Headers</span>
            </div>
            {reqHeaders.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-[var(--text3)]">Standard headers recorded.</p>
            ) : (
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                {reqHeaders.map((h) => (
                  <div
                    key={h.name}
                    className="flex items-baseline justify-between gap-3 border-b border-[var(--border)]/50 pb-1.5 text-[12px] last:border-0"
                  >
                    <span className="font-[family-name:var(--mono)] text-[11.5px] font-medium text-[var(--text3)] shrink-0">
                      {h.name}
                    </span>
                    <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={h.value}>
                      {h.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Response Headers */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                Outbound Headers ({resHeaders.length})
              </span>
              <span className="text-[11px] text-[var(--text3)]">Server Headers</span>
            </div>
            {resHeaders.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-[var(--text3)]">Standard response headers recorded.</p>
            ) : (
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                {resHeaders.map((h) => (
                  <div
                    key={h.name}
                    className="flex items-baseline justify-between gap-3 border-b border-[var(--border)]/50 pb-1.5 text-[12px] last:border-0"
                  >
                    <span className="font-[family-name:var(--mono)] text-[11.5px] font-medium text-[var(--text3)] shrink-0">
                      {h.name}
                    </span>
                    <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={h.value}>
                      {h.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Payload Privacy Notice */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg1)] px-4 py-3 text-[12px] text-[var(--text3)]">
          <ShieldCheck className="size-4 shrink-0 text-[var(--green)]" />
          <span>
            Telemetry metadata and parameter schemas are captured securely. Raw request/response bodies are sanitized to protect sensitive user credentials and privacy.
          </span>
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
  return (
    <SectionShell
      id={sectionDomId("performance")}
      title="Performance & Timing Analysis"
      description="Request duration, transmission size, and direct link to distributed trace waterfall."
      action={
        performance.isSlow ? (
          <span className="rounded-full bg-[var(--amber-bg)] px-3 py-1 font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--amber)]">
            Slow Request
          </span>
        ) : (
          <span className="rounded-full bg-[var(--green-bg)] px-3 py-1 font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--green)]">
            Optimal Latency
          </span>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <KeyValueGrid
          columns={3}
          items={[
            {
              label: "Roundtrip Duration",
              value: performance.totalDuration == null ? null : formatLatency(performance.totalDuration),
              mono: true,
            },
            {
              label: "Inbound Payload Size",
              value: summary.requestSize == null ? null : formatBytes(summary.requestSize),
              mono: true,
            },
            {
              label: "Outbound Response Size",
              value: summary.responseSize == null ? null : formatBytes(summary.responseSize),
              mono: true,
            },
          ]}
        />

        {/* Trace Waterfall Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--violet)]/30 bg-[var(--violet-bg)]/20 p-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--violet-bg)] text-[var(--violet)]">
              <GitBranch className="size-5" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[var(--text)]">Distributed Span Waterfall</div>
              <div className="mt-0.5 text-[12.5px] text-[var(--text3)]">
                Inspect database queries, microservice RPCs, and internal spans for this request.
              </div>
            </div>
          </div>

          {tracePublicId ? (
            <Link
              to={`/observability/traces/${encodeURIComponent(tracePublicId)}`}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--violet)] px-4 text-[13px] font-semibold text-[var(--violet-fg)] transition-opacity hover:opacity-90 cursor-pointer"
            >
              Open Trace Execution
              <ExternalLink className="size-3.5" />
            </Link>
          ) : (
            <span className="text-[12px] text-[var(--text3)]">No distributed trace correlated</span>
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
    <SectionShell
      id={sectionDomId("context")}
      title="Client & Environment Context"
      description="Origin, caller identity, browser platform, and client device properties."
    >
      <KeyValueGrid
        columns={3}
        items={[
          { label: "Authenticated User", value: context.user, mono: true, copyable: true },
          { label: "Session ID", value: context.session, mono: true, copyable: true },
          { label: "Tenant Organization", value: context.tenant, mono: true, copyable: true },
          { label: "SDK Telemetry Client", value: context.sdk },
          { label: "Release / Tag", value: context.release },
          { label: "Server Node", value: context.server, mono: true },
          { label: "Browser Family", value: context.browser },
          { label: "Operating System", value: context.os },
          { label: "Device Classification", value: context.device },
          { label: "Geo Location", value: geo || null },
        ]}
      />
    </SectionShell>
  );
}

export function MetadataSection({ metadata }: { metadata: RequestMetadataDetail }) {
  const attributes = metadata?.attributes ?? {};
  const sdkMeta = metadata?.metadata ?? {};

  const attrEntries = Object.entries(attributes);
  const metaEntries = Object.entries(sdkMeta);

  if (attrEntries.length === 0 && metaEntries.length === 0) {
    return (
      <SectionShell
        id={sectionDomId("metadata")}
        title="Custom Attributes & Metadata"
        description="Application-specific key-value telemetry attributes attached to this event."
      >
        <EmptyInline message="No custom metadata or telemetry tags were attached to this request." />
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id={sectionDomId("metadata")}
      title="Custom Attributes & Metadata"
      description="Application-specific key-value telemetry attributes attached to this event."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {attrEntries.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                Custom Attributes ({attrEntries.length})
              </span>
              <Tag className="size-3.5 text-[var(--text3)]" />
            </div>
            <dl className="mt-3 space-y-2.5">
              {attrEntries.map(([key, val]) => (
                <div key={key} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <dt className="font-[family-name:var(--mono)] text-[11.5px] font-medium text-[var(--text3)]">
                    {key}
                  </dt>
                  <dd className="font-[family-name:var(--mono)] font-medium text-[var(--text)] truncate" title={String(val)}>
                    {String(val)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {metaEntries.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                SDK Metadata ({metaEntries.length})
              </span>
              <Server className="size-3.5 text-[var(--text3)]" />
            </div>
            <dl className="mt-3 space-y-2.5">
              {metaEntries.map(([key, val]) => (
                <div key={key} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <dt className="font-[family-name:var(--mono)] text-[11.5px] font-medium text-[var(--text3)]">
                    {key}
                  </dt>
                  <dd className="font-[family-name:var(--mono)] font-medium text-[var(--text)] truncate" title={String(val)}>
                    {String(val)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
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
      title="AI Root Cause & Diagnostic Insights"
      description="Automated root cause analysis, latency diagnosis, and architectural optimization."
      action={
        parsed ? (
          <Button variant="secondary" className="h-8 gap-1.5" onClick={onAnalyze} disabled={analyzing}>
            <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} />
            Re-run Analysis
          </Button>
        ) : undefined
      }
    >
      {!parsed ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--ai-bg)] text-[var(--ai)]">
            <Brain className="size-6" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-[var(--text)]">No AI Analysis Run Yet</div>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[var(--text3)]">
              Evaluate request timing, payload size, server status, and correlated telemetry to generate diagnostic findings.
            </p>
          </div>
          <Button
            variant="primary"
            className="gap-2 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90"
            onClick={onAnalyze}
            disabled={analyzing}
          >
            <Brain className="size-4" />
            {analyzing ? "Analyzing Telemetry…" : "Analyze with AI"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-xl border border-[var(--ai)]/30 bg-[var(--ai-bg)]/20 p-6">
          {/* Summary */}
          {parsed.summary && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                Executive Summary
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text)]">{parsed.summary}</p>
            </div>
          )}

          {/* Root Cause Hypothesis */}
          {parsed.rootCause && (
            <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber-bg)]/30 p-4">
              <div className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--amber)]">
                Likely Root Cause / Latency Driver
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text)] font-medium font-[family-name:var(--mono)]">
                {parsed.rootCause}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {parsed.recommendations.length > 0 && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                Actionable Recommendations
              </div>
              <ul className="mt-2 space-y-2 pl-5 text-[13.5px] leading-relaxed text-[var(--text)] list-disc">
                {parsed.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Confidence & Timing footer */}
          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--ai)]/20 pt-4 text-[12px] text-[var(--text3)]">
            {parsed.confidence != null && (
              <span>
                Model Confidence:{" "}
                <span className="font-[family-name:var(--mono)] font-semibold text-[var(--brand)]">
                  {Math.round(parsed.confidence <= 1 ? parsed.confidence * 100 : parsed.confidence)}%
                </span>
              </span>
            )}
            {parsed.generatedAt && (
              <span>
                Analyzed at <Timestamp value={parsed.generatedAt} />
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
      title="Correlated Telemetry Resources"
      description="Direct linkages to correlated distributed traces, thrown exception groups, and application logs."
    >
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <RelatedCard
          label="Correlated Trace"
          icon={GitBranch}
          href={related.trace.publicId ? `/observability/traces/${encodeURIComponent(related.trace.publicId)}` : null}
          primary={related.trace.publicId ?? "No correlated trace"}
          secondary="Full span execution waterfall"
          accent="text-[var(--violet)]"
        />

        {related.errors.length === 0 ? (
          <RelatedCard
            label="Related Errors"
            icon={Zap}
            href={null}
            primary="0 Errors Thrown"
            secondary="Request executed without unhandled errors"
            accent="text-[var(--green)]"
          />
        ) : (
          related.errors.map((error) => (
            <RelatedCard
              key={error.publicId}
              label="Correlated Error"
              icon={Zap}
              href={`/observability/errors/${encodeURIComponent(error.publicId)}`}
              primary={error.publicId}
              secondary={error.message}
              accent="text-[var(--red)]"
            />
          ))
        )}

        <RelatedCard
          label="Correlated Logs"
          icon={Server}
          href={related.trace.publicId ? `/observability/logs?trace=${encodeURIComponent(related.trace.publicId)}` : null}
          primary={related.logs.count === 1 ? "1 Correlated Log" : `${related.logs.count} Correlated Logs`}
          secondary="Log records in same execution context"
          accent="text-[var(--blue)]"
        />
      </div>
    </SectionShell>
  );
}

function RelatedCard({
  label,
  icon: Icon,
  primary,
  secondary,
  href,
  accent,
}: {
  label: string;
  icon: typeof GitBranch;
  primary: string;
  secondary?: string;
  href: string | null;
  accent?: string;
}) {
  const content = (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
          {label}
        </span>
        <Icon className={cn("size-4", accent ?? "text-[var(--text3)]")} />
      </div>
      <div className="mt-3">
        <div className="truncate font-[family-name:var(--mono)] text-[13.5px] font-semibold text-[var(--text)]">
          {primary}
        </div>
        {secondary && <div className="mt-1 truncate text-[12px] text-[var(--text3)]">{secondary}</div>}
      </div>
    </div>
  );

  if (!href) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/70">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] transition-all hover:border-[var(--brand)] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
    >
      {content}
    </Link>
  );
}

export function TagsSection({ tags }: { tags: RequestTag[] }) {
  return (
    <SectionShell
      id={sectionDomId("tags")}
      title="Categorization Tags"
      description="Filterable attribute chips and telemetry indexing keys."
    >
      {tags.length === 0 ? (
        <EmptyInline message="No tags recorded for this request." />
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {tags.map((tag) => (
            <button
              key={`${tag.key}:${tag.value}`}
              type="button"
              title={`Copy ${tag.label}`}
              onClick={() => navigator.clipboard?.writeText(`${tag.key}:${tag.value}`)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-1.5 text-[12.5px] transition-all hover:border-[var(--brand)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
            >
              <span className="text-[var(--text3)]">{tag.label}</span>
              <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text)]">{tag.value}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11.5px] text-[var(--text3)]">Click any tag to copy its key:value pair to clipboard.</p>
    </SectionShell>
  );
}
