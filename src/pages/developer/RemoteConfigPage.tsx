import { useState } from "react";
import { Plus, Settings2, Code } from "lucide-react";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, Field, SubmitButton, inputClass, Button, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";

type RemoteConfigItem = {
  id: string;
  key: string;
  value: string;
  type: "boolean" | "string" | "number" | "json";
  status: "active" | "inactive";
  updatedAt: string;
};

const DUMMY_CONFIG: RemoteConfigItem[] = [
  { id: "1", key: "enable_new_dashboard", value: "true", type: "boolean", status: "active", updatedAt: new Date().toISOString() },
  { id: "2", key: "sampling_rate", value: "0.5", type: "number", status: "active", updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "3", key: "maintenance_mode", value: "false", type: "boolean", status: "inactive", updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "4", key: "theme_override", value: "{\"mode\":\"dark\",\"accent\":\"#34d399\"}", type: "json", status: "active", updatedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
];

export default function RemoteConfigPage() {
  const [items, setItems] = useState<RemoteConfigItem[]>(DUMMY_CONFIG);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newKey = formData.get("key") as string;
    const newValue = formData.get("value") as string;
    if (!newKey || !newValue) return;

    setItems([{
      id: Math.random().toString(),
      key: newKey,
      value: newValue,
      type: "string",
      status: "active",
      updatedAt: new Date().toISOString()
    }, ...items]);
    
    demoSuccess(`Config "${newKey}" created`);
    (e.target as HTMLFormElement).reset();
  };

  const columns: Column<RemoteConfigItem>[] = [
    { key: "key", header: "Config Key", width: "1fr", cell: (c) => <span className="truncate font-medium text-[var(--text)]"><Code className="mr-2 inline size-4 text-[var(--text3)]" />{c.key}</span> },
    { key: "value", header: "Value", width: "1fr", cell: (c) => <span className="truncate font-mono text-[12px] bg-[var(--bg2)] px-2 py-1 rounded">{c.value}</span> },
    { key: "type", header: "Type", width: "100px", cell: (c) => <span className="text-[12px] text-[var(--text2)] capitalize">{c.type}</span> },
    { key: "status", header: "Status", width: "110px", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "actions", header: "", width: "100px", cell: (c) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Button variant="secondary" onClick={() => demoSuccess(`Edited ${c.key}`)}>Edit</Button>
      </div>
    )},
  ];

  return (
    <FillPage>
      <PageHeader 
        title="Remote Config" 
        description="Manage remote configuration keys and feature flags for your SDKs." 
        actions={<span className="text-[12px] text-[var(--text3)]"><Settings2 className="mr-1 inline size-4" />{items.length} configs</span>} 
      />

      <SectionCard title="Create new configuration">
        <form onSubmit={handleCreate} className="flex items-end gap-3 flex-wrap">
          <div className="min-w-[200px] flex-1">
            <Field label="Config Key"><input name="key" required placeholder="e.g. enable_feature_x" className={inputClass} /></Field>
          </div>
          <div className="min-w-[200px] flex-1">
            <Field label="Value"><input name="value" required placeholder="e.g. true" className={inputClass} /></Field>
          </div>
          <SubmitButton><Plus className="size-4" /> Add Config</SubmitButton>
        </form>
      </SectionCard>

      <InfiniteTable className="flex-1" loading={false} items={items} queryKey={["remoteConfig"]} columns={columns} getKey={(k) => k.id} />
    </FillPage>
  );
}
