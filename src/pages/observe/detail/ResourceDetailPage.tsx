import { useMemo } from "react";
import { ArrowLeft, Terminal, ShieldAlert, Sparkles, Clock, Globe, GitBranch } from "lucide-react";
import { useNavigate } from "react-router";
import { Button, DetailSkeleton, SectionCard, Tabs, VirtualList } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { askObservabilityEvent, useObservabilityDetail, type AIIntent, type ObservabilityEventDetail } from "../hooks/useObservabilityApi";
import { DETAIL_RESOURCES, RESOURCE_FIELDS, asRecord, arrayValue, detailId, hasValue, pick, stringValue, type DetailResource, type JsonRecord } from "./detail-contract";
import { DETAIL_CONFIG } from "./detail-config";
import { AIInvestigationPanel, FieldGrid, InvestigationHeader, MetadataSidebar, OverviewCards, RelatedResources, SpanTreePanel, StructuredSections, TimelinePanel } from "./detail-panels";
import { EmptyState } from "./EmptyState";
import { StructuredDataSection } from "./StructuredDataSection";

function normalize(value: unknown): string {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function JsonPayloadSection({ title, value }: { title: string; value: unknown }) {
  return hasValue(value) ? <StructuredDataSection title={title} data={value} /> : null;
}

function StackTraceSection({ value }: { value: unknown }) {
  if (!hasValue(value)) {
    return <EmptyState title="No Stack Trace" description="This event did not record stack frames in the telemetry context." />;
  }
  if (typeof value === "string") {
    return (
      <SectionCard title="Stack Trace">
        <pre className="sidebar-scroll max-h-[560px] overflow-auto rounded-xl bg-[var(--bg)] p-4 font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text)]">
          {value}
        </pre>
      </SectionCard>
    );
  }
  const frames = arrayValue(value).map(asRecord).filter((frame): frame is JsonRecord => frame !== null);
  if (frames.length === 0) return <StructuredDataSection title="Stack Trace" data={value} />;

  const renderCompactFrame = (frame: JsonRecord) => (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-[family-name:var(--mono)] text-[12.5px] font-semibold text-[var(--brand)]">
          {normalize(pick(frame, ["function", "functionName", "function_name"])) || "anonymous"}
        </span>
        <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
          {normalize(pick(frame, ["filename", "file", "module"]))}
        </span>
      </div>
      <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
        Line {normalize(pick(frame, ["lineno", "lineNumber", "line_number"]))}
      </span>
    </div>
  );

  return (
    <SectionCard title="Stack Trace">
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60">
        {frames.length > 100 ? (
          <VirtualList
            items={frames}
            rowHeight={48}
            height={520}
            getKey={(frame, index) => stringValue(pick(frame, ["filename", "file"])) ?? `frame-${index}`}
            renderRow={renderCompactFrame}
          />
        ) : (
          frames.map((frame, index) => (
            <div key={`${normalize(pick(frame, ["filename", "file"]))}-${index}`} className="border-b border-[var(--border)] last:border-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-[family-name:var(--mono)] text-[12.5px] font-semibold text-[var(--brand)]">
                    {normalize(pick(frame, ["function", "functionName", "function_name"])) || "anonymous"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                    {normalize(pick(frame, ["filename", "file", "module"]))}
                  </span>
                </div>
                <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                  {normalize(pick(frame, ["lineno", "lineNumber", "line_number"]))}:{normalize(pick(frame, ["colno", "columnNumber", "column_number"]))}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function ResourceSpecificSections({ resource, entity, detail }: { resource: DetailResource; entity: JsonRecord; detail: ObservabilityEventDetail }) {
  const attributes = asRecord(detail.attributes);
  const metadata = asRecord(detail.metadata);
  const payload = asRecord(detail.payload);
  const context = { ...metadata, ...attributes, ...payload, ...entity };

  if (resource === "errors") {
    const stack = pick(context, ["stack", "stacktrace", "stackTrace"]);
    const breadcrumbs = arrayValue(pick(context, ["breadcrumbs"]));
    return (
      <div className="flex flex-col gap-6">
        <SectionCard title="Exception Details">
          <FieldGrid fields={RESOURCE_FIELDS.errors.slice(0, 9)} entity={entity} columns={2} />
        </SectionCard>
        <StackTraceSection value={stack} />
        {breadcrumbs.length > 0 ? (
          <SectionCard title="Breadcrumbs Timeline">
            <div className="relative ml-2 border-l border-[var(--border2)] pl-5 space-y-3">
              {breadcrumbs.map((item, index) => {
                const record = asRecord(item);
                return (
                  <div key={index} className="relative pb-3 last:pb-0">
                    <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-[var(--red)]" />
                    <div className="text-[13px] font-medium text-[var(--text)]">{normalize(pick(record, ["message", "name", "category"]))}</div>
                    <div className="mt-1 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{normalize(pick(record, ["timestamp", "occurredAt"]))}</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ) : (
          <EmptyState title="No Breadcrumbs" description="No breadcrumb timeline was recorded for this error." />
        )}
      </div>
    );
  }

  if (resource === "requests") {
    return (
      <div className="flex flex-col gap-6">
        <SectionCard title="HTTP Transaction">
          <FieldGrid fields={RESOURCE_FIELDS.requests.slice(0, 5)} entity={entity} columns={2} />
        </SectionCard>
        <SectionCard title="Client & Device Context">
          <FieldGrid fields={RESOURCE_FIELDS.requests.slice(9)} entity={entity} columns={3} />
        </SectionCard>
      </div>
    );
  }

  if (resource === "traces") {
    return (
      <div className="flex flex-col gap-6">
        <SectionCard title="Trace Overview">
          <FieldGrid fields={RESOURCE_FIELDS.traces} entity={entity} columns={3} />
        </SectionCard>
        <SpanTreePanel detail={detail} />
      </div>
    );
  }

  if (resource === "spans") {
    return (
      <div className="flex flex-col gap-6">
        <SectionCard title="Span Attributes">
          <FieldGrid fields={RESOURCE_FIELDS.spans} entity={entity} columns={3} />
        </SectionCard>
        <SpanTreePanel detail={detail} />
      </div>
    );
  }

  if (resource === "logs") {
    const logLevel = stringValue(pick(entity, ["level", "severity"])) ?? "info";
    const logMsg = stringValue(pick(entity, ["message", "msg"])) ?? "No message text attached.";
    const isErr = logLevel.toLowerCase() === "error" || logLevel.toLowerCase() === "fatal";

    return (
      <div className="flex flex-col gap-6">
        {/* Log Hero Card */}
        <div className={`rounded-2xl border p-6 shadow-xs ${isErr ? "border-[var(--red)]/30 bg-[var(--red-bg)]/30" : "border-[var(--border)] bg-[var(--bg1)]"}`}>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-[var(--brand)]" />
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                Log Message
              </span>
            </div>
            <span className={`rounded-md px-2.5 py-0.5 font-[family-name:var(--mono)] text-[11px] font-semibold uppercase ${isErr ? "bg-[var(--red)] text-[var(--red-fg)]" : "bg-[var(--bg2)] text-[var(--text)]"}`}>
              {logLevel}
            </span>
          </div>
          <div className="mt-4 whitespace-pre-wrap break-words font-[family-name:var(--mono)] text-[14px] leading-relaxed text-[var(--text)] font-medium">
            {logMsg}
          </div>
        </div>

        <SectionCard title="Log Telemetry Context">
          <FieldGrid fields={RESOURCE_FIELDS.logs} entity={entity} columns={3} />
        </SectionCard>
      </div>
    );
  }

  if (resource === "metrics") {
    return (
      <div className="flex flex-col gap-6">
        <SectionCard title="Metric Statistics">
          <FieldGrid fields={RESOURCE_FIELDS.metrics} entity={entity} columns={3} />
        </SectionCard>
      </div>
    );
  }

  if (resource === "profiles") {
    return (
      <div className="flex flex-col gap-6">
        <SectionCard title="Profile Summary">
          <FieldGrid fields={RESOURCE_FIELDS.profiles} entity={entity} columns={3} />
        </SectionCard>
        <ProfileSamples detail={detail} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Cron Execution Details">
        <FieldGrid fields={RESOURCE_FIELDS.crons} entity={entity} columns={3} />
      </SectionCard>
      <CronTimeline entity={entity} />
    </div>
  );
}

function ProfileSamples({ detail }: { detail: ObservabilityEventDetail }) {
  const data = asRecord(detail.payload) ?? asRecord(detail.attributes) ?? {};
  const profile = asRecord(pick(data, ["profile"]));
  const samples = arrayValue(pick(profile, ["samples"]));
  const nodes = arrayValue(pick(profile, ["nodes"]));
  if (samples.length === 0 && nodes.length === 0) {
    return <EmptyState title="No Profile Samples" description="The profile event returned no sample or node data." />;
  }
  const sampleRows = samples.map(asRecord).filter((sample): sample is JsonRecord => sample !== null);
  return (
    <SectionCard title="Profile Telemetry Statistics">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">Samples</div>
          <div className="mt-1 font-[family-name:var(--mono)] text-[20px] font-semibold text-[var(--text)]">{samples.length.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">Nodes</div>
          <div className="mt-1 font-[family-name:var(--mono)] text-[20px] font-semibold text-[var(--text)]">{nodes.length.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">Flamegraph</div>
          <div className="mt-1 text-[13px] font-medium text-[var(--text2)]">{nodes.length > 0 ? "Node telemetry recorded" : "Unavailable"}</div>
        </div>
      </div>
      {sampleRows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60">
          {sampleRows.length > 100 ? (
            <VirtualList
              items={sampleRows}
              rowHeight={42}
              height={360}
              getKey={(sample, index) => `${normalize(pick(sample, ["timestamp"]))}-${index}`}
              renderRow={(sample) => (
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 last:border-0 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                  <span>{normalize(pick(sample, ["timestamp"]))}</span>
                  <span className="ml-auto">node {normalize(pick(sample, ["nodeId", "node_id"]))}</span>
                </div>
              )}
            />
          ) : (
            sampleRows.map((sample, index) => (
              <div key={index} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 last:border-0 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                <span>{normalize(pick(sample, ["timestamp"]))}</span>
                <span className="ml-auto">node {normalize(pick(sample, ["nodeId", "node_id"]))}</span>
              </div>
            ))
          )}
        </div>
      )}
    </SectionCard>
  );
}

function CronTimeline({ entity }: { entity: JsonRecord }) {
  const points = [
    ["Started", pick(entity, ["startedAt", "started_at"])],
    ["Occurred", pick(entity, ["occurredAt", "occurred_at", "timestamp"])],
    ["Finished", pick(entity, ["finishedAt", "finished_at"])],
  ] as const;
  const visible = points.filter(([, value]) => hasValue(value));
  if (visible.length === 0) return <EmptyState title="No Execution Timeline" description="Started, occurred, and finished timestamps were not returned." />;

  return (
    <SectionCard title="Execution Timeline">
      <div className="flex flex-col gap-4">
        {visible.map(([label, value], index) => (
          <div key={label} className="flex items-center gap-3.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[var(--green-bg)] text-[var(--green)]">
              <span className="size-2 rounded-full bg-current" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--text)]">{label}</div>
              <div className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{normalize(value)}</div>
            </div>
            {index < visible.length - 1 && <div className="ml-[-30px] mt-10 h-4 border-l border-[var(--border2)]" />}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default function ResourceDetailPage({ resource, id }: { resource: DetailResource; id: string }) {
  const navigate = useNavigate();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const { data: detail, isLoading, error } = useObservabilityDetail<ObservabilityEventDetail>(resource, decodeURIComponent(id));
  const entity = detail?.entity ?? null;
  const canonicalId = detailId(detail, decodeURIComponent(id));
  const config = DETAIL_CONFIG[resource];
  const title = `${config.singular} Details`;

  const tabs = useMemo(() => (detail && entity ? [
    {
      id: "investigation",
      label: "Overview & Telemetry",
      content: (
        <div className="flex flex-col gap-6">
          <ResourceSpecificSections resource={resource} entity={entity} detail={detail} />
          <TimelinePanel timeline={detail.timeline} />
          <StructuredSections detail={detail} />
        </div>
      ),
    },
    {
      id: "related",
      label: `Correlated (${Object.values(detail.counts ?? {}).reduce((sum, count) => sum + (typeof count === "number" ? count : 0), 0)})`,
      content: <RelatedResources detail={detail} />,
    },
    {
      id: "ai",
      label: "AI Investigation",
      content: (
        <AIInvestigationPanel
          detail={detail}
          resource={resource}
          id={canonicalId}
          ask={(intent: AIIntent, question?: string) => {
            if (!activeOrgId) throw new Error("No active organization.");
            return askObservabilityEvent(activeOrgId, resource, canonicalId, intent, question);
          }}
        />
      ),
    },
  ] : []), [activeOrgId, canonicalId, detail, entity, resource]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg1)] px-8 py-16 text-center shadow-xs">
          <EmptyState title={`${title} Failed`} description="The event could not be loaded from the observability detail endpoint." />
        </div>
      </div>
    );
  }

  if (!detail || !entity) {
    return (
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg1)] px-8 py-16 text-center shadow-xs">
          <EmptyState title={`${title} Not Found`} description={`No ${resource} event was returned for this ID.`} />
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 px-6 py-6 pb-28">
      <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" />
        Back to {config.label.toLowerCase()}
      </Button>
      <InvestigationHeader resource={resource} entity={entity} detail={detail} id={canonicalId} />
      <OverviewCards entity={entity} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0">
          <Tabs tabs={tabs} />
        </article>
        <MetadataSidebar resource={resource} entity={entity} detail={detail} />
      </div>
    </main>
  );
}

export { DETAIL_RESOURCES };

