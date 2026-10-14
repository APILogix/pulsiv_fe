import { useActionState, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { env } from "@/app/config/env";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { orgApi } from "@/modules/organizations/api/org.api";
import { CONTROL_LABEL, CONTROL_TONE, useAdminHref, type ControlState } from "@/modules/organizations/components/org-page";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { SsoProvider, SsoProviderType } from "@/modules/organizations/types/org.types";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { ConfirmDialog, DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import { Timestamp, formatNumber } from "@/shared/observe";
import {
  Panel,
  Pill,
  Row,
  RowStack,
  SecretField,
  SettingRow,
  SetupSteps,
  SplitShell,
  Toggle,
  fieldInputClass,
  fieldMonoClass,
  fieldTextareaClass,
  type SetupStepItem,
} from "@/shared/ui/pulse";

// ── Static reference data ────────────────────────────────────

interface AttributeMapping {
  attr: string;
  source: string;
  description: string;
  required: boolean;
}

const ATTRIBUTE_MAPPINGS: AttributeMapping[] = [
  { attr: "email", source: "NameID", description: "Primary user identifier used for sign-in", required: true },
  { attr: "firstName", source: "given_name", description: "Given name on the user profile", required: false },
  { attr: "lastName", source: "family_name", description: "Family name on the user profile", required: false },
  { attr: "role", source: "groups", description: "Group-based role assignment", required: false },
];

const IDP_NAMES = ["Okta", "Azure AD", "Google Workspace", "Auth0", "OneLogin", "JumpCloud"];

const PROVIDER_TYPE_LABEL: Record<SsoProviderType, string> = {
  saml: "SAML",
  oidc: "OIDC",
};

const PROVIDER_COLUMNS: SheetColumn[] = [
  { key: "provider", header: "Provider" },
  { key: "type", header: "Type", className: "w-[96px]" },
  { key: "status", header: "Status", className: "w-[120px]" },
  { key: "entity", header: "IdP entity ID", className: `w-[260px] ${HIDE_BELOW_LG}` },
  { key: "added", header: "Added", className: `w-[140px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[56px] text-right", align: "right" },
];

const ATTRIBUTE_COLUMNS: SheetColumn[] = [
  { key: "attr", header: "Pulse attribute", className: "w-[160px]" },
  { key: "source", header: "IdP source", className: "w-[140px]" },
  { key: "notes", header: "Notes", className: HIDE_BELOW_MD },
  { key: "required", header: "Required", className: "w-[110px]" },
];

// ── Helpers ──────────────────────────────────────────────────

function toOptionalString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** A copyable service provider value with a sentence-case label. */
function EndpointField({ label, value }: { label: string; value: string }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1.5">
      <p className="text-[12px] text-[var(--text2)]">{label}</p>
      <SecretField value={value} />
    </div>
  );
}

const PAGE_DESCRIPTION = "Configure a SAML 2.0 identity provider, publish service provider endpoints, and control who may sign in.";

// ── Page ─────────────────────────────────────────────────────

export default function SsoPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const href = useAdminHref();
  const [deleteTarget, setDeleteTarget] = useState<SsoProvider | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingState, setIsTogglingState] = useState(false);

  const {
    data: ssoProviders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: orgQueryKeys.sso(activeOrgId!),
    queryFn: () => orgApi.listSsoProviders(activeOrgId!),
    enabled: !!activeOrgId,
  });

  // Same key as the dashboard and settings pages, so the enforcement state here
  // matches the dashboard's access controls ledger.
  const { data: settings } = useQuery({
    queryKey: orgQueryKeys.settings(activeOrgId!),
    queryFn: () => orgApi.getSettings(activeOrgId!),
    enabled: !!activeOrgId,
  });

  // The form and the sign-in toggle edit the first provider, as before.
  const provider: SsoProvider | null = ssoProviders?.[0] ?? null;
  const providers = ssoProviders ?? [];
  const providerCount = providers.length;
  const activeProvider = providers.find((item) => item.isActive) ?? null;
  const activeCount = providers.filter((item) => item.isActive).length;
  const routedCount = providers.filter((item) => !!item.domain).length;

  const apiBaseUrl = env.VITE_API_URL.replace(/\/$/, "");
  const metadataUrl = `${apiBaseUrl}/auth/saml/metadata`;
  const acsUrl = `${apiBaseUrl}/auth/saml/acs`;
  const sloUrl = `${apiBaseUrl}/auth/saml/slo`;
  const entityId = `${apiBaseUrl}/auth/saml/metadata`;
  const ssoLoginUrl = `${window.location.origin}/auth/login/sso`;

  const [state, saveAction, savePending] = useActionState(
    async (_prevState: { ok: boolean; error: string | null }, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const data = {
          providerName: toOptionalString(form, "providerName") ?? "Custom SAML",
          providerType: "saml" as const,
          entityId: toOptionalString(form, "entityId"),
          ssoUrl: toOptionalString(form, "ssoUrl"),
          x509Certificate: toOptionalString(form, "x509Certificate"),
          domain: toOptionalString(form, "domain"),
        };
        if (provider?.id) {
          await orgApi.updateSsoProvider(activeOrgId, provider.id, data);
        } else {
          await orgApi.createSsoProvider(activeOrgId, data);
        }
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.sso(activeOrgId) });
        return { ok: true, error: null };
      } catch (err: unknown) {
        return { ok: false, error: apiErrorMessage(err, "Failed to save configuration") };
      }
    },
    { ok: false, error: null },
  );

  useEffect(() => {
    if (state.ok) toast.success("SSO configuration saved");
    if (state.error) toast.error(state.error);
  }, [state]);

  async function setProviderState(target: SsoProvider | null, isActive: boolean) {
    if (!activeOrgId || !target?.id) return;
    setIsTogglingState(true);
    try {
      await orgApi.updateSsoProvider(activeOrgId, target.id, { isActive });
      toast.success(isActive ? "SSO provider enabled" : "SSO provider disabled");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.sso(activeOrgId) });
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to update provider state"));
    } finally {
      setIsTogglingState(false);
    }
  }

  async function deleteProvider() {
    if (!activeOrgId || !deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await orgApi.deleteSsoProvider(activeOrgId, deleteTarget.id);
      toast.success("SSO provider deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.sso(activeOrgId) });
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to delete provider"));
    } finally {
      setIsDeleting(false);
    }
  }

  const isConfigured = !!provider;
  const isEnabled = provider?.isActive ?? false;

  const steps: SetupStepItem[] = [
    { title: "Create a SAML app in your IdP", description: "Add Sentinel as a new SAML 2.0 application.", done: isConfigured },
    {
      title: "Paste the service provider URLs",
      description: "Entity ID, ACS URL, and single logout URL from the service provider details panel.",
      done: isConfigured,
    },
    { title: "Store the IdP details here", description: "Entity ID, SSO URL, and the X.509 signing certificate.", done: !!provider?.ssoUrl },
    { title: "Set a verified routing domain", description: "Users signing in with that email domain are sent to this IdP.", done: !!provider?.domain },
    { title: "Enable the provider", description: "Turn on sign-in, then test the user entry route.", done: isEnabled },
  ];
  const stepsDone = steps.filter((step) => step.done).length;

  // Same rule as the dashboard ledger's single sign-on row.
  const controlState: ControlState =
    settings === undefined
      ? "unknown"
      : activeProvider && settings.enforceSso
        ? "enforced"
        : activeProvider
          ? "active"
          : settings.enforceSso
            ? "partial"
            : "off";

  const enforcementMeta = {
    label: "Enforcement",
    value: settings === undefined ? "—" : settings.enforceSso ? "Required" : "Optional",
  };

  const controlBadge =
    controlState === "unknown" ? undefined : (
      <Pill tone={CONTROL_TONE[controlState]} dot={controlState === "enforced" || controlState === "active"}>
        {CONTROL_LABEL[controlState]}
      </Pill>
    );

  const metadataButton = (
    <UiButton asChild variant="outline" size="lg">
      <a href={metadataUrl} target="_blank" rel="noopener noreferrer">
        Metadata XML
        <ExternalLink className="size-3.5" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </UiButton>
  );

  if (isError && !ssoProviders) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="SSO" description={PAGE_DESCRIPTION} />
        <Sheet title="Providers">
          <SheetError
            title="Could not load SSO providers"
            message={apiErrorMessage(error, "The SSO provider request failed.")}
            onRetry={() => void refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  if (isLoading) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="SSO" description={PAGE_DESCRIPTION} />
        <Readouts
          loading
          label="SSO summary"
          cells={[
            { label: "Providers configured", value: "" },
            { label: "Active providers", value: "" },
            { label: "Routing domains", value: "" },
            { label: "Setup progress", value: "" },
          ]}
        />
        <Sheet title="Providers">
          <SheetLoading rows={2} label="Loading SSO providers" />
        </Sheet>
      </WorkspacePage>
    );
  }

  const readouts: Readout[] = [
    {
      label: "Providers configured",
      value: formatNumber(providerCount),
      sub: providerCount > 0 ? "In this organization" : "None added yet",
    },
    {
      label: "Active providers",
      value: formatNumber(activeCount),
      sub: activeProvider ? activeProvider.providerName : "Members sign in with a password",
      tone: activeCount > 0 ? "good" : "neutral",
    },
    {
      label: "Routing domains",
      value: formatNumber(routedCount),
      sub: routedCount > 0 ? "Set on a provider" : "No email domain routed",
    },
    {
      label: "Setup progress",
      value: `${stepsDone}/${steps.length}`,
      sub: "Steps in the setup guide",
      tone: stepsDone === steps.length ? "good" : "neutral",
    },
  ];

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="SSO"
        badges={controlBadge}
        description={PAGE_DESCRIPTION}
        meta={[
          enforcementMeta,
          { label: "Active provider", value: activeProvider?.providerName ?? "None" },
          { label: "Protocol", value: "SAML 2.0" },
        ]}
        actions={metadataButton}
      />

      <Readouts cells={readouts} label="SSO summary" />

      <SplitShell
        rail={
          <>
            <Panel
              title="Setup guide"
              description="Five steps from zero to enterprise sign-in."
              footer={
                <>
                  <TextLink to={href("domains")} size="sm" arrow>
                    Verified domains
                  </TextLink>
                  <TextLink to={href("settings")} size="sm" arrow className="ml-3">
                    Organization settings
                  </TextLink>
                </>
              }
            >
              <SetupSteps steps={steps} />
              <p className="mt-5 border-t border-[var(--border)] pt-4 text-[12px] leading-[1.6] text-[var(--text2)]">
                Tested with {IDP_NAMES.join(", ")}. The routing domain must be verified by DNS before members are sent to
                your IdP automatically.
              </p>
            </Panel>

            <Panel
              title="Service provider details"
              description="Copy these values into the SAML application on your identity provider."
              footer={
                <UiButton asChild variant="outline" size="sm">
                  <a href={metadataUrl} target="_blank" rel="noopener noreferrer">
                    Open metadata XML
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </UiButton>
              }
            >
              <div className="flex flex-col gap-4">
                <EndpointField label="Entity ID" value={entityId} />
                <EndpointField label="Assertion consumer service URL" value={acsUrl} />
                <EndpointField label="Single logout URL" value={sloUrl} />
                <EndpointField label="User entry route" value={ssoLoginUrl} />
                <p className="text-[12px] leading-[1.6] text-[var(--text3)]">
                  Some providers can import the metadata document instead of individual URLs.
                </p>
              </div>
            </Panel>
          </>
        }
      >
        <Sheet
          title="Providers"
          description="Identity providers configured for this organization."
          footer={
            providerCount > 0 ? (
              <span>
                {providerCount} configured, {activeCount} active
              </span>
            ) : undefined
          }
        >
          {providerCount === 0 ? (
            <SheetEmpty
              title="No identity provider yet"
              description="Members still sign in with email and password. Fill in the identity provider details below and save to add one."
            />
          ) : (
            <SheetTable columns={PROVIDER_COLUMNS} caption="Configured SSO providers" minWidth={480}>
              {providers.map((item) => (
                <SheetRow key={item.id} muted={!item.isActive}>
                  <SheetCell>
                    <RowTitle
                      title={item.providerName}
                      badges={providerCount > 1 && item.id === provider?.id ? <Pill>Editing below</Pill> : undefined}
                      subtitle={item.domain ?? "No routing domain"}
                      subtitleMono={!!item.domain}
                    />
                  </SheetCell>
                  <SheetCell>
                    <Pill>{PROVIDER_TYPE_LABEL[item.providerType] ?? item.providerType}</Pill>
                  </SheetCell>
                  <SheetCell>
                    <Pill tone={item.isActive ? "green" : "neutral"} dot={item.isActive}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Pill>
                  </SheetCell>
                  <SheetCell className={HIDE_BELOW_LG}>
                    <span className="block max-w-[260px] truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                      {item.entityId ?? "Not set"}
                    </span>
                  </SheetCell>
                  <SheetCell className={HIDE_BELOW_MD}>
                    <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
                      <Timestamp value={item.createdAt} />
                    </span>
                  </SheetCell>
                  <SheetCell align="right">
                    <RowActions label={`Actions for ${item.providerName}`}>
                      <DropdownMenuItem
                        disabled={isTogglingState}
                        onSelect={() => void setProviderState(item, !item.isActive)}
                      >
                        {item.isActive ? "Disable sign-in" : "Enable sign-in"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(item)}>
                        Delete provider
                      </DropdownMenuItem>
                    </RowActions>
                  </SheetCell>
                </SheetRow>
              ))}
            </SheetTable>
          )}
        </Sheet>

        <Panel
          title={provider ? `Identity provider: ${provider.providerName}` : "Identity provider"}
          description="Details Sentinel uses to validate SAML assertions from your IdP."
          footer={
            <UiButton type="submit" form="sso-provider-form" size="lg" disabled={savePending}>
              {savePending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              Save configuration
            </UiButton>
          }
        >
          {/* Keyed by provider so defaults reset after a delete or create. */}
          <form
            key={provider?.id ?? "new"}
            id="sso-provider-form"
            action={saveAction}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2"
          >
            <DialogField label="Provider name" name="sso-provider-name">
              <input
                id="sso-provider-name"
                name="providerName"
                defaultValue={provider?.providerName || "Custom SAML"}
                placeholder="Okta, Azure AD, Google Workspace"
                className={fieldInputClass}
              />
            </DialogField>
            <DialogField label="Routing domain" name="sso-domain" hint="Sends users with this email domain to your IdP.">
              <input
                id="sso-domain"
                name="domain"
                defaultValue={provider?.domain || ""}
                placeholder="acme.com"
                className={fieldMonoClass}
              />
            </DialogField>
            <DialogField label="IdP entity ID" name="sso-entity-id">
              <input
                id="sso-entity-id"
                name="entityId"
                defaultValue={provider?.entityId || ""}
                placeholder="https://idp.example.com/entity"
                className={fieldMonoClass}
              />
            </DialogField>
            <DialogField label="IdP SSO URL" name="sso-url">
              <input
                id="sso-url"
                name="ssoUrl"
                defaultValue={provider?.ssoUrl || ""}
                placeholder="https://idp.example.com/sso"
                className={fieldMonoClass}
              />
            </DialogField>
            <DialogField
              label="X.509 certificate"
              name="sso-certificate"
              hint="Paste a certificate only when replacing the stored one."
              className="sm:col-span-2"
            >
              <textarea
                id="sso-certificate"
                name="x509Certificate"
                rows={5}
                placeholder="-----BEGIN CERTIFICATE-----"
                className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12px]`}
              />
            </DialogField>
          </form>
        </Panel>

        <Panel title="Sign-in" description="Control whether members may authenticate through this provider." bodyClassName="p-0">
          <RowStack>
            <Row>
              <SettingRow
                label="SAML sign-in"
                description={
                  isConfigured
                    ? "When on, members may sign in through the configured identity provider."
                    : "Save an identity provider configuration before enabling sign-in."
                }
                htmlFor="sso-active"
              >
                <Toggle
                  id="sso-active"
                  label="Enable SAML sign-in"
                  checked={isEnabled}
                  disabled={!isConfigured || isTogglingState}
                  onChange={(next) => void setProviderState(provider, next)}
                />
              </SettingRow>
            </Row>
            <Row>
              <SettingRow
                label="Require SSO for all members"
                description="Organization-wide SSO enforcement is managed with the other security preferences."
              >
                <TextLink to={href("settings")} size="sm" arrow>
                  Organization settings
                </TextLink>
              </SettingRow>
            </Row>
          </RowStack>
        </Panel>

        <Sheet title="Attribute mapping" description="Assertion attributes Sentinel reads. These mappings are fixed for SAML 2.0.">
          <SheetTable columns={ATTRIBUTE_COLUMNS} caption="SAML attribute mapping" minWidth={400}>
            {ATTRIBUTE_MAPPINGS.map((mapping) => (
              <SheetRow key={mapping.attr}>
                <SheetCell>
                  <span className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{mapping.attr}</span>
                </SheetCell>
                <SheetCell>
                  <span className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text2)]">{mapping.source}</span>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  <span className="text-[12.5px] text-[var(--text2)]">{mapping.description}</span>
                </SheetCell>
                <SheetCell>
                  <Pill>{mapping.required ? "Required" : "Optional"}</Pill>
                </SheetCell>
              </SheetRow>
            ))}
          </SheetTable>
        </Sheet>
      </SplitShell>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete SSO provider"
        description="This permanently removes the provider configuration. Members who rely on SSO cannot sign in until a new provider is configured."
        confirmLabel="Delete provider"
        pending={isDeleting}
        onConfirm={() => void deleteProvider()}
      >
        <p className="text-[13px] text-[var(--text2)]">{deleteTarget?.providerName}</p>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
