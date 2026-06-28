import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useEscalation } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, StatusBadge, Button, demoSuccess } from "@/shared/observe";

export default function EscalationDetailPage() {
  const { policyId = "" } = useParams();
  const navigate = useNavigate();
  const { data: p, isLoading } = useEscalation(policyId);

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading policy…</div>;
  if (!p) return <div className="p-8 text-[var(--text2)]">Policy not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to escalations</Button>
      <PageHeader
        title={p.name}
        description={p.description}
        breadcrumbs={[{ label: "Act" }, { label: "Escalations" }, { label: p.name }]}
        actions={<Button variant="secondary" onClick={() => demoSuccess("Test page sent")}><Send className="size-4" /> Test policy</Button>}
      />

      <SectionCard title="Escalation steps">
        <div className="flex flex-col gap-3">
          {p.steps.map((s) => (
            <div key={s.step} className="flex items-start gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-bg)] font-semibold text-[var(--brand)]">{s.step}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--text)]">Notify after {s.waitMinutes}m</span>
                  <span className="rounded bg-[var(--bg3)] px-1.5 py-0.5 text-[11px] text-[var(--text2)]">{s.channels}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {s.notify.map((n) => (
                    <span key={n.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg3)] px-2 py-1 text-[12px] text-[var(--text2)]">
                      <span className="flex size-4 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[10px] text-[var(--brand)]">{n.name.charAt(0)}</span>
                      {n.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="On-call now">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-[var(--brand-bg)] font-semibold text-[var(--brand)]">{p.onCallNow.name.charAt(0)}</div>
          <div>
            <div className="text-[13px] font-medium text-[var(--text)]">{p.onCallNow.name}</div>
            <div className="text-[12px] text-[var(--text3)]">{p.onCallNow.email}</div>
          </div>
          <StatusBadge status="active" />
        </div>
      </SectionCard>
    </div>
  );
}
