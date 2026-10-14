import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { env } from "@/app/config/env";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { CreateScimTokenInput, ScimToken } from "@/modules/organizations/types/org.types";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  HIDE_BELOW_XL,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetList,
  SheetListItem,
  SheetLoading,
  SheetRow,
  SheetTable,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { ConfirmDialog, DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import { CopyButton, Timestamp, formatNumber } from "@/shared/observe";
import {
  KeyValueGrid,
  Notice,
  Panel,
  Pill,
  SecretField,
  SetupSteps,
  SplitShell,
  fieldInputClass,
  fieldTextareaClass,
  type KeyValueItem,
  type SetupStepItem,
  type SurfaceTone,
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

const DAY_MS = 86_400_000;
const EXPIRING_WINDOW_MS = 7 * DAY_MS;
const TOKEN_FORM_ID = "scim-token-form";

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

// ── Token state ──────────────────────────────────────────────

type TokenState = "active" | "expiring" | "expired" | "revoked";

const TOKEN_STATE: Record<TokenState, { label: string; tone: SurfaceTone }> = {
  active: { label: "Active", tone: "green" },
  expiring: { label: "Expiring", tone: "amber" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "red" },
};

function isExpiredAt(token: ScimToken, now: number) {
  return token.expiresAt ? new Date(token.expiresAt).getTime() <= now : false;
}

/** Same rule as the dashboard ledger: not revoked and not expired. */
function isLive(token: ScimToken, now: number) {
  return !token.revokedAt && !isExpiredAt(token, now);
}

function isExpiringSoon(token: ScimToken, now: number) {
  if (!isLive(token, now) || !token.expiresAt) return false;
  return new Date(token.expiresAt).getTime() - now <= EXPIRING_WINDOW_MS;
}

function tokenState(token: ScimToken, now: number): TokenState {
  if (token.revokedAt) return "revoked";
  if (isExpiredAt(token, now)) return "expired";
  if (isExpiringSoon(token, now)) return "expiring";
  return "active";
}

const TOKEN_COLUMNS: SheetColumn[] = [
  { key: "token", header: "Token" },
  { key: "scopes", header: "Scopes", className: HIDE_BELOW_LG },
  { key: "state", header: "State", className: "w-[104px]" },
  { key: "ips", header: "Allowed IPs", className: `w-[150px] ${HIDE_BELOW_XL}` },
  { key: "lastUsed", header: "Last used", className: `w-[120px] ${HIDE_BELOW_MD}` },
  { key: "expires", header: "Expires", className: `w-[104px] ${HIDE_BELOW_SM}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[52px]", align: "right" },
];

// ── Scope picker row ─────────────────────────────────────────

function ScopeTile({
  option,
  selected,
  onToggle,
}: {
  option: ScopeOption;
  selected: boolean;
  onToggle: () => void;
}) {
  const id = `scim-scope-${option.value.replace(":", "-")}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 px-3.5 py-2.5 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[var(--brand)]",
        selected ? "bg-[var(--bg2)]" : "hover:bg-[var(--bg2)]/50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        name="scopes"
        value={option.value}
        checked={selected}
        onChange={onToggle}
        className="mt-0.5 size-4 shrink-0 accent-[var(--text)] focus-visible:outline-none"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-[13px] font-medium text-[var(--text)]">{option.label}</span>
          <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">{option.value}</code>
        </span>
        <span className="mt-0.5 block text-[12px] leading-[1.5] text-[var(--text2)]">{option.description}</span>
      </span>
    </label>
  );
}

// ── Page ─────────────────────────────────────────────────────

export function ScimProvisioningPage({ mode = "admin" }: ScimProvisioningPageProps) {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [now] = useState(() => Date.now());

  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<ScimScope[]>(DEFAULT_SCOPES);
  const [expiresInDays, setExpiresInDays] = useState("365");
  const [allowedIpsText, setAllowedIpsText] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<ScimToken | null>(null);

  const { data: tokens, isLoading, isError, error, refetch } = useQuery({
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
      toast.success("SCIM token created");
      setNewTokenRaw(data.rawToken);
      invalidateTokens();
    },
    onError: (err: unknown) =>
      toast.error(apiErrorMessage(err, "Could not create the SCIM token. Check the scopes and try again.")),
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
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Could not rotate the SCIM token. Try again.")),
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
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Could not revoke the SCIM token. Try again.")),
  });

  const allTokens = tokens ?? [];
  const liveTokens = allTokens.filter((token) => isLive(token, now));
  const revokedCount = allTokens.filter((token) => token.revokedAt).length;
  const expiredCount = allTokens.filter((token) => !token.revokedAt && isExpiredAt(token, now)).length;
  const expiringSoonCount = liveTokens.filter((token) => isExpiringSoon(token, now)).length;
  const anyExpiry = allTokens.some((token) => token.expiresAt);
  const lastUsedAt =
    liveTokens
      .map((token) => token.lastUsedAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  const provisioningOn = liveTokens.length > 0;
  const hasData = tokens !== undefined;

  const apiBaseUrl = env.VITE_API_URL.replace(/\/$/, "");
  const scimBaseUrl = activeOrgId ? `${apiBaseUrl}/scim/v2/${activeOrgId}` : `${apiBaseUrl}/scim/v2/{orgId}`;
  const allowedIps = parseAllowedIps(allowedIpsText);
  const canCreate = selectedScopes.length > 0 && !generateMutation.isPending;

  const pageTitle = mode === "settings" ? "SCIM provisioning" : "SCIM";
  const pageDescription =
    mode === "settings"
      ? "Manage provisioning endpoints, token scopes, rotation, and IP allowlists for your organization."
      : "Provisioning tokens and the SCIM endpoints your identity provider uses to create and remove members.";

  const readouts: Readout[] = [
    {
      label: "Live tokens",
      value: formatNumber(liveTokens.length),
      sub: `of ${formatNumber(allTokens.length)} issued`,
      tone: provisioningOn ? "good" : "neutral",
    },
    {
      label: "Revoked",
      value: formatNumber(revokedCount),
      sub: expiredCount > 0 ? `${formatNumber(expiredCount)} more expired` : "None expired",
    },
    ...(anyExpiry
      ? [
          {
            label: "Expiring soon",
            value: formatNumber(expiringSoonCount),
            sub: "Live tokens, next 7 days",
            tone: expiringSoonCount > 0 ? ("warn" as const) : ("neutral" as const),
          },
        ]
      : []),
    {
      label: "Last used",
      value: lastUsedAt ? (
        <Timestamp value={lastUsedAt} />
      ) : (
        <span className="font-[family-name:var(--sans)]">Never</span>
      ),
      sub: "Latest request from a live token",
    },
  ];

  const steps: SetupStepItem[] = [
    {
      title: "Issue a provisioning token",
      description: "Pick least-privilege scopes, then create. The raw token is shown once.",
      done: provisioningOn,
    },
    {
      title: "Add the base URL to your IdP",
      description: <span className="break-all font-[family-name:var(--mono)] text-[11.5px]">{scimBaseUrl}</span>,
    },
    {
      title: "Set the authorization header",
      description: (
        <span>
          Send <span className="font-[family-name:var(--mono)] text-[11.5px]">Authorization: Bearer scim_…</span> on every
          request.
        </span>
      ),
    },
    {
      title: "Restrict by IP",
      description: "Add your IdP egress CIDR ranges so tokens only work from known networks.",
      done: liveTokens.some((token) => token.allowedIps.length > 0),
    },
    { title: "Schedule rotation", description: "Rotate on a fixed cadence and revoke tokens you no longer recognise." },
  ];

  function toggleScope(scope: ScimScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  const revokingLastLive =
    revokeTarget !== null && liveTokens.length === 1 && liveTokens[0]?.id === revokeTarget.id;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title={pageTitle}
        description={pageDescription}
        meta={
          hasData
            ? [
                { label: "Provisioning", value: provisioningOn ? "On" : "Off" },
                { label: "Live tokens", value: formatNumber(liveTokens.length), mono: true },
              ]
            : undefined
        }
        actions={
          <UiButton type="submit" form={TOKEN_FORM_ID} size="lg" disabled={!canCreate}>
            Create token
          </UiButton>
        }
      />

      {isLoading ? (
        <Readouts
          loading
          label="SCIM summary"
          cells={[
            { label: "Live tokens", value: "" },
            { label: "Revoked", value: "" },
            { label: "Last used", value: "" },
          ]}
        />
      ) : hasData ? (
        <Readouts cells={readouts} label="SCIM summary" />
      ) : null}

      <div aria-live="polite">
        {newTokenRaw && (
          <Notice tone="amber" title="Copy this token now">
            <p>
              This is the only time the raw bearer token is shown. Store it in your secrets manager before you leave this
              page, then paste it into your identity provider.
            </p>
            <p className="mt-3 text-[12px] font-medium text-[var(--text2)]">Bearer token</p>
            <SecretField value={newTokenRaw} masked className="mt-1.5" />
          </Notice>
        )}
      </div>

      <SplitShell
        rail={
          <>
            <Panel title="Connect your identity provider" description="Five steps to a working SCIM sync.">
              <SetupSteps steps={steps} />
            </Panel>
            <Panel
              title="Endpoints"
              description="Resource URLs your identity provider calls. Paste the base URL into its provisioning settings."
              bodyClassName="p-0"
            >
              <SheetList label="SCIM endpoints">
                {scimEndpoints(scimBaseUrl).map((endpoint) => (
                  <SheetListItem key={endpoint.label} className="items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-medium text-[var(--text)]">
                        {endpoint.label}
                        <span className="font-[family-name:var(--mono)] text-[11px] font-normal text-[var(--text3)]">
                          {endpoint.method}
                        </span>
                      </p>
                      <p className="mt-0.5 break-all font-[family-name:var(--mono)] text-[11.5px] leading-[1.5] text-[var(--text2)]">
                        {endpoint.url}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--text3)]">{endpoint.description}</p>
                    </div>
                    <CopyButton value={endpoint.url} label="Copy" />
                  </SheetListItem>
                ))}
              </SheetList>
            </Panel>
          </>
        }
      >
        <Sheet
          title="Tokens"
          description="Rotate to replace a token in place. Revoking is immediate and cannot be undone."
          footer={
            hasData && allTokens.length > 0 ? (
              <span>
                {formatNumber(liveTokens.length)} live of {formatNumber(allTokens.length)} issued
              </span>
            ) : undefined
          }
        >
          {isLoading ? (
            <SheetLoading rows={3} label="Loading SCIM tokens" />
          ) : isError && !hasData ? (
            <SheetError
              title="Could not load SCIM tokens"
              message={apiErrorMessage(error, "The token request failed.")}
              onRetry={() => void refetch()}
            />
          ) : allTokens.length === 0 ? (
            <SheetEmpty
              title="No SCIM tokens yet"
              description="A token lets your identity provider call the endpoints listed alongside. Choose scopes in the form below, then create a token."
            />
          ) : (
            <SheetTable columns={TOKEN_COLUMNS} caption="SCIM provisioning tokens">
              {allTokens.map((token) => {
                const state = tokenState(token, now);
                const canMutate = state === "active" || state === "expiring";
                const blockedReason =
                  state === "revoked" ? "Token is revoked" : state === "expired" ? "Token has expired" : null;
                const masked = maskToken(token.id);
                return (
                  <SheetRow key={token.id} muted={!canMutate}>
                    <SheetCell>
                      <RowTitle
                        title={
                          <>
                            Created <Timestamp value={token.createdAt} />
                          </>
                        }
                        subtitle={masked}
                        subtitleMono
                      />
                    </SheetCell>
                    <SheetCell className={HIDE_BELOW_LG}>
                      {token.scopes.length ? (
                        <div className="flex max-w-[340px] flex-wrap gap-1">
                          {token.scopes.map((scope) => (
                            // Scopes are identifiers: undo Pill's sentence-case first letter.
                            <Pill
                              key={scope}
                              className="font-[family-name:var(--mono)] font-normal [&>span]:first-letter:normal-case"
                            >
                              {scope}
                            </Pill>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px] text-[var(--text3)]">None</span>
                      )}
                    </SheetCell>
                    <SheetCell>
                      <Pill tone={TOKEN_STATE[state].tone} dot={canMutate}>
                        {TOKEN_STATE[state].label}
                      </Pill>
                    </SheetCell>
                    <SheetCell className={HIDE_BELOW_XL}>
                      {token.allowedIps.length ? (
                        <span
                          className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]"
                          title={token.allowedIps.join(", ")}
                        >
                          {token.allowedIps.join(", ")}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text3)]">Any IP</span>
                      )}
                    </SheetCell>
                    <SheetCell className={HIDE_BELOW_MD}>
                      {token.lastUsedAt ? (
                        <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                          <Timestamp value={token.lastUsedAt} />
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text3)]">Never</span>
                      )}
                    </SheetCell>
                    <SheetCell className={HIDE_BELOW_SM}>
                      <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                        {formatExpiryLabel(token.expiresAt)}
                      </span>
                    </SheetCell>
                    <SheetCell align="right">
                      <RowActions label={`Actions for token ${masked}`}>
                        <DropdownMenuItem
                          disabled={!canMutate || rotateMutation.isPending}
                          onClick={() => rotateMutation.mutate(token.id)}
                          className="flex-col items-start gap-0.5"
                        >
                          <span>Rotate token</span>
                          {blockedReason && <span className="text-[11.5px] text-[var(--text3)]">{blockedReason}</span>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!canMutate || revokeMutation.isPending}
                          onClick={() => setRevokeTarget(token)}
                          className="flex-col items-start gap-0.5"
                        >
                          <span>Revoke token</span>
                          {blockedReason && <span className="text-[11.5px] text-[var(--text3)]">{blockedReason}</span>}
                        </DropdownMenuItem>
                      </RowActions>
                    </SheetCell>
                  </SheetRow>
                );
              })}
            </SheetTable>
          )}
        </Sheet>

        <Panel
          title="Create a token"
          description="Scopes, network allowlist, and lifetime applied to the next token you issue."
          footer={
            <UiButton type="submit" form={TOKEN_FORM_ID} disabled={!canCreate}>
              {generateMutation.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              Create token
            </UiButton>
          }
        >
          <form
            id={TOKEN_FORM_ID}
            onSubmit={(event) => {
              event.preventDefault();
              if (!canCreate) return;
              generateMutation.mutate();
            }}
            className="flex flex-col gap-6"
          >
            <fieldset className="min-w-0">
              <legend className="text-[13px] font-medium text-[var(--text2)]">Scopes</legend>
              <p id="scim-scopes-hint" className="mt-1 text-[12px] leading-[1.5] text-[var(--text3)]">
                At least one scope is required. Prefer least privilege.
              </p>
              <div
                aria-describedby="scim-scopes-hint"
                className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius)] border border-[var(--border)]"
              >
                {SCIM_SCOPE_OPTIONS.map((option) => (
                  <ScopeTile
                    key={option.value}
                    option={option}
                    selected={selectedScopes.includes(option.value)}
                    onToggle={() => toggleScope(option.value)}
                  />
                ))}
              </div>
              {selectedScopes.length === 0 && (
                <p role="alert" className="mt-2 text-[12px] text-[var(--red)]">
                  Select at least one scope to create a token.
                </p>
              )}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <DialogField
                label="Allowed IP CIDRs"
                name="scim-allowed-ips"
                hint="Optional. Separate values with commas or new lines."
              >
                <textarea
                  id="scim-allowed-ips"
                  name="scim-allowed-ips"
                  value={allowedIpsText}
                  onChange={(event) => setAllowedIpsText(event.target.value)}
                  rows={3}
                  placeholder={"203.0.113.10/32\n198.51.100.0/24"}
                  className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12px]`}
                />
              </DialogField>
              <DialogField label="Token expiry in days" name="scim-expiry" hint="Leave blank to use the backend default.">
                <input
                  id="scim-expiry"
                  name="scim-expiry"
                  type="number"
                  min={1}
                  max={3650}
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(event.target.value)}
                  className={`${fieldInputClass} font-[family-name:var(--mono)] tabular-nums`}
                />
              </DialogField>
            </div>

            <div className="border-t border-[var(--border)] pt-5">
              <p className="mb-3 text-[13px] font-medium text-[var(--text2)]">Next token</p>
              <KeyValueGrid items={policyPreview(selectedScopes, allowedIps, expiresInDays)} columns={2} />
            </div>
          </form>
        </Panel>
      </SplitShell>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revoke token"
        description="Requests signed with this token fail immediately and your identity provider stops syncing through it. This cannot be undone."
        confirmLabel="Revoke token"
        pending={revokeMutation.isPending}
        onConfirm={() => {
          if (!revokeTarget) return;
          revokeMutation.mutate(revokeTarget.id, { onSuccess: () => setRevokeTarget(null) });
        }}
      >
        {revokeTarget && (
          <div className="flex flex-col gap-2 text-[13px] leading-[1.6] text-[var(--text2)]">
            <p>
              Token <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{maskToken(revokeTarget.id)}</span>
            </p>
            {revokingLastLive && <p>This is the last live token, so SCIM provisioning turns off.</p>}
          </div>
        )}
      </ConfirmDialog>
    </WorkspacePage>
  );
}

export default function ScimPage() {
  return <ScimProvisioningPage mode="admin" />;
}
