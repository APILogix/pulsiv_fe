import { useNavigate } from "react-router";
import { Plus, PhoneForwarded } from "lucide-react";
import { useEscalations } from "@/hooks/useDummyData";
import { PageHeader, KpiCard, FillPage, InfiniteCards, StatusBadge, Button, demoAction } from "@/shared/observe";

export default function EscalationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useEscalations();
  const policies = data ?? [];

  return (
    <FillPage>
      <PageHeader
        title="Escalations"
        description="On-call routing and escalation policies."
        actions={<Button variant="primary" onClick={() => demoAction("Create escalation policy")}><Plus className="size-4" /> New policy</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Policies" value={policies.length} icon={PhoneForwarded} />
        <KpiCard label="On-call now" value={policies.length} />
        <KpiCard label="Active rotations" value="3" />
        <KpiCard label="Avg ack time" value="6m" />
      </div>

      <InfiniteCards
        className="flex-1"
        loading={isLoading}
        items={policies}
        queryKey={["escalations"]}
        getKey={(p) => p.id}
        renderCard={(p) => (
          <div onClick={() => navigate(`/alerts/escalations/${p.id}`)} className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 hover:border-[var(--input)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text)]">{p.name}</span>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--text2)]">{p.description}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-[var(--brand-bg)] text-[12px] font-semibold text-[var(--brand)]">{p.onCallNow.name.charAt(0)}</div>
              <div className="text-[12px]"><span className="text-[var(--text3)]">On-call: </span><span className="text-[var(--text)]">{p.onCallNow.name}</span></div>
              <span className="ml-auto text-[12px] text-[var(--text3)]">{p.steps.length} steps</span>
            </div>
          </div>
        )}
      />
    </FillPage>
  );
}
