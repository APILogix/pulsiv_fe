import { useActionState, useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Clock,
  Database,
  KeyRound,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { UpdateOrganizationBody } from "@/modules/organizations/types/org.types";
import { Button, CardSkeleton, Field, SubmitButton, inputClass } from "@/shared/observe";
import {
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  SplitShell,
  Toggle,
  type HeroFact,
} from "@/shared/ui/pulse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PolicyNote {
  label: string;
  detail: string;
}

const POLICY_NOTES: PolicyNote[] = [
  {
    label: "MFA enforcement",
    detail: "Members without a second factor are prompted to enrol on their next sign-in and cannot skip it.",
  },
  {
    label: "SSO enforcement",
    detail: "Managed with the identity provider. When required, password sign-in is refused for org members.",
  },
  {
    label: "Session timeout",
    detail: "Idle sessions are signed out. Shorter windows reduce the blast radius of an unattended device.",
  },
  {
    label: "API log retention",
    detail: "Controls how long request and event payloads stay queryable in dashboards and exports.",
  },
  {
    label: "Audit log retention",
    detail: "Privileged action history. Most compliance programmes expect at least 90 days.",
  },
  {
    label: "Data residency",
    detail: "The region that stores ingested telemetry. Changing it applies to newly ingested data only.",
  },
];

const normalizeOptional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

const toInt = (value: FormDataEntryValue | null, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function sessionLabel(minutes: number) {
  if (minutes >= 1440) return "Never";
  if (minutes >= 60) return `${minutes / 60} h`;
  return `${minutes} min`;
}

// ── one-off local component: policy reference row for the side rail ──
function PolicyNoteRow({ note }: { note: PolicyNote }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[12.5px] font-medium text-[var(--text)]">{note.label}</dt>
      <dd className="text-[12.5px] leading-relaxed text-[var(--text2)]">{note.detail}</dd>
    </div>
  );
}

export default function OrgSettingsPage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();
  const [mfaDraft, setMfaDraft] = useState<boolean | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [confirmSlug, setConfirmSlug] = useState("");

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: orgQueryKeys.detail(activeOrgId!),
    queryFn: () => orgApi.getOrganization(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: orgQueryKeys.settings(activeOrgId!),
    queryFn: () => orgApi.getSettings(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: me } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "me"],
    queryFn: () => orgApi.getMe(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: members } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "transfer-candidates"],
    queryFn: () => orgApi.listMembers(activeOrgId!, { limit: 100, status: "active" }),
    enabled: !!activeOrgId && me?.role === "owner",
  });

  const invalidateOrg = () => {
    if (!activeOrgId) return;
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.detail(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.settings(activeOrgId) });
    queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
  };

  const [profileState, saveProfile] = useActionState(
    async (_prev: any, formData: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const body: UpdateOrganizationBody = {
          name: String(formData.get("name") || "").trim(),
          logoUrl: normalizeOptional(formData.get("logoUrl")) ?? null,
          billingEmail: normalizeOptional(formData.get("billingEmail")),
          industry: normalizeOptional(formData.get("industry")) ?? null,
          companySize: normalizeOptional(formData.get("companySize")) ?? null,
        };
        await orgApi.updateOrganization(activeOrgId, body);
        invalidateOrg();
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to update organization profile" };
      }
    },
    { ok: false, error: null },
  );

  const [preferencesState, savePreferences] = useActionState(
    async (_prev: any, formData: FormData) => {
      if (!activeOrgId || !settings || !org) return { ok: false, error: "No active organization" };
      try {
        await orgApi.updateOrganization(activeOrgId, {
          timezone: String(formData.get("timezone") || org.timezone || "UTC"),
        });
        await orgApi.updateSettings(activeOrgId, {
          dataRegion: String(formData.get("dataRegion") || settings.dataRegion),
          sessionTimeoutMinutes: toInt(formData.get("sessionTimeoutMinutes"), settings.sessionTimeoutMinutes),
          dataRetentionDays: toInt(formData.get("dataRetentionDays"), settings.dataRetentionDays),
          auditLogRetentionDays: toInt(formData.get("auditLogRetentionDays"), settings.auditLogRetentionDays),
          enforceMfa: formData.get("enforceMfa") === "on",
        });
        invalidateOrg();
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to update preferences" };
      }
    },
    { ok: false, error: null },
  );

  const transferMutation = useMutation({
    mutationFn: () => orgApi.transferOwnership(activeOrgId!, { newOwnerUserId }),
    onSuccess: () => {
      toast.success("Ownership transferred");
      setShowTransfer(false);
      invalidateOrg();
      if (activeOrgId) queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to transfer ownership"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orgApi.deleteOrganization(activeOrgId!),
    onSuccess: () => {
      toast.success("Organization deleted");
      setShowDelete(false);
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete organization"),
  });

  useEffect(() => {
    if (profileState.ok) toast.success("Organization profile saved");
    if (profileState.error) toast.error(profileState.error);
  }, [profileState]);

  useEffect(() => {
    if (preferencesState.ok) toast.success("Organization preferences saved");
    if (preferencesState.error) toast.error(preferencesState.error);
  }, [preferencesState]);

  if (orgLoading || settingsLoading || !org || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Organization"
          title="Settings"
          description="Profile, preferences, security policy, and owner-only destructive actions."
          icon={SlidersHorizontal}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const ownerOnly = me?.role === "owner";
  const enforceMfa = mfaDraft ?? settings.enforceMfa;
  const transferCandidates = (members?.data ?? []).filter((member) => member.userId !== me?.userId);

  const facts: HeroFact[] = [
    {
      label: "MFA enforcement",
      value: enforceMfa ? "Required" : "Optional",
      tone: enforceMfa ? "green" : "amber",
      icon: ShieldCheck,
    },
    {
      label: "SSO enforcement",
      value: settings.enforceSso ? "Required" : "Optional",
      tone: settings.enforceSso ? "green" : "neutral",
      icon: KeyRound,
    },
    { label: "Session timeout", value: sessionLabel(settings.sessionTimeoutMinutes), icon: Clock },
    { label: "Audit retention", value: `${settings.auditLogRetentionDays} days`, tone: "blue", icon: ScrollText },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Organization"
        title="Settings"
        description="Profile, preferences, security policy, and owner-only destructive actions for this organization."
        icon={SlidersHorizontal}
        actions={<Pill tone={ownerOnly ? "brand" : "neutral"}>{me?.role ?? "member"}</Pill>}
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {!ownerOnly && (
        <Notice tone="blue" icon={ShieldAlert} title="Some actions need owner access">
          Ownership transfer and organization deletion are limited to the organization owner.
        </Notice>
      )}

      <SplitShell
        rail={
          <>
            <Panel
              title="Policy reference"
              description="What each setting on this page changes for members."
              icon={ShieldCheck}
              tone="ai"
            >
              <dl className="flex flex-col gap-4">
                {POLICY_NOTES.map((note) => (
                  <PolicyNoteRow key={note.label} note={note} />
                ))}
              </dl>
            </Panel>

            <Panel title="Identity surfaces" description="Policies that live with the identity provider." icon={KeyRound} tone="brand">
              <div className="flex flex-col gap-3">
                <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">
                  SSO enforcement and routing domains are configured alongside the SAML provider.
                </p>
                <Link
                  to="/admin/sso"
                  className="inline-flex w-fit items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text)] transition-colors hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Single sign-on
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </Panel>
          </>
        }
      >
        <form action={saveProfile}>
          <Panel
            title="Organization profile"
            description="Shown to members and used on billing documents."
            icon={Building2}
            tone="brand"
            footer={<SubmitButton>Save profile</SubmitButton>}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Organization name">
                <input name="name" defaultValue={org.name} className={inputClass} required />
              </Field>
              <Field label="Slug" hint={`Used in URLs: pulsiv.io/org/${org.slug}`}>
                <input
                  value={org.slug}
                  className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`}
                  disabled
                  readOnly
                />
              </Field>
              <Field label="Logo URL" hint="SVG or PNG URL. File upload is not enabled by the backend yet.">
                <input name="logoUrl" defaultValue={org.logoUrl || ""} className={inputClass} />
              </Field>
              <Field label="Billing email">
                <input
                  name="billingEmail"
                  type="email"
                  defaultValue={org.billingEmail || ""}
                  className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`}
                />
              </Field>
              <Field label="Industry">
                <select name="industry" defaultValue={org.industry || ""} className={inputClass}>
                  <option value="">Not set</option>
                  <option value="software">Software</option>
                  <option value="fintech">Fintech</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="commerce">Commerce</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Company size">
                <select name="companySize" defaultValue={org.companySize || ""} className={inputClass}>
                  <option value="">Not set</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-1000">201-1000</option>
                  <option value="1000+">1000+</option>
                </select>
              </Field>
            </div>
          </Panel>
        </form>

        <form action={savePreferences} className="flex flex-col gap-6">
          <Panel
            title="General preferences"
            description="Defaults applied across dashboards and scheduled reports."
            icon={SlidersHorizontal}
            tone="brand"
            bodyClassName="p-0"
          >
            <RowStack>
              <Row>
                <SettingRow
                  label="Default timezone"
                  description="Used for charts, digests, and exported timestamps."
                  htmlFor="timezone"
                >
                  <select
                    id="timezone"
                    name="timezone"
                    defaultValue={org.timezone || "UTC"}
                    className={`${inputClass} w-[200px]`}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Berlin">Europe/Berlin</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="Asia/Singapore">Asia/Singapore</option>
                  </select>
                </SettingRow>
              </Row>
              <Row>
                <SettingRow
                  label="Public projects"
                  description="Whether projects may be shared without authentication. Managed by support today."
                >
                  {settings.allowPublicProjects ? (
                    <Pill tone="amber" dot>Allowed</Pill>
                  ) : (
                    <Pill tone="green" dot>Blocked</Pill>
                  )}
                </SettingRow>
              </Row>
            </RowStack>
          </Panel>

          <Panel
            title="Security policy"
            description="Authentication requirements and session behaviour for every member."
            icon={ShieldCheck}
            tone="green"
            bodyClassName="p-0"
          >
            <RowStack>
              <Row>
                <SettingRow
                  label="Require MFA for all members"
                  description="Members without a second factor must enrol before they can continue."
                  htmlFor="enforceMfa"
                >
                  <Toggle
                    id="enforceMfa"
                    label="Require MFA for all members"
                    checked={enforceMfa}
                    onChange={setMfaDraft}
                  />
                </SettingRow>
                <input type="hidden" name="enforceMfa" value={enforceMfa ? "on" : "off"} />
              </Row>
              <Row>
                <SettingRow
                  label="Require SSO for all members"
                  description="Enforcement is stored with the identity provider configuration."
                >
                  <div className="flex items-center gap-2">
                    {settings.enforceSso ? <Pill tone="green" dot>Required</Pill> : <Pill tone="neutral">Optional</Pill>}
                    <Link
                      to="/admin/sso"
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text)] transition-colors hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      Manage
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </SettingRow>
              </Row>
              <Row>
                <SettingRow
                  label="Session timeout"
                  description="Idle sessions are signed out after this period."
                  htmlFor="sessionTimeoutMinutes"
                >
                  <select
                    id="sessionTimeoutMinutes"
                    name="sessionTimeoutMinutes"
                    defaultValue={settings.sessionTimeoutMinutes}
                    className={`${inputClass} w-[160px] tabular-nums`}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                    <option value="480">8 hours</option>
                    <option value="1440">Never</option>
                  </select>
                </SettingRow>
              </Row>
            </RowStack>
          </Panel>

          <Panel
            title="Data residency and retention"
            description="Where telemetry is stored and how long it stays queryable."
            icon={Database}
            tone="blue"
            bodyClassName="p-0"
            footer={<SubmitButton>Save preferences</SubmitButton>}
          >
            <RowStack>
              <Row>
                <SettingRow
                  label="Data residency"
                  description="Region that stores ingested telemetry for this organization."
                  htmlFor="dataRegion"
                >
                  <select
                    id="dataRegion"
                    name="dataRegion"
                    defaultValue={settings.dataRegion}
                    className={`${inputClass} w-[160px]`}
                  >
                    <option value="us-east-1">US</option>
                    <option value="eu-west-1">EU</option>
                    <option value="ap-south-1">APAC</option>
                  </select>
                </SettingRow>
              </Row>
              <Row>
                <SettingRow
                  label="API log retention"
                  description="How long request and event payloads remain queryable."
                  htmlFor="dataRetentionDays"
                >
                  <select
                    id="dataRetentionDays"
                    name="dataRetentionDays"
                    defaultValue={settings.dataRetentionDays}
                    className={`${inputClass} w-[160px] tabular-nums`}
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                  </select>
                </SettingRow>
              </Row>
              <Row>
                <SettingRow
                  label="Audit log retention"
                  description="Privileged action history kept for compliance review."
                  htmlFor="auditLogRetentionDays"
                >
                  <select
                    id="auditLogRetentionDays"
                    name="auditLogRetentionDays"
                    defaultValue={settings.auditLogRetentionDays}
                    className={`${inputClass} w-[160px] tabular-nums`}
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                  </select>
                </SettingRow>
              </Row>
            </RowStack>
          </Panel>
        </form>

        {ownerOnly && (
          <Panel
            title="Danger zone"
            description="These actions change access for everyone in the organization."
            icon={ShieldAlert}
            danger
            bodyClassName="p-0"
          >
            <RowStack>
              <Row className="flex flex-col gap-4">
                <SettingRow
                  label="Transfer ownership"
                  description="The selected member becomes the owner and you are downgraded to admin."
                  htmlFor="newOwnerUserId"
                >
                  <Button
                    variant="danger"
                    disabled={!newOwnerUserId || transferMutation.isPending}
                    onClick={() => setShowTransfer(true)}
                  >
                    <KeyRound className="size-4" aria-hidden="true" />
                    Transfer
                  </Button>
                </SettingRow>
                <div className="max-w-[360px]">
                  <Field label="New owner" hint="Only active members other than you can be selected.">
                    <select
                      id="newOwnerUserId"
                      value={newOwnerUserId}
                      onChange={(event) => setNewOwnerUserId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select a member</option>
                      {transferCandidates.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {`${member.fullName || member.email} (${member.role})`}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Row>
              <Row>
                <SettingRow
                  label="Delete organization"
                  description="All API logs, monitors, and member data are permanently deleted. This cannot be undone."
                >
                  <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => setShowDelete(true)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete organization
                  </Button>
                </SettingRow>
              </Row>
            </RowStack>
          </Panel>
        )}
      </SplitShell>

      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              The selected member becomes the owner. You are downgraded to admin and cannot undo this yourself.
            </DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-[var(--text2)]">
            {transferCandidates.find((member) => member.userId === newOwnerUserId)?.fullName ||
              transferCandidates.find((member) => member.userId === newOwnerUserId)?.email ||
              "No member selected"}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowTransfer(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!newOwnerUserId || transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
            >
              Transfer ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDelete}
        onOpenChange={(open) => {
          setShowDelete(open);
          if (!open) setConfirmSlug("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              All API logs, monitors, and member data are permanently deleted. Type the organization slug to confirm.
            </DialogDescription>
          </DialogHeader>
          <Field label="Confirm slug" hint={`Type ${org.slug} exactly.`}>
            <input
              value={confirmSlug}
              onChange={(event) => setConfirmSlug(event.target.value)}
              placeholder={org.slug}
              className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDelete(false);
                setConfirmSlug("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmSlug !== org.slug || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
