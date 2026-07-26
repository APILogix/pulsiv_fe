import { useActionState, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ExternalLink,
  FileCode2,
  Globe,
  KeySquare,
  LogIn,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { env } from "@/app/config/env";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { SsoProvider } from "@/modules/organizations/types/org.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, CardSkeleton, Field, StatusBadge, SubmitButton, Table, Td, Tr, inputClass, textareaClass } from "@/shared/observe";
import {
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SecretField,
  SettingRow,
  SetupSteps,
  SplitShell,
  Toggle,
  type HeroFact,
  type SetupStepItem,
} from "@/shared/ui/pulse";

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

const ATTRIBUTE_HEADERS = ["Pulse attribute", "IdP source", "Notes", "State"];

const IDP_NAMES = ["Okta", "Azure AD", "Google Workspace", "Auth0", "OneLogin", "JumpCloud"];

function toOptionalString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function SsoPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTogglingState, setIsTogglingState] = useState(false);

  const { data: ssoProviders, isLoading } = useQuery({
    queryKey: orgQueryKeys.sso(activeOrgId!),
    queryFn: () => orgApi.listSsoProviders(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const provider: SsoProvider | null = ssoProviders?.[0] ?? null;
  const providerCount = ssoProviders?.length ?? 0;
  const apiBaseUrl = env.VITE_API_URL.replace(/\/$/, "");
  const metadataUrl = `${apiBaseUrl}/auth/saml/metadata`;
  const acsUrl = `${apiBaseUrl}/auth/saml/acs`;
  const sloUrl = `${apiBaseUrl}/auth/saml/slo`;
  const entityId = `${apiBaseUrl}/auth/saml/metadata`;
  const ssoLoginUrl = `${window.location.origin}/auth/login/sso`;

  const [state, saveAction] = useActionState(
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
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to save configuration" };
      }
    },
    { ok: false, error: null },
  );

  useEffect(() => {
    if (state.ok) toast.success("SSO configuration saved");
    if (state.error) toast.error(state.error);
  }, [state]);

  async function setProviderState(isActive: boolean) {
    if (!activeOrgId || !provider?.id) return;
    setIsTogglingState(true);
    try {
      await orgApi.updateSsoProvider(activeOrgId, provider.id, { isActive });
      toast.success(isActive ? "SSO provider enabled" : "SSO provider disabled");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.sso(activeOrgId) });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update provider state");
    } finally {
      setIsTogglingState(false);
    }
  }

  async function deleteProvider() {
    if (!activeOrgId || !provider?.id) return;
    try {
      await orgApi.deleteSsoProvider(activeOrgId, provider.id);
      toast.success("SSO provider deleted");
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.sso(activeOrgId) });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete provider");
    }
  }

  const isConfigured = !!provider;
  const isEnabled = provider?.isActive ?? false;

  const facts: HeroFact[] = [
    {
      label: "Status",
      value: isEnabled ? "Enabled" : isConfigured ? "Disabled" : "Not set up",
      tone: isEnabled ? "green" : isConfigured ? "amber" : "neutral",
      icon: isEnabled ? ShieldCheck : ShieldAlert,
    },
    { label: "Protocol", value: "SAML 2.0", icon: Shield },
    { label: "Providers", value: providerCount, icon: Users },
    {
      label: "Routing domain",
      value: provider?.domain ?? "Not set",
      tone: provider?.domain ? "green" : "neutral",
      icon: Globe,
    },
  ];

  const steps: SetupStepItem[] = [
    { title: "Create a SAML app in your IdP", description: "Add Pulsiv as a new SAML 2.0 application.", done: isConfigured },
    { title: "Paste the service provider URLs", description: "Entity ID, ACS URL, and single logout URL from the panel on the left.", done: isConfigured },
    { title: "Store the IdP details here", description: "Entity ID, SSO URL, and the X.509 signing certificate.", done: !!provider?.ssoUrl },
    { title: "Set a verified routing domain", description: "Users signing in with that email domain are sent to this IdP.", done: !!provider?.domain },
    { title: "Enable the provider", description: "Turn on sign-in, then test the user entry route.", done: isEnabled },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Identity"
          title="Single sign-on"
          description="Configure a SAML 2.0 identity provider and publish service provider endpoints."
          icon={Shield}
        />
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
        eyebrow="Identity"
        title="Single sign-on"
        description="Configure a SAML 2.0 identity provider, publish service provider endpoints, and control who may sign in."
        icon={Shield}
        actions={
          <>
            <Pill tone={isEnabled ? "green" : isConfigured ? "amber" : "neutral"} dot>
              {isEnabled ? "Sign-in live" : isConfigured ? "Configured, off" : "Not configured"}
            </Pill>
            <Button variant="secondary" onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}>
              <FileCode2 className="size-4" aria-hidden="true" />
              Metadata XML
              <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
            </Button>
          </>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {!isConfigured && (
        <Notice tone="blue" icon={ShieldAlert} title="No identity provider configured">
          Members still sign in with email and password. Add your IdP details below to enable SAML sign-in.
        </Notice>
      )}

      <SplitShell
        rail={
          <>
            <Panel title="Setup guide" description="Five steps from zero to enterprise sign-in." icon={ShieldCheck} tone="ai">
              <SetupSteps steps={steps} />
            </Panel>

            <Panel title="Domain routing" description="SSO routing requires a verified company domain." icon={Globe} tone="brand">
              <div className="flex flex-col gap-3">
                <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">
                  The routing domain must be verified by DNS before members can be sent to your IdP automatically.
                </p>
                <Link
                  to="/admin/domains"
                  className="inline-flex w-fit items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text)] transition-colors hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Verified domains
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </Panel>

            <Panel title="Tested identity providers" icon={Shield} tone="violet">
              <div className="flex flex-wrap gap-2">
                {IDP_NAMES.map((name) => (
                  <Pill key={name} tone="neutral" className="normal-case tracking-normal">
                    {name}
                  </Pill>
                ))}
              </div>
            </Panel>
          </>
        }
      >
        <Panel
          title="Service provider endpoints"
          description="Copy these values into the SAML application on your identity provider."
          icon={KeySquare}
          tone="brand"
        >
          <div className="flex flex-col gap-4">
            <SecretField label="Entity ID" value={entityId} />
            <SecretField label="Assertion consumer service URL" value={acsUrl} />
            <SecretField label="Single logout URL" value={sloUrl} />
            <SecretField label="User entry route" value={ssoLoginUrl} />
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
              <Button variant="secondary" onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}>
                <FileCode2 className="size-4" aria-hidden="true" />
                Download metadata XML
                <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
              </Button>
              <span className="text-[12px] text-[var(--text3)]">
                Some providers can import the metadata document instead of individual URLs.
              </span>
            </div>
          </div>
        </Panel>

        <Panel
          title="Identity provider configuration"
          description="Details Pulsiv uses to validate SAML assertions from your IdP."
          icon={LogIn}
          tone="brand"
        >
          <form action={saveAction} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Provider name">
              <input
                name="providerName"
                defaultValue={provider?.providerName || "Custom SAML"}
                placeholder="Okta, Azure AD, Google Workspace"
                className={inputClass}
              />
            </Field>
            <Field label="Routing domain" hint="Sends users with this email domain to your IdP.">
              <input name="domain" defaultValue={provider?.domain || ""} placeholder="acme.com" className={inputClass} />
            </Field>
            <Field label="IdP entity ID">
              <input
                name="entityId"
                defaultValue={provider?.entityId || ""}
                placeholder="https://idp.example.com/entity"
                className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`}
              />
            </Field>
            <Field label="IdP SSO URL">
              <input
                name="ssoUrl"
                defaultValue={provider?.ssoUrl || ""}
                placeholder="https://idp.example.com/sso"
                className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="X.509 certificate" hint="Paste a certificate only when replacing the stored one.">
                <textarea
                  name="x509Certificate"
                  rows={5}
                  placeholder="-----BEGIN CERTIFICATE-----"
                  className={`${textareaClass} font-[family-name:var(--mono)] text-[12px]`}
                />
              </Field>
            </div>
            <div className="flex justify-end sm:col-span-2">
              <SubmitButton>Save configuration</SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel
          title="Enforcement"
          description="Control whether members may authenticate through this provider."
          icon={ShieldCheck}
          tone="green"
          bodyClassName="p-0"
        >
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
                  onChange={(next) => setProviderState(next)}
                />
              </SettingRow>
            </Row>
            <Row>
              <SettingRow
                label="Require SSO for all members"
                description="Organization-wide SSO enforcement is managed with the other security preferences."
              >
                <Link
                  to="/admin/settings"
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text)] transition-colors hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Organization settings
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </SettingRow>
            </Row>
          </RowStack>
        </Panel>

        <Panel
          title="Attribute mapping"
          description="Assertion attributes Pulsiv reads. These mappings are fixed for SAML 2.0."
          icon={Users}
          tone="violet"
          bodyClassName="p-0"
        >
          <Table headers={ATTRIBUTE_HEADERS} maxHeight="20rem">
            {ATTRIBUTE_MAPPINGS.map((mapping) => (
              <Tr key={mapping.attr}>
                <Td className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">
                  <span className="flex items-center gap-2">
                    {mapping.attr}
                    {mapping.required && <Pill tone="brand">Required</Pill>}
                  </span>
                </Td>
                <Td className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text2)]">{mapping.source}</Td>
                <Td className="text-[12.5px] text-[var(--text2)]">{mapping.description}</Td>
                <Td><StatusBadge status={isConfigured ? "active" : "pending"} /></Td>
              </Tr>
            ))}
          </Table>
        </Panel>

        {provider && (
          <Panel
            title="Danger zone"
            description="Removing the provider stops all SSO sign-ins for this organization."
            icon={ShieldAlert}
            danger
            bodyClassName="p-0"
          >
            <RowStack>
              <Row>
                <SettingRow
                  label="Disable SAML sign-in"
                  description="Keeps the configuration but blocks IdP-initiated and SP-initiated sign-in."
                >
                  <Button variant="secondary" disabled={!isEnabled || isTogglingState} onClick={() => setProviderState(false)}>
                    <ShieldOff className="size-4" aria-hidden="true" />
                    Disable
                  </Button>
                </SettingRow>
              </Row>
              <Row>
                <SettingRow
                  label="Delete provider"
                  description={`Permanently removes ${provider.providerName}. Members with no password will lose access.`}
                >
                  <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete provider
                  </Button>
                </SettingRow>
              </Row>
            </RowStack>
          </Panel>
        )}
      </SplitShell>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete SSO provider</DialogTitle>
            <DialogDescription>
              This permanently removes the provider configuration. Members who rely on SSO cannot sign in until a new
              provider is configured.
            </DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-[var(--text2)]">{provider?.providerName}</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteProvider}>
              Delete provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
