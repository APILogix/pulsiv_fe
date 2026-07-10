import { useNavigate, useParams } from "react-router";
import { PageHeader, FillPage, InfiniteTable, Button, StatusBadge } from "@/shared/observe";
import { Plus, Edit2, Play, Pause, Trash } from "lucide-react";
import { toast } from "sonner";
import { useAlertRoutes, useAlertRouteMutations } from "@/modules/projects/hooks/useAlertRoutes";

export default function ProjectAlertRoutesPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: routes, isLoading } = useAlertRoutes(projectId!);
  const { deleteRoute } = useAlertRouteMutations(projectId!);

  const columns = [
    {
      key: "name",
      header: "Route Name",
      width: "2fr",
      cell: (r: any) => (
        <div className="font-medium text-[var(--text)] cursor-pointer hover:underline" onClick={() => navigate(`/projects/${projectId}/routes/${r.id}`)}>
          {r.name}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "100px",
      cell: (r: any) => <StatusBadge status={r.isActive ? "active" : "suspended"} />,
    },
    {
      key: "targets",
      header: "Targets",
      width: "150px",
      cell: (r: any) => `${r.targetCount} Connectors`,
    },
    {
      key: "created",
      header: "Created",
      width: "150px",
      cell: (r: any) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      align: "right" as const,
      cell: (r: any) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={() => toast.success("Route toggled")}>
            {r.isActive ? <Pause className="size-4 text-[var(--text3)]" /> : <Play className="size-4 text-[var(--text3)]" />}
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}/routes/${r.id}`)}>
            <Edit2 className="size-4 text-[var(--text3)]" />
          </Button>
          <Button variant="ghost" onClick={async () => {
            await deleteRoute.mutateAsync(r.id);
            toast.success("Route deleted");
          }}>
            <Trash className="size-4 text-[var(--red)]" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <FillPage className="flex flex-col gap-6">
      <PageHeader
        title="Alert Routes"
        description="Configure routing rules for project alerts."
        actions={
          <Button variant="primary" onClick={() => navigate(`/projects/${projectId}/routes/new`)}>
            <Plus className="size-4 mr-2" /> New Route
          </Button>
        }
      />
      
      <InfiniteTable
        items={routes || []}
        queryKey={["alertRoutes", projectId]}
        columns={columns}
        getKey={(r) => r.id}
        loading={isLoading}
        emptyMessage="No alert routes configured."
        className="flex-1"
      />
    </FillPage>
  );
}
