import { useActionState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, ShieldAlert, FolderGit2, Activity, CalendarDays } from "lucide-react";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { UpdateOrganizationBody } from "@/modules/organizations/types/org.types";
import { toast } from "sonner";
import { Field, SubmitButton, inputClass } from "@/shared/observe";

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
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--text2)]" /></div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-[800px] w-full">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Organization Profile</h1>
        <p className="text-sm text-[var(--text2)] mt-1.5">Manage your organization's identity, ownership, and core settings.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Members", value: "-", icon: Building2 },
          { label: "Projects", value: "-", icon: FolderGit2 },
          { label: "Status", value: org.status === 'active' ? "Active" : org.status, color: org.status === 'active' ? "text-[var(--brand)]" : "text-[var(--text)]", icon: Activity },
          { label: "Created", value: new Date(org.createdAt).toLocaleDateString(), icon: CalendarDays }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[var(--bg1)] border border-[var(--border)] rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">{kpi.label}</span>
              {kpi.icon && <kpi.icon className="h-4 w-4 text-[var(--text3)]" />}
            </div>
            <div className={`text-2xl font-semibold font-[family-name:var(--mono)] ${kpi.color || 'text-[var(--text)]'}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <form action={saveAction} className="flex flex-col gap-8">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] shadow-sm overflow-hidden">
          <div className="p-6 pb-5 border-b border-[var(--border)]">
            <h2 className="text-base font-semibold text-[var(--text)]">Identity</h2>
            <p className="text-sm text-[var(--text2)] mt-1">These details are visible to your members and used for billing.</p>
          </div>
          
          <div className="p-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Organization Name">
              <input name="name" defaultValue={org.name} className={inputClass} required />
            </Field>
            <Field label="Slug" hint="Used in URLs and SSO endpoints.">
              <input disabled defaultValue={org.slug} className={inputClass} />
            </Field>
            
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea name="description" defaultValue={org.description || ""} className="min-h-[88px] w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] p-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--brand)]" rows={3} />
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
            <Field label="Company Size">
              <input name="companySize" defaultValue={org.companySize || ""} className={inputClass} />
            </Field>
            
            <Field label="Country">
              <input name="country" defaultValue={org.country || ""} className={inputClass} />
            </Field>
            <Field label="Timezone">
              <input name="timezone" defaultValue={org.timezone || ""} className={inputClass} />
            </Field>
            
            <Field label="Billing Email">
              <input type="email" name="billingEmail" defaultValue={org.billingEmail || ''} className={inputClass} />
            </Field>
            <Field label="Support Email">
              <input type="email" name="supportEmail" defaultValue={org.supportEmail || ''} className={inputClass} />
            </Field>
          </div>
          
          <div className="bg-[var(--bg2)] border-t border-[var(--border)] px-6 py-3.5 flex justify-end">
            <SubmitButton>Save Profile</SubmitButton>
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] shadow-sm overflow-hidden">
        <div className="p-6 pb-5 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text)]">Ownership Transfer</h2>
          <p className="text-sm text-[var(--text2)] mt-1">Transfer your owner privileges to another active member.</p>
        </div>
        
        <div className="p-6">
          {me?.role === "owner" ? (
            <form
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
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
                <Field label="New Owner">
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
              <button type="submit" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--bg3)] px-4 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg4)]">
                Transfer Ownership
              </button>
            </form>
          ) : (
            <div className="rounded-lg bg-[var(--bg2)] p-4 border border-[var(--border)] text-sm text-[var(--text2)]">
              Only the current organization owner can transfer ownership.
            </div>
          )}
        </div>
      </div>
      
      <div className="rounded-xl border border-red-500/20 bg-[var(--bg1)] shadow-sm overflow-hidden">
        <div className="p-6 pb-5 border-b border-red-500/10 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Danger Zone</h2>
            <p className="text-sm text-[var(--text2)] mt-1">Irreversible and destructive actions.</p>
          </div>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">Leave Organization</div>
              <p className="text-[13px] text-[var(--text2)] mt-1 max-w-md">Remove yourself from this organization. You will lose access to all projects and resources immediately.</p>
            </div>
            <button className="inline-flex h-9 items-center justify-center rounded-[8px] bg-red-500/10 text-red-500 px-4 text-sm font-medium transition-colors hover:bg-red-500/20" onClick={async () => {
              if (confirm("Are you sure you want to leave this organization?")) {
                try {
                  await orgApi.leaveOrganization(activeOrgId!);
                  toast.success("You have left the organization");
                  queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
                } catch (err: any) {
                  toast.error(err.response?.data?.message || "Failed to leave");
                }
              }
            }}>Leave Organization</button>
          </div>
          
          <div className="h-px w-full bg-[var(--border)] opacity-50"></div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">{org.status === "archived" ? "Restore Organization" : "Archive Organization"}</div>
              <p className="text-[13px] text-[var(--text2)] mt-1 max-w-md">{org.status === "archived" ? "Restore access to this organization." : "Suspend all resources and user access temporarily. Billing will be paused."}</p>
            </div>
            <button className="inline-flex h-9 items-center justify-center rounded-[8px] bg-red-500/10 text-red-500 px-4 text-sm font-medium transition-colors hover:bg-red-500/20" onClick={async () => {
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
            }}>{org.status === "archived" ? "Restore Organization" : "Archive Organization"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
