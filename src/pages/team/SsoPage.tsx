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
  SectionCard,
  StatusBadge,
  SubmitButton,
  textareaClass,
} from "@/shared/observe";

const ATTRIBUTE_MAPPINGS = [
  {
    attr: "email",
    source: "NameID",
    description: "Primary user identifier / login",
    icon: User,
    required: true,
  },
  {
    attr: "firstName",
    source: "given_name",
    description: "User display name (first)",
    icon: User,
    required: false,
  },
  {
    attr: "lastName",
    source: "family_name",
    description: "User display name (last)",
    icon: User,
    required: false,
  },
  {
    attr: "role",
    source: "groups",
    description: "Group-based role assignment",
    icon: Users,
    required: false,
  },
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

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  const isConfigured = !!provider;
  const isEnabled = provider?.isActive ?? false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Single Sign-On"
        description="Configure SAML 2.0 identity providers and publish service provider endpoints for your IdP."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}
            >
              <FileCode2 className="mr-1.5 size-4" />
              Metadata XML
              <ExternalLink className="ml-1.5 size-3 opacity-60" />
            </Button>
            {provider && (
              <>
                <Button
                  variant="secondary"
                  disabled={isTogglingState}
                  onClick={() => setProviderState(!provider.isActive)}
                >
                  {isTogglingState ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : provider.isActive ? (
                    <ShieldOff className="mr-1.5 size-4" />
                  ) : (
                    <ShieldCheck className="mr-1.5 size-4" />
                  )}
                  {provider.isActive ? "Disable" : "Enable"}
                </Button>
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-1.5 size-4 text-[var(--red)]" />
                  Delete
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* ── Delete confirmation ── */}
      {showDeleteConfirm && (
        <div className="rounded-[12px] border border-[var(--red)]/30 bg-[var(--red)]/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--red)]/15 mt-0.5">
              <AlertTriangle className="size-3.5 text-[var(--red)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--text)]">Delete SSO provider?</div>
              <p className="mt-0.5 text-[12px] text-[var(--text2)]">
                This will permanently remove <strong className="text-[var(--text)]">{provider?.providerName}</strong>.
                Users who rely on SSO will not be able to log in until a new provider is configured.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="danger" onClick={deleteProvider}>
                  Yes, delete provider
                </Button>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Status KPI Row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* SSO Status */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Status</span>
            <div
              className={`flex size-7 items-center justify-center rounded-full ${
                isEnabled
                  ? "bg-[var(--green)]/12"
                  : isConfigured
                  ? "bg-[var(--amber)]/12"
                  : "bg-[var(--red)]/12"
              }`}
            >
              {isEnabled ? (
                <ShieldCheck className="size-3.5 text-[var(--green)]" />
              ) : isConfigured ? (
                <ShieldAlert className="size-3.5 text-[var(--amber)]" />
              ) : (
                <ShieldAlert className="size-3.5 text-[var(--red)]" />
              )}
            </div>
          </div>
          <div
            className={`text-lg font-semibold ${
              isEnabled ? "text-[var(--green)]" : isConfigured ? "text-[var(--amber)]" : "text-[var(--text3)]"
            }`}
          >
            {isEnabled ? "Enabled" : isConfigured ? "Disabled" : "Not set up"}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text3)]">
            {isEnabled ? "Users can sign in via SSO" : isConfigured ? "Provider configured but off" : "No IdP configured"}
          </div>
        </div>

        {/* Protocol */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Protocol</span>
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--brand)]/12">
              <Shield className="size-3.5 text-[var(--brand)]" />
            </div>
          </div>
          <div className="text-lg font-semibold text-[var(--text)]">SAML 2.0</div>
          <div className="mt-0.5 text-[11px] text-[var(--text3)]">Industry standard</div>
        </div>

        {/* Provider */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Provider</span>
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--bg3)]">
              <Unplug className="size-3.5 text-[var(--text3)]" />
            </div>
          </div>
          <div className="text-sm font-semibold text-[var(--text)] truncate">
            {provider?.providerName || "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text3)]">
            {providerCount} provider{providerCount !== 1 ? "s" : ""} configured
          </div>
        </div>

        {/* Domain */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Domain</span>
            <div
              className={`flex size-7 items-center justify-center rounded-full ${
                provider?.domain ? "bg-[var(--green)]/12" : "bg-[var(--bg3)]"
              }`}
            >
              <Globe
                className={`size-3.5 ${provider?.domain ? "text-[var(--green)]" : "text-[var(--text3)]"}`}
              />
            </div>
          </div>
          <div className="text-sm font-semibold text-[var(--text)] truncate">
            {provider?.domain || "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text3)]">
            {provider?.domain ? "Verified for routing" : "Not configured"}
          </div>
        </div>
      </div>

      {/* ── Service Provider Endpoints ── */}
      <SectionCard title="Service provider endpoints">
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-2">
            {[
              {
                label: "Entity ID",
                value: entityId,
                description: "Your Pulse SP identifier — paste this into the IdP",
                icon: KeySquare,
              },
              {
                label: "ACS URL",
                value: acsUrl,
                description: "Assertion Consumer Service — receives SAML responses",
                icon: LogIn,
              },
              {
                label: "Single Logout URL",
                value: sloUrl,
                description: "Back-channel logout endpoint (SLO)",
                icon: ShieldOff,
              },
              {
                label: "User entry route",
                value: ssoLoginUrl,
                description: "Share with users as their SSO login link",
                icon: ArrowRight,
              },
            ].map((entry) => {
              const EntryIcon = entry.icon;
              return (
                <div
                  key={entry.label}
                  className="group flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 transition-colors hover:bg-[var(--bg3)]"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg3)] group-hover:bg-[var(--bg2)]">
                    <EntryIcon className="size-4 text-[var(--text3)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                        {entry.label}
                      </span>
                    </div>
                    <div className="font-mono text-[12px] text-[var(--text2)] truncate">{entry.value}</div>
                    <div className="text-[11px] text-[var(--text3)] mt-0.5">{entry.description}</div>
                  </div>
                  <CopyButton value={entry.value} label="Copy" />
                </div>
              );
            })}

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}
              >
                <FileCode2 className="mr-1.5 size-4" />
                Download metadata XML
                <ExternalLink className="ml-1.5 size-3 opacity-60" />
              </Button>
            </div>
          </div>

          {/* Right panel — setup guidance */}
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-6 items-center justify-center rounded-full bg-[var(--brand)]/12">
                <Info className="size-3.5 text-[var(--brand)]" />
              </div>
              <span className="text-sm font-semibold text-[var(--text)]">IdP setup guide</span>
            </div>

            <div className="space-y-3">
              {[
                {
                  done: isConfigured,
                  text: "Add Pulse as a SAML application in your IdP",
                },
                {
                  done: isConfigured,
                  text: "Configure entity ID, ACS URL and SLO URL in your IdP",
                },
                {
                  done: !!provider?.domain,
                  text: "Set a verified email domain for SSO routing",
                },
                {
                  done: isEnabled,
                  text: "Enable the provider to allow user sign-in",
                },
                {
                  done: false,
                  text: "Test login via the user entry route",
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

            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)] mb-2">
                Compatible IdPs
              </div>
              <div className="flex flex-wrap gap-1.5">
                {IDP_GUIDES.map((idp) => (
                  <span
                    key={idp.name}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg1)] px-2 py-0.5 text-[11px] font-medium text-[var(--text2)]"
                  >
                    {idp.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Provider Configuration ── */}
      <SectionCard title="Provider configuration">
        <form action={saveAction}>
          <div className="grid max-w-[800px] grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Provider name">
              <input
                name="providerName"
                defaultValue={provider?.providerName || "Custom SAML"}
                className={inputClass}
                placeholder="Okta, Azure AD, Google Workspace…"
              />
            </Field>

            <Field
              label="Verified domain"
              hint="Routes users from their work email domain to this IdP."
            >
              <input
                name="domain"
                defaultValue={provider?.domain || ""}
                className={inputClass}
                placeholder="company.com"
              />
            </Field>

            <Field label="Entity ID">
              <input
                name="entityId"
                defaultValue={provider?.entityId || ""}
                className={inputClass}
                placeholder="https://idp.example.com/entity"
              />
            </Field>

            <Field label="SSO URL">
              <input
                name="ssoUrl"
                defaultValue={provider?.ssoUrl || ""}
                className={inputClass}
                placeholder="https://idp.example.com/sso"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="X.509 certificate"
                hint="Paste a new certificate only when you want to replace the existing stored certificate."
              >
                <textarea
                  name="x509Certificate"
                  className={textareaClass}
                  rows={5}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIICpDCCAYwCCQDU...&#10;-----END CERTIFICATE-----"
                />
              </Field>
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <SubmitButton>Save configuration</SubmitButton>
              {state.ok && (
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--green)]">
                  <CheckCircle2 className="size-3.5" />
                  Saved
                </div>
              )}
            </div>
          </div>
        </form>
      </SectionCard>

      {/* ── Attribute Mapping ── */}
      <SectionCard title="Attribute mapping">
        <div className="max-w-[800px]">
          <p className="text-[13px] text-[var(--text2)] mb-4">
            Pulse automatically maps IdP assertion attributes to user profile fields. These mappings are fixed
            for SAML 2.0 — configure the matching attributes on your IdP side.
          </p>
          <div className="divide-y divide-[var(--border)] rounded-[10px] border border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_140px] gap-4 px-4 py-2.5 bg-[var(--bg2)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Pulse attribute</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">IdP assertion source</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Status</span>
            </div>
            {ATTRIBUTE_MAPPINGS.map((mapping) => {
              const MappingIcon = mapping.icon;
              return (
                <div
                  key={mapping.attr}
                  className="grid grid-cols-[1fr_1fr_140px] gap-4 items-center px-4 py-3 bg-[var(--bg1)] hover:bg-[var(--bg2)] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-6 items-center justify-center rounded-[6px] bg-[var(--bg3)]">
                      <MappingIcon className="size-3 text-[var(--text3)]" />
                    </div>
                    <div>
                      <div className="font-mono text-[12px] font-medium text-[var(--text)]">{mapping.attr}</div>
                      <div className="text-[11px] text-[var(--text3)]">{mapping.description}</div>
                    </div>
                    {mapping.required && (
                      <span className="ml-auto rounded-full bg-[var(--brand)]/10 px-1.5 py-px text-[10px] font-semibold text-[var(--brand)]">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[12px] text-[var(--text2)]">{mapping.source}</div>
                  <div>
                    <StatusBadge status={provider ? "active" : "pending"} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
