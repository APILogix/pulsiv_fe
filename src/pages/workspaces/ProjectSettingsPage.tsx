import { useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, MoreHorizontal, Plus } from "lucide-react";
import {
  PageHeader, FillPage, SectionCard, Field, SubmitButton, Button, inputClass, textareaClass, demoSuccess, demoAction, Tabs, InfiniteTable, StatusBadge, CopyButton, Timestamp, formatCompact,
} from "@/shared/observe";
import { useApiKeys } from "@/hooks/useDummyData";
import type { Column } from "@/shared/observe";
import type { ApiKey } from "@/lib/dummy-data";

const schema = z.object({
  name: z.string().min(1, "Project name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  description: z.string().max(280, "Keep it under 280 characters").optional(),
});
type FormData = z.infer<typeof schema>;

const DEFAULTS: FormData = { name: "Pulse API", slug: "pulse-api", description: "Primary observability project for the API gateway service." };

function ActionMenu({ onRevoke }: { onRevoke: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text2)] hover:text-[var(--text)]" onClick={() => setOpen(!open)}>
        <MoreHorizontal className="size-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border border-[var(--border)] bg-[var(--bg1)] p-1 shadow-lg">
            <button 
              className="flex w-full items-center rounded px-2 py-1.5 text-sm font-medium text-[var(--red)] transition-colors hover:bg-[var(--red)]/10"
              onClick={() => { setOpen(false); onRevoke(); }}
            >
              <Trash2 className="mr-2 size-4" />
              Revoke key
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProjectSettingsPage() {
  const { register, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: DEFAULTS,
  });

  const [, submitAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 800));
    demoSuccess("Project settings saved");
    return { success: true };
  }, { success: false });

  const { data: apiKeys, isLoading: isKeysLoading } = useApiKeys();

  const columns: Column<ApiKey>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (k) => <span className="truncate font-medium text-[var(--text)]">{k.name}</span> },
    { key: "key", header: "Key", width: "160px", cell: (k) => <div onClick={(e) => e.stopPropagation()}><CopyButton value={`${k.prefix}_${k.id}`} label={`${k.prefix}••••`} /></div> },
    { key: "type", header: "Type", width: "110px", cell: (k) => <span className="capitalize text-[var(--text2)]">{k.type}</span> },
    { key: "used", header: "Last used", width: "130px", cell: (k) => <Timestamp value={k.lastUsedAt} /> },
    { key: "usage", header: "Usage 24h", width: "110px", cell: (k) => <span className="tabular-nums text-[var(--text2)]">{formatCompact(k.usage24h)}</span> },
    { key: "status", header: "Status", width: "110px", cell: (k) => <StatusBadge status={k.status} /> },
    { key: "actions", header: "", width: "60px", align: "right", cell: (k) => (k.status === "active" ? <div onClick={(e) => e.stopPropagation()}><ActionMenu onRevoke={() => demoSuccess(`Revoked ${k.name}`)} /></div> : null) },
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
          <Button variant="danger" onClick={() => demoAction("Delete project")}><Trash2 className="mr-2 size-4" /> Delete Project</Button>
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
        <Button variant="primary" onClick={() => demoAction("Create API key")}><Plus className="mr-2 size-4" /> Create Key</Button>
      </div>
      <div className="flex-1 rounded-md border border-[var(--border)] overflow-hidden bg-[var(--bg1)]">
        <InfiniteTable loading={isKeysLoading} items={apiKeys || []} queryKey={["projectApiKeys"]} columns={columns} getKey={(k) => k.id} />
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
            { id: "keys", label: "API Keys", content: apiKeysTab },
          ]}
        />
      </div>
    </FillPage>
  );
}
