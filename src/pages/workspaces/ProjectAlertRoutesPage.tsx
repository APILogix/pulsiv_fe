import { useNavigate, useParams } from "react-router";
import { PageHeader, FillPage, InfiniteTable, Button, StatusBadge } from "@/shared/observe";
import { Plus, Edit2, Play, Pause, Trash, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAlertRoutes, useAlertRouteMutations } from "@/modules/projects/hooks/useAlertRoutes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
        <button type="button" className="font-medium text-[var(--text)] cursor-pointer hover:underline text-left" onClick={() => navigate(`/projects/${projectId}/routes/${r.id}`)}>
          {r.name}
        </button>
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
      width: "60px",
      align: "right" as const,
      cell: (r: any) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={() => toast.success("Route toggled")}>
                {r.isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {r.isActive ? "Pause Route" : "Resume Route"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/routes/${r.id}`)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Route
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await deleteRoute.mutateAsync(r.id);
                  toast.success("Route deleted");
                }}
                className="text-[var(--red)] focus:text-[var(--red)] focus:bg-[var(--red-bg)]"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Route
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
