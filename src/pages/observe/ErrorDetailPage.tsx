import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, UserX } from "lucide-react";
import { useObservabilityDetail } from "./hooks/useObservabilityApi";
import { RelatedTab } from "./components/RelatedTab";
import { PageHeader, SectionCard, SeverityBadge, Tabs, JsonViewer, Button, Timestamp,
  MetricSparkline, demoSuccess, demoAction, DetailSkeleton } from "@/shared/observe";
import type { StackFrame, Breadcrumb } from "@/types/events";

export default function ErrorDetailPage() {
  const { fingerprint = "" } = useParams();
  const navigate = useNavigate();
  const { data: eventDetail, isLoading } = useObservabilityDetail<any>("errors", decodeURIComponent(fingerprint));

  if (isLoading) return <DetailSkeleton />;
  const group = eventDetail?.entity || eventDetail;
  if (!group) return <div className="p-8 text-[var(--text2)]">Error group not found.</div>;

  const sample = group.occurrences?.[0] ?? group.sample ?? group;
  const count = group.count ?? 1;
  const occurrenceSeries = Array.from(
    { length: 24 },
    (_, i) => Math.round(count / 24 + Math.sin(i / 2) * (count / 30) + ((i % 4) + 1)),
  );
  
  const affectedUsersCount = group.affectedUsers?.size ?? group.affectedUsers?.length ?? 0;
  const affectedUsersList = Array.isArray(group.affectedUsers) ? group.affectedUsers : (group.affectedUsers?.size ? Array.from(group.affectedUsers as Set<string>) : []);
  const servicesList = Array.isArray(group.services) ? group.services : (group.services?.size ? Array.from(group.services as Set<string>) : [group.service]);

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to error groups</Button>
      <PageHeader
        title={group.name ?? group.type ?? "Error"}
        description={group.message}
        breadcrumbs={[{ label: "Observe" }, { label: "Error groups" }, { label: group.name ?? group.type ?? group.id ?? group.fingerprint }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => demoAction("Assigned error")}><UserX className="size-4" /> Assign</Button>
            <Button variant="primary" onClick={() => demoSuccess("Marked as resolved")}><CheckCircle2 className="size-4" /> Resolve</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
        <SeverityBadge severity={group.severity} />
        <Stat label="Occurrences" value={count.toLocaleString()} />
        <Stat label="Affected users" value={String(affectedUsersCount)} />
        <Stat label="Services" value={servicesList.filter(Boolean).join(", ")} />
        <Stat label="First seen" value="" extra={<Timestamp value={group.firstSeen ?? group.timestamp} />} />
        <Stat label="Last seen" value="" extra={<Timestamp value={group.lastSeen ?? group.timestamp} />} />
      </div>

      <SectionCard title="Occurrences over time">
        <MetricSparkline data={occurrenceSeries} color="var(--red)" width={760} height={80} />
      </SectionCard>

      <Tabs
        tabs={[
          { id: "stack", label: "Stack trace", content: <StackTrace frames={sample.stack ?? sample.stacktrace ?? []} /> },
          { id: "breadcrumbs", label: "Breadcrumbs", content: <BreadcrumbTimeline crumbs={sample.breadcrumbs ?? []} /> },
          {
            id: "users",
            label: `Affected users (${affectedUsersCount})`,
            content: (
              <SectionCard className="p-0">
                {affectedUsersList.map((u: string) => (
                  <div key={u} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 last:border-0">
                    <div className="flex size-7 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[12px] font-semibold text-[var(--brand)]">{u.slice(-1)}</div>
                    <code className="font-[family-name:var(--mono)] text-[13px] text-[var(--text2)]">{u}</code>
                  </div>
                ))}
                {affectedUsersCount === 0 && <div className="p-4 text-[var(--text3)]">No users affected.</div>}
              </SectionCard>
            ),
          },
          { id: "related-requests", label: "Related Requests", content: <RelatedTab resource="errors" id={group.fingerprint ?? group.id} relation="requests" /> },
          { id: "related-logs", label: "Related Logs", content: <RelatedTab resource="errors" id={group.fingerprint ?? group.id} relation="logs" /> },
          { id: "related-spans", label: "Related Spans", content: <RelatedTab resource="errors" id={group.fingerprint ?? group.id} relation="spans" /> },
          { id: "raw", label: "Raw event", content: <JsonViewer data={sample} /> },
        ]}
      />
    </div>
  );
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--text3)]">{label}</div>
      <div className="text-[13px] font-medium text-[var(--text)]">{extra ?? value}</div>
    </div>
  );
}

function StackTrace({ frames }: { frames: StackFrame[] }) {
  if (!frames || frames.length === 0) return <div className="p-4 text-[var(--text3)] border border-[var(--border)] rounded-[12px]">No stack trace available.</div>;
  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
      {frames.map((f, idx) => (
        <div key={`${f.filename}-${f.lineno}-${f.colno}-${f.function}-${idx}`} className={f.inApp ? "" : "opacity-60"}>
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2 font-[family-name:var(--mono)] text-[12px]">
            <span className="text-[var(--brand)]">{f.function}</span>
            <span className="text-[var(--text3)]">{f.filename}:{f.lineno}:{f.colno}</span>
            {f.inApp && <span className="ml-auto rounded bg-[var(--brand-bg)] px-1.5 py-0.5 text-[10px] text-[var(--brand)]">in-app</span>}
          </div>
          {f.sourceContext && (
            <pre className="overflow-x-auto bg-[var(--bg)] px-4 py-2 font-[family-name:var(--mono)] text-[12px] leading-relaxed">
              {f.sourceContext.pre?.map((l: string, j: number) => <div key={`pre-${j}`} className="text-[var(--text3)]">{l}</div>)}
              <div className="bg-[var(--red-bg)] text-[var(--red)]">{f.sourceContext.line}</div>
              {f.sourceContext.post?.map((l: string, j: number) => <div key={`post-${j}`} className="text-[var(--text3)]">{l}</div>)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function BreadcrumbTimeline({ crumbs }: { crumbs: Breadcrumb[] }) {
  if (!crumbs || crumbs.length === 0) return <div className="p-6 text-center text-[var(--text3)]">No breadcrumbs captured.</div>;
  return (
    <div className="relative ml-3 border-l border-[var(--border)] pl-5">
      {crumbs.map((c, i) => (
        <div key={`${c.timestamp}-${c.category}-${c.message}-${i}`} className="relative pb-4 last:pb-0">
          <span className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-[var(--brand)]" />
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--bg2)] px-1.5 py-0.5 text-[11px] text-[var(--text2)]">{c.category}</span>
            <span className="text-[13px] text-[var(--text)]">{c.message}</span>
          </div>
          <div className="mt-0.5 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{c.timestamp}</div>
        </div>
      ))}
    </div>
  );
}
