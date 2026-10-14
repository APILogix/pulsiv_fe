import { Globe, GitBranch, Layers, ScrollText } from "lucide-react";
import { useState } from "react";
import { MethodBadge, StatusCodeBadge, formatAbsoluteTime } from "@/shared/observe";
import { ghostButtonClass } from "@/shared/observe/form";
import { hasJsonValue, normalizeAiResponse, sectionDomId } from "./helpers";
import { EmptyInline, KeyValueGrid, SectionShell } from "./ui";
import { StackTraceViewer } from "./StackTraceViewer";
import { BreadcrumbsTimeline } from "./BreadcrumbsTimeline";
import { AiAnalysisBody, AiRerunButton, PairTable, RelatedPanel, RelatedRow, TagChips, toPairs } from "../components/detail-kit";
import type { ErrorDetailResponse } from "./types";

export function OverviewSection({ detail }: { detail: ErrorDetailResponse }) {
  const projectName = typeof detail.project === "object" ? detail.project?.name : detail.project;
  const serverName = typeof detail.server === "object" ? detail.server?.name : detail.server;
  const issuePublicId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;

  return (
    <SectionShell id={sectionDomId("overview")} title="Overview" description="What was thrown, how it was caught, and where it ran.">
      <div className="flex flex-col gap-5">
        <div className="rounded-[var(--radius)] bg-[var(--red-bg)] px-4 py-3.5">
          <div className="font-[family-name:var(--mono)] text-[14px] font-medium text-[var(--red)]">{detail.error?.name ?? "Error"}</div>
          <p className="mt-1 break-words font-[family-name:var(--mono)] text-[13px] leading-[1.6] text-[var(--text)]">
            {detail.error?.message ?? "No message was captured."}
          </p>
          {detail.error?.mechanism && (
            <p className="mt-2 text-[12px] text-[var(--text2)]">
              Captured by <span className="font-[family-name:var(--mono)] text-[var(--text)]">{detail.error.mechanism}</span>
            </p>
          )}
        </div>
        <KeyValueGrid
          columns={2}
          items={[
            { label: "Error ID", value: detail.publicId, mono: true, copyable: true },
            { label: "Occurred", value: detail.occurredAt ? formatAbsoluteTime(detail.occurredAt) : null, mono: true },
            { label: "Environment", value: detail.environment },
            { label: "Project", value: projectName },
            { label: "Service", value: detail.service, copyable: true },
            { label: "Server", value: serverName, mono: true, copyable: true },
            { label: "Release", value: detail.release, mono: true, copyable: true },
            { label: "SDK", value: detail.sdk ? `${detail.sdk.name}@${detail.sdk.version}` : null, mono: true },
            { label: "Issue", value: issuePublicId, mono: true, copyable: true },
            { label: "Request", value: detail.request?.publicId, mono: true, copyable: true },
            { label: "Trace", value: detail.trace?.publicId, mono: true, copyable: true },
          ]}
        />
      </div>
    </SectionShell>
  );
}

export function StackTraceSection({ detail }: { detail: ErrorDetailResponse }) {
  return (
    <SectionShell id={sectionDomId("stack-trace")} title="Stack trace" description="Frames captured when the exception was thrown. Expand a frame for its source.">
      <StackTraceViewer frames={detail.debugging?.stackFrames ?? []} />
    </SectionShell>
  );
}

export function BreadcrumbsSection({ detail }: { detail: ErrorDetailResponse }) {
  return (
    <SectionShell id={sectionDomId("breadcrumbs")} title="Breadcrumbs" description="The trail of events the SDK recorded leading up to the error.">
      <BreadcrumbsTimeline breadcrumbs={detail.debugging?.breadcrumbs ?? []} />
    </SectionShell>
  );
}

export function HttpSection({ detail }: { detail: ErrorDetailResponse }) {
  const http = detail.http;
  if (!http) {
    return (
      <SectionShell id={sectionDomId("http")} title="HTTP" description="The request that was being served when the error was thrown.">
        <EmptyInline message="This error was not raised inside an HTTP request." />
      </SectionShell>
    );
  }
  const extraQuery = (detail.extra as Record<string, unknown> | undefined)?.query;
  const query = hasJsonValue(extraQuery) ? toPairs(extraQuery) : [];

  return (
    <SectionShell
      id={sectionDomId("http")}
      title="HTTP"
      description="The request that was being served when the error was thrown."
      action={
        <div className="flex items-center gap-1.5">
          {http.method && <MethodBadge method={http.method} />}
          {http.statusCode && <StatusCodeBadge code={http.statusCode} />}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <KeyValueGrid
          columns={2}
          items={[
            { label: "Method", value: http.method, mono: true },
            { label: "Route", value: http.route, mono: true, copyable: true },
            { label: "Status", value: http.statusCode != null ? `${http.statusCode} ${http.statusText ?? ""}`.trim() : null, mono: true },
            { label: "URL", value: http.url, mono: true, copyable: true },
          ]}
        />
        {query.length > 0 && <PairTable title="Query parameters" rows={query} empty="" />}
      </div>
    </SectionShell>
  );
}

export function ContextSection({ detail }: { detail: ErrorDetailResponse }) {
  const ctx = (detail.context ?? {}) as Record<string, unknown>;
  const user = ctx.user as Record<string, unknown> | string | undefined;
  const userStr = typeof user === "object" && user !== null
    ? ((user.id as string) ?? (user.email as string) ?? (user.username as string) ?? null)
    : typeof user === "string" ? user : null;

  return (
    <SectionShell id={sectionDomId("context")} title="Runtime and user" description="Who hit the error and what it ran on.">
      <KeyValueGrid
        columns={2}
        items={[
          { label: "User", value: userStr, mono: true, copyable: true },
          { label: "Session", value: (ctx.session as string | undefined) ?? null, mono: true, copyable: true },
          { label: "Runtime", value: (ctx.runtime as string | undefined) ?? null, mono: true },
          { label: "Operating system", value: (ctx.os as string | undefined) ?? null },
          { label: "Server", value: typeof detail.server === "object" ? detail.server?.name : detail.server, mono: true },
          { label: "SDK", value: detail.sdk ? `${detail.sdk.name}@${detail.sdk.version}` : null, mono: true },
        ]}
      />
    </SectionShell>
  );
}

export function MetadataSection({ detail }: { detail: ErrorDetailResponse }) {
  const meta = hasJsonValue(detail.metadata) ? toPairs(detail.metadata) : [];
  const extra = hasJsonValue(detail.extra) ? toPairs(detail.extra) : [];
  return (
    <SectionShell id={sectionDomId("metadata")} title="Attributes" description="SDK metadata and extra context attached when the error was captured.">
      {meta.length === 0 && extra.length === 0 ? (
        <EmptyInline message="No metadata or extra context was attached to this error." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PairTable title="Metadata" rows={meta} empty="None attached." />
          <PairTable title="Extra" rows={extra} empty="None attached." />
        </div>
      )}
    </SectionShell>
  );
}

export function AISection({ aiResponse, analyzing, onAnalyze }: { aiResponse: unknown; analyzing: boolean; onAnalyze: () => void }) {
  const parsed = normalizeAiResponse(aiResponse);
  const [copied, setCopied] = useState(false);

  const copyReport = () => {
    if (!parsed) return;
    const lines: string[] = [];
    if (parsed.summary) lines.push(`Summary: ${parsed.summary}`, "");
    if (parsed.rootCause) lines.push(`Likely cause: ${parsed.rootCause}`, "");
    if (parsed.recommendations.length) lines.push("Recommendations:", ...parsed.recommendations.map((r) => `- ${r}`));
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <SectionShell
      id={sectionDomId("ai")}
      title="AI analysis"
      description="Likely root cause and fixes from the stack, breadcrumbs, and HTTP context."
      action={
        parsed ? (
          <>
            <button type="button" className={ghostButtonClass} onClick={copyReport}>{copied ? "Copied" : "Copy report"}</button>
            <AiRerunButton analyzing={analyzing} onAnalyze={onAnalyze} />
          </>
        ) : undefined
      }
    >
      <AiAnalysisBody parsed={parsed} analyzing={analyzing} onAnalyze={onAnalyze} subject="error" reads="the stack frames, breadcrumbs, and HTTP context" />
    </SectionShell>
  );
}

export function RelatedSection({ detail }: { detail: ErrorDetailResponse }) {
  const issueId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const traceId = detail.trace?.publicId ?? detail.related?.trace?.publicId;
  const reqId = detail.request?.publicId ?? detail.related?.request?.publicId;
  const logCount = detail.related?.logs?.count ?? 0;

  return (
    <RelatedPanel id={sectionDomId("related")} description="The issue this error belongs to and the telemetry around it.">
      <RelatedRow icon={Layers} tone="text-[var(--red)]" label="Issue" primary={issueId ?? "Not grouped"} secondary={issueId ? "every occurrence of this fingerprint" : null} href={issueId ? `/observability/error-groups/${encodeURIComponent(issueId)}` : null} />
      <RelatedRow icon={Globe} tone="text-[var(--blue)]" label="Request" primary={reqId ?? "None correlated"} href={reqId ? `/observability/requests/${encodeURIComponent(reqId)}` : null} />
      <RelatedRow icon={GitBranch} tone="text-[var(--violet)]" label="Trace" primary={traceId ?? "None correlated"} href={traceId ? `/observability/traces/${encodeURIComponent(traceId)}` : null} />
      <RelatedRow
        icon={ScrollText}
        tone="text-[var(--text2)]"
        label="Logs"
        primary={`${logCount.toLocaleString()} ${logCount === 1 ? "line" : "lines"}`}
        secondary={logCount ? "captured around this error" : null}
        href={logCount ? "/observability/logs" : null}
      />
    </RelatedPanel>
  );
}

export function TagsSection({ detail }: { detail: ErrorDetailResponse }) {
  const raw = detail.tags;
  const tags: { key: string; label?: string; value: string }[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.entries(raw).map(([k, v]) => ({ key: k, label: k, value: String(v) }))
      : [];
  return (
    <SectionShell id={sectionDomId("tags")} title="Tags" description="Indexed tags. Select one to copy it as a search term.">
      <TagChips tags={tags} empty="No tags were recorded for this error." />
    </SectionShell>
  );
}
