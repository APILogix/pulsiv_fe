import { Link } from "react-router";
import { Brain, ExternalLink, GitBranch, RefreshCw, AlertTriangle } from "lucide-react";
import {
  Button,
  MethodBadge,
  SeverityBadge,
  StatusCodeBadge,
  Timestamp,
  formatAbsoluteTime,
} from "@/shared/observe";
import { cn } from "@/lib/utils";
import { InteractiveJsonViewer } from "../request-detail/InteractiveJsonViewer";
import { hasJsonValue, normalizeAiResponse, sectionDomId } from "./helpers";
import { CollapsibleBlock, EmptyInline, KeyValueGrid, SectionShell } from "./ui";
import { StackTraceViewer } from "./StackTraceViewer";
import { BreadcrumbsTimeline } from "./BreadcrumbsTimeline";
import type { ErrorDetailResponse } from "./types";

export function OverviewSection({ detail }: { detail: ErrorDetailResponse }) {
  const errorName = detail.error?.name ?? "Error";
  const errorMessage = detail.error?.message ?? "No error message captured";
  const projectName = typeof detail.project === "object" ? detail.project?.name : detail.project;
  const serverName = typeof detail.server === "object" ? detail.server?.name : detail.server;
  const issuePublicId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;

  return (
    <SectionShell
      id={sectionDomId("overview")}
      title="Overview & Diagnosis"
      description="Core exception identity, severity classification, and environment metadata."
    >
      <div className="flex flex-col gap-4">
        {/* Exception Hero Callout */}
        <div className="rounded-[var(--radius)] border border-[var(--red)]/30 bg-[var(--red-bg)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={detail.error?.severity} />
            <span
              className={`rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] ${
                detail.error?.handled
                  ? "bg-[var(--green-bg)] text-[var(--green)]"
                  : "bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/40"
              }`}
            >
              {detail.error?.handled ? "Handled" : "Unhandled Exception"}
            </span>
            {detail.error?.mechanism && (
              <span className="rounded bg-[var(--bg3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] text-[var(--text2)]">
                {detail.error.mechanism}
              </span>
            )}
          </div>

          <div className="mt-2.5 font-[family-name:var(--mono)] text-[16px] font-semibold text-[var(--red)]">
            {errorName}
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--text)] font-[family-name:var(--mono)]">
            {errorMessage}
          </p>
        </div>

        {/* Identity & Metadata Grid */}
        <KeyValueGrid
          columns={3}
          items={[
            { label: "Error Public ID", value: detail.publicId, mono: true, copyable: true },
            { label: "Occurred At", value: detail.occurredAt ? formatAbsoluteTime(detail.occurredAt) : null, mono: true },
            { label: "Environment", value: detail.environment },
            { label: "Project", value: projectName },
            { label: "Service", value: detail.service, copyable: true },
            { label: "Server Node", value: serverName, mono: true, copyable: true },
            { label: "Release / Commit", value: detail.release, mono: true, copyable: true },
            { label: "SDK", value: detail.sdk ? `${detail.sdk.name}@${detail.sdk.version}` : null, mono: true },
            { label: "Correlated Issue", value: issuePublicId, mono: true, copyable: true },
            { label: "Correlated Request", value: detail.request?.publicId, mono: true, copyable: true },
            { label: "Correlated Trace", value: detail.trace?.publicId, mono: true, copyable: true },
          ]}
        />
      </div>
    </SectionShell>
  );
}

export function StackTraceSection({ detail }: { detail: ErrorDetailResponse }) {
  const frames = detail.debugging?.stackFrames ?? [];

  return (
    <SectionShell
      id={sectionDomId("stack-trace")}
      title="Stack Trace & Debugging"
      description="Call stack frames and code context captured when the exception was thrown."
    >
      <StackTraceViewer frames={frames} />
    </SectionShell>
  );
}

export function BreadcrumbsSection({ detail }: { detail: ErrorDetailResponse }) {
  const breadcrumbs = detail.debugging?.breadcrumbs ?? [];

  return (
    <SectionShell
      id={sectionDomId("breadcrumbs")}
      title="Breadcrumbs"
      description="Chronological event trail leading up to the error."
    >
      <BreadcrumbsTimeline breadcrumbs={breadcrumbs} />
    </SectionShell>
  );
}

export function HttpSection({ detail }: { detail: ErrorDetailResponse }) {
  const http = detail.http;
  if (!http) {
    return (
      <SectionShell
        id={sectionDomId("http")}
        title="HTTP & Route"
        description="HTTP request and route parameters captured when the exception occurred."
      >
        <EmptyInline message="No HTTP request details were attached to this error event." />
      </SectionShell>
    );
  }

  const extraQuery = (detail.extra as Record<string, unknown> | undefined)?.query;

  return (
    <SectionShell
      id={sectionDomId("http")}
      title="HTTP & Route"
      description="HTTP request parameters, URL, route pattern, and headers."
      action={
        <div className="flex items-center gap-2">
          {http.method && <MethodBadge method={http.method} />}
          {http.statusCode && <StatusCodeBadge code={http.statusCode} />}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <KeyValueGrid
          columns={3}
          items={[
            { label: "HTTP Method", value: http.method, mono: true },
            { label: "Route Pattern", value: http.route, mono: true, copyable: true },
            { label: "Status Code", value: http.statusCode != null ? `${http.statusCode} ${http.statusText ?? ""}` : null, mono: true },
            { label: "Full URL", value: http.url, mono: true, copyable: true },
          ]}
        />

        {hasJsonValue(extraQuery) && (
          <CollapsibleBlock title="Query Parameters" defaultOpen>
            <InteractiveJsonViewer data={extraQuery} />
          </CollapsibleBlock>
        )}
      </div>
    </SectionShell>
  );
}

export function ContextSection({ detail }: { detail: ErrorDetailResponse }) {
  const ctx = (detail.context ?? {}) as Record<string, unknown>;
  const user = (ctx.user as Record<string, unknown> | string | undefined);
  const userStr = typeof user === "object" && user !== null ? (user.id as string ?? user.email as string ?? JSON.stringify(user)) : (typeof user === "string" ? user : null);
  const session = (ctx.session as string | undefined) ?? null;
  const runtime = (ctx.runtime as string | undefined) ?? null;
  const os = (ctx.os as string | undefined) ?? null;

  return (
    <SectionShell
      id={sectionDomId("context")}
      title="Context & Environment"
      description="User, session, server node, runtime, and platform context."
    >
      <div className="flex flex-col gap-4">
        <KeyValueGrid
          columns={3}
          items={[
            { label: "User ID / Email", value: userStr, mono: true, copyable: true },
            { label: "Session ID", value: session, mono: true, copyable: true },
            { label: "Runtime", value: runtime, mono: true },
            { label: "Operating System", value: os },
            { label: "Server Node", value: typeof detail.server === "object" ? detail.server?.name : detail.server, mono: true },
            { label: "SDK Client", value: detail.sdk ? `${detail.sdk.name}@${detail.sdk.version}` : null, mono: true },
          ]}
        />

        {hasJsonValue(ctx) && (
          <CollapsibleBlock title="Full Context Object" defaultOpen>
            <InteractiveJsonViewer data={ctx} />
          </CollapsibleBlock>
        )}
      </div>
    </SectionShell>
  );
}

export function MetadataSection({ detail }: { detail: ErrorDetailResponse }) {
  const meta = detail.metadata;
  const extra = detail.extra;
  const hasMeta = hasJsonValue(meta);
  const hasExtra = hasJsonValue(extra);

  return (
    <SectionShell
      id={sectionDomId("metadata")}
      title="Metadata & Extra Payloads"
      description="Custom attributes, SDK metadata, and extra debug parameters."
    >
      {!hasMeta && !hasExtra ? (
        <EmptyInline message="No metadata or extra debugging payloads were captured for this error." />
      ) : (
        <div className="flex flex-col gap-4">
          {hasExtra && <InteractiveJsonViewer data={extra} title="Extra Parameters" defaultExpanded />}
          {hasMeta && <InteractiveJsonViewer data={meta} title="Metadata" defaultExpanded />}
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
      title="AI Root Cause Analysis"
      description="Automated investigation, likely root cause hypothesis, and suggested remediation."
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
          <Brain className="size-8 text-[var(--brand)]" />
          <div>
            <div className="text-[14px] font-medium text-[var(--text)]">No AI Root Cause Analysis yet</div>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--text3)]">
              Analyze exception stack frames, HTTP context, and breadcrumb patterns to pinpoint root cause.
            </p>
          </div>
          <Button variant="primary" onClick={onAnalyze} disabled={analyzing}>
            <Brain className="size-3.5" />
            {analyzing ? "Analyzing…" : "Analyze Root Cause"}
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
            <div className="rounded-[var(--radius)] border border-[var(--brand)]/30 bg-[var(--brand-bg)] p-3.5">
              <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--brand)] font-bold">Hypothesized Root Cause</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text)] font-[family-name:var(--mono)]">{parsed.rootCause}</p>
            </div>
          )}
          {parsed.recommendations.length > 0 && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Recommended Fixes</div>
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
                <span className="font-[family-name:var(--mono)] text-[var(--brand)] font-bold">
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

export function RelatedSection({ detail }: { detail: ErrorDetailResponse }) {
  const issueId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const traceId = detail.trace?.publicId ?? detail.related?.trace?.publicId;
  const reqId = detail.request?.publicId ?? detail.related?.request?.publicId;
  const logCount = detail.related?.logs?.count ?? 0;

  return (
    <SectionShell
      id={sectionDomId("related")}
      title="Related Telemetry"
      description="Direct references to correlated issue groups, HTTP requests, distributed traces, and log events."
    >
      <div className="flex flex-col gap-3">
        <RelatedRow
          label="Issue Group"
          href={issueId ? `/observability/error-groups/${encodeURIComponent(issueId)}` : null}
          primary={issueId ?? "No correlated issue group"}
          secondary={issueId ? "Grouped occurrences of this exception" : undefined}
          icon={AlertTriangle}
        />
        <RelatedRow
          label="Request"
          href={reqId ? `/observability/requests/${encodeURIComponent(reqId)}` : null}
          primary={reqId ?? "No correlated HTTP request"}
          secondary={reqId ? "The HTTP request during which this error occurred" : undefined}
          icon={ExternalLink}
        />
        <RelatedRow
          label="Trace"
          href={traceId ? `/observability/traces/${encodeURIComponent(traceId)}` : null}
          primary={traceId ?? "No correlated trace"}
          secondary={traceId ? "Distributed waterfall trace execution" : undefined}
          icon={GitBranch}
        />
        <RelatedRow
          label="Logs"
          href={traceId ? `/observability/logs?trace=${encodeURIComponent(traceId)}` : null}
          primary={logCount === 1 ? "1 related log" : `${logCount} related logs`}
          secondary="Logs captured around this event timestamp"
          icon={ExternalLink}
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
  icon: Icon,
}: {
  label: string;
  primary: string;
  secondary?: string;
  href: string | null;
  icon: typeof ExternalLink;
}) {
  const content = (
    <>
      <div className="w-24 shrink-0 font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-[family-name:var(--mono)] text-[13px] text-[var(--text)] flex items-center gap-1.5">
          <Icon className="size-3.5 text-[var(--brand)]" />
          {primary}
        </div>
        {secondary && <div className="mt-0.5 truncate text-[12px] text-[var(--text3)]">{secondary}</div>}
      </div>
      {href && <ExternalLink className="size-3.5 shrink-0 text-[var(--text3)]" />}
    </>
  );

  if (!href) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 opacity-75">
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

export function TagsSection({ detail }: { detail: ErrorDetailResponse }) {
  const tagsRaw = detail.tags;
  let tagPairs: { key: string; label?: string; value: string }[] = [];

  if (Array.isArray(tagsRaw)) {
    tagPairs = tagsRaw;
  } else if (tagsRaw && typeof tagsRaw === "object") {
    tagPairs = Object.entries(tagsRaw).map(([k, v]) => ({ key: k, label: k, value: String(v) }));
  }

  return (
    <SectionShell id={sectionDomId("tags")} title="Tags & Extra Metadata" description="Categorization tags as filterable chips.">
      {tagPairs.length === 0 ? (
        <EmptyInline message="No tags available for this error." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tagPairs.map((tag) => (
            <button
              key={`${tag.key}:${tag.value}`}
              type="button"
              title={`Copy ${tag.key}:${tag.value}`}
              onClick={() => navigator.clipboard?.writeText(`${tag.key}:${tag.value}`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[12px] transition-colors hover:border-[var(--text3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <span className="text-[var(--text3)]">{tag.label ?? tag.key}</span>
              <span className="font-[family-name:var(--mono)] text-[var(--text)]">{tag.value}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-[var(--text3)]">Click a tag to copy its key:value pair.</p>
    </SectionShell>
  );
}
