import { useState } from "react";
import { toast } from "sonner";
import { VolumeX, Plus, Trash2 } from "lucide-react";
import { useSilenceMutations, useSilences } from "@/modules/alerting/hooks/useAlerting";
import type { AlertSilence } from "@/modules/alerting/api/types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SilencesPage() {
  const { data, isLoading } = useSilences({ active: true, limit: 100 });
  const { create, remove } = useSilenceMutations();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const silences = data?.data ?? [];

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({ startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), comment }, {
      onSuccess: () => { toast.success("Silence created"); setOpen(false); setComment(""); },
      onError: (error) => toast.error(apiErrorMessage(error, "Could not create silence.")),
    });
  };

  const handleRemove = (silence: AlertSilence) => {
    remove.mutate(silence.id, {
      onSuccess: () => toast.success("Silence expired"),
      onError: (error) => toast.error(apiErrorMessage(error, "Could not expire silence.")),
    });
  };

  return <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
    <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><VolumeX className="h-6 w-6 text-amber-500" /><h1 className="text-2xl font-bold">Silences</h1></div><p className="mt-1 text-xs text-muted-foreground">Runtime suppression configuration. No silences are created during organization provisioning.</p></div><button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"><Plus className="h-4 w-4" />Create silence</button></div>
    {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading silences…</div> : silences.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No active silences.</div> : <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60"><table className="w-full text-left text-xs"><thead className="border-b border-border/60 bg-muted/40 text-[10px] uppercase text-muted-foreground"><tr><th className="p-3">Comment</th><th className="p-3">Starts</th><th className="p-3">Ends</th><th className="p-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border/40">{silences.map((silence) => <tr key={silence.id}><td className="p-3">{silence.comment || "No comment"}</td><td className="p-3 text-muted-foreground">{new Date(silence.startsAt).toLocaleString()}</td><td className="p-3 text-muted-foreground">{new Date(silence.endsAt).toLocaleString()}</td><td className="p-3 text-right"><button onClick={() => handleRemove(silence)} className="text-rose-400"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create silence</DialogTitle></DialogHeader><form onSubmit={handleCreate} className="space-y-4 text-xs"><input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" /><input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" /><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Reason" className="w-full rounded-lg border border-border bg-background p-3" /><button disabled={create.isPending} className="float-right rounded-lg bg-primary px-4 py-2 text-primary-foreground">{create.isPending ? "Creating…" : "Create silence"}</button></form></DialogContent></Dialog>
  </div>;
}
