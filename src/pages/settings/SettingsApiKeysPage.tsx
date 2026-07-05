import { useActionState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { useApiKeys } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, CopyButton, Field, SubmitButton, inputClass, Timestamp, Button, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ApiKey } from "@/lib/dummy-data";

export default function SettingsApiKeysPage() {
  const { data, isLoading } = useApiKeys();
  const keys = data ?? [];

  const [, createAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Personal token "${form.get("name")}" created`);
    return { ok: true };
  }, { ok: false });

  const columns: Column<ApiKey>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (k) => <span className="truncate font-medium">{k.name}</span> },
    { key: "key", header: "Token", width: "160px", cell: (k) => <div onClick={(e) => e.stopPropagation()}><CopyButton value={`${k.prefix}_${k.id}`} label={`${k.prefix}••••`} /></div> },
    { key: "used", header: "Last used", width: "130px", cell: (k) => <Timestamp value={k.lastUsedAt} /> },
    { key: "status", header: "Status", width: "110px", cell: (k) => <StatusBadge status={k.status} /> },
    { key: "actions", header: "", width: "100px", cell: (k) => (k.status === "active" ? <div onClick={(e) => e.stopPropagation()}><Button variant="danger" onClick={() => demoSuccess(`Revoked ${k.name}`)}>Revoke</Button></div> : null) },
  ];

  return (
    <FillPage>
      <PageHeader title="API Keys" description="Personal access tokens for the API and CLI." actions={<span className="text-[12px] text-[var(--text3)]"><KeyRound className="mr-1 inline size-4" />{keys.length} tokens</span>} />

      <SectionCard title="Create personal access token">
        <form action={createAction} className="flex items-end gap-3">
          <div className="min-w-[240px] flex-1"><Field label="Token name"><input name="name" required placeholder="e.g. CLI on laptop" className={inputClass} /></Field></div>
          <SubmitButton><Plus className="size-4" /> Generate</SubmitButton>
        </form>
      </SectionCard>

      <InfiniteTable className="flex-1" loading={isLoading} items={keys} queryKey={["settingsApiKeys"]} columns={columns} getKey={(k) => k.id} />
    </FillPage>
  );
}
