import { useActionState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { UpdateOrganizationBody } from "@/modules/organizations/types/org.types";
import { Button, Field, PageHeader, SectionCard, SubmitButton, inputClass } from "@/shared/observe";

const normalizeOptional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

const toInt = (value: FormDataEntryValue | null, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function OrgSettingsPage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: orgQueryKeys.detail(activeOrgId!),
    queryFn: () => orgApi.getOrganization(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: orgQueryKeys.settings(activeOrgId!),
    queryFn: () => orgApi.getSettings(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: me } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "me"],
    queryFn: () => orgApi.getMe(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: members } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "transfer-candidates"],
    queryFn: () => orgApi.listMembers(activeOrgId!, { limit: 100, status: "active" }),
    enabled: !!activeOrgId && me?.role === "owner",
  });

  const invalidateOrg = () => {
    if (!activeOrgId) return;
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.settings(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
  };

  const [profileState, saveProfile] = useActionState(
    async (_prev: any, formData: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const body: UpdateOrganizationBody = {
          name: String(formData.get("name") || "").trim(),
          logoUrl: normalizeOptional(formData.get("logoUrl")) ?? null,
          billingEmail: normalizeOptional(formData.get("billingEmail")),
          industry: normalizeOptional(formData.get("industry")) ?? null,
          companySize: normalizeOptional(formData.get("companySize")) ?? null,
        };
        await orgApi.updateOrganization(activeOrgId, body);
        invalidateOrg();
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to update organization profile" };
      }
    },
    { ok: false, error: null },
  );

  const [preferencesState, savePreferences] = useActionState(
    async (_prev: any, formData: FormData) => {
      if (!activeOrgId || !settings || !org) return { ok: false, error: "No active organization" };
      try {
        await orgApi.updateOrganization(activeOrgId, {
          timezone: String(formData.get("timezone") || org.timezone || "UTC"),
        });
        await orgApi.updateSettings(activeOrgId, {
          dataRegion: String(formData.get("dataRegion") || settings.dataRegion),
          sessionTimeoutMinutes: toInt(formData.get("sessionTimeoutMinutes"), settings.sessionTimeoutMinutes),
          dataRetentionDays: toInt(formData.get("dataRetentionDays"), settings.dataRetentionDays),
          auditLogRetentionDays: toInt(formData.get("auditLogRetentionDays"), settings.auditLogRetentionDays),
          enforceMfa: formData.get("enforceMfa") === "on",
        });
        invalidateOrg();
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to update preferences" };
      }
    },
    { ok: false, error: null },
  );

  useEffect(() => {
    if (profileState.ok) toast.success("Organization profile saved");
    if (profileState.error) toast.error(profileState.error);
  }, [profileState]);

  useEffect(() => {
    if (preferencesState.ok) toast.success("Organization preferences saved");
    if (preferencesState.error) toast.error(preferencesState.error);
  }, [preferencesState]);

  if (orgLoading || settingsLoading || !org || !settings) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text2)]" />
      </div>
    );
  }

  const ownerOnly = me?.role === "owner";

  return (
    <div className="flex w-full max-w-[900px] flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Organization profile, preferences, and owner-only destructive actions."
      />

      <form action={saveProfile}>
        <SectionCard title="Organization Profile">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Logo URL" hint="SVG or PNG URL. File upload is not enabled by the backend yet.">
              <input name="logoUrl" defaultValue={org.logoUrl || ""} className={inputClass} />
            </Field>
            <Field label="Organization name">
              <input name="name" defaultValue={org.name} className={inputClass} required />
            </Field>
            <Field label="Slug" hint={`Used in URLs: pulsiv.io/org/${org.slug}`}>
              <input value={org.slug} className={inputClass} disabled readOnly />
            </Field>
            <Field label="Billing email">
              <input name="billingEmail" type="email" defaultValue={org.billingEmail || ""} className={inputClass} />
            </Field>
            <Field label="Industry">
              <select name="industry" defaultValue={org.industry || ""} className={inputClass}>
                <option value="">Not set</option>
                <option value="software">Software</option>
                <option value="fintech">Fintech</option>
                <option value="healthcare">Healthcare</option>
                <option value="commerce">Commerce</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Company size">
              <select name="companySize" defaultValue={org.companySize || ""} className={inputClass}>
                <option value="">Not set</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-1000">201-1000</option>
                <option value="1000+">1000+</option>
              </select>
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <SubmitButton>Save profile</SubmitButton>
            </div>
          </div>
        </SectionCard>
      </form>

      <form action={savePreferences}>
        <SectionCard title="Preferences">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Default timezone">
              <select name="timezone" defaultValue={org.timezone || "UTC"} className={inputClass}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
              </select>
            </Field>
            <Field label="Data residency">
              <select name="dataRegion" defaultValue={settings.dataRegion} className={inputClass}>
                <option value="us-east-1">US</option>
                <option value="eu-west-1">EU</option>
                <option value="ap-south-1">APAC</option>
              </select>
            </Field>
            <Field label="Session timeout">
              <select name="sessionTimeoutMinutes" defaultValue={settings.sessionTimeoutMinutes} className={inputClass}>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
                <option value="1440">Never</option>
              </select>
            </Field>
            <Field label="API log retention">
              <select name="dataRetentionDays" defaultValue={settings.dataRetentionDays} className={inputClass}>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </Field>
            <Field label="Audit log retention">
              <select name="auditLogRetentionDays" defaultValue={settings.auditLogRetentionDays} className={inputClass}>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </Field>
            <label className="flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)]">
              <input name="enforceMfa" type="checkbox" defaultChecked={settings.enforceMfa} />
              Require MFA for all members
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <SubmitButton>Save preferences</SubmitButton>
            </div>
          </div>
        </SectionCard>
      </form>

      {ownerOnly && (
        <SectionCard title="Danger Zone" className="border-red-500/30">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3 rounded-[8px] border border-red-500/20 bg-red-500/5 p-4">
              <ShieldAlert className="mt-0.5 size-5 text-red-500" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--text)]">Transfer ownership</div>
                <p className="mt-1 text-sm text-[var(--text2)]">Old owner becomes an admin after transfer.</p>
                <form
                  className="mt-4 flex flex-wrap items-end gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!activeOrgId) return;
                    const formData = new FormData(event.currentTarget);
                    const newOwnerUserId = String(formData.get("newOwnerUserId") || "");
                    if (!newOwnerUserId) return toast.error("Select a new owner");
                    try {
                      await orgApi.transferOwnership(activeOrgId, { newOwnerUserId });
                      toast.success("Ownership transferred");
                      invalidateOrg();
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Failed to transfer ownership");
                    }
                  }}
                >
                  <div className="min-w-[260px] flex-1">
                    <Field label="New owner">
                      <select name="newOwnerUserId" defaultValue="" className={inputClass}>
                        <option value="" disabled>Select a member</option>
                        {(members?.data ?? []).filter((member) => member.userId !== me?.userId).map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.fullName || member.email} ({member.role})
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Button type="submit">Transfer ownership</Button>
                </form>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-[8px] border border-red-500/20 bg-red-500/5 p-4">
              <ShieldAlert className="mt-0.5 size-5 text-red-500" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--text)]">Delete organization</div>
                <p className="mt-1 text-sm text-[var(--text2)]">Type the org slug to confirm. All API logs, monitors, and member data will be permanently deleted.</p>
                <form
                  className="mt-4 flex flex-wrap items-end gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!activeOrgId) return;
                    const formData = new FormData(event.currentTarget);
                    if (String(formData.get("confirmSlug") || "") !== org.slug) {
                      return toast.error("Slug does not match");
                    }
                    try {
                      await orgApi.deleteOrganization(activeOrgId);
                      toast.success("Organization deleted");
                      queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Failed to delete organization");
                    }
                  }}
                >
                  <div className="min-w-[260px] flex-1">
                    <Field label="Confirm slug">
                      <input name="confirmSlug" placeholder={org.slug} className={inputClass} />
                    </Field>
                  </div>
                  <Button type="submit" variant="danger">Delete organization</Button>
                </form>
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
