import { useActionState, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  Globe,
  Info,
  KeySquare,
  Loader2,
  LogIn,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Unplug,
  User,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { env } from "@/app/config/env";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  Button,
  CopyButton,
  Field,
  inputClass,
  PageHeader,
  StatusBadge,
  SubmitButton,
  textareaClass,
} from "@/shared/observe";

const ATTRIBUTE_MAPPINGS = [
  { attr: "email", source: "NameID", description: "Primary user identifier / login", icon: User, required: true },
  { attr: "firstName", source: "given_name", description: "User display name (first)", icon: User, required: false },
  { attr: "lastName", source: "family_name", description: "User display name (last)", icon: User, required: false },
  { attr: "role", source: "groups", description: "Group-based role assignment", icon: Users, required: false },
];

const IDP_GUIDES = [
  { name: "Okta", color: "#007DC1" },
  { name: "Azure AD", color: "#0078D4" },
  { name: "Google Workspace", color: "#4285F4" },
  { name: "Auth0", color: "#EB5424" },
  { name: "OneLogin", color: "#3E7BFA" },
];

function toOptionalString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function SsoDeleteConfirm({ provider, deleteProvider, setShowDeleteConfirm }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 rounded-[16px] border border-[var(--red)]/30 bg-[var(--red)]/5 p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--red)]/15">
          <AlertTriangle className="size-5 text-[var(--red)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">Delete SSO provider?</div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text2)]">
            This will permanently remove <strong className="text-[var(--text)]">{provider?.providerName}</strong>.
            Users who rely on SSO will not be able to log in until a new provider is configured.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button variant="danger" className="h-9 px-4" onClick={deleteProvider}>
              Yes, delete provider
            </Button>
            <Button variant="secondary" className="h-9 px-4" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SsoStatusRow({ isEnabled, isConfigured, provider, providerCount }: any) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Status</span>
          <div className={`flex size-8 items-center justify-center rounded-[10px] ${isEnabled ? "bg-[var(--green)]/10" : isConfigured ? "bg-[var(--amber)]/10" : "bg-[var(--red)]/10"}`}>
            {isEnabled ? <ShieldCheck className="size-4 text-[var(--green)]" /> : <ShieldAlert className={`size-4 ${isConfigured ? "text-[var(--amber)]" : "text-[var(--red)]"}`} />}
          </div>
        </div>
        <div className={`text-xl font-medium tracking-tight ${isEnabled ? "text-[var(--green)]" : isConfigured ? "text-[var(--amber)]" : "text-[var(--text3)]"}`}>
          {isEnabled ? "Enabled" : isConfigured ? "Disabled" : "Not set up"}
        </div>
        <div className="mt-1 text-[12px] text-[var(--text3)]">
          {isEnabled ? "Users can sign in via SSO" : isConfigured ? "Provider configured but off" : "No IdP configured"}
        </div>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Protocol</span>
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--brand)]/10">
            <Shield className="size-4 text-[var(--brand)]" />
          </div>
        </div>
        <div className="text-xl font-medium tracking-tight text-[var(--text)]">SAML 2.0</div>
        <div className="mt-1 text-[12px] text-[var(--text3)]">Industry standard</div>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Provider</span>
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--bg2)]">
            <Unplug className="size-4 text-[var(--text3)]" />
          </div>
        </div>
        <div className="truncate text-[15px] font-medium tracking-tight text-[var(--text)]">{provider?.providerName || "—"}</div>
        <div className="mt-1 text-[12px] text-[var(--text3)]">{providerCount} provider{providerCount !== 1 ? "s" : ""} configured</div>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-sm transition-all hover:border-[var(--border-hover)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Domain</span>
          <div className={`flex size-8 items-center justify-center rounded-[10px] ${provider?.domain ? "bg-[var(--green)]/10" : "bg-[var(--bg2)]"}`}>
            <Globe className={`size-4 ${provider?.domain ? "text-[var(--green)]" : "text-[var(--text3)]"}`} />
          </div>
        </div>
        <div className="truncate text-[15px] font-medium tracking-tight text-[var(--text)]">{provider?.domain || "—"}</div>
        <div className="mt-1 text-[12px] text-[var(--text3)]">{provider?.domain ? "Verified for routing" : "Not configured"}</div>
      </div>
    </div>
  );
}

function SsoServiceProviderEndpoints({ entityId, acsUrl, sloUrl, ssoLoginUrl, metadataUrl, isConfigured, provider, isEnabled }: any) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-semibold tracking-tight text-[var(--text)]">Service Provider Endpoints</h3>
        <p className="mt-1 text-[13px] text-[var(--text2)]">Use these URLs to configure the Pulse app in your Identity Provider.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {[
            { label: "Entity ID", value: entityId, description: "Your Pulse SP identifier — paste this into the IdP", icon: KeySquare },
            { label: "ACS URL", value: acsUrl, description: "Assertion Consumer Service — receives SAML responses", icon: LogIn },
            { label: "Single Logout URL", value: sloUrl, description: "Back-channel logout endpoint (SLO)", icon: ShieldOff },
            { label: "User entry route", value: ssoLoginUrl, description: "Share with users as their SSO login link", icon: ArrowRight },
          ].map((entry) => {
            const EntryIcon = entry.icon;
            return (
              <div key={entry.label} className="group flex flex-col gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-4 transition-all hover:border-[var(--border)]/80 hover:bg-[var(--bg3)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg1)] group-hover:bg-[var(--bg2)]">
                    <EntryIcon className="size-4 text-[var(--text3)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">{entry.label}</div>
                    <div className="truncate font-mono text-[13px] text-[var(--text2)] mt-1">{entry.value}</div>
                    <div className="mt-1 text-[12px] text-[var(--text3)]">{entry.description}</div>
                  </div>
                </div>
                <CopyButton value={entry.value} label="Copy" className="shrink-0" />
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" className="h-9" onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}>
              <FileCode2 className="mr-2 size-4 text-[var(--brand)]" /> Download metadata XML <ExternalLink className="ml-1.5 size-3 opacity-50" />
            </Button>
          </div>
        </div>
        
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--brand)]/10">
              <Info className="size-4 text-[var(--brand)]" />
            </div>
            <span className="text-[14px] font-medium tracking-tight text-[var(--text)]">IdP Setup Guide</span>
          </div>
          <div className="space-y-4">
            {[
              { done: isConfigured, text: "Add Pulse as a SAML application in your IdP" },
              { done: isConfigured, text: "Configure entity ID, ACS URL and SLO URL in your IdP" },
              { done: !!provider?.domain, text: "Set a verified email domain for SSO routing" },
              { done: isEnabled, text: "Enable the provider to allow user sign-in" },
              { done: false, text: "Test login via the user entry route" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--green)]" />
                ) : (
                  <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-[var(--border)] transition-colors hover:border-[var(--text3)]" />
                )}
                <span className="text-[13px] leading-relaxed text-[var(--text2)]">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Compatible IdPs</div>
            <div className="flex flex-wrap gap-2">
              {IDP_GUIDES.map((idp) => (
                <span key={idp.name} className="rounded-full border border-[var(--border)] bg-[var(--bg1)] px-2.5 py-1 text-[11px] font-medium text-[var(--text2)]">
                  {idp.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SsoProviderConfiguration({ provider, saveAction, state }: any) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-semibold tracking-tight text-[var(--text)]">Provider Configuration</h3>
        <p className="mt-1 text-[13px] text-[var(--text2)]">Configure Identity Provider specifics for SAML authentication.</p>
      </div>
      <form action={saveAction}>
        <div className="grid max-w-[800px] grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Provider Name">
            <input name="providerName" defaultValue={provider?.providerName || "Custom SAML"} className={inputClass} placeholder="Okta, Azure AD, Google Workspace…" />
          </Field>
          <Field label="Verified Domain" hint="Routes users from their work email domain to this IdP.">
            <input name="domain" defaultValue={provider?.domain || ""} className={inputClass} placeholder="company.com" />
          </Field>
          <Field label="Entity ID">
            <input name="entityId" defaultValue={provider?.entityId || ""} className={inputClass} placeholder="https://idp.example.com/entity" />
          </Field>
          <Field label="SSO URL">
            <input name="ssoUrl" defaultValue={provider?.ssoUrl || ""} className={inputClass} placeholder="https://idp.example.com/sso" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="X.509 Certificate" hint="Paste a new certificate only when you want to replace the existing stored certificate.">
              <textarea name="x509Certificate" className={textareaClass} rows={5} placeholder="-----BEGIN CERTIFICATE-----&#10;MIICpDCCAYwCCQDU...&#10;-----END CERTIFICATE-----" />
            </Field>
          </div>
          <div className="sm:col-span-2 flex items-center gap-4 pt-2">
            <SubmitButton className="h-10 px-5">Save configuration</SubmitButton>
            {state.ok && (
              <div className="animate-in fade-in flex items-center gap-1.5 text-[13px] font-medium text-[var(--green)]">
                <CheckCircle2 className="size-4" /> Configuration saved
              </div>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

function SsoAttributeMapping({ provider }: any) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
      <div className="mb-6 max-w-[800px]">
        <h3 className="font-semibold tracking-tight text-[var(--text)]">Attribute Mapping</h3>
        <p className="mt-1 text-[13px] text-[var(--text2)] leading-relaxed">
          Pulse automatically maps IdP assertion attributes to user profile fields. These mappings are fixed
          for SAML 2.0 — configure the matching attributes on your IdP side.
        </p>
      </div>
      <div className="max-w-[800px] overflow-hidden rounded-[12px] border border-[var(--border)]">
        <div className="grid grid-cols-[1fr_1fr_100px] gap-4 bg-[var(--bg2)] px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Pulse Attribute</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">IdP Source</span>
          <span className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Status</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {ATTRIBUTE_MAPPINGS.map((mapping) => {
            const MappingIcon = mapping.icon;
            return (
              <div key={mapping.attr} className="grid grid-cols-[1fr_1fr_100px] items-center gap-4 bg-[var(--bg1)] px-5 py-4 transition-colors hover:bg-[var(--bg2)]">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg3)]">
                    <MappingIcon className="size-4 text-[var(--text3)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-mono text-[13px] font-medium text-[var(--text)]">{mapping.attr}</div>
                      {mapping.required && <span className="rounded-full bg-[var(--brand)]/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">Req</span>}
                    </div>
                    <div className="truncate text-[11px] text-[var(--text3)] mt-0.5">{mapping.description}</div>
                  </div>
                </div>
                <div className="truncate font-mono text-[13px] text-[var(--text2)]">{mapping.source}</div>
                <div className="text-right">
                  <StatusBadge status={provider ? "active" : "pending"} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
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

  const provider = ssoProviders?.[0] ?? null;
  const providerCount = ssoProviders?.length ?? 0;
  const apiBaseUrl = env.VITE_API_URL.replace(/\/$/, "");
  const metadataUrl = `${apiBaseUrl}/auth/saml/metadata`;
  const acsUrl = `${apiBaseUrl}/auth/saml/acs`;
  const sloUrl = `${apiBaseUrl}/auth/saml/slo`;
  const entityId = `${apiBaseUrl}/auth/saml/metadata`;
  const ssoLoginUrl = `${window.location.origin}/auth/login/sso`;

  const [state, saveAction] = useActionState(
    async (_prevState: { ok: boolean; error: string | null }, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active org" };
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
    { ok: false, error: null }
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
      setIsTogglingState(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update provider state");
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

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  const isConfigured = !!provider;
  const isEnabled = provider?.isActive ?? false;

  return (
    <div className="mx-auto max-w-[1000px] w-full flex flex-col gap-10 pb-20">
      <PageHeader
        title="Single Sign-On"
        description="Configure SAML 2.0 identity providers and publish service provider endpoints for your IdP."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="h-10" onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}>
              <FileCode2 className="mr-2 size-4" /> Metadata XML <ExternalLink className="ml-1.5 size-3 opacity-50" />
            </Button>
            {provider && (
              <>
                <Button variant="outline" className="h-10" disabled={isTogglingState} onClick={() => setProviderState(!provider.isActive)}>
                  {isTogglingState ? <Loader2 className="mr-2 size-4 animate-spin" /> : provider.isActive ? <ShieldOff className="mr-2 size-4 text-[var(--text2)]" /> : <ShieldCheck className="mr-2 size-4 text-[var(--green)]" />}
                  {provider.isActive ? "Disable" : "Enable"}
                </Button>
                <Button variant="ghost" className="h-10 px-3 text-[var(--red)] hover:bg-[var(--red-bg)] hover:text-[var(--red)]" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        }
      />

      {showDeleteConfirm && <SsoDeleteConfirm provider={provider} deleteProvider={deleteProvider} setShowDeleteConfirm={setShowDeleteConfirm} />}
      <SsoStatusRow isEnabled={isEnabled} isConfigured={isConfigured} provider={provider} providerCount={providerCount} />
      <SsoServiceProviderEndpoints entityId={entityId} acsUrl={acsUrl} sloUrl={sloUrl} ssoLoginUrl={ssoLoginUrl} metadataUrl={metadataUrl} isConfigured={isConfigured} provider={provider} isEnabled={isEnabled} />
      <SsoProviderConfiguration provider={provider} saveAction={saveAction} state={state} />
      <SsoAttributeMapping provider={provider} />
    </div>
  );
}
