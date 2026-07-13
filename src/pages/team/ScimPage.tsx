import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { env } from "@/app/config/env";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { CreateScimTokenInput } from "@/modules/organizations/types/org.types";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Button,
  CopyButton,
  Field,
  inputClass,
  MonospaceText,
  PageHeader,
  StatusBadge,
  Table,
  Td,
  textareaClass,
  Timestamp,
  Tr,
} from "@/shared/observe";

type ScimProvisioningPageProps = {
  mode?: "admin" | "settings";
};

type ScimScope = CreateScimTokenInput["scopes"][number];

const SCIM_SCOPE_OPTIONS: Array<{ value: ScimScope; label: string; description: string; icon: React.ElementType }> = [
  { value: "users:read", label: "Read Users", description: "Allow user directory reads and discovery endpoints.", icon: Info },
  { value: "users:write", label: "Write Users", description: "Allow user create, update, and patch provisioning calls.", icon: Zap },
  { value: "users:delete", label: "Delete Users", description: "Allow user deprovisioning and delete operations.", icon: Trash2 },
  { value: "groups:read", label: "Read Groups", description: "Allow group and role management reads.", icon: Info },
  { value: "groups:write", label: "Write Groups", description: "Allow group creation and assignment.", icon: Zap },
  { value: "groups:delete", label: "Delete Groups", description: "Allow group deletion.", icon: Trash2 },
  { value: "bulk", label: "Bulk Sync", description: "Allow SCIM bulk sync operations.", icon: Zap },
];

const SCIM_ENDPOINTS = (base: string) => [
  { label: "Base URL", path: base, method: "ALL", description: "Root provisioning endpoint" },
  { label: "Users", path: `${base}/Users`, method: "GET/POST", description: "User provisioning and syncing" },
  { label: "Groups", path: `${base}/Groups`, method: "GET/POST", description: "Group and role management" },
  { label: "ServiceProviderConfig", path: `${base}/ServiceProviderConfig`, method: "GET", description: "Capability discovery" },
  { label: "Schemas", path: `${base}/Schemas`, method: "GET", description: "Resource schema definitions" },
];

function formatExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Never";
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return "Unknown";
  if (expiry.getTime() <= Date.now()) return "Expired";
  const hours = Math.round((expiry.getTime() - Date.now()) / 3600000);
  return hours <= 72 ? `${hours}h left` : expiry.toLocaleDateString();
}

function parseAllowedIps(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function maskToken(token: string): string {
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function ScimStatsRow({ statusIsActive, activeTokens, tokensLength, expiringSoonCount, lastUsedAt }: any) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Status</span>
          <div className={`flex size-8 items-center justify-center rounded-[10px] ${statusIsActive ? "bg-[var(--green)]/10" : "bg-[var(--red)]/10"}`}>
            {statusIsActive ? <ShieldCheck className="size-4 text-[var(--green)]" /> : <ShieldAlert className="size-4 text-[var(--red)]" />}
          </div>
        </div>
        <div className={`text-xl font-medium tracking-tight ${statusIsActive ? "text-[var(--green)]" : "text-[var(--text3)]"}`}>
          {statusIsActive ? "Active" : "Inactive"}
        </div>
        <div className="mt-1 text-[12px] text-[var(--text3)]">
          {statusIsActive ? "Provisioning enabled" : "No active token"}
        </div>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Active Tokens</span>
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--brand)]/10">
            <KeyRound className="size-4 text-[var(--brand)]" />
          </div>
        </div>
        <div className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--text)]">{activeTokens.length}</div>
        <div className="mt-1 text-[12px] text-[var(--text3)]">{tokensLength} total issued</div>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Expiring Soon</span>
          <div className={`flex size-8 items-center justify-center rounded-[10px] ${expiringSoonCount > 0 ? "bg-[var(--amber)]/10" : "bg-[var(--bg2)]"}`}>
            <Clock className={`size-4 ${expiringSoonCount > 0 ? "text-[var(--amber)]" : "text-[var(--text3)]"}`} />
          </div>
        </div>
        <div className={`text-2xl font-semibold tabular-nums tracking-tight ${expiringSoonCount > 0 ? "text-[var(--amber)]" : "text-[var(--text)]"}`}>
          {expiringSoonCount}
        </div>
        <div className="mt-1 text-[12px] text-[var(--text3)]">within 7 days</div>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Last Used</span>
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--bg2)]">
            <Users className="size-4 text-[var(--text3)]" />
          </div>
        </div>
        {lastUsedAt ? (
          <>
            <div className="text-[15px] font-medium tracking-tight text-[var(--text)]">{new Date(lastUsedAt).toLocaleDateString()}</div>
            <div className="mt-1 text-[12px] text-[var(--text3)]">{new Date(lastUsedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </>
        ) : (
          <>
            <div className="text-[15px] font-medium tracking-tight text-[var(--text3)]">Never</div>
            <div className="mt-1 text-[12px] text-[var(--text3)]">No activity recorded</div>
          </>
        )}
      </div>
    </div>
  );
}

function ScimNewTokenBanner({ newTokenRaw }: { newTokenRaw: string }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 rounded-[16px] border border-[var(--amber)]/30 bg-[var(--amber)]/5 p-5">
      <div className="flex items-start gap-4 min-w-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--amber)]/15">
          <AlertTriangle className="size-5 text-[var(--amber)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">Copy your token now</div>
          <p className="mt-1 text-[13px] text-[var(--text2)] leading-relaxed">
            Pulse only returns the raw bearer token once. Store it in your secrets manager immediately.
          </p>
          <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3 shadow-sm">
            <MonospaceText value={newTokenRaw} className="flex-1 truncate text-[14px]" />
            <CopyButton value={newTokenRaw} label="Copy" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScimProvisioningEndpoints({ scimBaseUrl, activeToken }: { scimBaseUrl: string, activeToken: any }) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-semibold tracking-tight text-[var(--text)]">Provisioning Endpoints</h3>
        <p className="mt-1 text-[13px] text-[var(--text2)]">URLs and capabilities for identity synchronization.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {SCIM_ENDPOINTS(scimBaseUrl).map((endpoint) => {
            const url = `${scimBaseUrl}${endpoint.path}`;
            return (
              <div key={endpoint.label} className="group flex flex-col gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-4 transition-all hover:border-[var(--border)]/80 hover:bg-[var(--bg3)] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">{endpoint.label}</span>
                    <span className="rounded-[4px] bg-[var(--brand)]/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-[var(--brand)]">{endpoint.method}</span>
                  </div>
                  <div className="truncate font-mono text-[13px] text-[var(--text2)]">{url}</div>
                </div>
                <CopyButton value={url} label="Copy URL" />
              </div>
            );
          })}
        </div>
        
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--brand)]/10">
              <Shield className="size-4 text-[var(--brand)]" />
            </div>
            <span className="text-[14px] font-medium tracking-tight text-[var(--text)]">Setup Checklist</span>
          </div>
          <div className="space-y-4">
            {[
              { id: "gen", done: !!activeToken, text: "Generate a SCIM bearer token below" },
              { id: "paste", done: false, text: "Paste base URL into your IdP provisioning app" },
              { id: "header", done: false, text: (<span>Set <code className="rounded-[4px] border border-[var(--border)] bg-[var(--bg1)] px-1.5 py-0.5 font-mono text-[11px]">Authorization: Bearer scim_...</code> header</span>) },
              { id: "scopes", done: false, text: "Restrict scopes to least-privilege for production" },
              { id: "cidr", done: false, text: "Add CIDR allowlist for extra security" },
              { id: "rotate", done: false, text: "Schedule token rotation on a defined cadence" },
            ].map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--green)]" />
                ) : (
                  <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-[var(--border)] transition-colors hover:border-[var(--text3)]" />
                )}
                <span className="text-[13px] leading-relaxed text-[var(--text2)]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScimTokenPolicy({
  selectedScopes, toggleScope, allowedIpsText, setAllowedIpsText, expiresInDays, setExpiresInDays, generateMutation
}: any) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-semibold tracking-tight text-[var(--text)]">Token Policy</h3>
        <p className="mt-1 text-[13px] text-[var(--text2)]">Configure permissions and lifecycle for new tokens.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Field label="Scopes" hint="At least one scope is required.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SCIM_SCOPE_OPTIONS.map((scope) => {
                const selected = selectedScopes.includes(scope.value);
                const ScopeIcon = scope.icon;
                return (
                  <label key={scope.value} className={`group flex cursor-pointer flex-col gap-3 rounded-[12px] border p-4 transition-all ${selected ? "border-[var(--brand)] bg-[var(--brand)]/5 shadow-[0_0_0_1px_var(--brand)/10]" : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border-hover)]"}`}>
                    <div className="flex items-center justify-between">
                      <div className={`flex size-8 items-center justify-center rounded-[8px] transition-colors ${selected ? "bg-[var(--brand)]/10" : "bg-[var(--bg3)] group-hover:bg-[var(--bg1)]"}`}>
                        <ScopeIcon className={`size-4 ${selected ? "text-[var(--brand)]" : "text-[var(--text3)]"}`} />
                      </div>
                      <input type="checkbox" checked={selected} onChange={() => toggleScope(scope.value)} className="size-4 accent-[var(--brand)] cursor-pointer" />
                    </div>
                    <div>
                      <div className={`text-[13px] font-medium tracking-tight ${selected ? "text-[var(--text)]" : "text-[var(--text2)]"}`}>{scope.label}</div>
                      <div className="mt-1 text-[11px] leading-relaxed text-[var(--text3)]">{scope.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Allowed IP CIDRs" hint="Optional. Separate multiple values with commas or new lines.">
            <textarea value={allowedIpsText} onChange={(e) => setAllowedIpsText(e.target.value)} className={textareaClass} rows={3} placeholder={"203.0.113.10/32\n198.51.100.0/24"} />
          </Field>
        </div>
        
        <div className="space-y-6">
          <Field label="Token Expiry (days)" hint="Leave blank to use the backend default. Shorter lifecycles improve security.">
            <input type="number" min={1} max={3650} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} className={inputClass} />
          </Field>
          
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Policy Preview</div>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text3)]">Scopes</span>
                <span className="text-[13px] font-medium tracking-tight text-[var(--text)]">{selectedScopes.length ? selectedScopes.join(", ") : "—"}</span>
              </div>
              <div className="h-px bg-[var(--border)]" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text3)]">IP allowlist</span>
                <span className="text-[13px] font-medium tracking-tight text-[var(--text)]">{parseAllowedIps(allowedIpsText).length ? `${parseAllowedIps(allowedIpsText).length} CIDR${parseAllowedIps(allowedIpsText).length > 1 ? "s" : ""}` : "Any IP"}</span>
              </div>
              <div className="h-px bg-[var(--border)]" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text3)]">Expiry</span>
                <span className="text-[13px] font-medium tracking-tight text-[var(--text)]">{expiresInDays.trim() ? `${expiresInDays} days` : "Backend default"}</span>
              </div>
              <div className="h-px bg-[var(--border)]" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text3)]">Risk level</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${selectedScopes.some((s: string) => s.endsWith(":delete")) ? "bg-[var(--red)]/10 text-[var(--red)]" : selectedScopes.some((s: string) => s.endsWith(":write")) ? "bg-[var(--amber)]/10 text-[var(--amber)]" : "bg-[var(--green)]/10 text-[var(--green)]"}`}>
                  {selectedScopes.some((s: string) => s.endsWith(":delete")) ? "High" : selectedScopes.some((s: string) => s.endsWith(":write")) ? "Medium" : "Low"}
                </span>
              </div>
            </div>
          </div>
          
          <UiButton className="h-11 w-full text-[14px]" disabled={generateMutation.isPending || selectedScopes.length === 0} onClick={() => generateMutation.mutate()}>
            {generateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
            Generate token
          </UiButton>
        </div>
      </div>
    </section>
  );
}

function ScimTokenInventory({ tokens, rotateMutation, revokeMutation }: any) {
  const [now] = useState(() => Date.now());
  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
      <div className="border-b border-[var(--border)] p-6">
        <h3 className="font-semibold tracking-tight text-[var(--text)]">Token Inventory</h3>
        <p className="mt-1 text-[13px] text-[var(--text2)]">Manage issued tokens and revoke access.</p>
      </div>
      <Table headers={["Token", "Status", "Scopes", "Allowed IPs", "Last used", "Expires", "Actions"]}>
        {tokens?.length ? (
          tokens.map((token: any) => {
            const isExpired = token.expiresAt ? new Date(token.expiresAt).getTime() <= now : false;
            const status = token.revokedAt ? "revoked" : isExpired ? "expired" : "active";
            const canMutate = !token.revokedAt && !isExpired;
            return (
              <Tr key={token.id} className="transition-colors hover:bg-[var(--bg2)]">
                <Td className="font-mono text-[13px] text-[var(--text)]">{maskToken(token.id)}</Td>
                <Td><StatusBadge status={status} /></Td>
                <Td className="text-[13px] text-[var(--text2)]">{token.scopes.length ? token.scopes.join(", ") : "None"}</Td>
                <Td className="text-[13px] text-[var(--text2)]">{token.allowedIps.length ? token.allowedIps.join(", ") : "Any IP"}</Td>
                <Td>{token.lastUsedAt ? <Timestamp value={new Date(token.lastUsedAt).getTime()} /> : <span className="text-[var(--text3)]">Never</span>}</Td>
                <Td><span className={`text-[13px] font-medium ${isExpired ? "text-[var(--red)]" : formatExpiryLabel(token.expiresAt).endsWith("h left") ? "text-[var(--amber)]" : "text-[var(--text2)]"}`}>{formatExpiryLabel(token.expiresAt)}</span></Td>
                <Td>
                  <div className="flex justify-end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <UiButton variant="ghost" size="icon" className="h-8 w-8 text-[var(--text3)] hover:text-[var(--text)]">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="size-4" />
                        </UiButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!canMutate || rotateMutation.isPending} onClick={() => rotateMutation.mutate(token.id)}>
                          <RefreshCcw className="mr-2 size-4" /> Rotate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!canMutate || revokeMutation.isPending} onClick={() => revokeMutation.mutate(token.id)} className="text-[var(--red)] focus:bg-[var(--red-bg)] focus:text-[var(--red)]">
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Td>
              </Tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={7} className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-[var(--bg2)]">
                  <KeyRound className="size-6 text-[var(--text3)]" />
                </div>
                <h4 className="mt-4 font-medium tracking-tight text-[var(--text)]">No SCIM tokens yet</h4>
                <p className="mt-1 text-[13px] text-[var(--text2)] max-w-[300px]">
                  Configure a token policy above and click "Generate token" to get started.
                </p>
              </div>
            </td>
          </tr>
        )}
      </Table>
    </section>
  );
}

export function ScimProvisioningPage({ mode = "admin" }: ScimProvisioningPageProps) {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [now] = useState(() => Date.now());

  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<ScimScope[]>(["users:read", "users:write", "users:delete", "groups:read", "groups:write", "groups:delete"]);
  const [expiresInDays, setExpiresInDays] = useState("365");
  const [allowedIpsText, setAllowedIpsText] = useState("");

  const { data: tokens, isLoading } = useQuery({
    queryKey: orgQueryKeys.scimTokens(activeOrgId!),
    queryFn: () => orgApi.listScimTokens(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const invalidateTokens = () => {
    if (!activeOrgId) return;
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.scimTokens(activeOrgId) });
  };

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!activeOrgId) throw new Error("No active organization");
      return orgApi.createScimToken(activeOrgId, {
        scopes: selectedScopes,
        allowedIps: parseAllowedIps(allowedIpsText),
        expiresInDays: expiresInDays.trim() ? Number(expiresInDays) : undefined,
      });
    },
    onSuccess: (data) => {
      toast.success("SCIM token generated");
      setNewTokenRaw(data.rawToken);
      invalidateTokens();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to generate token"),
  });

  const rotateMutation = useMutation({
    mutationFn: (tokenId: string) => {
      if (!activeOrgId) throw new Error("No active organization");
      return orgApi.rotateScimToken(activeOrgId, tokenId);
    },
    onSuccess: (data) => {
      toast.success("SCIM token rotated");
      setNewTokenRaw(data.rawToken);
      invalidateTokens();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to rotate token"),
  });

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => {
      if (!activeOrgId) throw new Error("No active organization");
      return orgApi.revokeScimToken(activeOrgId, tokenId);
    },
    onSuccess: () => {
      toast.success("SCIM token revoked");
      setNewTokenRaw(null);
      invalidateTokens();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to revoke token"),
  });

  const activeTokens = tokens?.filter((token) => !token.revokedAt && (!token.expiresAt || new Date(token.expiresAt) > new Date())) ?? [];
  const activeToken = activeTokens[0] ?? null;
  const expiringSoonCount = activeTokens.filter((token) => {
    if (!token.expiresAt) return false;
    return new Date(token.expiresAt).getTime() - now <= 7 * 86400000;
  }).length;
  const lastUsedAt = activeTokens
    .map((token) => token.lastUsedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  const apiBaseUrl = env.VITE_API_URL.replace(/\/$/, "");
  const scimBaseUrl = activeOrgId ? `${apiBaseUrl}/scim/v2/${activeOrgId}` : `${apiBaseUrl}/scim/v2/{orgId}`;
  const pageTitle = mode === "settings" ? "SCIM Provisioning" : "SCIM Configuration";
  const pageDescription = mode === "settings"
    ? "Manage provisioning endpoints, token scopes, rotation, and IP allowlists for your organization."
    : "Provisioning tokens and SCIM resource endpoints for identity automation.";

  function toggleScope(scope: ScimScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] w-full flex flex-col gap-10 pb-20">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <Button variant="primary" className="h-10 px-5" disabled={generateMutation.isPending || selectedScopes.length === 0} onClick={() => generateMutation.mutate()}>
            {generateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />} Create token
          </Button>
        }
      />
      <ScimStatsRow statusIsActive={!!activeToken} activeTokens={activeTokens} tokensLength={tokens?.length ?? 0} expiringSoonCount={expiringSoonCount} lastUsedAt={lastUsedAt} />
      {newTokenRaw && <ScimNewTokenBanner newTokenRaw={newTokenRaw} />}
      <ScimProvisioningEndpoints scimBaseUrl={scimBaseUrl} activeToken={activeToken} />
      <ScimTokenPolicy selectedScopes={selectedScopes} toggleScope={toggleScope} allowedIpsText={allowedIpsText} setAllowedIpsText={setAllowedIpsText} expiresInDays={expiresInDays} setExpiresInDays={setExpiresInDays} generateMutation={generateMutation} />
      <ScimTokenInventory tokens={tokens} rotateMutation={rotateMutation} revokeMutation={revokeMutation} />
    </div>
  );
}

export default function ScimPage() {
  return <ScimProvisioningPage mode="admin" />;
}
