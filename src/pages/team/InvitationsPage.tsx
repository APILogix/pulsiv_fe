import { useActionState, useEffect } from "react";
import { MailPlus, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Invitation } from "@/modules/organizations/types/org.types";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, Field, SubmitButton, inputClass, Timestamp
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function InvitationsPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data, isLoading } = useQuery({
    queryKey: [...orgQueryKeys.invitations(activeOrgId!)],
    queryFn: () => orgApi.listInvitations(activeOrgId!, { limit: 100 }),
    enabled: !!activeOrgId,
  });

  const invites = data?.data ?? [];

  const [state, inviteAction] = useActionState(
    async (_prevState: any, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active org" };
      try {
        const email = form.get("email") as string;
        const role = form.get("role") as string;
        await orgApi.createInvitation(activeOrgId, { email, role });
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.invitations(activeOrgId) });
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) }); // Also update members list
        return { ok: true, email };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to send invitation" };
      }
    },
    { ok: false, error: null, email: undefined }
  );

  useEffect(() => {
    if (state.ok && state.email) {
      toast.success(`Invitation sent to ${state.email}`);
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const resendMutation = useMutation({
    mutationFn: (id: string) => orgApi.resendInvitation(activeOrgId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success("Invitation resent")
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to resend")
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => orgApi.revokeInvitation(activeOrgId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success("Invitation revoked");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.invitations(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to revoke")
  });

  const columns: Column<Invitation>[] = [
    { key: "email", header: "Email", width: "1fr", cell: (i) => <span className="truncate font-medium">{i.email}</span> },
    { key: "role", header: "Role", width: "100px", cell: (i) => <span className="text-[var(--text2)] capitalize">{i.role}</span> },
    { key: "by", header: "Invited by", width: "150px", cell: (i) => <span className="truncate text-[var(--text2)]">{i.invitedBy?.name || i.invitedBy?.email || '-'}</span> },
    { key: "status", header: "Status", width: "110px", cell: (i) => <StatusBadge status={i.status as any} /> },
    { key: "invited", header: "Invited", width: "120px", cell: (i) => <Timestamp value={new Date(i.invitedAt).getTime()} /> },
    {
      key: "actions", header: "", width: "60px",
      cell: (i) => i.status === "pending" ? (
        <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text2)] hover:bg-[var(--bg2)]">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem 
                disabled={resendMutation.isPending} 
                onClick={() => resendMutation.mutate(i.id)}
              >
                Resend invitation
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={revokeMutation.isPending} 
                onClick={() => revokeMutation.mutate(i.id)}
                className="text-[var(--red)] focus:text-[var(--red)] focus:bg-[var(--red-bg)]"
              >
                Revoke invitation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null,
    },
  ];

  return (
    <FillPage>
      <PageHeader title="Invitations" description="Invite, resend, validate, decline, and revoke." />

      <SectionCard title="Invite a member">
        <form action={inviteAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Field label="Email">
              <input name="email" type="email" required placeholder="teammate@company.com" className={inputClass} />
            </Field>
          </div>
          <div className="w-40">
            <Field label="Role">
              <select name="role" className={inputClass}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="billing">Billing</option>
                <option value="viewer">Viewer</option>
              </select>
            </Field>
          </div>
          <SubmitButton><MailPlus className="size-4 mr-2" /> Send invite</SubmitButton>
        </form>
      </SectionCard>

      <InfiniteTable 
        className="flex-1" 
        loading={isLoading} 
        items={invites} 
        queryKey={["invitations-table", activeOrgId]} 
        columns={columns} 
        getKey={(i) => i.id} 
      />
    </FillPage>
  );
}
