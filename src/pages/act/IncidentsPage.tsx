import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Siren } from "lucide-react";
import { useAlertIncidents } from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import type { AlertIncident } from "@/modules/alerting/api/types";

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState("all");
  const { data, isLoading } = useAlertIncidents({});
  const incidents = useMemo(() => (data?.data ?? []) as AlertIncident[], [data]);
  const filtered = incidents.filter((incident) => state === "all" || incident.state === state);

  return <div className="flex min-h-0 flex-1 flex-col gap-5 p-6">
    <div className="flex items-center gap-2"><Siren className="h-6 w-6 text-primary" /><div><h1 className="text-xl font-bold">Incidents</h1><p className="text-xs text-muted-foreground">Runtime incidents from subscribed policies.</p></div></div>
    <div className="flex flex-wrap gap-2 text-xs">{["all", "triggered", "acknowledged", "escalated", "muted", "resolved", "closed"].map((item) => <button key={item} onClick={() => setState(item)} className={state === item ? "rounded-lg bg-primary/10 px-3 py-1.5 capitalize text-primary" : "rounded-lg px-3 py-1.5 capitalize text-muted-foreground"}>{item}</button>)}</div>
    {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading incidents…</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center"><p className="text-sm font-medium">No incidents yet</p><p className="mt-1 text-xs text-muted-foreground">Incidents appear only after a project subscribes to a policy and runtime telemetry breaches it.</p></div> : <div className="overflow-auto rounded-xl border border-border/60"><table className="w-full text-left text-xs"><thead className="border-b border-border/60 bg-muted/40 text-[10px] uppercase text-muted-foreground"><tr><th className="p-3">State</th><th className="p-3">Title</th><th className="p-3">Service</th><th className="p-3">Severity</th></tr></thead><tbody className="divide-y divide-border/40">{filtered.map((incident) => <tr key={incident.id} onClick={() => navigate(`/alerts/${incident.id}`)} className="cursor-pointer hover:bg-muted/20"><td className="p-3"><IncidentStateBadge state={incident.state} size="sm" /></td><td className="p-3 font-medium">{incident.title}</td><td className="p-3">{incident.service}</td><td className="p-3 capitalize">{incident.severity}</td></tr>)}</tbody></table></div>}
  </div>;
}
