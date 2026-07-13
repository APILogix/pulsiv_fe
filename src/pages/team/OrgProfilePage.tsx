import { useActionState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, Field, SubmitButton, Button, inputClass } from "@/shared/observe";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { UpdateOrganizationBody } from "@/modules/organizations/types/org.types";
import { toast } from "sonner"; // Or however toasts are done

const normalizeOptional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

export default function OrgProfilePage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();



  const { data: org, isLoading } = useQuery({
    queryKey: orgQueryKeys.detail(activeOrgId!),
    queryFn: () => orgApi.getOrganization(activeOrgId!),
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

  const [state, saveAction] = useActionState(
    async (_prevState: any, formData: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const body: UpdateOrganizationBody = {
          name: (formData.get("name") as string)?.trim(),
          description: normalizeOptional(formData.get("description")) ?? null,
          logoUrl: normalizeOptional(formData.get("logoUrl")) ?? null,
          websiteUrl: normalizeOptional(formData.get("websiteUrl")) ?? null,
          industry: normalizeOptional(formData.get("industry")) ?? null,
          companySize: normalizeOptional(formData.get("companySize")) ?? null,
          country: normalizeOptional(formData.get("country")) ?? null,
          timezone: normalizeOptional(formData.get("timezone")),
          billingEmail: normalizeOptional(formData.get("billingEmail")),
          supportEmail: normalizeOptional(formData.get("supportEmail")) ?? null,
        };
        await orgApi.updateOrganization(activeOrgId, body);
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId) });
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.response?.data?.message || "Failed to update profile" };
      }
    },
    { ok: false, error: null }
  );

  useEffect(() => {
    if (state.ok) toast.success("Organization profile saved");
    if (state.error) toast.error(state.error);
  }, [state]);

  if (isLoading || !org) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Organization Profile" description="Organization identity, ownership, and base settings." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Members" value="-" icon={Building2} />
        <KpiCard label="Projects" value="-" />
        <KpiCard label="Status" value={org.status === 'active' ? "Active" : org.status} />
        <KpiCard label="Created" value={new Date(org.createdAt).toLocaleDateString()} />
      </div>

      <SectionCard title="Identity">
        <form action={saveAction} className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Organization name">
            <input name="name" defaultValue={org.name} className={inputClass} required />
          </Field>
          <Field label="Slug" hint="Used in URLs and SSO endpoints.">
            <input disabled defaultValue={org.slug} className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea name="description" defaultValue={org.description || ""} className={inputClass} rows={3} />
            </Field>
          </div>
          <Field label="Logo URL">
            <input name="logoUrl" defaultValue={org.logoUrl || ""} className={inputClass} />
          </Field>
          <Field label="Website URL">
            <input name="websiteUrl" defaultValue={org.websiteUrl || ""} className={inputClass} />
          </Field>
          <Field label="Industry">
            <input name="industry" defaultValue={org.industry || ""} className={inputClass} />
          </Field>
          <Field label="Company size">
            <input name="companySize" defaultValue={org.companySize || ""} className={inputClass} />
          </Field>
          <Field label="Country">
            <input name="country" defaultValue={org.country || ""} className={inputClass} />
          </Field>
          <Field label="Timezone">
            <input name="timezone" defaultValue={org.timezone || ""} className={inputClass} />
          </Field>
          <Field label="Billing email">
            <input type="email" name="billingEmail" defaultValue={org.billingEmail || ''} className={inputClass} />
          </Field>
          <Field label="Support email">
            <input type="email" name="supportEmail" defaultValue={org.supportEmail || ''} className={inputClass} />
          </Field>
          <div className="sm:col-span-2"><SubmitButton>Save profile</SubmitButton></div>
        </form>
      </SectionCard>

      <SectionCard title="Ownership transfer" className="border-[var(--amber)]/30">
        {me?.role === "owner" ? (
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!activeOrgId) return;
              const formData = new FormData(event.currentTarget);
              const newOwnerUserId = formData.get("newOwnerUserId") as string;
              if (!newOwnerUserId) return toast.error("Select a target owner");
              if (!confirm("Transfer organization ownership to the selected member?")) return;
              try {
                await orgApi.transferOwnership(activeOrgId, { newOwnerUserId });
                toast.success("Ownership transferred");
                queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId) });
                queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
              } catch (err: any) {
                toast.error(err?.response?.data?.message || "Failed to transfer ownership");
              }
            }}
          >
            <div className="flex-1">
              <Field label="New owner">
                <select name="newOwnerUserId" className={inputClass} defaultValue="">
                  <option value="" disabled>Select an active member</option>
                  {(members?.data || []).flatMap((member) => 
                    member.userId !== me.userId ? [(
                      <option key={member.userId} value={member.userId}>
                        {member.fullName || member.email} ({member.role})
                      </option>
                    )] : []
                  )}
                </select>
              </Field>
            </div>
            <Button variant="secondary" type="submit">Transfer ownership</Button>
          </form>
        ) : (
          <p className="text-[13px] text-[var(--text2)]">Only the current organization owner can transfer ownership.</p>
        )}
      </SectionCard>
      
      <SectionCard title="Danger Zone" className="border-[var(--red)]/30 mt-4">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--red)]">Leave Organization</div>
              <p className="text-[13px] text-[var(--text2)]">Remove yourself from this organization. You will lose access immediately.</p>
            </div>
            <Button variant="danger" onClick={async () => {
              if (confirm("Are you sure you want to leave this organization?")) {
                try {
                  await orgApi.leaveOrganization(activeOrgId!);
                  toast.success("You have left the organization");
                  queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
                } catch (err: any) {
                  toast.error(err.response?.data?.message || "Failed to leave");
                }
              }
            }}>Leave</Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--red)]">{org.status === "archived" ? "Restore Organization" : "Archive Organization"}</div>
              <p className="text-[13px] text-[var(--text2)]">{org.status === "archived" ? "Restore access to this organization." : "Suspend all resources and user access temporarily."}</p>
            </div>
            <Button variant="danger" onClick={async () => {
              if (confirm(org.status === "archived" ? "Restore this organization?" : "Are you sure you want to archive this organization?")) {
                try {
                  if (org.status === "archived") {
                    await orgApi.restoreOrganization(activeOrgId!);
                    toast.success("Organization restored");
                  } else {
                    await orgApi.archiveOrganization(activeOrgId!);
                    toast.success("Organization archived");
                  }
                  queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId!) });
                  queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
                } catch (err: any) {
                  toast.error(err.response?.data?.message || "Failed to update organization status");
                }
              }
            }}>{org.status === "archived" ? "Restore" : "Archive"}</Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
