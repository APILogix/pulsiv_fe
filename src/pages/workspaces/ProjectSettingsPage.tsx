import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, MoreHorizontal } from "lucide-react";
import { useParams } from "react-router";
import { useApiKeys, useEnvironments, useProjectMutations } from "@/modules/projects/hooks/useProjects";
import { CreateEnvironmentModal } from "@/modules/projects/CreateEnvironmentModal";
import { CreateApiKeyModal } from "@/modules/projects/CreateApiKeyModal";
import { ApiKeyDetailsSheet } from "@/modules/projects/ApiKeyDetailsSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RefreshCcw, PowerOff } from "lucide-react";
import { Button as UiButton } from "@/components/ui/button";
import {
  Button,
  CopyButton,
  Field,
  FillPage,
  InfiniteTable,
  PageHeader,
  SectionCard,
  StatusBadge,
  SubmitButton,
  Tabs,
  Timestamp,
  formatCompact,
  inputClass,
  textareaClass,
  type Column,
} from "@/shared/observe";
import { toast } from "sonner";
import type { ProjectApiKeyView, ProjectEnvironmentView } from "@/modules/projects/api/projects.api";

const schema = z.object({
  name: z.string().min(1, "Project name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  description: z.string().max(280, "Keep it under 280 characters").optional(),
});
type FormData = z.infer<typeof schema>;

const DEFAULTS: FormData = { name: "Pulse API", slug: "pulse-api", description: "Primary observability project for the API gateway service." };

function ActionMenu({ 
  apiKey, 
  onRotate, 
  onRegenerate, 
  onDisable, 
  onRevoke 
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
          <DropdownMenuItem onClick={() => onRotate(apiKey.id)}><RefreshCcw className="mr-2 size-4" /> Rotate Key</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegenerate(apiKey.id)}>Regenerate Key</DropdownMenuItem>
          <DropdownMenuSeparator />
          {apiKey.status === "active" ? (
            <DropdownMenuItem onClick={() => onDisable(apiKey.id)}><PowerOff className="mr-2 size-4" /> Disable Key</DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-[var(--red)] focus:text-[var(--red)]" onClick={() => onRevoke(apiKey.id)}>
            <Trash2 className="mr-2 size-4" /> Revoke Key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function ProjectSettingsPage() {
  const { projectId = "" } = useParams();
  const { data: apiKeys, isLoading: isKeysLoading } = useApiKeys(projectId);
  const { data: environments, isLoading: isEnvsLoading } = useEnvironments(projectId);
  const { rotateApiKey, regenerateApiKey, disableApiKey, revokeApiKey, deleteEnvironment } = useProjectMutations();

  const { register, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: DEFAULTS,
  });

  const [, submitAction] = useActionState(async () => {
    // Replace with real updateProject mutation later
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Project settings saved");
    return { success: true };
  }, { success: false });

  const columns: Column<ProjectApiKeyView>[] = [
    { 
      key: "name", 
      header: "Name", 
      width: "1fr", 
      cell: (k) => (
        <ApiKeyDetailsSheet apiKey={k}>
          <button className="truncate font-medium text-[var(--text)] hover:underline outline-none cursor-pointer text-left">{k.name}</button>
        </ApiKeyDetailsSheet>
      ) 
    },
    { key: "key", header: "Key", width: "160px", cell: (k) => <div onClick={(e) => e.stopPropagation()}><CopyButton value={`${k.prefix}_${k.id}`} label={`${k.prefix}••••`} /></div> },
    { key: "type", header: "Type", width: "110px", cell: (k) => <span className="capitalize text-[var(--text2)]">{k.type}</span> },
    { key: "used", header: "Last used", width: "130px", cell: (k) => k.lastUsedAt ? <Timestamp value={k.lastUsedAt} /> : <span className="text-[var(--text3)]">Never</span> },
    { key: "usage", header: "Usage 24h", width: "110px", cell: (k) => <span className="tabular-nums text-[var(--text2)]">{formatCompact(k.usage24h)}</span> },
    { key: "status", header: "Status", width: "110px", cell: (k) => <StatusBadge status={k.status} /> },
    { key: "actions", header: "", width: "60px", align: "right", cell: (k) => (
      <ActionMenu 
        apiKey={k} 
        onRotate={(keyId) => rotateApiKey.mutate({ projectId, keyId })}
        onRegenerate={(keyId) => regenerateApiKey.mutate({ projectId, keyId })}
        onDisable={(keyId) => disableApiKey.mutate({ projectId, keyId })}
        onRevoke={(keyId) => revokeApiKey.mutate({ projectId, keyId })}
      />
    ) },
  ];

  const generalTab = (
    <div className="flex flex-col gap-6 max-w-[800px] mt-4">
      <SectionCard title="General Settings">
        <form action={submitAction} className="flex flex-col gap-4">
          <Field label="Name" error={errors.name?.message}>
            <input {...register("name")} className={inputClass} />
          </Field>
          <Field label="Slug" error={errors.slug?.message} hint="Used in API endpoints and URLs.">
            <input {...register("slug")} className={inputClass} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <textarea {...register("description")} className={textareaClass} rows={4} />
          </Field>
          <div className="pt-2"><SubmitButton>Save Changes</SubmitButton></div>
        </form>
      </SectionCard>

      <SectionCard title="Danger Zone" className="border border-[var(--red)]/20 bg-[var(--red)]/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-medium text-[var(--text)]">Delete this project</div>
            <p className="text-[13px] text-[var(--text2)] mt-1">Permanently remove the project and all of its ingested data. This cannot be undone.</p>
          </div>
          <Button variant="danger" onClick={() => toast.info("Project deletion is not wired yet")}><Trash2 className="mr-2 size-4" /> Delete Project</Button>
        </div>
      </SectionCard>
    </div>
  );

  const apiKeysTab = (
    <div className="flex flex-col mt-4 min-h-[600px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-medium text-[var(--text)]">API Keys</h3>
          <p className="text-[13px] text-[var(--text2)] mt-1">Manage project ingestion and SDK keys used to send observability data.</p>
        </div>
        <CreateApiKeyModal />
      </div>
      <div className="flex-1 rounded-md border border-[var(--border)] overflow-hidden bg-[var(--bg1)]">
        <InfiniteTable loading={isKeysLoading} items={apiKeys || []} queryKey={["projectApiKeys"]} columns={columns} getKey={(k) => k.id} />
      </div>
    </div>
  );

  const environmentsTab = (
    <div className="flex flex-col mt-4 min-h-[600px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-medium text-[var(--text)]">Environments</h3>
          <p className="text-[13px] text-[var(--text2)] mt-1">Manage isolated environments for your project (e.g. Production, Staging).</p>
        </div>
        <CreateEnvironmentModal />
      </div>
      <div className="flex-1 rounded-md border border-[var(--border)] overflow-hidden bg-[var(--bg1)]">
        <InfiniteTable<ProjectEnvironmentView>
          loading={isEnvsLoading} 
          items={environments || []} 
          queryKey={["projectEnvironments", projectId]} 
          columns={[
            { key: "name", header: "Name", width: "1fr", cell: (e) => <span className="font-medium text-[var(--text)]">{e.name}</span> },
            { key: "slug", header: "Slug", width: "1fr", cell: (e) => <code className="text-[12px] text-[var(--text2)]">{e.slug}</code> },
            { key: "type", header: "Type", width: "120px", cell: (e) => <span className="capitalize text-[var(--text2)]">{e.type}</span> },
            { key: "status", header: "Status", width: "120px", cell: () => <StatusBadge status="active" /> },
            { key: "actions", header: "", width: "60px", align: "right", cell: (e) => (
              <div onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <UiButton variant="ghost" size="icon"><MoreHorizontal className="size-4" /></UiButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit Environment</DropdownMenuItem>
                    <DropdownMenuItem className="text-[var(--red)] focus:text-[var(--red)]" onClick={() => deleteEnvironment.mutate({ projectId, env: e.slug })}>
                      <Trash2 className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) },
          ]} 
          getKey={(e) => e.id || e.slug} 
        />
      </div>
    </div>
  );

  return (
    <FillPage>
      <PageHeader 
        title="Project Settings" 
        description="Manage your project configuration, API keys, and danger zone actions." 
      />
      <div className="flex-1 overflow-y-auto">
        <Tabs
          tabs={[
            { id: "general", label: "General", content: generalTab },
            { id: "environments", label: "Environments", content: environmentsTab },
            { id: "keys", label: "API Keys", content: apiKeysTab },
          ]}
        />
      </div>
    </FillPage>
  );
}
