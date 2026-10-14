import React from "react";
import { Link } from "react-router";
import {
  ExternalLink,
  Globe,
  AlertTriangle,
  FileText,
  User,
  GitBranch,
  Shield,
  Layers,
} from "lucide-react";
import { CopyButton } from "@/shared/observe";
import { SectionShell, KeyValueGrid } from "./ui";
import { sectionDomId } from "./helpers";
import type { TraceDetailData } from "./types";

export function CorrelatedSignalsSection({ detail }: { detail: TraceDetailData }) {
  const entity = detail.entity;
  const correlations = detail.correlations;
  const requestId = entity.requestId || correlations?.requestId;
  const userId = entity.userId || correlations?.userId;
  const sessionId = entity.sessionId || correlations?.sessionId;

  const relatedErrors = detail.relatedErrors ?? [];
  const relatedLogs = detail.logs ?? [];
  const relatedRequests = detail.relatedRequests ?? [];

  return (
    <SectionShell
      id={sectionDomId("correlations")}
      title="Related"
      description="The request, errors, and logs that share this trace."
    >
      <div className="flex flex-col gap-6">
        {/* Core identity & context */}
        <KeyValueGrid
          columns={3}
          items={[
            { label: "Trace ID", value: entity.traceId, mono: true, copyable: true },
            { label: "Trace Public ID", value: detail.publicId || entity.publicId, mono: true, copyable: true },
            { label: "Root Span ID", value: entity.rootSpanId || entity.spanId, mono: true, copyable: true },
            { label: "Environment", value: entity.environment },
            { label: "Project", value: entity.projectName || entity.project },
            { label: "Service", value: entity.service, copyable: true },
            { label: "Release", value: entity.release, copyable: true },
            { label: "SDK Version", value: entity.sdkName ? `${entity.sdkName}@${entity.sdkVersion || ""}` : null },
            { label: "User ID", value: userId, mono: true, copyable: true },
            { label: "Session ID", value: sessionId, mono: true, copyable: true },
          ]}
        />

        {/* Linked Request Card */}
        {requestId && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--blue)]/30 bg-[var(--blue-bg)]/20 p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-[var(--blue-bg)] text-[var(--blue)]">
                <Globe className="size-4.5" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[var(--text)]">
                  Correlated HTTP Request
                </div>
                <div className="mt-0.5 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">
                  Request ID: {requestId}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <CopyButton value={requestId} label="Copy ID" className="h-9 px-3 text-[12px]" />
              <Link
                to={`/observability/requests/${encodeURIComponent(requestId)}`}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] bg-[var(--blue)] px-4 text-[13px] font-semibold text-[var(--bg)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                View Request
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Related Errors & Logs Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Related Errors */}
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--red)]">
                <AlertTriangle className="size-4" />
                <span>Correlated Errors ({relatedErrors.length})</span>
              </div>
              <span className="text-[11px] text-[var(--text3)]">Exceptions in Trace</span>
            </div>
            {relatedErrors.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-[var(--text3)]">No error events occurred during this trace.</p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--border)]">
                {relatedErrors.map((err: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 text-[12.5px]">
                    <div className="truncate font-[family-name:var(--mono)] font-medium text-[var(--text)] pr-3" title={err.message || err.name}>
                      {err.message || err.name || "Error Event"}
                    </div>
                    {err.publicId && (
                      <Link
                        to={`/observability/errors/${encodeURIComponent(err.publicId)}`}
                        className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)] underline-offset-2 hover:underline shrink-0"
                      >
                        {err.publicId}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Logs */}
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
                <FileText className="size-4 text-[var(--blue)]" />
                <span>Correlated Logs ({relatedLogs.length})</span>
              </div>
              <span className="text-[11px] text-[var(--text3)]">Telemetry Logs</span>
            </div>
            {relatedLogs.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-[var(--text3)]">No log messages attached to this trace.</p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--border)] max-h-60 overflow-y-auto">
                {relatedLogs.slice(0, 15).map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 text-[12px]">
                    <span className="truncate font-[family-name:var(--mono)] text-[var(--text2)] pr-3" title={log.message || log.name}>
                      {log.message || log.name}
                    </span>
                    <span className="rounded bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)] shrink-0">
                      {log.level || "info"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
