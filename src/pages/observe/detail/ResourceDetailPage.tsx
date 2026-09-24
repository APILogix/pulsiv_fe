import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
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
  if (!hasValue(value)) return <EmptyState title="No stack trace" description="This error did not include stack frames in the returned event context." />;
  if (typeof value === "string") return <SectionCard title="Stack trace"><pre className="sidebar-scroll max-h-[560px] overflow-auto rounded-[var(--radius)] bg-[var(--bg)] p-4 font-[family-name:var(--mono)] text-[11px] leading-relaxed text-[var(--text2)]">{value}</pre></SectionCard>;
  const frames = arrayValue(value).map(asRecord).filter((frame): frame is JsonRecord => frame !== null);
  if (frames.length === 0) return <StructuredDataSection title="Stack trace" data={value} />;
  const renderCompactFrame = (frame: JsonRecord) => <div className="flex min-w-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0"><span className="font-[family-name:var(--mono)] text-[11px] text-[var(--brand)]">{normalize(pick(frame, ["function", "functionName", "function_name"])) || "anonymous"}</span><span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{normalize(pick(frame, ["filename", "file", "module"]))}</span><span className="font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">{normalize(pick(frame, ["lineno", "lineNumber", "line_number"]))}</span></div>;
  return <SectionCard title="Stack trace"><div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]">{frames.length > 100 ? <VirtualList items={frames} rowHeight={48} height={520} getKey={(frame, index) => stringValue(pick(frame, ["filename", "file"])) ?? `frame-${index}`} renderRow={renderCompactFrame} /> : frames.map((frame, index) => <div key={`${normalize(pick(frame, ["filename", "file"]))}-${index}`} className="border-b border-[var(--border)] last:border-0"><div className="flex items-center gap-3 px-4 py-2.5"><span className="font-[family-name:var(--mono)] text-[11px] text-[var(--brand)]">{normalize(pick(frame, ["function", "functionName", "function_name"])) || "anonymous"}</span><span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{normalize(pick(frame, ["filename", "file", "module"]))}</span><span className="font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">{normalize(pick(frame, ["lineno", "lineNumber", "line_number"]))}:{normalize(pick(frame, ["colno", "columnNumber", "column_number"]))}</span></div>{hasValue(pick(frame, ["sourceContext", "source_context"])) && <pre className="overflow-auto bg-[var(--bg)] px-4 py-2 font-[family-name:var(--mono)] text-[11px] leading-relaxed text-[var(--text3)]">{JSON.stringify(pick(frame, ["sourceContext", "source_context"]), null, 2)}</pre>}</div>)}</div></SectionCard>;
}

function ResourceSpecificSections({ resource, entity, detail }: { resource: DetailResource; entity: JsonRecord; detail: ObservabilityEventDetail }) {
  const attributes = asRecord(detail.attributes);
  const metadata = asRecord(detail.metadata);
  const payload = asRecord(detail.payload);
  const context = { ...metadata, ...attributes, ...payload, ...entity };

  if (resource === "errors") {
    const stack = pick(context, ["stack", "stacktrace", "stackTrace"]);
    const breadcrumbs = arrayValue(pick(context, ["breadcrumbs"]));
    return <div className="flex flex-col gap-5"><SectionCard title="Exception"><FieldGrid fields={RESOURCE_FIELDS.errors.slice(0, 9)} entity={entity} columns={2} /></SectionCard><StackTraceSection value={stack} />{breadcrumbs.length > 0 ? <SectionCard title="Breadcrumbs"><div className="relative ml-2 border-l border-[var(--border2)] pl-5">{breadcrumbs.map((item, index) => { const record = asRecord(item); return <div key={index} className="relative pb-4 last:pb-0"><span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-[var(--red)]" /><div className="text-[12px] text-[var(--text)]">{normalize(pick(record, ["message", "name", "category"]))}</div><div className="mt-1 font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">{normalize(pick(record, ["timestamp", "occurredAt"]))}</div></div>; })}</div></SectionCard> : <EmptyState title="No breadcrumbs" description="No breadcrumb timeline was returned with this error." />}</div>;
  }

  if (resource === "requests") {
    const headers = pick(context, ["headers", "requestHeaders", "request_headers"]);
    const query = pick(context, ["query", "queryParams", "query_params", "queryParameters"]);
    const path = pick(context, ["pathParams", "path_params", "pathParameters"]);
    const body = pick(context, ["body", "requestBody", "request_body"]);
    const response = pick(context, ["response", "responseBody", "response_body"]);
    return <div className="flex flex-col gap-5"><SectionCard title="HTTP information"><FieldGrid fields={RESOURCE_FIELDS.requests.slice(0, 5)} entity={entity} columns={2} /></SectionCard><SectionCard title="Client and device"><FieldGrid fields={RESOURCE_FIELDS.requests.slice(9)} entity={entity} columns={3} /></SectionCard><JsonPayloadSection title="Headers" value={headers} /><JsonPayloadSection title="Query parameters" value={query} /><JsonPayloadSection title="Path parameters" value={path} /><JsonPayloadSection title="Request body" value={body} /><JsonPayloadSection title="Response body" value={response} /></div>;
  }

  if (resource === "traces") return <div className="flex flex-col gap-5"><SectionCard title="Trace overview"><FieldGrid fields={RESOURCE_FIELDS.traces} entity={entity} columns={3} /></SectionCard><SpanTreePanel detail={detail} /></div>;
  if (resource === "spans") return <div className="flex flex-col gap-5"><SectionCard title="Span overview"><FieldGrid fields={RESOURCE_FIELDS.spans} entity={entity} columns={3} /></SectionCard><SpanTreePanel detail={detail} /></div>;
  if (resource === "logs") return <div className="flex flex-col gap-5"><SectionCard title="Log message"><div className="whitespace-pre-wrap break-words font-[family-name:var(--mono)] text-[13px] leading-relaxed text-[var(--text)]">{stringValue(pick(entity, ["message"])) ?? "No message returned."}</div></SectionCard><SectionCard title="Log context"><FieldGrid fields={RESOURCE_FIELDS.logs} entity={entity} columns={3} /></SectionCard></div>;
  if (resource === "metrics") return <div className="flex flex-col gap-5"><SectionCard title="Metric statistics"><FieldGrid fields={RESOURCE_FIELDS.metrics} entity={entity} columns={3} /></SectionCard></div>;
  if (resource === "profiles") return <div className="flex flex-col gap-5"><SectionCard title="Profile summary"><FieldGrid fields={RESOURCE_FIELDS.profiles} entity={entity} columns={3} /></SectionCard><ProfileSamples detail={detail} /></div>;
  return <div className="flex flex-col gap-5"><SectionCard title="Cron execution"><FieldGrid fields={RESOURCE_FIELDS.crons} entity={entity} columns={3} /></SectionCard><CronTimeline entity={entity} /></div>;
}

function ProfileSamples({ detail }: { detail: ObservabilityEventDetail }) {
  const data = asRecord(detail.payload) ?? asRecord(detail.attributes) ?? {};
  const profile = asRecord(pick(data, ["profile"]));
  const samples = arrayValue(pick(profile, ["samples"]));
  const nodes = arrayValue(pick(profile, ["nodes"]));
  if (samples.length === 0 && nodes.length === 0) return <EmptyState title="No profile samples" description="The profile event returned no sample or node data." />;
  const sampleRows = samples.map(asRecord).filter((sample): sample is JsonRecord => sample !== null);
  return <SectionCard title="Profile statistics"><div className="grid gap-3 sm:grid-cols-3"><div><div className="text-[11px] text-[var(--text3)]">Samples</div><div className="mt-1 font-[family-name:var(--mono)] text-[18px] text-[var(--text)]">{samples.length.toLocaleString()}</div></div><div><div className="text-[11px] text-[var(--text3)]">Nodes</div><div className="mt-1 font-[family-name:var(--mono)] text-[18px] text-[var(--text)]">{nodes.length.toLocaleString()}</div></div><div><div className="text-[11px] text-[var(--text3)]">Flamegraph</div><div className="mt-1 text-[12px] text-[var(--text2)]">{nodes.length > 0 ? "Node data returned; interactive flamegraph is unavailable." : "Unavailable"}</div></div></div>{sampleRows.length > 0 && <div className="mt-4 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]">{sampleRows.length > 100 ? <VirtualList items={sampleRows} rowHeight={42} height={360} getKey={(sample, index) => `${normalize(pick(sample, ["timestamp"]))}-${index}`} renderRow={(sample) => <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2 last:border-0 font-[family-name:var(--mono)] text-[11px] text-[var(--text2)]"><span>{normalize(pick(sample, ["timestamp"]))}</span><span className="ml-auto">node {normalize(pick(sample, ["nodeId", "node_id"]))}</span></div>} /> : sampleRows.map((sample, index) => <div key={index} className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2 last:border-0 font-[family-name:var(--mono)] text-[11px] text-[var(--text2)]"><span>{normalize(pick(sample, ["timestamp"]))}</span><span className="ml-auto">node {normalize(pick(sample, ["nodeId", "node_id"]))}</span></div>)}</div>}</SectionCard>;
}

function CronTimeline({ entity }: { entity: JsonRecord }) {
  const points = [["Started", pick(entity, ["startedAt", "started_at"])], ["Occurred", pick(entity, ["occurredAt", "occurred_at", "timestamp"])], ["Finished", pick(entity, ["finishedAt", "finished_at"])]] as const;
  const visible = points.filter(([, value]) => hasValue(value));
  if (visible.length === 0) return <EmptyState title="No execution timeline" description="Started, occurred, and finished timestamps were not returned." />;
  return <SectionCard title="Execution timeline"><div className="flex flex-col gap-4">{visible.map(([label, value], index) => <div key={label} className="flex items-center gap-3"><div className="flex size-7 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green)]"><span className="size-2 rounded-full bg-current" /></div><div><div className="text-[12px] text-[var(--text)]">{label}</div><div className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{normalize(value)}</div></div>{index < visible.length - 1 && <div className="ml-[-30px] mt-10 h-4 border-l border-[var(--border2)]" />}</div>)}</div></SectionCard>;
}

export default function ResourceDetailPage({ resource, id }: { resource: DetailResource; id: string }) {
  const navigate = useNavigate();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const { data: detail, isLoading, error } = useObservabilityDetail<ObservabilityEventDetail>(resource, decodeURIComponent(id));
  const entity = detail?.entity ?? null;
  const canonicalId = detailId(detail, decodeURIComponent(id));
  const config = DETAIL_CONFIG[resource];
  const title = `${config.singular} investigation`;
  const tabs = useMemo(() => detail && entity ? [
    { id: "investigation", label: "Investigation", content: <div className="flex flex-col gap-5"><ResourceSpecificSections resource={resource} entity={entity} detail={detail} /><TimelinePanel timeline={detail.timeline} /><StructuredSections detail={detail} /></div> },
    { id: "related", label: `Related (${Object.values(detail.counts ?? {}).reduce((sum, count) => sum + (typeof count === "number" ? count : 0), 0)})`, content: <RelatedResources detail={detail} /> },
    { id: "ai", label: "Ask AI", content: <AIInvestigationPanel detail={detail} resource={resource} id={canonicalId} ask={(intent: AIIntent, question?: string) => { if (!activeOrgId) throw new Error("No active organization."); return askObservabilityEvent(activeOrgId, resource, canonicalId, intent, question); }} /> },
  ] : [], [activeOrgId, canonicalId, detail, entity, resource]);

  if (isLoading) return <DetailSkeleton />;
  if (error) return <div className="flex flex-col gap-4"><Button variant="ghost" className="w-fit" onClick={() => navigate(-1)}><ArrowLeft className="size-4" />Back</Button><EmptyState title={`${title} failed`} description="The event could not be loaded from the observability detail endpoint." /></div>;
  if (!detail || !entity) return <div className="flex flex-col gap-4"><Button variant="ghost" className="w-fit" onClick={() => navigate(-1)}><ArrowLeft className="size-4" />Back</Button><EmptyState title={`${title} not found`} description={`No ${resource} event was returned for this ID.`} /></div>;

  return <main className="flex flex-col gap-6 pb-12"><Button variant="ghost" className="w-fit" onClick={() => navigate(-1)}><ArrowLeft className="size-4" />Back to {config.label.toLowerCase()}</Button><InvestigationHeader resource={resource} entity={entity} detail={detail} id={canonicalId} /><OverviewCards entity={entity} /><div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><article className="min-w-0"><Tabs tabs={tabs} /></article><MetadataSidebar resource={resource} entity={entity} detail={detail} /></div></main>;
}

export { DETAIL_RESOURCES };
