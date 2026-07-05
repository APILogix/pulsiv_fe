import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Info,
  KeyRound,
  Loader2,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { env } from "@/app/config/env";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { CreateScimTokenInput } from "@/modules/organizations/types/org.types";
import {
  Button,
  CopyButton,
  Field,
  inputClass,
  MonospaceText,
  PageHeader,
  SectionCard,
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
  { value: "read", label: "Read", description: "Allow directory reads and discovery endpoints.", icon: Info },
  { value: "write", label: "Write", description: "Allow create, update, and patch provisioning calls.", icon: Zap },
  { value: "delete", label: "Delete", description: "Allow deprovisioning and delete operations.", icon: Trash2 },
];

const SCIM_ENDPOINTS = (base: string) => [
  { label: "Base URL", path: "", method: "ALL", description: "Root provisioning endpoint" },
  { label: "Users", path: "/Users", method: "GET/POST", description: "User provisioning and syncing" },
  { label: "Groups", path: "/Groups", method: "GET/POST", description: "Group and role management" },
  { label: "ServiceProviderConfig", path: "/ServiceProviderConfig", method: "GET", description: "Capability discovery" },
  { label: "Schemas", path: "/Schemas", method: "GET", description: "Resource schema definitions" },
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

export function ScimProvisioningPage({ mode = "admin" }: ScimProvisioningPageProps) {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<ScimScope[]>(["read", "write", "delete"]);
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

  const activeTokens =
    tokens?.filter((token) => !token.revokedAt && (!token.expiresAt || new Date(token.expiresAt) > new Date())) ?? [];
  const activeToken = activeTokens[0] ?? null;
  const expiringSoonCount = activeTokens.filter((token) => {
    if (!token.expiresAt) return false;
    return new Date(token.expiresAt).getTime() - Date.now() <= 7 * 86400000;
  }).length;
  const lastUsedAt =
    activeTokens
      .map((token) => token.lastUsedAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  const apiBaseUrl = env.VITE_API_URL.replace(/\/$/, "");
  const scimBaseUrl = activeOrgId ? `${apiBaseUrl}/scim/v2/${activeOrgId}` : `${apiBaseUrl}/scim/v2/{orgId}`;
  const pageTitle = mode === "settings" ? "SCIM Provisioning" : "SCIM";
  const pageDescription =
    mode === "settings"
      ? "Manage provisioning endpoints, token scopes, rotation, and IP allowlists for your organization."
      : "Provisioning tokens and SCIM resource endpoints for identity automation.";

  function toggleScope(scope: ScimScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  const statusIsActive = !!activeToken;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <Button
            variant="primary"
            disabled={generateMutation.isPending || selectedScopes.length === 0}
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 size-4" />
            )}
            Create token
          </Button>
        }
      />

      {/* ── KPI Stats Row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Status */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Status</span>
            <div
              className={`flex size-7 items-center justify-center rounded-full ${
                statusIsActive ? "bg-[var(--green)]/12" : "bg-[var(--red)]/12"
              }`}
            >
              {statusIsActive ? (
                <ShieldCheck className="size-3.5 text-[var(--green)]" />
              ) : (
                <ShieldAlert className="size-3.5 text-[var(--red)]" />
              )}
            </div>
          </div>
          <div
            className={`text-lg font-semibold ${statusIsActive ? "text-[var(--green)]" : "text-[var(--text3)]"}`}
          >
            {statusIsActive ? "Active" : "Inactive"}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text3)]">
            {statusIsActive ? "Provisioning enabled" : "No active token"}
          </div>
        </div>

        {/* Active Tokens */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Active Tokens</span>
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--brand)]/12">
              <KeyRound className="size-3.5 text-[var(--brand)]" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-[var(--text)]">{activeTokens.length}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text3)]">
            {tokens?.length ?? 0} total issued
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Expiring Soon</span>
            <div
              className={`flex size-7 items-center justify-center rounded-full ${
                expiringSoonCount > 0 ? "bg-[var(--amber)]/12" : "bg-[var(--bg3)]"
              }`}
            >
              <Clock
                className={`size-3.5 ${expiringSoonCount > 0 ? "text-[var(--amber)]" : "text-[var(--text3)]"}`}
              />
            </div>
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              expiringSoonCount > 0 ? "text-[var(--amber)]" : "text-[var(--text)]"
            }`}
          >
            {expiringSoonCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text3)]">within 7 days</div>
        </div>

        {/* Last Token Use */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Last Used</span>
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--bg3)]">
              <Users className="size-3.5 text-[var(--text3)]" />
            </div>
          </div>
          {lastUsedAt ? (
            <>
              <div className="text-sm font-semibold text-[var(--text)]">
                {new Date(lastUsedAt).toLocaleDateString()}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text3)]">
                {new Date(lastUsedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-[var(--text3)]">Never</div>
              <div className="mt-0.5 text-[11px] text-[var(--text3)]">No activity recorded</div>
            </>
          )}
        </div>
      </div>

      {/* ── New Token Banner ── */}
      {newTokenRaw && (
        <div className="rounded-[12px] border border-[var(--amber)]/30 bg-[var(--amber)]/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/15">
                <AlertTriangle className="size-3.5 text-[var(--amber)]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text)]">Copy your token now</div>
                <p className="mt-0.5 text-[12px] text-[var(--text2)]">
                  Pulse only returns the raw bearer token once. Store it in your secrets manager immediately.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] px-3 py-2">
                  <MonospaceText value={newTokenRaw} className="flex-1 truncate" />
                  <CopyButton value={newTokenRaw} label="Copy" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Provisioning Endpoints ── */}
      <SectionCard title="Provisioning endpoints">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            {SCIM_ENDPOINTS(scimBaseUrl).map((endpoint) => {
              const url = `${scimBaseUrl}${endpoint.path}`;
              return (
                <div
                  key={endpoint.label}
                  className="group flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 transition-colors hover:border-[var(--border)]/80 hover:bg-[var(--bg3)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                        {endpoint.label}
                      </span>
                      <span className="rounded-[4px] bg-[var(--brand)]/10 px-1.5 py-px text-[10px] font-medium text-[var(--brand)]">
                        {endpoint.method}
                      </span>
                    </div>
                    <div className="font-mono text-[12px] text-[var(--text2)] truncate">{url}</div>
                  </div>
                  <CopyButton value={url} label="Copy" />
                </div>
              );
            })}
          </div>

          {/* Checklist */}
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-6 items-center justify-center rounded-full bg-[var(--brand)]/12">
                <Shield className="size-3.5 text-[var(--brand)]" />
              </div>
              <span className="text-sm font-semibold text-[var(--text)]">Setup checklist</span>
            </div>
            <div className="space-y-3">
              {[
                {
                  done: !!activeToken,
                  text: "Generate a SCIM bearer token below",
                },
                {
                  done: false,
                  text: "Paste base URL into your IdP provisioning app",
                },
                {
                  done: false,
                  text: (
                    <span>
                      Set{" "}
                      <code className="rounded bg-[var(--bg3)] px-1 py-px text-[11px]">
                        Authorization: Bearer scim_...
                      </code>{" "}
                      header
                    </span>
                  ),
                },
                {
                  done: false,
                  text: "Restrict scopes to least-privilege for production",
                },
                {
                  done: false,
                  text: "Add CIDR allowlist for extra security",
                },
                {
                  done: false,
                  text: "Schedule token rotation on a defined cadence",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  {item.done ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--green)]" />
                  ) : (
                    <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-[var(--border)]" />
                  )}
                  <span className="text-[12px] text-[var(--text2)] leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Token Policy ── */}
      <SectionCard title="Token policy">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <Field label="Scopes" hint="At least one scope is required.">
              <div className="grid gap-2 sm:grid-cols-3">
                {SCIM_SCOPE_OPTIONS.map((scope) => {
                  const selected = selectedScopes.includes(scope.value);
                  const ScopeIcon = scope.icon;
                  return (
                    <label
                      key={scope.value}
                      className={`flex cursor-pointer flex-col gap-2 rounded-[10px] border p-3 transition-all ${
                        selected
                          ? "border-[var(--brand)] bg-[var(--brand)]/8 shadow-[0_0_0_1px_var(--brand)/20]"
                          : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border)]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex size-6 items-center justify-center rounded-full ${
                            selected ? "bg-[var(--brand)]/15" : "bg-[var(--bg3)]"
                          }`}
                        >
                          <ScopeIcon
                            className={`size-3 ${selected ? "text-[var(--brand)]" : "text-[var(--text3)]"}`}
                          />
                        </div>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleScope(scope.value)}
                          className="accent-[var(--brand)]"
                        />
                      </div>
                      <span className={`text-[13px] font-medium ${selected ? "text-[var(--text)]" : "text-[var(--text2)]"}`}>
                        {scope.label}
                      </span>
                      <span className="text-[11px] text-[var(--text3)] leading-snug">{scope.description}</span>
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Allowed IP CIDRs" hint="Optional. Separate multiple values with commas or new lines.">
              <textarea
                value={allowedIpsText}
                onChange={(event) => setAllowedIpsText(event.target.value)}
                className={textareaClass}
                rows={3}
                placeholder={"203.0.113.10/32\n198.51.100.0/24"}
              />
            </Field>
          </div>

          <div className="space-y-4">
            <Field
              label="Token expiry (days)"
              hint="Leave blank to use the backend default. Shorter lifecycles improve security."
            >
              <input
                type="number"
                min={1}
                max={3650}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                className={inputClass}
              />
            </Field>

            {/* Policy summary card */}
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)] mb-3">
                Policy preview
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text3)]">Scopes</span>
                  <span className="text-[12px] font-medium text-[var(--text)]">
                    {selectedScopes.length ? selectedScopes.join(", ") : "—"}
                  </span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text3)]">IP allowlist</span>
                  <span className="text-[12px] font-medium text-[var(--text)]">
                    {parseAllowedIps(allowedIpsText).length
                      ? `${parseAllowedIps(allowedIpsText).length} CIDR${parseAllowedIps(allowedIpsText).length > 1 ? "s" : ""}`
                      : "Any IP"}
                  </span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text3)]">Expiry</span>
                  <span className="text-[12px] font-medium text-[var(--text)]">
                    {expiresInDays.trim() ? `${expiresInDays} days` : "Backend default"}
                  </span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text3)]">Risk level</span>
                  <span
                    className={`text-[12px] font-semibold ${
                      selectedScopes.includes("delete")
                        ? "text-[var(--red)]"
                        : selectedScopes.includes("write")
                        ? "text-[var(--amber)]"
                        : "text-[var(--green)]"
                    }`}
                  >
                    {selectedScopes.includes("delete")
                      ? "High"
                      : selectedScopes.includes("write")
                      ? "Medium"
                      : "Low"}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              disabled={generateMutation.isPending || selectedScopes.length === 0}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 size-4" />
              )}
              Generate token
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* ── Token Inventory ── */}
      <SectionCard title="Token inventory" className="p-0">
        <Table headers={["Token", "Status", "Scopes", "Allowed IPs", "Last used", "Expires", "Actions"]}>
          {tokens?.length ? (
            tokens.map((token) => {
              const isExpired = token.expiresAt ? new Date(token.expiresAt).getTime() <= Date.now() : false;
              const status = token.revokedAt ? "revoked" : isExpired ? "expired" : "active";
              const canMutate = !token.revokedAt && !isExpired;

              return (
                <Tr key={token.id}>
                  <Td className="font-[family-name:var(--mono)] text-[12px]">{maskToken(token.id)}</Td>
                  <Td>
                    <StatusBadge status={status} />
                  </Td>
                  <Td className="text-[12px] text-[var(--text2)]">
                    {token.scopes.length ? token.scopes.join(", ") : "None"}
                  </Td>
                  <Td className="text-[12px] text-[var(--text2)]">
                    {token.allowedIps.length ? token.allowedIps.join(", ") : "Any IP"}
                  </Td>
                  <Td>
                    {token.lastUsedAt ? (
                      <Timestamp value={new Date(token.lastUsedAt).getTime()} />
                    ) : (
                      <span className="text-[var(--text3)]">Never</span>
                    )}
                  </Td>
                  <Td>
                    <span
                      className={`text-[12px] font-medium ${
                        isExpired
                          ? "text-[var(--red)]"
                          : formatExpiryLabel(token.expiresAt).endsWith("h left")
                          ? "text-[var(--amber)]"
                          : "text-[var(--text2)]"
                      }`}
                    >
                      {formatExpiryLabel(token.expiresAt)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={!canMutate || rotateMutation.isPending}
                        onClick={() => rotateMutation.mutate(token.id)}
                      >
                        <RefreshCcw className="size-3.5" />
                        Rotate
                      </Button>
                      <Button
                        variant="danger"
                        disabled={!canMutate || revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(token.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[var(--bg3)]">
                    <KeyRound className="size-5 text-[var(--text3)]" />
                  </div>
                  <div className="text-sm font-medium text-[var(--text2)]">No SCIM tokens yet</div>
                  <div className="text-[12px] text-[var(--text3)]">
                    Configure a token policy above and click "Generate token" to get started.
                  </div>
                </div>
              </td>
            </tr>
          )}
        </Table>
      </SectionCard>
    </div>
  );
}

export default function ScimPage() {
  return <ScimProvisioningPage mode="admin" />;
}
