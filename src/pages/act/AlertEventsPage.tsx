import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AlertOctagon, Search } from "lucide-react";
import { useAlertEvents } from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { toIncidentView } from "@/modules/alerting/components/incident-view";
import type { IncidentState } from "@/modules/alerting/api/types";

export default function AlertEventsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState("all");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAlertEvents({});
  const incidents = useMemo(() => (data?.data ?? []).map(toIncidentView), [data]);
  const filtered = incidents.filter((incident) => {
    const matchesState = state === "all" || incident.state === state;
    const matchesSearch = `${incident.title} ${incident.service} ${incident.fingerprint}`.toLowerCase().includes(search.toLowerCase());
    return matchesState && matchesSearch;
  });

  return <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
    <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><AlertOctagon className="h-6 w-6 text-rose-500" /><h1 className="text-2xl font-bold">Incident Command Center</h1></div><p className="mt-1 text-xs text-muted-foreground">Live incidents and alert events from the Alerting runtime.</p></div><div className="text-xs text-muted-foreground">{data?.total ?? 0} runtime events</div></div>
    <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3 text-xs">{["all", "triggered", "acknowledged", "escalated", "muted", "resolved", "closed"].map((item) => <button key={item} onClick={() => setState(item)} className={state === item ? "rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 capitalize text-primary" : "rounded-lg px-3 py-1.5 capitalize text-muted-foreground"}>{item}</button>)}</div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter incidents" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs" /></div>
    {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading incidents…</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center"><p className="text-sm font-medium">No incidents yet</p><p className="mt-1 text-xs text-muted-foreground">Runtime incidents appear here after telemetry evaluates a subscribed policy.</p></div> : <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60"><table className="w-full text-left text-xs"><thead className="border-b border-border/60 bg-muted/40 text-[10px] uppercase text-muted-foreground"><tr><th className="p-3">State</th><th className="p-3">Title</th><th className="p-3">Service</th><th className="p-3">Occurrences</th><th className="p-3">Last triggered</th></tr></thead><tbody className="divide-y divide-border/40">{filtered.map((incident) => <tr key={incident.id} onClick={() => navigate(`/alerts/${incident.id}`)} className="cursor-pointer hover:bg-muted/20"><td className="p-3"><IncidentStateBadge state={incident.state as IncidentState} size="sm" /></td><td className="p-3"><div className="font-semibold">{incident.title}</div><div className="text-[11px] text-muted-foreground">{incident.summary}</div></td><td className="p-3">{incident.service}<span className="block text-[10px] uppercase text-muted-foreground">{incident.environment}</span></td><td className="p-3 font-mono">{incident.occurrenceCount}x</td><td className="p-3 text-muted-foreground">{new Date(incident.lastTriggeredAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
  </div>;
}
