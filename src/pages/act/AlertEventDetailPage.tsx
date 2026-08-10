import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckSquare, Eye, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useAlertEvent, useAlertEventMutations } from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { DetailSkeleton } from "@/shared/observe";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";

export default function AlertEventDetailPage() {
  const { incidentId = "" } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading } = useAlertEvent(incidentId);
  const { acknowledge, resolve, silenceFromEvent } = useAlertEventMutations();
  const [comment, setComment] = useState("");

  if (isLoading) return <DetailSkeleton />;
  if (!event) return <div className="p-8 text-sm text-muted-foreground">Runtime event not found.</div>;

  const onAcknowledge = () => acknowledge.mutate({ id: event.id, body: { comment } }, { onSuccess: () => toast.success("Event acknowledged"), onError: (error) => toast.error(apiErrorMessage(error, "Could not acknowledge event.")) });
  const onSilence = () => silenceFromEvent.mutate({ id: event.id, body: { durationMinutes: 60, comment } }, { onSuccess: () => toast.success("Event silenced"), onError: (error) => toast.error(apiErrorMessage(error, "Could not silence event.")) });
  const onResolve = () => resolve.mutate({ id: event.id, body: { reason: comment || "Resolved from command center" } }, { onSuccess: () => toast.success("Event resolved"), onError: (error) => toast.error(apiErrorMessage(error, "Could not resolve event.")) });

  return <div className="mx-auto w-full max-w-[1200px] space-y-5 p-6">
    <button onClick={() => navigate("/alerts")} className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back to incidents</button>
    <div className="rounded-xl border border-border/60 bg-card/60 p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex items-center gap-2"><IncidentStateBadge state={(event.status === "firing" ? "triggered" : event.status) as never} size="lg" /><span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs capitalize text-rose-400">{event.severity}</span></div><h1 className="mt-3 text-xl font-bold">{event.source}</h1><p className="mt-1 text-xs text-muted-foreground">Fingerprint: {event.fingerprint}</p></div><div className="text-right font-mono text-xs text-muted-foreground"><span className="block text-[10px] uppercase">Occurrences</span><span className="text-lg font-bold text-primary">{event.duplicateCount}</span></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs md:grid-cols-4"><div><span className="text-muted-foreground">Status</span><p>{event.status}</p></div><div><span className="text-muted-foreground">Started</span><p>{new Date(event.startedAt).toLocaleString()}</p></div><div><span className="text-muted-foreground">Project</span><p>{event.projectId ?? "Organization"}</p></div><div><span className="text-muted-foreground">Rule</span><p>{event.ruleId ?? "Unbound"}</p></div></div>
    </div>
    <div className="flex flex-wrap gap-2"><button onClick={onAcknowledge} disabled={acknowledge.isPending} className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400"><Eye className="h-3.5 w-3.5" />Acknowledge</button><button onClick={onSilence} disabled={silenceFromEvent.isPending} className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400"><VolumeX className="h-3.5 w-3.5" />Silence</button><button onClick={onResolve} disabled={resolve.isPending} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-emerald-950"><CheckSquare className="h-3.5 w-3.5" />Resolve</button></div>
    <textarea value={comment} onChange={(eventInput) => setComment(eventInput.target.value)} rows={3} placeholder="Optional lifecycle comment" className="w-full rounded-xl border border-border bg-background p-3 text-xs" />
    <pre className="max-h-[420px] overflow-auto rounded-xl border border-border/60 bg-card/60 p-4 text-xs">{JSON.stringify(event.payload, null, 2)}</pre>
  </div>;
}
