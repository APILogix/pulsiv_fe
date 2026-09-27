import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  X,
  Copy,
  Check,
  Database,
  Globe,
  Layers,
  Flame,
  AlertCircle,
  FileText,
  Terminal,
  ExternalLink,
  Code2,
  ArrowUpRight,
  Search,
  Server,
  CornerDownRight,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton, Button, Timestamp } from "@/shared/observe";
import { formatDurationMs, formatPercent } from "./helpers";
import type { SpanTreeNode } from "./types";

interface SpanDetailDrawerProps {
  span: SpanTreeNode | null;
  onClose: () => void;
  traceId?: string;
  tracePublicId?: string;
  environment?: string;
  onSelectSpanId?: (spanId: string) => void;
}

type DrawerTab = "overview" | "database" | "attributes" | "events" | "correlations" | "raw";

export function SpanDetailDrawer({
  span,
  onClose,
  traceId,
  tracePublicId,
  environment,
  onSelectSpanId,
}: SpanDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [attrSearch, setAttrSearch] = useState("");
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  if (!span) return null;

  const rawSpan = span.span;
  const isDb =
    span.kind.includes("db") ||
    Boolean(rawSpan.dbSystem) ||
    Boolean(rawSpan.dbStatement) ||
    span.name.startsWith("db.");

  const isHttp =
    span.kind.includes("http") ||
    span.kind.includes("client") ||
    Boolean(rawSpan.httpMethod);

  // Extract structured attributes
  const allAttributes: Record<string, unknown> = {
    ...(rawSpan.attributes ?? {}),
    ...(rawSpan.metadata ?? {}),
    ...(rawSpan.dbSystem ? { "db.system": rawSpan.dbSystem } : {}),
    ...(rawSpan.dbName ? { "db.name": rawSpan.dbName } : {}),
    ...(rawSpan.dbOperation ? { "db.operation": rawSpan.dbOperation } : {}),
    ...(rawSpan.dbCollection ? { "db.collection": rawSpan.dbCollection } : {}),
    ...(rawSpan.dbStatement ? { "db.statement": rawSpan.dbStatement } : {}),
    ...(rawSpan.netPeerIp ? { "net.peer.ip": rawSpan.netPeerIp } : {}),
    ...(rawSpan.netPeerPort ? { "net.peer.port": rawSpan.netPeerPort } : {}),
    ...(rawSpan.httpMethod ? { "http.method": rawSpan.httpMethod } : {}),
    ...(rawSpan.httpStatusCode ? { "http.status_code": rawSpan.httpStatusCode } : {}),
    ...(rawSpan.httpUrl ? { "http.url": rawSpan.httpUrl } : {}),
    ...(rawSpan.httpRoute ? { "http.route": rawSpan.httpRoute } : {}),
    ...(rawSpan.service ? { "service.name": rawSpan.service } : {}),
  };

  const attributeEntries = Object.entries(allAttributes);

  const filteredAttributes = attributeEntries.filter(([k, v]) => {
    if (!attrSearch.trim()) return true;
    const q = attrSearch.toLowerCase();
    return k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q);
  });

  const handleCopyQuery = () => {
    const q = rawSpan.dbStatement || (allAttributes["db.statement"] as string) || "";
    if (!q) return;
    navigator.clipboard.writeText(typeof q === "string" ? q : JSON.stringify(q, null, 2));
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 1800);
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(JSON.stringify(rawSpan, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 1800);
  };

  const kindBadgeStyle = isDb
    ? "bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber)]/30"
    : isHttp
    ? "bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue)]/30"
    : "bg-[var(--violet-bg)] text-[var(--violet)] border-[var(--violet)]/30";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col border-l border-[var(--border)] bg-[var(--bg1)] shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--border)] p-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-bold uppercase tracking-wider",
                  kindBadgeStyle,
                )}
              >
                {isDb ? "DATABASE" : isHttp ? "HTTP" : span.kind}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] font-semibold",
                  span.hasError
                    ? "bg-[var(--red-bg)] text-[var(--red)]"
                    : "bg-[var(--green-bg)] text-[var(--green)]",
                )}
              >
                <span className={cn("size-1.5 rounded-full", span.hasError ? "bg-[var(--red)]" : "bg-[var(--green)]")} />
                {span.status.toUpperCase()}
              </span>
              {span.isBottleneck && (
                <span className="flex items-center gap-1 rounded-full bg-[var(--amber-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--amber)]">
                  <Flame className="size-3" />
                  Bottleneck
                </span>
              )}
            </div>
            <h2
              className="truncate font-[family-name:var(--mono)] text-[16px] font-bold text-[var(--text)]"
              title={span.name}
            >
              {span.name}
            </h2>
            <div className="flex items-center gap-2 text-[12px] text-[var(--text3)]">
              <span>{rawSpan.service || "default-service"}</span>
              <span>·</span>
              <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text2)]">
                {formatDurationMs(span.durationMs)}
              </span>
              <span>·</span>
              <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                +{formatDurationMs(span.startOffsetMs)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <CopyButton value={span.spanId} label="Copy ID" className="h-8 px-2.5 text-[11px]" />
            <Button
              variant="ghost"
              className="size-8 p-0 text-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex shrink-0 border-b border-[var(--border)] bg-[var(--bg2)]/40 px-5 text-[12px]">
          {[
            { id: "overview", label: "Overview" },
            ...(isDb ? [{ id: "database", label: "Database 🍃" }] : []),
            { id: "attributes", label: `Attributes (${attributeEntries.length})` },
            { id: "events", label: "Events & Errors" },
            { id: "correlations", label: "Correlations" },
            { id: "raw", label: "Raw JSON" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DrawerTab)}
              className={cn(
                "border-b-2 px-3 py-2.5 font-medium transition-colors cursor-pointer",
                activeTab === tab.id
                  ? "border-[var(--brand)] text-[var(--brand)] font-semibold"
                  : "border-transparent text-[var(--text3)] hover:text-[var(--text)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="sidebar-scroll flex-1 overflow-y-auto p-5 text-[13px]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-5">
              {/* Database quick banner if DB span */}
              {isDb && (
                <div className="flex items-center justify-between rounded-xl border border-[var(--amber)]/30 bg-[var(--amber-bg)]/40 p-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Database className="size-4 shrink-0 text-[var(--amber)]" />
                    <div className="min-w-0">
                      <div className="font-medium text-[12px] text-[var(--amber)]">
                        Database Telemetry Available
                      </div>
                      <div className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text2)]">
                        {rawSpan.dbOperation || "query"} on {rawSpan.dbCollection || rawSpan.dbName || "database"}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-7 shrink-0 text-[11px] px-2.5 font-medium"
                    onClick={() => setActiveTab("database")}
                  >
                    View Query →
                  </Button>
                </div>
              )}

              {/* Timing KPI grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-3">
                  <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider text-[var(--text3)]">
                    Total Duration
                  </div>
                  <div className="mt-1 font-[family-name:var(--mono)] text-[15px] font-bold text-[var(--text)]">
                    {formatDurationMs(span.durationMs)}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-[var(--text3)]">
                    Wall-clock execution
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--violet)]/30 bg-[var(--violet-bg)]/20 p-3">
                  <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider text-[var(--violet)]">
                    Self / Compute Time
                  </div>
                  <div className="mt-1 font-[family-name:var(--mono)] text-[15px] font-bold text-[var(--violet)]">
                    {formatDurationMs(span.selfDurationMs)}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-[var(--violet)]/80 font-medium">
                    {formatPercent(span.durationMs > 0 ? (span.selfDurationMs / span.durationMs) * 100 : 100)} of span
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-3">
                  <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider text-[var(--text3)]">
                    Timeline Offset
                  </div>
                  <div className="mt-1 font-[family-name:var(--mono)] text-[15px] font-bold text-[var(--text)]">
                    +{formatDurationMs(span.startOffsetMs)}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-[var(--text3)]">
                    {formatPercent(span.offsetPercent)} into trace
                  </div>
                </div>
              </div>

              {/* Execution Attribution Card for Parent Spans */}
              {span.children.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
                  <div className="flex items-center justify-between text-[11px] mb-2 font-medium">
                    <span className="text-[var(--text3)]">Span Execution Breakdown</span>
                    <span className="font-[family-name:var(--mono)] text-[var(--text)]">
                      {formatDurationMs(span.durationMs)} Total
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg3)] flex">
                    <div
                      style={{ width: `${Math.max(1, (span.selfDurationMs / Math.max(1, span.durationMs)) * 100)}%` }}
                      className="h-full bg-[var(--violet)]"
                      title={`Internal Compute: ${formatDurationMs(span.selfDurationMs)}`}
                    />
                    <div
                      style={{ width: `${Math.max(1, ((span.durationMs - span.selfDurationMs) / Math.max(1, span.durationMs)) * 100)}%` }}
                      className="h-full bg-[var(--amber)]"
                      title={`Child I/O Operations: ${formatDurationMs(Math.max(0, span.durationMs - span.selfDurationMs))}`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-[var(--violet)]">
                      <span className="size-2 rounded-full bg-[var(--violet)]" />
                      <span>Internal Calculation: {formatDurationMs(span.selfDurationMs)} ({formatPercent((span.selfDurationMs / Math.max(1, span.durationMs)) * 100)})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--amber)]">
                      <span className="size-2 rounded-full bg-[var(--amber)]" />
                      <span>Child Calls: {formatDurationMs(Math.max(0, span.durationMs - span.selfDurationMs))} ({formatPercent(((span.durationMs - span.selfDurationMs) / Math.max(1, span.durationMs)) * 100)})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* High Internal Calculation Notice */}
              {span.selfDurationMs > 100 && (span.selfDurationMs / span.durationMs) > 0.6 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[var(--violet)]/35 bg-[var(--violet-bg)]/25 p-3.5 text-[12px]">
                  <Cpu className="size-4 shrink-0 text-[var(--violet)] mt-0.5" />
                  <div className="flex flex-col gap-0.5 text-[var(--text2)]">
                    <strong className="text-[var(--text)]">
                      High Internal Calculation Time ({formatPercent((span.selfDurationMs / span.durationMs) * 100)} of span):
                    </strong>
                    <span className="leading-relaxed">
                      This operation spent {formatDurationMs(span.selfDurationMs)} executing local CPU calculations, business logic, bcrypt hashing, or serialization rather than waiting on database or network I/O.
                    </span>
                  </div>
                </div>
              )}

              {/* Execution Details Table */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/30 overflow-hidden">
                <div className="border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2 font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Span Identity & Execution Context
                </div>
                <div className="divide-y divide-[var(--border)]">
                  <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                    <span className="font-medium text-[12px] text-[var(--text3)]">Operation Name</span>
                    <span className="font-[family-name:var(--mono)] font-semibold text-[12px] text-[var(--text)] truncate">
                      {span.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                    <span className="font-medium text-[12px] text-[var(--text3)]">Span ID</span>
                    <div className="flex items-center justify-between min-w-0">
                      <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)] truncate">
                        {span.spanId}
                      </code>
                      <CopyButton value={span.spanId} className="h-6 px-1.5 text-[10px]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                    <span className="font-medium text-[12px] text-[var(--text3)]">Trace ID</span>
                    <div className="flex items-center justify-between min-w-0">
                      <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)] truncate">
                        {rawSpan.traceId || traceId}
                      </code>
                      <CopyButton value={rawSpan.traceId || traceId || ""} className="h-6 px-1.5 text-[10px]" />
                    </div>
                  </div>

                  {span.parentSpanId && (
                    <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                      <span className="font-medium text-[12px] text-[var(--text3)]">Parent Span</span>
                      <div className="flex items-center justify-between min-w-0">
                        <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)] truncate">
                          {span.parentSpanId}
                        </code>
                        {onSelectSpanId && (
                          <button
                            type="button"
                            onClick={() => onSelectSpanId(span.parentSpanId!)}
                            className="inline-flex items-center gap-1 text-[11px] text-[var(--brand)] hover:underline cursor-pointer ml-2"
                          >
                            Jump to parent <ArrowUpRight className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                    <span className="font-medium text-[12px] text-[var(--text3)]">Service</span>
                    <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                      {rawSpan.service || "default-service"}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                    <span className="font-medium text-[12px] text-[var(--text3)]">Environment</span>
                    <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                      {rawSpan.environment || environment || "production"}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                    <span className="font-medium text-[12px] text-[var(--text3)]">Start Timestamp</span>
                    <span className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                      {rawSpan.startTime || rawSpan.occurredAt}
                    </span>
                  </div>

                  {rawSpan.endTime && (
                    <div className="grid grid-cols-[140px_1fr] items-center px-4 py-2.5">
                      <span className="font-medium text-[12px] text-[var(--text3)]">End Timestamp</span>
                      <span className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                        {rawSpan.endTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATABASE INTELLIGENCE */}
          {activeTab === "database" && isDb && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-[var(--amber)]" />
                    <span className="font-[family-name:var(--mono)] text-[12px] font-bold uppercase tracking-wider text-[var(--text)]">
                      {rawSpan.dbSystem || "Database"} Intelligence
                    </span>
                  </div>
                  {rawSpan.dbOperation && (
                    <span className="rounded bg-[var(--amber-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[11px] font-bold text-[var(--amber)] uppercase">
                      {rawSpan.dbOperation}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <span className="text-[var(--text3)]">Target Collection / Table:</span>
                    <div className="mt-0.5 font-[family-name:var(--mono)] font-semibold text-[var(--text)]">
                      {rawSpan.dbCollection || rawSpan.dbName || "unknown"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text3)]">Target Host:</span>
                    <div className="mt-0.5 font-[family-name:var(--mono)] text-[var(--text2)]">
                      {rawSpan.netPeerIp ? `${rawSpan.netPeerIp}:${rawSpan.netPeerPort || 27017}` : "159.41.196.119:27017"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formatted Query Text Card */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Code2 className="size-3.5 text-[var(--brand)]" />
                    <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text)]">
                      Executed Query Statement
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyQuery}
                    className="inline-flex items-center gap-1 rounded border border-[var(--border2)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text2)] hover:text-[var(--text)] cursor-pointer"
                  >
                    {copiedQuery ? <Check className="size-3 text-[var(--green)]" /> : <Copy className="size-3" />}
                    <span>{copiedQuery ? "Copied" : "Copy Query"}</span>
                  </button>
                </div>
                <div className="p-4">
                  <pre className="font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text)] whitespace-pre-wrap break-all overflow-x-auto">
                    {rawSpan.dbStatement || (allAttributes["db.statement"] as string) || "No query statement recorded for this span."}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTRIBUTES */}
          {activeTab === "attributes" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-[var(--text3)]" />
                  <input
                    type="text"
                    placeholder="Search attributes by key or value…"
                    value={attrSearch}
                    onChange={(e) => setAttrSearch(e.target.value)}
                    className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(allAttributes, null, 2))}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-2.5 text-[11.5px] font-medium text-[var(--text)] hover:bg-[var(--border)] cursor-pointer"
                >
                  <Copy className="size-3" />
                  <span>Copy JSON</span>
                </button>
              </div>

              {filteredAttributes.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[var(--text3)]">
                  No attributes match your search.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--bg2)]/20 overflow-hidden">
                  {filteredAttributes.map(([key, value]) => {
                    const isObj = typeof value === "object" && value !== null;
                    const displayValue = isObj ? JSON.stringify(value, null, 2) : String(value);

                    return (
                      <div key={key} className="flex flex-col gap-1 p-3 transition-colors hover:bg-[var(--bg2)]/40">
                        <div className="flex items-center justify-between">
                          <span className="font-[family-name:var(--mono)] text-[11.5px] font-semibold text-[var(--text2)]">
                            {key}
                          </span>
                          <span className="font-[family-name:var(--mono)] text-[9.5px] text-[var(--text3)] uppercase">
                            {Array.isArray(value) ? "array" : typeof value}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {isObj ? (
                            <pre className="rounded-md bg-[var(--bg)] p-2 font-[family-name:var(--mono)] text-[11px] text-[var(--text)] whitespace-pre-wrap break-all border border-[var(--border)]">
                              {displayValue}
                            </pre>
                          ) : (
                            <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)] break-all">
                              {displayValue}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EVENTS & ERRORS */}
          {activeTab === "events" && (
            <div className="flex flex-col gap-4">
              {span.hasError && (
                <div className="rounded-xl border border-[var(--red)]/40 bg-[var(--red-bg)]/30 p-4">
                  <div className="flex items-center gap-2 text-[var(--red)] font-semibold text-[13px]">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Error Encountered in Span</span>
                  </div>
                  <div className="mt-2 font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                    Status: <span className="text-[var(--red)] font-semibold">{span.status}</span>
                  </div>
                  {rawSpan.httpStatusCode && (
                    <div className="mt-1 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                      HTTP Status Code: {rawSpan.httpStatusCode}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamped events list */}
              {rawSpan.events && rawSpan.events.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Recorded Span Events ({rawSpan.events.length})
                  </span>
                  <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--bg2)]/20 overflow-hidden">
                    {rawSpan.events.map((evt, idx) => (
                      <div key={idx} className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-[family-name:var(--mono)] text-[12px] font-bold text-[var(--text)]">
                            {String(evt.name || "Event")}
                          </span>
                          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                            {String(evt.time || evt.timestamp || "")}
                          </span>
                        </div>
                        {Boolean(evt.attributes) && (
                          <pre className="mt-2 rounded bg-[var(--bg)] p-2 font-[family-name:var(--mono)] text-[11px] text-[var(--text2)] border border-[var(--border)] whitespace-pre-wrap">
                            {JSON.stringify(evt.attributes, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/20 p-8 text-center text-[12.5px] text-[var(--text3)]">
                  No timestamped events or exceptions recorded for this span.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CORRELATIONS */}
          {activeTab === "correlations" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/30 p-4">
                <div className="font-semibold text-[13px] text-[var(--text)]">
                  Cross-Telemetry Navigation
                </div>
                <p className="mt-1 text-[12px] text-[var(--text3)]">
                  Jump directly to related signals correlated by trace ID and span context.
                </p>

                <div className="mt-4 flex flex-col gap-2.5">
                  {/* Related Logs */}
                  <Link
                    to={`/observability/logs?traceId=${encodeURIComponent(rawSpan.traceId || traceId || "")}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[12.5px] font-medium text-[var(--text)] hover:border-[var(--brand)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-[var(--cyan)]" />
                      <span>View Correlated Logs for Trace</span>
                    </div>
                    <ExternalLink className="size-3.5 text-[var(--text3)]" />
                  </Link>

                  {/* Parent Span */}
                  {span.parentSpanId && onSelectSpanId && (
                    <button
                      type="button"
                      onClick={() => onSelectSpanId(span.parentSpanId!)}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[12.5px] font-medium text-[var(--text)] hover:border-[var(--brand)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <ArrowUpRight className="size-4 text-[var(--violet)]" />
                        <span>Navigate to Parent Span ({span.parentSpanId.slice(0, 8)}…)</span>
                      </div>
                      <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">Jump</span>
                    </button>
                  )}

                  {/* Child Spans */}
                  {span.children.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <span className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase text-[var(--text3)]">
                        Child Spans ({span.children.length})
                      </span>
                      {span.children.map((child) => (
                        <button
                          key={child.spanId}
                          type="button"
                          onClick={() => onSelectSpanId?.(child.spanId)}
                          className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:border-[var(--brand)] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <CornerDownRight className="size-3 text-[var(--text3)] shrink-0" />
                            <span className="truncate font-[family-name:var(--mono)]">{child.name}</span>
                          </div>
                          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text2)] shrink-0">
                            {formatDurationMs(child.durationMs)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RAW JSON */}
          {activeTab === "raw" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                  Raw OpenTelemetry Span Object
                </span>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="inline-flex items-center gap-1 rounded border border-[var(--border2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text)] hover:bg-[var(--bg2)] cursor-pointer"
                >
                  {copiedRaw ? <Check className="size-3 text-[var(--green)]" /> : <Copy className="size-3" />}
                  <span>{copiedRaw ? "Copied" : "Copy JSON"}</span>
                </button>
              </div>
              <pre className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 font-[family-name:var(--mono)] text-[11.5px] leading-relaxed text-[var(--text)] whitespace-pre-wrap break-all overflow-x-auto">
                {JSON.stringify(rawSpan, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
