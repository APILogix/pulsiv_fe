import { useState } from "react";
import {
  Clock,
  KeyRound,
  Link2,
  MoreHorizontal,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { env } from "@/app/config/env";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { CreateScimTokenInput, ScimToken } from "@/modules/organizations/types/org.types";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CardSkeleton,
  CopyButton,
  StatusBadge,
  Table,
  Td,
  Timestamp,
  Tr,
} from "@/shared/observe";
import {
  EmptyPanel,
  HeroFacts,
  KeyValueGrid,
  Notice,
  PageHero,
  Panel,
  Pill,
  SecretField,
  SectionHeading,
  SetupSteps,
  SplitShell,
  fieldInputClass,
  fieldTextareaClass,
  type HeroFact,
  type KeyValueItem,
  type SetupStepItem,
} from "@/shared/ui/pulse";

type ScimProvisioningPageProps = {
  mode?: "admin" | "settings";
};

type ScimScope = CreateScimTokenInput["scopes"][number];

interface ScopeOption {
  value: ScimScope;
  label: string;
  description: string;
}

const SCIM_SCOPE_OPTIONS: ScopeOption[] = [
  { value: "users:read", label: "Read users", description: "Directory reads and discovery endpoints." },
  { value: "users:write", label: "Write users", description: "Create, update, and patch users." },
  { value: "users:delete", label: "Delete users", description: "Deprovision and delete users." },
  { value: "groups:read", label: "Read groups", description: "Group and role management reads." },
  { value: "groups:write", label: "Write groups", description: "Group creation and assignment." },
  { value: "groups:delete", label: "Delete groups", description: "Group deletion." },
  { value: "bulk", label: "Bulk sync", description: "SCIM bulk sync operations." },
];

const DEFAULT_SCOPES: ScimScope[] = [
  "users:read",
  "users:write",
  "users:delete",
  "groups:read",
  "groups:write",
  "groups:delete",
];

const TOKEN_HEADERS = ["Token", "Status", "Scopes", "Allowed IPs", "Last used", "Expires", ""];

const DAY_MS = 86_400_000;

interface ScimEndpoint {
  label: string;
  url: string;
  method: string;
  description: string;
}

function scimEndpoints(base: string): ScimEndpoint[] {
  return [
    { label: "Base URL", url: base, method: "ALL", description: "Root provisioning endpoint" },
    { label: "Users", url: `${base}/Users`, method: "GET/POST", description: "User provisioning and sync" },
    { label: "Groups", url: `${base}/Groups`, method: "GET/POST", description: "Group and role management" },
    { label: "ServiceProviderConfig", url: `${base}/ServiceProviderConfig`, method: "GET", description: "Capability discovery" },
    { label: "Schemas", url: `${base}/Schemas`, method: "GET", description: "Resource schema definitions" },
  ];
}

function formatExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Never";
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return "Unknown";
  if (expiry.getTime() <= Date.now()) return "Expired";
  const hours = Math.round((expiry.getTime() - Date.now()) / 3_600_000);
  return hours <= 72 ? `${hours}h left` : expiry.toLocaleDateString();
}

function parseAllowedIps(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function maskToken(token: string): string {
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}

function riskTone(scopes: ScimScope[]) {
  if (scopes.some((scope) => scope.endsWith(":delete"))) return "red" as const;
  if (scopes.some((scope) => scope.endsWith(":write")) || scopes.includes("bulk")) return "amber" as const;
  return "green" as const;
}

function riskLabel(scopes: ScimScope[]) {
  if (scopes.some((scope) => scope.endsWith(":delete"))) return "High";
  if (scopes.some((scope) => scope.endsWith(":write")) || scopes.includes("bulk")) return "Medium";
  return "Low";
}

function policyPreview(scopes: ScimScope[], allowedIps: string[], expiresInDays: string): KeyValueItem[] {
  return [
    { label: "Scopes", value: scopes.length ? `${scopes.length} selected` : "None selected" },
    { label: "IP allowlist", value: allowedIps.length ? `${allowedIps.length} CIDR ranges` : "Any IP" },
    { label: "Expiry", value: expiresInDays.trim() ? `${expiresInDays} days` : "Backend default" },
    { label: "Risk level", value: <Pill tone={riskTone(scopes)}>{riskLabel(scopes)}</Pill> },
  ];
}

// ── one-off local component: endpoint reference row ──
function EndpointRow({ endpoint }: { endpoint: ScimEndpoint }) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 transition-colors hover:border-[var(--border2)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">{endpoint.label}</span>
          <span className="rounded-[6px] bg-[var(--ai-bg)] px-1.5 py-px font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase text-[var(--ai)]">
            {endpoint.method}
          </span>
        </div>
        <p className="mt-1 truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]" title={endpoint.url}>
          {endpoint.url}
        </p>
        <p className="mt-1 text-[12px] text-[var(--text3)]">{endpoint.description}</p>
      </div>
      <CopyButton value={endpoint.url} label="Copy URL" />
    </div>
  );
}

// ── one-off local component: scope selector tile ──
function ScopeTile({
  option,
  selected,
  onToggle,
}: {
  option: ScopeOption;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition-colors ${
        selected ? "border-[var(--brand)] bg-[var(--brand-bg)]" : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
      />
      <span className="min-w-0">
        <span className="block font-[family-name:var(--mono)] text-[12.5px] font-medium text-[var(--text)]">{option.label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[var(--text2)]">{option.description}</span>
      </span>
    </label>
  );
}

export function ScimProvisioningPage({ mode = "admin" }: ScimProvisioningPageProps) {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [now] = useState(() => Date.now());

  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<ScimScope[]>(DEFAULT_SCOPES);
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

  const allTokens = tokens ?? [];
  const activeTokens = allTokens.filter(
    (token) => !token.revokedAt && (!token.expiresAt || new Date(token.expiresAt).getTime() > now),
  );
  const activeToken = activeTokens[0] ?? null;
  const expiringSoonCount = activeTokens.filter((token) => {
    if (!token.expiresAt) return false;
    return new Date(token.expiresAt).getTime() - now <= 7 * DAY_MS;
  }).length;
  const lastUsedAt =
    activeTokens
      .map((token) => token.lastUsedAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  const apiBaseUrl = env.VITE_API_URL.replace(/\/$/, "");
  const scimBaseUrl = activeOrgId ? `${apiBaseUrl}/scim/v2/${activeOrgId}` : `${apiBaseUrl}/scim/v2/{orgId}`;
  const allowedIps = parseAllowedIps(allowedIpsText);

  const pageTitle = mode === "settings" ? "SCIM provisioning" : "SCIM configuration";
  const pageDescription =
    mode === "settings"
      ? "Manage provisioning endpoints, token scopes, rotation, and IP allowlists for your organization."
      : "Provisioning tokens and SCIM resource endpoints for identity automation.";

  const facts: HeroFact[] = [
    {
      label: "Provisioning",
      value: activeToken ? "Active" : "Inactive",
      tone: activeToken ? "green" : "amber",
      icon: ShieldCheck,
    },
    { label: "Active tokens", value: activeTokens.length, icon: KeyRound },
    {
      label: "Expiring in 7 days",
      value: expiringSoonCount,
      tone: expiringSoonCount > 0 ? "amber" : "neutral",
      icon: Clock,
    },
    {
      label: "Last used",
      value: lastUsedAt ? <Timestamp value={lastUsedAt} /> : "Never",
      icon: Users,
    },
  ];

  const steps: SetupStepItem[] = [
    { title: "Issue a provisioning token", description: "Pick least-privilege scopes, then generate. The raw token is shown once.", done: !!activeToken },
    { title: "Add the base URL to your IdP", description: <span className="font-[family-name:var(--mono)] text-[11.5px]">{scimBaseUrl}</span> },
    {
      title: "Set the authorization header",
      description: (
        <span>
          Send <span className="font-[family-name:var(--mono)] text-[11.5px]">Authorization: Bearer scim_…</span> on every request.
        </span>
      ),
    },
    { title: "Restrict by IP", description: "Add your IdP egress CIDR ranges so tokens only work from known networks.", done: allowedIps.length > 0 },
    { title: "Schedule rotation", description: "Rotate on a fixed cadence and revoke tokens you no longer recognise." },
  ];

  function toggleScope(scope: ScimScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero eyebrow="Provisioning" title={pageTitle} description={pageDescription} icon={Workflow} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Provisioning"
        title={pageTitle}
        description={pageDescription}
        icon={Workflow}
        actions={
          <>
            <Pill tone={activeToken ? "green" : "amber"} dot>
              {activeToken ? "Provisioning active" : "No active token"}
            </Pill>
            <UiButton
              disabled={generateMutation.isPending || selectedScopes.length === 0}
              onClick={() => generateMutation.mutate()}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Issue token
            </UiButton>
          </>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {newTokenRaw && (
        <Notice tone="amber" icon={KeyRound} title="Copy this token now">
          <p>The raw bearer token is returned only once. Store it in your secrets manager before leaving this page.</p>
          <SecretField value={newTokenRaw} label="Bearer token" masked className="mt-3" />
        </Notice>
      )}

      <SplitShell
        rail={
          <>
            <Panel title="Wire up your IdP" description="Five steps to a working SCIM sync." icon={ShieldCheck} tone="ai">
              <SetupSteps steps={steps} />
            </Panel>
            <Panel title="Base URL" description="Paste this into the provisioning tab of your IdP application." icon={Link2} tone="brand">
              <SecretField value={scimBaseUrl} label="SCIM base URL" />
            </Panel>
          </>
        }
      >
        <Panel
          title="Provisioning endpoints"
          description="Resource URLs exposed to your identity provider."
          icon={Link2}
          tone="brand"
          bodyClassName="p-5 flex flex-col gap-3"
        >
          {scimEndpoints(scimBaseUrl).map((endpoint) => (
            <EndpointRow key={endpoint.label} endpoint={endpoint} />
          ))}
        </Panel>

        <Panel
          title="Token policy"
          description="Scopes, network allowlist, and lifetime applied to the next token you issue."
          icon={KeyRound}
          tone="violet"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <SectionHeading title="Scopes" description="At least one scope is required. Prefer least privilege." />
              <div className="grid gap-3 sm:grid-cols-2">
                {SCIM_SCOPE_OPTIONS.map((option) => (
                  <ScopeTile
                    key={option.value}
                    option={option}
                    selected={selectedScopes.includes(option.value)}
                    onToggle={() => toggleScope(option.value)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="scim-allowed-ips" className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                  Allowed IP CIDRs
                </label>
                <textarea
                  id="scim-allowed-ips"
                  value={allowedIpsText}
                  onChange={(event) => setAllowedIpsText(event.target.value)}
                  rows={3}
                  placeholder={"203.0.113.10/32\n198.51.100.0/24"}
                  className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12.5px]`}
                />
                <span className="text-[11.5px] text-[var(--text3)]">Optional. Separate values with commas or new lines.</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="scim-expiry" className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                  Token expiry in days
                </label>
                <input
                  id="scim-expiry"
                  type="number"
                  min={1}
                  max={3650}
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(event.target.value)}
                  className={`${fieldInputClass} tabular-nums`}
                />
                <span className="text-[11.5px] text-[var(--text3)]">Leave blank to use the backend default.</span>
              </div>
            </div>

            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-4">
              <KeyValueGrid items={policyPreview(selectedScopes, allowedIps, expiresInDays)} columns={2} />
            </div>

            <div className="flex justify-end">
              <UiButton
                disabled={generateMutation.isPending || selectedScopes.length === 0}
                onClick={() => generateMutation.mutate()}
              >
                <KeyRound className="size-4" aria-hidden="true" />
                Generate token
              </UiButton>
            </div>
          </div>
        </Panel>

        <Panel
          title="Issued tokens"
          description="Rotate to replace a token in place. Revoking is immediate and cannot be undone."
          icon={ShieldCheck}
          tone="brand"
          bodyClassName="p-0"
        >
          {allTokens.length === 0 ? (
            <EmptyPanel
              className="rounded-none border-0 border-t border-dashed"
              icon={KeyRound}
              title="No SCIM tokens yet"
              description="Set a token policy above, then issue a token to start provisioning."
            />
          ) : (
            <Table headers={TOKEN_HEADERS} maxHeight="26rem">
              {allTokens.map((token: ScimToken) => {
                const isExpired = token.expiresAt ? new Date(token.expiresAt).getTime() <= now : false;
                const status = token.revokedAt ? "revoked" : isExpired ? "expired" : "active";
                const canMutate = !token.revokedAt && !isExpired;
                return (
                  <Tr key={token.id}>
                    <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{maskToken(token.id)}</Td>
                    <Td><StatusBadge status={status} /></Td>
                    <Td className="text-[12.5px] text-[var(--text2)]">{token.scopes.length ? token.scopes.join(", ") : "None"}</Td>
                    <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                      {token.allowedIps.length ? token.allowedIps.join(", ") : "Any IP"}
                    </Td>
                    <Td>
                      {token.lastUsedAt ? (
                        <Timestamp value={token.lastUsedAt} />
                      ) : (
                        <span className="text-[var(--text3)]">Never</span>
                      )}
                    </Td>
                    <Td
                      className={`text-[12.5px] tabular-nums ${
                        isExpired
                          ? "text-[var(--red)]"
                          : formatExpiryLabel(token.expiresAt).endsWith("h left")
                            ? "text-[var(--amber)]"
                            : "text-[var(--text2)]"
                      }`}
                    >
                      {formatExpiryLabel(token.expiresAt)}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <UiButton variant="ghost" size="icon" className="size-8 text-[var(--text3)] hover:text-[var(--text)]">
                              <span className="sr-only">Token actions</span>
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </UiButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!canMutate || rotateMutation.isPending}
                              onClick={() => rotateMutation.mutate(token.id)}
                            >
                              <RefreshCcw className="mr-2 size-4" aria-hidden="true" />
                              Rotate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!canMutate || revokeMutation.isPending}
                              onClick={() => revokeMutation.mutate(token.id)}
                              className="text-[var(--red)] focus:bg-[var(--red-bg)] focus:text-[var(--red)]"
                            >
                              <Trash2 className="mr-2 size-4" aria-hidden="true" />
                              Revoke
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Table>
          )}
        </Panel>
      </SplitShell>
    </div>
  );
}

export default function ScimPage() {
  return <ScimProvisioningPage mode="admin" />;
}
