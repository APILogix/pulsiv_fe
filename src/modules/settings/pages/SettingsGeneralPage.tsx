import { useActionState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { Loader2 } from "lucide-react";
import { Field, SubmitButton, inputClass } from "@/shared/observe";
import { toast } from "sonner";

export default function SettingsGeneralPage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: orgQueryKeys.settings(activeOrgId!),
    queryFn: () => orgApi.getSettings(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const [state, saveAction] = useActionState(
    async (_prevState: any, formData: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active org" };
      try {
        await orgApi.updateSettings(activeOrgId, {
          dataRegion: formData.get("dataRegion") as string,
          sessionTimeoutMinutes: parseInt(formData.get("sessionTimeoutMinutes") as string, 10),
          dataRetentionDays: parseInt(formData.get("dataRetentionDays") as string, 10),
          auditLogRetentionDays: parseInt(formData.get("auditLogRetentionDays") as string, 10),
        });
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.settings(activeOrgId) });
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.response?.data?.message || "Failed to update settings" };
      }
    },
    { ok: false, error: null }
  );

  useEffect(() => {
    if (state.ok) toast.success("Organization settings updated");
    if (state.error) toast.error(state.error);
  }, [state]);

  if (isLoading || !settings) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">General Settings</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Manage global preferences, data retention, and regions.</p>
      </div>

      <div className="bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] p-6 max-w-xl">
        <form action={saveAction} className="flex flex-col gap-5">
          <Field label="Data Region" hint="Where your organization's data is stored.">
            <select name="dataRegion" defaultValue={settings.dataRegion} className={inputClass}>
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="eu-central-1">EU Central (Frankfurt)</option>
              <option value="ap-southeast-1">AP Southeast (Singapore)</option>
            </select>
          </Field>
          
          <Field label="Data Retention (Days)" hint="How long operational data is kept.">
            <input name="dataRetentionDays" type="number" defaultValue={settings.dataRetentionDays} className={inputClass} />
          </Field>

          <Field label="Audit Log Retention (Days)">
            <input name="auditLogRetentionDays" type="number" defaultValue={settings.auditLogRetentionDays} className={inputClass} />
          </Field>
          
          <Field label="Session Timeout (Minutes)" hint="Idle time before users are automatically logged out.">
            <input name="sessionTimeoutMinutes" type="number" defaultValue={settings.sessionTimeoutMinutes} className={inputClass} />
          </Field>

          <div className="pt-2"><SubmitButton>Save Settings</SubmitButton></div>
        </form>
      </div>
    </div>
  );
}
