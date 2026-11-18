import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useApiKeyMutations, useApiKeys } from "@/modules/projects/hooks/useApiKeys";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { ApiKeyRevealModal, type RevealedSecret } from "@/modules/projects/components/ApiKeyRevealModal";
import { ConfirmDialog, DialogField, apiErrorMessage, dialogInputClass } from "@/modules/projects/components/project-ui";
import {
  PageHeader, KpiCard, FillPage, Table, Tr, Td, StatusBadge, Button, CopyButton, Timestamp,
} from "@/shared/observe";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function KeysTokensPage() {
  const projectId = useOrgStore((state) => state.activeProjectId);
  const { data, isLoading, error, refetch } = useApiKeys(projectId ?? "", { includeInactive: true });
  const { data: environments = [] } = useEnvironments(projectId ?? "");
  const mutations = useApiKeyMutations(projectId ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);
  const [environmentId, setEnvironmentId] = useState("");
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);
  const keys = data?.data ?? [];
  const activeEnvironments = environments.filter((environment) => environment.isActive && !environment.deletedAt);
  const selectedEnvironment = activeEnvironments.find((environment) => environment.id === environmentId);

  const createKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!environmentId) {
      toast.error("Select an environment for this key.");
      return;
    }
    try {
      const result = await mutations.createKey.mutateAsync({
        environmentId,
        name: String(form.get("name") ?? "").trim() || null,
      });
      setCreateOpen(false);
      setRevealed({
        value: result.fullKey,
        label: result.apiKey.name || result.apiKey.publicKey,
        keyName: result.apiKey.name ?? undefined,
        publicKey: result.apiKey.publicKey,
        environmentName: selectedEnvironment?.name,
        environmentType: selectedEnvironment?.type,
      });
      toast.success("API key created");
    } catch (mutationError) {
      toast.error(apiErrorMessage(mutationError, "Could not create the API key."));
    }
  };

  return (
    <FillPage className="gap-5">
      <PageHeader
        title="Keys & tokens"
        description="Manage project API keys using the active environment and project."
        actions={projectId ? <Button variant="primary" onClick={() => {
          setEnvironmentId((current) => current || activeEnvironments[0]?.id || "");
          setCreateOpen(true);
        }} disabled={!activeEnvironments.length}>
          <Plus className="size-4" /> Generate key
        </Button> : undefined}
      />

      {!projectId ? (
        <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-4 text-[13px] text-[var(--text2)]">
          Select a project to view and manage its API keys.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <KpiCard label="Keys" value={keys.length} />
            <KpiCard label="Active" value={keys.filter((key) => key.status === "active").length} />
            <KpiCard label="Revoked or inactive" value={keys.filter((key) => key.status !== "active").length} />
          </div>

          {error ? (
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-4">
              <p role="alert" className="text-[13px] text-[var(--red)]">{apiErrorMessage(error, "Could not load API keys.")}</p>
              <Button variant="secondary" onClick={() => void refetch()}>Retry</Button>
            </div>
          ) : isLoading ? (
            <p className="text-[13px] text-[var(--text3)]">Loading project API keys…</p>
          ) : keys.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-5 text-[13px] text-[var(--text3)]">
              No API keys exist for this project yet.
            </p>
          ) : (
            <Table headers={["Name", "Public key", "Environment", "Status", "Created", "Last used", ""]}>
              {keys.map((key) => (
                <Tr key={key.id}>
                  <Td className="font-medium">{key.name || "Unnamed key"}</Td>
                  <Td><div onClick={(event) => event.stopPropagation()}><CopyButton value={key.publicKey} label={key.publicKey} /></div></Td>
                  <Td className="text-[var(--text2)]">{key.environment?.name ?? "—"}</Td>
                  <Td><StatusBadge status={key.status} /></Td>
                  <Td><Timestamp value={key.createdAt} /></Td>
                  <Td>{key.lastUsedAt ? <Timestamp value={key.lastUsedAt} /> : "Never"}</Td>
                  <Td>
                    {key.status === "active" && (
                      <Button variant="ghost" className="text-[var(--red)]" onClick={() => setRevokeTarget({ id: key.id, name: key.name || key.publicKey })}>
                        Revoke
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => {
        if (open) setEnvironmentId((current) => current || activeEnvironments[0]?.id || "");
        setCreateOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate an API key</DialogTitle>
            <DialogDescription>The secret appears once after creation. Store it before closing the reveal dialog.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createKey} className="flex flex-col gap-4">
            {activeEnvironments.length === 0 ? (
              <p className="text-[13px] text-[var(--text2)]">Create an active environment before generating a key.</p>
            ) : (
              <>
              <DialogField label="Environment" name="environmentId" required>
                <select
                  id="environmentId"
                  name="environmentId"
                  required
                  value={environmentId || activeEnvironments[0]?.id || ""}
                  onChange={(event) => setEnvironmentId(event.target.value)}
                  className={dialogInputClass}
                >
                  {activeEnvironments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}
                </select>
              </DialogField>
              <DialogField label="Name" name="name" hint="Optional label to help identify this key later.">
                <input id="name" name="name" className={dialogInputClass} maxLength={120} placeholder="Production server" />
              </DialogField>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              {activeEnvironments.length > 0 && (
                <Button type="submit" variant="primary" disabled={mutations.createKey.isPending}>
                  {mutations.createKey.isPending ? "Creating…" : "Generate key"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke this API key?"
        description={revokeTarget ? `Requests authenticated with “${revokeTarget.name}” will stop working.` : undefined}
        confirmLabel="Revoke key"
        pending={mutations.revokeKey.isPending}
        onConfirm={() => {
          if (!revokeTarget) return;
          mutations.revokeKey.mutate({ apiKeyId: revokeTarget.id }, {
            onSuccess: () => {
              toast.success("API key revoked");
              setRevokeTarget(null);
            },
            onError: (mutationError) => toast.error(apiErrorMessage(mutationError, "Could not revoke the API key.")),
          });
        }}
      />
      <ApiKeyRevealModal revealed={revealed} onClose={() => setRevealed(null)} />
    </FillPage>
  );
}
