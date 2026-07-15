import { useActionState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Field, SubmitButton, inputClass } from "@/shared/observe";

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
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--text2)]" /></div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-[800px] w-full">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">General Settings</h1>
        <p className="text-sm text-[var(--text2)] mt-1.5">Manage your organization's global preferences, data retention, and regions.</p>
      </div>

      <form action={saveAction} className="flex flex-col gap-8">
        
        {/* Data Region Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] shadow-sm overflow-hidden">
          <div className="p-6 pb-5">
            <h2 className="text-base font-semibold text-[var(--text)]">Data Region</h2>
            <p className="text-sm text-[var(--text2)] mt-1 mb-5">Select where your organization's data is primarily stored. This affects latency and compliance.</p>
            <div className="max-w-md">
              <Field label="Region">
                <select name="dataRegion" defaultValue={settings.dataRegion} className={inputClass}>
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="eu-central-1">EU Central (Frankfurt)</option>
                  <option value="ap-southeast-1">AP Southeast (Singapore)</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="bg-[var(--bg2)] border-t border-[var(--border)] px-6 py-3.5 flex items-center justify-between">
            <p className="text-[13px] text-[var(--text3)]">Changes to data region may require migration time.</p>
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </div>

        {/* Data Retention Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] shadow-sm overflow-hidden">
          <div className="p-6 pb-5">
            <h2 className="text-base font-semibold text-[var(--text)]">Data Retention</h2>
            <p className="text-sm text-[var(--text2)] mt-1 mb-5">Configure how long operational data and audit logs are retained before automatic deletion.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
              <Field label="Operational Data (Days)">
                <input name="dataRetentionDays" type="number" defaultValue={settings.dataRetentionDays} className={inputClass} />
              </Field>
              <Field label="Audit Logs (Days)">
                <input name="auditLogRetentionDays" type="number" defaultValue={settings.auditLogRetentionDays} className={inputClass} />
              </Field>
            </div>
          </div>
          <div className="bg-[var(--bg2)] border-t border-[var(--border)] px-6 py-3.5 flex justify-end">
            <SubmitButton>Save Retention</SubmitButton>
          </div>
        </div>

        {/* Security Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] shadow-sm overflow-hidden">
          <div className="p-6 pb-5">
            <h2 className="text-base font-semibold text-[var(--text)]">Security & Sessions</h2>
            <p className="text-sm text-[var(--text2)] mt-1 mb-5">Manage session durations to ensure organizational security compliance.</p>
            
            <div className="max-w-md">
              <Field label="Session Timeout (Minutes)">
                <input name="sessionTimeoutMinutes" type="number" defaultValue={settings.sessionTimeoutMinutes} className={inputClass} />
              </Field>
            </div>
          </div>
          <div className="bg-[var(--bg2)] border-t border-[var(--border)] px-6 py-3.5 flex justify-end">
            <SubmitButton>Save Security</SubmitButton>
          </div>
        </div>

      </form>
    </div>
  );
}
