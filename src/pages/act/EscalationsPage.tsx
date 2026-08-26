import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Clock, TrendingUp } from "lucide-react";
import { useAlertingWorkspace } from "@/modules/alerting/hooks/useAlerting";

interface EscalationRow {
  id: string;
  systemKey: string;
  name: string;
  description: string;
  acknowledgementTimeoutSeconds: number;
  repeatIntervalSeconds: number;
  maxRepeats: number;
  steps: Array<{ stepNumber: number; waitSeconds: number; connectorIds: string[]; routeIds: string[] }>;
}

export default function EscalationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useAlertingWorkspace();
  const policies = useMemo(() => (data?.escalationPolicies ?? []) as unknown as EscalationRow[], [data]);

  return <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
    <div className="border-b border-border/60 pb-4"><div className="flex items-center gap-2"><TrendingUp className="h-6 w-6 text-purple-500" /><h1 className="text-2xl font-bold">Escalation Policies</h1></div><p className="mt-1 text-xs text-muted-foreground">Provisioned escalation defaults remain connector-free until your organization configures delivery targets.</p></div>
    {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading escalation policies…</div> : policies.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No escalation policies are configured.</div> : <div className="space-y-5">{policies.map((policy) => <button key={policy.id} onClick={() => navigate(`/alerts/escalations/${policy.id}`)} className="block w-full rounded-xl border border-border/60 bg-card/60 p-6 text-left shadow-sm transition-colors hover:border-primary/40"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{policy.name}</h2><span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">{policy.systemKey}</span></div><p className="mt-1 text-xs text-muted-foreground">{policy.description}</p></div><div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Ack timeout {Math.round(policy.acknowledgementTimeoutSeconds / 60)}m</div></div><div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">{(policy.steps ?? []).map((step) => <div key={step.stepNumber} className="rounded-lg border border-border/40 bg-muted/20 p-3"><div className="flex justify-between text-xs font-semibold"><span>Step {step.stepNumber}</span><span>+{Math.round(step.waitSeconds / 60)}m</span></div><p className="mt-2 text-[11px] text-muted-foreground">{step.connectorIds.length || step.routeIds.length ? "Configured target" : "No connector selected"}</p></div>)}</div></button>)}</div>}
  </div>;
}
