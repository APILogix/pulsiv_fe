import { Link } from "react-router";
import { Brain, ExternalLink, GitBranch, RefreshCw, AlertTriangle, Globe, Shield, Tag, Server, Check, Copy } from "lucide-react";
import { useState } from "react";
import {
  Button,
  MethodBadge,
  SeverityBadge,
  StatusCodeBadge,
  Timestamp,
  formatAbsoluteTime,
} from "@/shared/observe";
import { cn } from "@/lib/utils";
import { hasJsonValue, normalizeAiResponse, sectionDomId } from "./helpers";
import { EmptyInline, KeyValueGrid, SectionShell } from "./ui";
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
      title="Error Overview & Diagnosis"
      description="Core exception classification, runtime environment, and service routing."
    >
      <div className="flex flex-col gap-6">
        {/* Exception Hero Callout Card */}
        <div className="rounded-2xl border border-[var(--red)]/30 bg-[var(--red-bg)]/40 p-6 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <SeverityBadge severity={detail.error?.severity} />
            <span
              className={`rounded-full px-3 py-1 font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] ${
                detail.error?.handled
                  ? "bg-[var(--green-bg)] text-[var(--green)]"
                  : "bg-[var(--red)] text-[var(--red-fg)] shadow-xs"
              }`}
            >
              {detail.error?.handled ? "Handled Gracefully" : "Unhandled Exception"}
            </span>
            {detail.error?.mechanism && (
              <span className="rounded-md bg-[var(--bg2)] px-2.5 py-0.5 font-[family-name:var(--mono)] text-[11px] font-medium text-[var(--text2)]">
                Mechanism: {detail.error.mechanism}
              </span>
            )}
          </div>

          <div className="mt-3.5 font-[family-name:var(--mono)] text-[18px] font-bold text-[var(--red)] tracking-[-0.01em]">
            {errorName}
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text)] font-[family-name:var(--mono)] font-medium">
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
            { label: "Origin Service", value: detail.service, copyable: true },
            { label: "Server Node", value: serverName, mono: true, copyable: true },
            { label: "Release / Commit", value: detail.release, mono: true, copyable: true },
            { label: "SDK Client", value: detail.sdk ? `${detail.sdk.name}@${detail.sdk.version}` : null, mono: true },
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
      title="Call Stack & Source Context"
      description="Interactive call stack frames and code snippets captured when the exception was thrown."
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
      title="Event Breadcrumbs Timeline"
      description="Chronological telemetry trail recorded leading up to this exception."
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
        title="HTTP Transaction Context"
        description="HTTP request parameters, URL, and route pattern captured during error execution."
      >
        <EmptyInline message="No HTTP request details were attached to this error event." />
      </SectionShell>
    );
  }

  const extraQuery = (detail.extra as Record<string, unknown> | undefined)?.query;
  const queryEntries = hasJsonValue(extraQuery) && typeof extraQuery === "object" ? Object.entries(extraQuery as Record<string, unknown>) : [];

  return (
    <SectionShell
      id={sectionDomId("http")}
      title="HTTP Transaction Context"
      description="HTTP request parameters, URL, and route pattern captured during error execution."
      action={
        <div className="flex items-center gap-2">
          {http.method && <MethodBadge method={http.method} />}
          {http.statusCode && <StatusCodeBadge code={http.statusCode} />}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <KeyValueGrid
          columns={3}
          items={[
            { label: "HTTP Method", value: http.method, mono: true },
            { label: "Route Pattern", value: http.route, mono: true, copyable: true },
            { label: "Status Code", value: http.statusCode != null ? `${http.statusCode} ${http.statusText ?? ""}` : null, mono: true },
            { label: "Target URL", value: http.url, mono: true, copyable: true },
          ]}
        />

        {queryEntries.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)] border-b border-[var(--border)] pb-3">
              Captured Query Parameters ({queryEntries.length})
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {queryEntries.map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-[12px]"
                >
                  <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text2)]">
                    {key}
                  </span>
                  <span className="truncate font-[family-name:var(--mono)] text-[var(--text)]" title={String(val)}>
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

export function ContextSection({ detail }: { detail: ErrorDetailResponse }) {
  const ctx = (detail.context ?? {}) as Record<string, unknown>;
  const user = (ctx.user as Record<string, unknown> | string | undefined);
  const userStr = typeof user === "object" && user !== null
    ? ((user.id as string) ?? (user.email as string) ?? (user.username as string) ?? "Identified User")
    : (typeof user === "string" ? user : null);
  const session = (ctx.session as string | undefined) ?? null;
  const runtime = (ctx.runtime as string | undefined) ?? null;
  const os = (ctx.os as string | undefined) ?? null;

  return (
    <SectionShell
      id={sectionDomId("context")}
      title="Client & Execution Context"
      description="Authenticated user identity, session ID, server host, and client runtime platform."
    >
      <KeyValueGrid
        columns={3}
        items={[
          { label: "User ID / Account", value: userStr, mono: true, copyable: true },
          { label: "Session ID", value: session, mono: true, copyable: true },
          { label: "Execution Runtime", value: runtime, mono: true },
          { label: "Operating System", value: os },
          { label: "Server Node", value: typeof detail.server === "object" ? detail.server?.name : detail.server, mono: true },
          { label: "SDK Client", value: detail.sdk ? `${detail.sdk.name}@${detail.sdk.version}` : null, mono: true },
        ]}
      />
    </SectionShell>
  );
}

export function MetadataSection({ detail }: { detail: ErrorDetailResponse }) {
  const meta = detail.metadata;
  const extra = detail.extra;

  const metaEntries = hasJsonValue(meta) && typeof meta === "object" ? Object.entries(meta as Record<string, unknown>) : [];
  const extraEntries = hasJsonValue(extra) && typeof extra === "object" ? Object.entries(extra as Record<string, unknown>) : [];

  if (metaEntries.length === 0 && extraEntries.length === 0) {
    return (
      <SectionShell
        id={sectionDomId("metadata")}
        title="Custom Attributes & Extra Context"
        description="Custom attributes and extra telemetry metadata attached to this exception."
      >
        <EmptyInline message="No custom metadata or extra attributes were attached to this error." />
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id={sectionDomId("metadata")}
      title="Custom Attributes & Extra Context"
      description="Custom attributes and extra telemetry metadata attached to this exception."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {metaEntries.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                Telemetry Metadata ({metaEntries.length})
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

        {extraEntries.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                Extra Parameters ({extraEntries.length})
              </span>
              <Tag className="size-3.5 text-[var(--text3)]" />
            </div>
            <dl className="mt-3 space-y-2.5">
              {extraEntries.map(([key, val]) => (
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
  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    if (!parsed) return;
    const lines: string[] = [];
    if (parsed.summary) lines.push(`Summary: ${parsed.summary}\n`);
    if (parsed.rootCause) lines.push(`Root Cause: ${parsed.rootCause}\n`);
    if (parsed.recommendations.length > 0) {
      lines.push("Recommendations:");
      parsed.recommendations.forEach((r) => lines.push(`- ${r}`));
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <SectionShell
      id={sectionDomId("ai")}
      title="AI Root Cause Analysis"
      description="Automated investigation, likely root cause hypothesis, and suggested remediation."
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
            <div className="text-[15px] font-semibold text-[var(--text)]">No AI Root Cause Analysis Run Yet</div>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[var(--text3)]">
              Analyze exception stack frames, HTTP context, and breadcrumb patterns to pinpoint root cause.
            </p>
          </div>
          <Button
            variant="primary"
            className="gap-2 bg-[var(--ai)] text-[var(--ai-fg)] hover:opacity-90"
            onClick={onAnalyze}
            disabled={analyzing}
          >
            <Brain className="size-4" />
            {analyzing ? "Analyzing Stack & Context…" : "Analyze Root Cause with AI"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-xl border border-[var(--ai)]/30 bg-[var(--ai-bg)]/20 p-6">
          <div className="flex items-center justify-between border-b border-[var(--ai)]/20 pb-3">
            <div className="flex items-center gap-2 font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
              <Brain className="size-3.5 text-[var(--brand)]" />
              Automated Diagnosis Findings
            </div>
            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg1)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg2)] transition-colors cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-[var(--green)]" /> : <Copy className="size-3.5 text-[var(--text3)]" />}
              {copied ? "Copied" : "Copy Report"}
            </button>
          </div>

          {parsed.summary && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                Executive Summary
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text)]">{parsed.summary}</p>
            </div>
          )}

          {parsed.rootCause && (
            <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber-bg)]/30 p-4">
              <div className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--amber)]">
                Likely Root Cause
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text)] font-[family-name:var(--mono)] font-medium">
                {parsed.rootCause}
              </p>
            </div>
          )}

          {parsed.recommendations.length > 0 && (
            <div>
              <div className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                Recommended Remediation Steps
              </div>
              <ul className="mt-2 space-y-2 pl-5 text-[13.5px] leading-relaxed text-[var(--text)] list-disc">
                {parsed.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

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

export function RelatedSection({ detail }: { detail: ErrorDetailResponse }) {
  const issueId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const traceId = detail.trace?.publicId ?? detail.related?.trace?.publicId;
  const reqId = detail.request?.publicId ?? detail.related?.request?.publicId;
  const logCount = detail.related?.logs?.count ?? 0;

  return (
    <SectionShell
      id={sectionDomId("related")}
      title="Correlated Telemetry Resources"
      description="Direct linkages to correlated issue groups, HTTP requests, distributed traces, and log events."
    >
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <RelatedCard
          label="Issue Group"
          icon={AlertTriangle}
          href={issueId ? `/observability/error-groups/${encodeURIComponent(issueId)}` : null}
          primary={issueId ?? "No issue group"}
          secondary="Grouped occurrences of this exception"
          accent="text-[var(--amber)]"
        />

        <RelatedCard
          label="HTTP Request"
          icon={Globe}
          href={reqId ? `/observability/requests/${encodeURIComponent(reqId)}` : null}
          primary={reqId ?? "No correlated request"}
          secondary="Origin HTTP transaction"
          accent="text-[var(--blue)]"
        />

        <RelatedCard
          label="Correlated Trace"
          icon={GitBranch}
          href={traceId ? `/observability/traces/${encodeURIComponent(traceId)}` : null}
          primary={traceId ?? "No correlated trace"}
          secondary="Distributed waterfall execution"
          accent="text-[var(--violet)]"
        />

        <RelatedCard
          label="Correlated Logs"
          icon={Server}
          href={traceId ? `/observability/logs?trace=${encodeURIComponent(traceId)}` : null}
          primary={logCount === 1 ? "1 Related Log" : `${logCount} Related Logs`}
          secondary="Logs captured around this error"
          accent="text-[var(--cyan)]"
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
  icon: typeof AlertTriangle;
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

export function TagsSection({ detail }: { detail: ErrorDetailResponse }) {
  const tagsRaw = detail.tags;
  let tagPairs: { key: string; label?: string; value: string }[] = [];

  if (Array.isArray(tagsRaw)) {
    tagPairs = tagsRaw;
  } else if (tagsRaw && typeof tagsRaw === "object") {
    tagPairs = Object.entries(tagsRaw).map(([k, v]) => ({ key: k, label: k, value: String(v) }));
  }

  return (
    <SectionShell
      id={sectionDomId("tags")}
      title="Categorization Tags"
      description="Telemetry tags and indexing labels attached to this error event."
    >
      {tagPairs.length === 0 ? (
        <EmptyInline message="No tags recorded for this error." />
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {tagPairs.map((tag) => (
            <button
              key={`${tag.key}:${tag.value}`}
              type="button"
              title={`Copy ${tag.key}:${tag.value}`}
              onClick={() => navigator.clipboard?.writeText(`${tag.key}:${tag.value}`)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-1.5 text-[12.5px] transition-all hover:border-[var(--brand)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
            >
              <span className="text-[var(--text3)]">{tag.label ?? tag.key}</span>
              <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text)]">{tag.value}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11.5px] text-[var(--text3)]">Click any tag to copy its key:value pair to clipboard.</p>
    </SectionShell>
  );
}
