/**
 * Silences — `GET/POST/DELETE /organizations/:orgId/alerting/silences`.
 *
 * A silence suppresses matching alert events between `startsAt` and `endsAt`.
 * `matchers` is an arbitrary label-match object interpreted by the batch
 * pipeline; `ruleId` optionally scopes the silence to one rule.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Plus, BellOff, Trash2 } from "lucide-react";
import { PageHeader, KpiCard, FillPage, Table, Tr, Td, Timestamp, FilterSelect } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  useSilenceMutations,
  useSilences,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, ConfirmDialog, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";
import { fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import type { AlertSilence } from "@/modules/alerting/api/types";

const ACTIVE_OPTS = [
  { value: "", label: "All silences" },
  { value: "true", label: "Active only" },
  { value: "false", label: "Expired / future" },
];

function toDatetimeLocal(offsetMinutes: number): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function SilencesPage() {
  const [activeFilter, setActiveFilter] = useState("");
  const { data, isLoading } = useSilences({
    limit: 100,
    ...(activeFilter ? { active: activeFilter === "true" } : {}),
  });
  const { create, remove } = useSilenceMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertSilence | null>(null);
  const silences = data?.data ?? [];

  const handleCreate = (form: FormData) => {
    setFormError(null);
    const startsAt = String(form.get("startsAt") ?? "");
    const endsAt = String(form.get("endsAt") ?? "");
    if (!startsAt || !endsAt) {
      setFormError("Start and end time are required.");
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setFormError("End time must be after start time.");
      return;
    }
    let matchers: Record<string, unknown> = {};
    const matchersRaw = String(form.get("matchers") ?? "").trim();
    if (matchersRaw) {
      try {
        matchers = JSON.parse(matchersRaw);
      } catch {
        setFormError("Matchers must be valid JSON.");
        return;
      }
    }
    const ruleId = String(form.get("ruleId") ?? "").trim();
    create.mutate(
      {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        comment: String(form.get("comment") ?? "").trim() || undefined,
        ruleId: ruleId || undefined,
        matchers,
      },
      {
        onSuccess: () => {
          toast.success("Silence created");
          setDialogOpen(false);
        },
        onError: (err) => setFormError(apiErrorMessage(err, "Could not create silence.")),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Silence expired");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Could not expire silence.")),
    });
  };

  const now = Date.now();
  const activeCount = silences.filter((s) => s.isActive && new Date(s.startsAt).getTime() <= now && new Date(s.endsAt).getTime() >= now).length;
  const upcomingCount = silences.filter((s) => new Date(s.startsAt).getTime() > now).length;

  return (
    <FillPage>
      <PageHeader
        title="Silences"
        description="Suppress matching alert events for a fixed window without disabling the underlying rule."
        actions={<UiButton onClick={() => setDialogOpen(true)}><Plus className="size-4" /> New silence</UiButton>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total" value={silences.length} icon={BellOff} />
        <KpiCard label="Active now" value={activeCount} />
        <KpiCard label="Upcoming" value={upcomingCount} />
        <KpiCard label="Rule-scoped" value={silences.filter((s) => s.ruleId).length} />
      </div>

      <div className="flex">
        <FilterSelect value={activeFilter} onChange={setActiveFilter} options={ACTIVE_OPTS} label="Filter" />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="loading-skeleton h-11 rounded-[var(--radius)] bg-[var(--bg2)]" />)}
        </div>
      ) : silences.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--text3)]">No silences match this filter.</div>
      ) : (
        <Table headers={["Comment", "Rule", "Starts", "Ends", "Status", ""]} maxHeight="calc(100vh - 22rem)">
          {silences.map((s) => (
            <Tr key={s.id}>
              <Td>{s.comment ?? <span className="text-[var(--text3)]">—</span>}</Td>
              <Td>{s.ruleId ? <code className="font-[family-name:var(--mono)] text-[11.5px]">{s.ruleId.slice(0, 8)}…</code> : <span className="text-[var(--text3)]">All rules</span>}</Td>
              <Td><Timestamp value={s.startsAt} /></Td>
              <Td><Timestamp value={s.endsAt} /></Td>
              <Td><EnabledPill enabled={s.isActive} /></Td>
              <Td className="text-right">
                {s.isActive && (
                  <UiButton variant="ghost" className="h-8 w-8 p-0" onClick={() => setDeleteTarget(s)}>
                    <Trash2 className="size-4 text-[var(--red)]" />
                  </UiButton>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New silence"
        description="Matching events won't fire notifications while the silence is active."
        submitLabel="Create silence"
        pending={create.isPending}
        error={formError}
        onSubmit={handleCreate}
      >
        <DialogField label="Comment" name="comment" hint="Why is this silence needed?">
          <input id="comment" name="comment" className={fieldInputClass} placeholder="Planned maintenance on checkout-api" />
        </DialogField>
        <div className="grid grid-cols-2 gap-4">
          <DialogField label="Starts at" name="startsAt" required>
            <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toDatetimeLocal(0)} className={fieldInputClass} />
          </DialogField>
          <DialogField label="Ends at" name="endsAt" required>
            <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toDatetimeLocal(60)} className={fieldInputClass} />
          </DialogField>
        </div>
        <DialogField label="Rule id" name="ruleId" hint="Optional. Leave blank to match across all rules.">
          <input id="ruleId" name="ruleId" className={fieldInputClass} placeholder="UUID" />
        </DialogField>
        <DialogField label="Matchers (JSON)" name="matchers" hint="Label match object, e.g. { &quot;service&quot;: &quot;checkout-api&quot; }.">
          <textarea id="matchers" name="matchers" className={`${fieldTextareaClass} min-h-[80px] font-[family-name:var(--mono)] text-[12px]`} defaultValue="{}" spellCheck={false} />
        </DialogField>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Expire this silence?"
        description="Matching events will start firing notifications again immediately."
        confirmLabel="Expire silence"
        pending={remove.isPending}
        onConfirm={handleDelete}
      />
    </FillPage>
  );
}
