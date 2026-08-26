import React from "react";
import { Link } from "react-router";
import {
  ExternalLink,
  Globe,
  AlertTriangle,
  FileText,
  User,
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
      title="Correlated Signals & Context"
      description="Linked HTTP requests, error events, logs, user session, and platform attributes."
    >
      <div className="flex flex-col gap-5">
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
          <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded bg-[var(--blue-bg)] text-[var(--blue)]">
                <Globe className="size-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">
                  Correlated HTTP Request
                </div>
                <div className="font-mono text-[11.5px] text-[var(--text3)]">
                  Request ID: {requestId}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CopyButton value={requestId} label="Copy ID" />
              <Link
                to={`/observability/requests/${encodeURIComponent(requestId)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] px-3 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg2)]"
              >
                View Request
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Related Errors */}
        {relatedErrors.length > 0 && (
          <div className="rounded-[var(--radius)] border border-[var(--red)]/20 bg-[var(--bg)] p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--red)]">
              <AlertTriangle className="size-4" />
              Related Errors ({relatedErrors.length})
            </div>
            <div className="mt-3 divide-y divide-[var(--border)]">
              {relatedErrors.map((err: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 text-[12px]">
                  <div className="truncate font-mono text-[var(--text)]">
                    {err.message || err.name || "Error Event"}
                  </div>
                  {err.publicId && (
                    <Link
                      to={`/observability/errors/${encodeURIComponent(err.publicId)}`}
                      className="text-[var(--blue)] hover:underline"
                    >
                      {err.publicId}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Logs */}
        {relatedLogs.length > 0 && (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
              <FileText className="size-4" />
              Correlated Logs ({relatedLogs.length})
            </div>
            <div className="mt-3 divide-y divide-[var(--border)]">
              {relatedLogs.slice(0, 10).map((log: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 text-[12px]">
                  <span className="truncate font-mono text-[var(--text2)]">
                    {log.message || log.name}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text3)]">
                    {log.level || "info"}
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
