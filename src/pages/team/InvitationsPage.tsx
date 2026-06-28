import { useActionState } from "react";
import { MailPlus } from "lucide-react";
import { useInvitations } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, Field, SubmitButton, Button, inputClass, Timestamp, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Invitation } from "@/lib/dummy-data";

export default function InvitationsPage() {
  const { data, isLoading } = useInvitations();
  const invites = data ?? [];

  const [, inviteAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Invitation sent to ${form.get("email")}`);
    return { ok: true };
  }, { ok: false });

  const columns: Column<Invitation>[] = [
    { key: "email", header: "Email", width: "1fr", cell: (i) => <span className="truncate font-medium">{i.email}</span> },
    { key: "role", header: "Role", width: "100px", cell: (i) => <span className="text-[var(--text2)]">{i.role}</span> },
    { key: "by", header: "Invited by", width: "150px", cell: (i) => <span className="truncate text-[var(--text2)]">{i.invitedBy}</span> },
    { key: "status", header: "Status", width: "110px", cell: (i) => <StatusBadge status={i.status} /> },
    { key: "invited", header: "Invited", width: "120px", cell: (i) => <Timestamp value={i.invitedAt} /> },
    {
      key: "actions", header: "", width: "170px",
      cell: (i) => i.status === "pending" ? (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" onClick={() => demoSuccess("Invitation resent")}>Resend</Button>
          <Button variant="danger" onClick={() => demoSuccess("Invitation revoked")}>Revoke</Button>
        </div>
      ) : null,
    },
  ];

  return (
    <FillPage>
      <PageHeader title="Invitations" description="Invite, resend, validate, decline, and revoke." />

      <SectionCard title="Invite a member">
        <form action={inviteAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1"><Field label="Email"><input name="email" type="email" required placeholder="teammate@company.com" className={inputClass} /></Field></div>
          <div className="w-40"><Field label="Role"><select name="role" className={inputClass}><option>Member</option><option>Admin</option><option>Billing</option><option>Viewer</option></select></Field></div>
          <SubmitButton><MailPlus className="size-4" /> Send invite</SubmitButton>
        </form>
      </SectionCard>

      <InfiniteTable className="flex-1" loading={isLoading} items={invites} queryKey={["invitations"]} columns={columns} getKey={(i) => i.id} />
    </FillPage>
  );
}
