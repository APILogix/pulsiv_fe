import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Clock, Phone } from "lucide-react";
import { useAlertingWorkspace } from "@/modules/alerting/hooks/useAlerting";
import { DetailSkeleton, PageHeader, SectionCard } from "@/shared/observe";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";

interface EscalationStep {
  id: string;
  stepNumber: number;
  waitSeconds: number;
  connectorIds: string[];
  routeIds: string[];
  notifyOnCall: boolean;
  isActive: boolean;
}

interface EscalationPolicy {
  id: string;
  systemKey: string;
  name: string;
  description: string;
  acknowledgementTimeoutSeconds: number;
  repeatIntervalSeconds: number;
  maxRepeats: number;
  steps: EscalationStep[];
}

export default function EscalationDetailPage() {
  const { policyId = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAlertingWorkspace();
  const policy = useMemo(() => (data?.escalationPolicies ?? []).find((item) => (item as unknown as EscalationPolicy).id === policyId) as unknown as EscalationPolicy | undefined, [data, policyId]);

  if (isLoading) return <DetailSkeleton />;
  if (!policy) return <div className="p-8 text-sm text-muted-foreground">Escalation policy not found.</div>;

  return <div className="flex flex-col gap-6 p-6">
    <button onClick={() => navigate("/alerts/escalations")} className="flex items-center gap-1.5 self-start text-xs text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back to escalations</button>
    <PageHeader title={policy.name} description={policy.description} breadcrumbs={[{ label: "Act", to: "/alerts" }, { label: "Escalations", to: "/alerts/escalations" }, { label: policy.name }]} />
    <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4"><div><span className="text-muted-foreground">System key</span><p className="font-mono">{policy.systemKey}</p></div><div><span className="text-muted-foreground">Acknowledgement timeout</span><p>{Math.round(policy.acknowledgementTimeoutSeconds / 60)}m</p></div><div><span className="text-muted-foreground">Repeat interval</span><p>{Math.round(policy.repeatIntervalSeconds / 60)}m</p></div><div><span className="text-muted-foreground">Max repeats</span><p>{policy.maxRepeats}</p></div></div>
    <SectionCard title="Provisioned escalation steps">
      {policy.steps.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No steps configured.</div> : <div className="flex flex-col gap-3">{policy.steps.slice().sort((a, b) => a.stepNumber - b.stepNumber).map((step) => <div key={step.id} className="rounded-xl border border-border bg-card/50 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Phone className="h-4 w-4 text-primary" />Step {step.stepNumber}</div><EnabledPill enabled={step.isActive} /></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4"><div><span className="text-muted-foreground">Wait</span><p className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(step.waitSeconds / 60)}m</p></div><div><span className="text-muted-foreground">Connectors</span><p>{step.connectorIds.length || "None selected"}</p></div><div><span className="text-muted-foreground">Routes</span><p>{step.routeIds.length || "None selected"}</p></div><div><span className="text-muted-foreground">On-call</span><p>{step.notifyOnCall ? "Enabled" : "Disabled"}</p></div></div></div>)}</div>}
    </SectionCard>
  </div>;
}
