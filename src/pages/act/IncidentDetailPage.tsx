import { useActionState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useIncident } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, KpiCard, SeverityBadge, StatusBadge, Button, Timestamp,
  Tabs, JsonViewer, SubmitButton, textareaClass, formatDuration, demoSuccess, DetailSkeleton } from "@/shared/observe";

export default function IncidentDetailPage() {
  const { incidentId = "" } = useParams();
  const navigate = useNavigate();
  const { data: inc, isLoading } = useIncident(incidentId);

  const [, commentAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Comment added: ${String(form.get("comment") ?? "").slice(0, 30)}`);
    return { ok: true };
  }, { ok: false });

  if (isLoading) return <DetailSkeleton />;
  if (!inc) return <div className="p-8 text-[var(--text2)]">Incident not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to incidents</Button>
      <PageHeader
        title={inc.title}
        breadcrumbs={[{ label: "Act" }, { label: "Incidents" }, { label: inc.id }]}
        actions={
          <>
            <SeverityBadge severity={inc.severity} />
            <StatusBadge status={inc.status} />
            {inc.status !== "resolved" && <Button variant="primary" onClick={() => demoSuccess("Incident resolved")}><CheckCircle2 className="size-4" /> Resolve</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Service" value={inc.service} />
        <KpiCard label="Duration" value={formatDuration(inc.duration)} />
        <KpiCard label="Assignee" value={inc.assignedToName} />
        <KpiCard label="Alert rule" value={inc.alertRuleName} />
      </div>

      <Tabs
        tabs={[
          {
            id: "timeline",
            label: "Timeline",
            content: (
              <SectionCard>
                <div className="relative ml-3 border-l border-[var(--border)] pl-5">
                  {inc.activityLog.map((a) => (
                    <div key={`${a.timestamp}-${a.actor}-${a.action}-${a.message}`} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-[var(--brand)]" />
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--text)] capitalize">{a.action}</span>
                        <span className="text-[12px] text-[var(--text3)]">by {a.actor}</span>
                      </div>
                      <div className="text-[13px] text-[var(--text2)]">{a.message}</div>
                      <div className="mt-0.5"><Timestamp value={a.timestamp} /></div>
                    </div>
                  ))}
                </div>
                <form action={commentAction} className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                  <textarea name="comment" placeholder="Add a comment…" className={textareaClass} required />
                  <div><SubmitButton>Post comment</SubmitButton></div>
                </form>
              </SectionCard>
            ),
          },
          {
            id: "events",
            label: `Related events (${inc.relatedEvents.length})`,
            content: (
              <SectionCard className="p-0">
                {inc.relatedEvents.map((e) => (
                  <div key={e} className="border-b border-[var(--border)] px-4 py-2.5 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)] last:border-0">{e}</div>
                ))}
              </SectionCard>
            ),
          },
          { id: "raw", label: "Raw JSON", content: <JsonViewer data={inc} /> },
        ]}
      />
    </div>
  );
}
