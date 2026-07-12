import { useState } from "react";
import {
  Clock,
  Info,
  KeyRound,
  Loader2,
  RefreshCcw,
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
import {
  Button,
  Callout,
  CopyField,
  DetailSkeleton,
  EmptyState,
  Field,
  IconTile,
  inputClass,
  KpiCard,
  PageHeader,
  SectionCard,
  SetupStep,
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
  { value: "users:read", label: "Read users", description: "User directory reads and discovery endpoints.", icon: Info },
  { value: "users:write", label: "Write users", description: "User create, update, and patch provisioning calls.", icon: Zap },
  { value: "users:delete", label: "Delete users", description: "User deprovisioning and delete operations.", icon: Trash2 },
  { value: "groups:read", label: "Read groups", description: "Group and role management reads.", icon: Info },
  { value: "groups:write", label: "Write groups", description: "Group creation and assignment.", icon: Zap },
  { value: "groups:delete", label: "Delete groups", description: "Group deletion.", icon: Trash2 },
  { value: "bulk", label: "Bulk sync", description: "SCIM bulk sync operations.", icon: Zap },
];

const SCIM_ENDPOINTS = [
  { label: "Base URL", path: "", method: "ALL", description: "Root provisioning endpoint" },
  { label: "Users", path: "/Users", method: "GET/POST", description: "User provisioning and syncing" },
  { label: "Groups", path: "/Groups", method: "GET/POST", description: "Group and role management" },
  { label: "ServiceProviderConfig", path: "/ServiceProviderConfig", method: "GET", description: "Capability discovery" },
  { label: "Schemas", path: "/Schemas", method: "GET", description: "Resource schema definitions" },
];

const SETUP_STEPS = [
  { title: "Generate a bearer token", description: "Pick least-privilege scopes below and create a token." },
  { title: "Connect your IdP", description: "Paste the base URL into your IdP provisioning app (Okta, Entra…)." },
  { title: "Set the auth header", description: "Configure Authorization: Bearer scim_… on the IdP connection." },
  { title: "Restrict network access", description: "Add a CIDR allowlist so only IdP egress IPs can provision." },
  { title: "Rotate on a cadence", description: "Schedule token rotation and revoke unused tokens." },
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
  const pageTitle = mode === "settings" ? "SCIM provisioning" : "SCIM";
  const pageDescription =
    mode === "settings"
      ? "Manage provisioning endpoints, token scopes, rotation, and IP allowlists for your organization."
      : "Provisioning tokens and SCIM resource endpoints for identity automation.";

  function toggleScope(scope: ScimScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
  }

  if (isLoading) return <DetailSkeleton />;

  const statusIsActive = !!activeToken;
  const riskLevel = selectedScopes.some((scope) => scope.endsWith(":delete"))
    ? "High"
    : selectedScopes.some((scope) => scope.endsWith(":write"))
      ? "Medium"
      : "Low";
  const riskTone =
    riskLevel === "High" ? "text-[var(--red)]" : riskLevel === "Medium" ? "text-[var(--amber)]" : "text-[var(--green)]";
  const allowedIpCount = parseAllowedIps(allowedIpsText).length;

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
            {generateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Create token
          </Button>
        }
      />

      {/* ── Status hero ── */}
      <div className="flex flex-col gap-4 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={ShieldCheck} tone={statusIsActive ? "green" : "neutral"} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">SCIM provisioning</h2>
              <StatusBadge status={statusIsActive ? "active" : "not-started"} />
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--text2)]">
              {statusIsActive
                ? "Your IdP can provision and deprovision users through the SCIM API."
                : "No active token — generate a bearer token below to enable provisioning."}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Active tokens" value={activeTokens.length} delta={`${tokens?.length ?? 0} total issued`} icon={KeyRound} />
        <KpiCard
          label="Expiring soon"
          value={expiringSoonCount}
          delta="within 7 days"
          trend={expiringSoonCount > 0 ? "down" : "neutral"}
          icon={Clock}
        />
        <KpiCard
          label="Last used"
          value={lastUsedAt ? new Date(lastUsedAt).toLocaleDateString() : "Never"}
          delta={lastUsedAt ? new Date(lastUsedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "No activity recorded"}
          icon={Users}
        />
      </div>

      {/* ── New token banner ── */}
      {newTokenRaw && (
        <Callout tone="warning">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Copy your token now</span>
            <span className="text-[var(--text2)]">
              Pulse only returns the raw bearer token once. Store it in your secrets manager immediately.
            </span>
            <CopyField value={newTokenRaw} />
          </div>
        </Callout>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_320px] lg:items-start">
        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Provisioning endpoints">
            <div className="flex flex-col gap-4">
              {SCIM_ENDPOINTS.map((endpoint) => (
                <div key={endpoint.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">{endpoint.label}</span>
                    <span className="rounded-[5px] bg-[var(--brand-bg)] px-1.5 py-px font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--brand)]">
                      {endpoint.method}
                    </span>
                  </div>
                  <CopyField value={`${scimBaseUrl}${endpoint.path}`} />
                  <span className="text-[12px] text-[var(--text3)]">{endpoint.description}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Token policy">
            <div className="flex flex-col gap-5">
              <Field label="Scopes" hint="At least one scope is required.">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {SCIM_SCOPE_OPTIONS.map((scope) => {
                    const selected = selectedScopes.includes(scope.value);
                    const ScopeIcon = scope.icon;
                    return (
                      <label
                        key={scope.value}
                        className={`flex cursor-pointer flex-col gap-2 rounded-[10px] border p-3 transition-colors ${
                          selected
                            ? "border-[var(--brand)] bg-[var(--brand-bg)]"
                            : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--input)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <ScopeIcon className={`size-4 ${selected ? "text-[var(--brand)]" : "text-[var(--text3)]"}`} />
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
                        <span className="text-[11px] leading-snug text-[var(--text3)]">{scope.description}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Allowed IP CIDRs" hint="Optional. Separate multiple values with commas or new lines.">
                  <textarea
                    value={allowedIpsText}
                    onChange={(event) => setAllowedIpsText(event.target.value)}
                    className={textareaClass}
                    rows={3}
                    placeholder={"203.0.113.10/32\n198.51.100.0/24"}
                  />
                </Field>
                <Field label="Token expiry (days)" hint="Leave blank to use the backend default. Shorter lifecycles improve security.">
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={expiresInDays}
                    onChange={(event) => setExpiresInDays(event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* Policy summary */}
              <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Policy preview</span>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-[var(--text3)]">Scopes</span>
                  <span className="truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)]">
                    {selectedScopes.length ? selectedScopes.join(", ") : "—"}
                  </span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-[var(--text3)]">IP allowlist</span>
                  <span className="text-[12px] font-medium text-[var(--text)]">
                    {allowedIpCount ? `${allowedIpCount} CIDR${allowedIpCount > 1 ? "s" : ""}` : "Any IP"}
                  </span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-[var(--text3)]">Expiry</span>
                  <span className="text-[12px] font-medium text-[var(--text)]">
                    {expiresInDays.trim() ? `${expiresInDays} days` : "Backend default"}
                  </span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-[var(--text3)]">Risk level</span>
                  <span className={`text-[12px] font-semibold ${riskTone}`}>{riskLevel}</span>
                </div>
              </div>

              <div>
                <Button
                  variant="primary"
                  disabled={generateMutation.isPending || selectedScopes.length === 0}
                  onClick={() => generateMutation.mutate()}
                >
                  {generateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  Generate token
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Token inventory">
            {tokens?.length ? (
              <Table headers={["Token", "Status", "Scopes", "Allowed IPs", "Last used", "Expires", "Actions"]}>
                {tokens.map((token) => {
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
                })}
              </Table>
            ) : (
              <EmptyState
                icon={KeyRound}
                message="No SCIM tokens yet — configure a token policy above and generate your first token."
              />
            )}
          </SectionCard>
        </div>

        {/* ── Side rail ── */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Setup guide">
            <div className="flex flex-col gap-4">
              {SETUP_STEPS.map((step, idx) => (
                <SetupStep key={step.title} step={idx + 1} title={step.title} description={step.description} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Good to know">
            <div className="flex flex-col gap-3">
              <Callout tone="info">Tokens are hashed at rest — the raw value is shown exactly once at creation.</Callout>
              <Callout tone="warning">Rotating a token invalidates the previous secret immediately.</Callout>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default function ScimPage() {
  return <ScimProvisioningPage mode="admin" />;
}
