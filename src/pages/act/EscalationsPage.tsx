/**
 * Escalation policies — `GET/POST/DELETE /organizations/:orgId/alerting/escalation-policies`.
 *
 * Backend model: a policy is a named repeat/maxRepeats envelope; the ordered
 * steps (waitMinutes, connectorIds, routeIds, notifyOnCall) are edited on the
 * detail page via `PUT /escalation-policies/:id/steps`.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus, PhoneForwarded } from "lucide-react";
import { PageHeader, KpiCard, FillPage, InfiniteCards } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  useEscalationPolicies,
  useEscalationPolicyMutations,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";
import { fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";

export default function EscalationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useEscalationPolicies({ limit: 100 });
  const { create } = useEscalationPolicyMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const policies = data?.data ?? [];

  const handleCreate = (form: FormData) => {
    setFormError(null);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    const repeatMinutesRaw = String(form.get("repeatIntervalMinutes") ?? "").trim();
    create.mutate(
      {
        name,
        description: String(form.get("description") ?? "").trim() || undefined,
        repeatIntervalMinutes: repeatMinutesRaw ? Number(repeatMinutesRaw) : undefined,
        maxRepeats: Number(form.get("maxRepeats") ?? 0),
      },
      {
        onSuccess: (policy) => {
          toast.success("Escalation policy created");
          setDialogOpen(false);
          navigate(`/alerts/escalations/${policy.id}`);
        },
        onError: (err) => setFormError(apiErrorMessage(err, "Could not create policy.")),
      },
    );
  };

  return (
    <FillPage>
      <PageHeader
        title="Escalation policies"
        description="Ordered notification steps with wait times, connectors, routes, and on-call fan-out."
        actions={<UiButton onClick={() => setDialogOpen(true)}><Plus className="size-4" /> New policy</UiButton>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Policies" value={policies.length} icon={PhoneForwarded} />
        <KpiCard label="Active" value={policies.filter((p) => p.isActive).length} />
        <KpiCard label="Repeating" value={policies.filter((p) => p.repeatIntervalMinutes != null).length} />
        <KpiCard label="Inactive" value={policies.filter((p) => !p.isActive).length} />
      </div>

      <InfiniteCards
        className="flex-1"
        loading={isLoading}
        items={policies}
        queryKey={["escalation-policies"]}
        getKey={(p) => p.id}
        renderCard={(p) => (
          <div role="button" tabIndex={0} onClick={() => navigate(`/alerts/escalations/${p.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/alerts/escalations/${p.id}`); } }} className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 hover:border-[var(--input)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text)]">{p.name}</span>
              <EnabledPill enabled={p.isActive} />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--text2)]">{p.description ?? "No description."}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--text3)]">
              <span>{p.repeatIntervalMinutes != null ? `Repeats every ${p.repeatIntervalMinutes}m` : "No repeat"}</span>
              <span className="ml-auto">Max {p.maxRepeats} repeats</span>
            </div>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New escalation policy"
        description="Steps are configured on the policy detail page after creation."
        submitLabel="Create policy"
        pending={create.isPending}
        error={formError}
        onSubmit={handleCreate}
      >
        <DialogField label="Name" name="name" required>
          <input id="name" name="name" className={fieldInputClass} placeholder="Primary on-call" />
        </DialogField>
        <DialogField label="Description" name="description">
          <textarea id="description" name="description" className={fieldTextareaClass} placeholder="When should this policy be used?" />
        </DialogField>
        <div className="grid grid-cols-2 gap-4">
          <DialogField label="Repeat interval (min)" name="repeatIntervalMinutes" hint="Leave blank to never repeat.">
            <input id="repeatIntervalMinutes" name="repeatIntervalMinutes" type="number" min={1} className={fieldInputClass} />
          </DialogField>
          <DialogField label="Max repeats" name="maxRepeats">
            <input id="maxRepeats" name="maxRepeats" type="number" min={0} defaultValue={0} className={fieldInputClass} />
          </DialogField>
        </div>
      </FormDialog>
    </FillPage>
  );
}
