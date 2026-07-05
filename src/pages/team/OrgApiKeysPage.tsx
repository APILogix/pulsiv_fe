import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { ApiKey } from "@/modules/organizations/types/org.types";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, Button, CopyButton, Timestamp,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { toast } from "sonner";

export default function OrgApiKeysPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [newKey, setNewKey] = useState<{ name: string; rawKey: string } | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: orgQueryKeys.apiKeys(activeOrgId!),
    queryFn: () => orgApi.listApiKeys(activeOrgId!, { limit: 100 }),
    enabled: !!activeOrgId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; environmentId?: string; role?: string; expiresInDays?: number }) => orgApi.createApiKey(activeOrgId!, data),
    onSuccess: (result) => {
      setNewKey({ name: result.name, rawKey: result.rawKey });
      toast.success("API key created");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create key"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => orgApi.revokeApiKey(activeOrgId!, id),
    onSuccess: () => {
      toast.success("API key revoked");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to revoke key"),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => orgApi.rotateApiKey(activeOrgId!, id),
    onSuccess: (result) => {
      setNewKey({ name: result.name, rawKey: result.rawKey });
      toast.success("API key rotated");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.apiKeys(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to rotate key"),
  });

  const items = keys?.data || [];

  const columns: Column<ApiKey>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (key) => <span className="truncate font-medium">{key.name}</span> },
    { key: "key", header: "Key", width: "160px", cell: (key) => <div onClick={(event) => event.stopPropagation()}><CopyButton value={`${key.keyPrefix}_****`} label={`${key.keyPrefix}****`} /></div> },
    { key: "role", header: "Role", width: "100px", cell: (key) => <span className="capitalize text-[var(--text2)]">{key.role}</span> },
    { key: "used", header: "Last used", width: "130px", cell: (key) => key.lastUsedAt ? <Timestamp value={new Date(key.lastUsedAt).getTime()} /> : <span className="text-[var(--text3)]">-</span> },
    { key: "status", header: "Status", width: "110px", cell: (key) => <StatusBadge status={key.revokedAt ? "revoked" : (key.expiresAt && new Date(key.expiresAt) < new Date() ? "expired" : "active")} /> },
    {
      key: "actions",
      header: "",
      width: "220px",
      cell: (key) => (!key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date()) ? (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Button variant="secondary" disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate(key.id)}>Rotate</Button>
          <Button variant="danger" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(key.id)}>Revoke</Button>
        </div>
      ) : null),
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Org API Keys"
        description="Organization-level API key administration."
        actions={<Button variant="primary" onClick={() => {
          const name = window.prompt("API key name");
          if (!name?.trim()) return;
          createMutation.mutate({ name: name.trim() });
        }}><Plus className="mr-2 size-4" /> Create key</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Keys" value={items.length} />
        <KpiCard label="Active" value={items.filter((key) => !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date())).length} />
        <KpiCard label="Admin keys" value={items.filter((key) => key.role === "admin" || key.role === "owner").length} />
      </div>

      {newKey ? (
        <div className="rounded-[12px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-4 text-sm">
          <div className="font-medium text-[var(--text)]">Copy this raw key now for {newKey.name}.</div>
          <div className="mt-2 flex items-center gap-3">
            <code className="flex-1 overflow-x-auto rounded bg-[var(--bg2)] px-3 py-2 text-[12px]">{newKey.rawKey}</code>
            <CopyButton value={newKey.rawKey} label="Copy" />
          </div>
        </div>
      ) : null}

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={items}
        queryKey={["orgApiKeys-table", activeOrgId]}
        columns={columns}
        getKey={(key) => key.id}
      />
    </FillPage>
  );
}
