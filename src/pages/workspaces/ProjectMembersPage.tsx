import { useParams } from "react-router";
import { useProjectMembers, useProjectMutations } from "@/modules/projects/hooks/useProjects";
import { PageHeader, FillPage, InfiniteTable, Button } from "@/shared/observe";
import { Plus, Trash, Shield, ShieldAlert, User, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ProjectMembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: members, isLoading } = useProjectMembers(projectId!);
  const { removeMember } = useProjectMutations();

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember.mutateAsync({ projectId: projectId!, userId });
      toast.success("Member removed");
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  const columns = [
    {
      key: "member",
      header: "Member",
      width: "2fr",
      cell: (m: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={`https://avatar.vercel.sh/${m.userId}.png`} />
            <AvatarFallback>{m.userEmail?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-[13px] text-[var(--text)]">{m.userName || m.userEmail || m.userId}</div>
            <div className="text-[11px] text-[var(--text3)]">{m.userEmail}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "150px",
      cell: (m: any) => (
        <div className="flex items-center gap-1.5">
          {m.role === "owner" && <ShieldAlert className="size-3.5 text-[var(--text)]" />}
          {m.role === "admin" && <Shield className="size-3.5 text-[var(--text2)]" />}
          {m.role === "member" && <User className="size-3.5 text-[var(--text3)]" />}
          <span className="capitalize text-[13px]">{m.role}</span>
        </div>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      width: "150px",
      cell: (m: any) => new Date(m.createdAt || Date.now()).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right" as const,
      cell: (m: any) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleRemove(m.userId)} className="text-[var(--red)] focus:text-[var(--red)] focus:bg-[var(--red-bg)]">
                <Trash className="mr-2 h-4 w-4" />
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <FillPage className="flex flex-col gap-6">
      <PageHeader
        title="Project Members"
        description="Manage who has access to this project."
        actions={
          <Button variant="primary" onClick={() => toast.info("Invite modal not yet implemented")}>
            <Plus className="size-4 mr-2" /> Add Member
          </Button>
        }
      />
      <InfiniteTable
        items={members || []}
        queryKey={["projectMembers", projectId]}
        columns={columns}
        getKey={(m) => m.userId}
        loading={isLoading}
        emptyMessage="No members found."
        className="flex-1"
      />
    </FillPage>
  );
}
