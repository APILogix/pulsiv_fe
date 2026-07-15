import { Trash2, MoreHorizontal, RefreshCcw, PowerOff } from "lucide-react";
import { useApiKeys, useProjectMutations } from "@/modules/projects/hooks/useProjects";
import { CreateApiKeyModal } from "@/modules/projects/CreateApiKeyModal";
import { ApiKeyDetailsSheet } from "@/modules/projects/ApiKeyDetailsSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button as UiButton } from "@/components/ui/button";
import { CopyButton, FillPage, InfiniteTable, PageHeader, StatusBadge, Timestamp, type Column } from "@/shared/observe";
import type { ProjectApiKeyView } from "@/modules/projects/api/projects.api";
import { useCurrentProject } from "./ProjectShellPage";

function ActionMenu({
  apiKey,
  onRotate,
  onRegenerate,
  onDisable,
  onRevoke,
}: {
  apiKey: ProjectApiKeyView;
  onRotate: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDisable: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <UiButton variant="ghost" size="icon" className="text-[var(--text2)] hover:text-[var(--text)]">
            <MoreHorizontal className="size-4" />
          </UiButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRotate(apiKey.id)}>
            <RefreshCcw className="mr-2 size-4" /> Rotate Key
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegenerate(apiKey.id)}>Regenerate Key</DropdownMenuItem>
          <DropdownMenuSeparator />
          {apiKey.status === "active" ? (
            <DropdownMenuItem onClick={() => onDisable(apiKey.id)}>
              <PowerOff className="mr-2 size-4" /> Disable Key
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-[var(--red)] focus:text-[var(--red)]"
            onClick={() => onRevoke(apiKey.id)}
          >
            <Trash2 className="mr-2 size-4" /> Revoke Key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function ProjectApiKeysPage() {
  const { projectId } = useCurrentProject();
  const { data: apiKeys, isLoading: isKeysLoading } = useApiKeys(projectId);
  const { rotateApiKey, regenerateApiKey, disableApiKey, revokeApiKey } = useProjectMutations();

  const columns: Column<ProjectApiKeyView>[] = [
    {
      key: "name",
      header: "Name",
      width: "1fr",
      cell: (k) => (
        <ApiKeyDetailsSheet apiKey={k}>
          <button type="button" className="truncate cursor-pointer text-left font-medium text-[var(--text)] outline-none hover:underline">
            {k.name}
          </button>
        </ApiKeyDetailsSheet>
      ),
    },
    {
      key: "key",
      header: "Key",
      width: "160px",
      cell: (k) => (
        <div onClick={(e) => e.stopPropagation()}>
          <CopyButton value={`${k.prefix}_${k.id}`} label={`${k.prefix}••••`} />
        </div>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      width: "110px",
      cell: (k) => <span className="capitalize text-[var(--text2)]">{k.environment}</span>,
    },
    {
      key: "used",
      header: "Last used",
      width: "130px",
      cell: (k) => (k.lastUsedAt ? <Timestamp value={k.lastUsedAt} /> : <span className="text-[var(--text3)]">Never</span>),
    },
    {
      key: "expires",
      header: "Expires",
      width: "130px",
      cell: (k) => (k.expiresAt ? <Timestamp value={k.expiresAt} /> : <span className="text-[var(--text3)]">Never</span>),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      cell: (k) => <StatusBadge status={k.status} />,
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right",
      cell: (k) => (
        <ActionMenu
          apiKey={k}
          onRotate={(keyId) => rotateApiKey.mutate({ projectId, keyId })}
          onRegenerate={(keyId) => regenerateApiKey.mutate({ projectId, keyId })}
          onDisable={(keyId) => disableApiKey.mutate({ projectId, keyId })}
          onRevoke={(keyId) => revokeApiKey.mutate({ projectId, keyId })}
        />
      ),
    },
  ];

  return (
    <FillPage className="flex flex-col gap-6">
      <PageHeader
        title="API Keys"
        description="Manage project ingestion and SDK keys used to send observability data."
        actions={<CreateApiKeyModal />}
      />
      <InfiniteTable 
        className="flex-1"
        loading={isKeysLoading} 
        items={apiKeys || []} 
        queryKey={["projectApiKeys", projectId]} 
        columns={columns} 
        getKey={(k) => k.id} 
      />
    </FillPage>
  );
}
