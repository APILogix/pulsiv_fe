import { useActionState, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  Globe,
  KeySquare,
  Loader2,
  LogIn,
  ShieldCheck,
  ShieldOff,
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
  Callout,
  CopyField,
  DangerRow,
  DangerZone,
  DetailSkeleton,
  EmptyState,
  Field,
  IconTile,
  inputClass,
  PageHeader,
  SectionCard,
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

const IDP_NAMES = ["Okta", "Azure AD", "Google Workspace", "Auth0", "OneLogin"];

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

  const [domainState, saveDomainAction] = useActionState(
    async (_prevState: { ok: boolean; error: string | null }, form: FormData) => {
      if (!activeOrgId || !provider?.id) return { ok: false, error: "Configure the SAML provider first" };
      try {
        await orgApi.updateSsoProvider(activeOrgId, provider.id, {
          domain: toOptionalString(form, "domain"),
        });
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.sso(activeOrgId) });
        return { ok: true, error: null };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to update domain" };
      }
    },
    { ok: false, error: null }
  );

  useEffect(() => {
    if (state.ok) toast.success("SSO configuration saved");
    if (state.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (domainState.ok) toast.success("Verified domain updated");
    if (domainState.error) toast.error(domainState.error);
  }, [domainState]);

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

  if (isLoading) return <DetailSkeleton />;

  const isConfigured = !!provider;
  const isEnabled = provider?.isActive ?? false;
  const heroStatus = isEnabled ? "active" : isConfigured ? "pending" : "not-started";
  const heroTone = isEnabled ? "green" : isConfigured ? "amber" : "neutral";

  const endpoints = [
    { label: "Entity ID", value: entityId, description: "Your Pulse SP identifier — paste this into the IdP", icon: KeySquare },
    { label: "ACS URL", value: acsUrl, description: "Assertion Consumer Service — receives SAML responses", icon: LogIn },
    { label: "Single logout URL", value: sloUrl, description: "Back-channel logout endpoint (SLO)", icon: ShieldOff },
    { label: "User entry route", value: ssoLoginUrl, description: "Share with users as their SSO login link", icon: ArrowRight },
  ];

  const setupSteps = [
    { done: isConfigured, title: "Register the application", description: "Add Pulse as a SAML application in your IdP." },
    { done: isConfigured, title: "Configure SP endpoints", description: "Paste the entity ID, ACS URL and SLO URL into your IdP." },
    { done: !!provider?.domain, title: "Verify an email domain", description: "Set the work email domain that routes users to this IdP." },
    { done: isEnabled, title: "Enable the provider", description: "Turn on the provider so users can sign in." },
    { done: false, title: "Test sign-in", description: "Open the user entry route and complete a full login." },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Single sign-on"
        description="Configure SAML 2.0 identity providers and publish service provider endpoints for your IdP."
        actions={
          <Button variant="secondary" onClick={() => window.open(metadataUrl, "_blank", "noopener,noreferrer")}>
            <FileCode2 className="size-4" />
            Metadata XML
            <ExternalLink className="size-3 opacity-60" />
          </Button>
        }
      />

      {/* ── Status hero ── */}
      <div className="flex flex-col gap-4 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={ShieldCheck} tone={heroTone} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {provider?.providerName ?? "No identity provider"}
              </h2>
              <StatusBadge status={heroStatus} />
            </div>
            <p className="mt-0.5 truncate text-[12px] text-[var(--text2)]">
              {isEnabled
                ? "Users can sign in with SSO via this provider."
                : isConfigured
                  ? "Provider is configured but disabled — users cannot sign in with SSO yet."
                  : "Configure a SAML 2.0 provider below to enable single sign-on."}
            </p>
          </div>
        </div>
        {provider && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant={isEnabled ? "secondary" : "primary"} disabled={isTogglingState} onClick={() => setProviderState(!isEnabled)}>
              {isTogglingState ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEnabled ? (
                <ShieldOff className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {isEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_320px] lg:items-start">
        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Service provider endpoints">
            <div className="flex flex-col gap-4">
              {endpoints.map((entry) => {
                const EntryIcon = entry.icon;
                return (
                  <div key={entry.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <EntryIcon className="size-3.5 text-[var(--text3)]" />
                      <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">{entry.label}</span>
                    </div>
                    <CopyField value={entry.value} />
                    <span className="text-[12px] text-[var(--text3)]">{entry.description}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Provider configuration">
            <form action={saveAction}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Provider name">
                  <input
                    name="providerName"
                    defaultValue={provider?.providerName || "Custom SAML"}
                    className={inputClass}
                    placeholder="Okta, Azure AD, Google Workspace…"
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
                <div className="sm:col-span-2">
                  <Field label="SSO URL">
                    <input
                      name="ssoUrl"
                      defaultValue={provider?.ssoUrl || ""}
                      className={inputClass}
                      placeholder="https://idp.example.com/sso"
                    />
                  </Field>
                </div>
                <input type="hidden" name="domain" value={provider?.domain || ""} />
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
                <div className="flex items-center gap-3 pt-1 sm:col-span-2">
                  <SubmitButton>Save configuration</SubmitButton>
                  {state.ok && (
                    <span className="flex items-center gap-1.5 text-[12px] text-[var(--green)]">
                      <CheckCircle2 className="size-3.5" />
                      Saved
                    </span>
                  )}
                </div>
              </div>
            </form>
          </SectionCard>

          {/* ── Verified domains ── */}
          <SectionCard title="Verified domains">
            <div className="flex flex-col gap-4">
              <p className="text-[13px] leading-relaxed text-[var(--text2)]">
                Users signing in with an email on a verified domain are routed to this identity provider automatically.
              </p>

              {provider?.domain ? (
                <div className="flex items-center justify-between gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile icon={Globe} tone="green" className="size-8 rounded-[8px] [&>svg]:size-4" />
                    <div className="min-w-0">
                      <div className="truncate font-[family-name:var(--mono)] text-[13px] font-medium text-[var(--text)]">
                        {provider.domain}
                      </div>
                      <div className="text-[11px] text-[var(--text3)]">Routes matching sign-ins to {provider.providerName}</div>
                    </div>
                  </div>
                  <StatusBadge status="verified" />
                </div>
              ) : (
                <EmptyState icon={Globe} message="No verified domain yet — add your work email domain to enable SSO routing." />
              )}

              {isConfigured ? (
                <form action={saveDomainAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field label={provider?.domain ? "Replace domain" : "Add domain"} hint="Example: company.com">
                      <input name="domain" defaultValue={provider?.domain || ""} className={inputClass} placeholder="company.com" />
                    </Field>
                  </div>
                  <SubmitButton>{provider?.domain ? "Update domain" : "Add domain"}</SubmitButton>
                </form>
              ) : (
                <Callout tone="info">Save the provider configuration first, then add a verified domain for SSO routing.</Callout>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Attribute mapping">
            <p className="mb-4 text-[13px] leading-relaxed text-[var(--text2)]">
              Pulse automatically maps IdP assertion attributes to user profile fields. These mappings are fixed for
              SAML 2.0 — configure the matching attributes on your IdP side.
            </p>
            <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[10px] border border-[var(--border)]">
              <div className="grid grid-cols-[1fr_1fr_110px] gap-4 bg-[var(--bg2)] px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Pulse attribute</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">IdP assertion source</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">Status</span>
              </div>
              {ATTRIBUTE_MAPPINGS.map((mapping) => (
                <div
                  key={mapping.attr}
                  className="grid grid-cols-[1fr_1fr_110px] items-center gap-4 bg-[var(--bg1)] px-4 py-3 transition-colors hover:bg-[var(--bg2)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)]">{mapping.attr}</span>
                      {mapping.required && (
                        <span className="rounded-full bg-[var(--brand-bg)] px-1.5 py-px text-[10px] font-semibold text-[var(--brand)]">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--text3)]">{mapping.description}</div>
                  </div>
                  <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{mapping.source}</span>
                  <div>
                    <StatusBadge status={provider ? "active" : "pending"} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {provider && (
            <DangerZone>
              {showDeleteConfirm ? (
                <div className="flex flex-col gap-3">
                  <Callout tone="danger">
                    This will permanently remove {provider.providerName}. Users who rely on SSO will not be able to log
                    in until a new provider is configured.
                  </Callout>
                  <div className="flex items-center gap-2">
                    <Button variant="danger" onClick={deleteProvider}>Yes, delete provider</Button>
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <DangerRow
                  label="Delete SSO provider"
                  description="Removes the provider configuration and disables SSO sign-in for all users."
                  action={<Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>Delete provider</Button>}
                />
              )}
            </DangerZone>
          )}
        </div>

        {/* ── Side rail ── */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Setup guide">
            <div className="flex flex-col gap-4">
              {setupSteps.map((item, idx) => (
                <div key={item.title} className="flex gap-3">
                  {item.done ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                      <CheckCircle2 className="size-3.5 text-[var(--green)]" />
                    </span>
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg2)] font-[family-name:var(--mono)] text-[11px] font-medium text-[var(--text2)]">
                      {idx + 1}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--text)]">{item.title}</div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--text2)]">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Compatible IdPs">
            <div className="flex flex-wrap gap-1.5">
              {IDP_NAMES.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text2)]"
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--text3)]">
              Any SAML 2.0-compliant identity provider is supported.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
