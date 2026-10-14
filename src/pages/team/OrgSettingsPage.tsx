import { useActionState, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button as UiButton } from "@/components/ui/button";
import { orgApi } from "@/modules/organizations/api/org.api";
import { useAdminHref } from "@/modules/organizations/components/org-page";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { UpdateOrganizationBody } from "@/modules/organizations/types/org.types";
import { bootstrapService } from "@/modules/bootstrap";
import {
  ProjectPageHeader,
  SETTINGS_COLUMN,
  Sheet,
  SheetError,
  SheetLoading,
  TextLink,
  WorkspacePage,
} from "@/modules/projects/components/project-page";
import { ConfirmDialog, DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  Notice,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  Toggle,
  fieldInputClass,
  fieldMonoClass,
} from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────

type SaveState = { ok: boolean; error: string | null };

const INITIAL_SAVE_STATE: SaveState = { ok: false, error: null };

const PROFILE_FORM_ID = "org-settings-profile-form";
const PREFERENCES_FORM_ID = "org-settings-preferences-form";

const PAGE_DESCRIPTION = "Profile, preferences, security policy, and owner-only destructive actions for this organization.";

const normalizeOptional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

const toInt = (value: FormDataEntryValue | null, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ── Page ─────────────────────────────────────────────────────

export default function OrgSettingsPage() {
  const { activeOrgId } = useOrganizations();
  const href = useAdminHref();
  const queryClient = useQueryClient();
  const [mfaDraft, setMfaDraft] = useState<boolean | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [confirmSlug, setConfirmSlug] = useState("");
  const [slugMismatch, setSlugMismatch] = useState(false);

  const {
    data: org,
    isLoading: orgLoading,
    isError: orgFailed,
    error: orgError,
    refetch: refetchOrg,
  } = useQuery({
    queryKey: orgQueryKeys.detail(activeOrgId!),
    queryFn: () => orgApi.getOrganization(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsFailed,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
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

  const [profileState, saveProfile, profilePending] = useActionState(
    async (_prev: SaveState, formData: FormData): Promise<SaveState> => {
      if (!activeOrgId) return { ok: false, error: "No active organization" };
      try {
        const body: UpdateOrganizationBody = {
          name: String(formData.get("name") || "").trim(),
          logoUrl: normalizeOptional(formData.get("logoUrl")) ?? null,
        };
        await orgApi.updateOrganization(activeOrgId, body);
        invalidateOrg();
        return { ok: true, error: null };
      } catch (err: unknown) {
        return { ok: false, error: apiErrorMessage(err, "Failed to update organization profile") };
      }
    },
    INITIAL_SAVE_STATE,
  );

  const [preferencesState, savePreferences, preferencesPending] = useActionState(
    async (_prev: SaveState, formData: FormData): Promise<SaveState> => {
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
        return { ok: true, error: null };
      } catch (err: unknown) {
        return { ok: false, error: apiErrorMessage(err, "Failed to update preferences") };
      }
    },
    INITIAL_SAVE_STATE,
  );

  const transferMutation = useMutation({
    mutationFn: () => orgApi.transferOwnership(activeOrgId!, { newOwnerUserId }),
    onSuccess: () => {
      toast.success("Ownership transferred");
      setShowTransfer(false);
      invalidateOrg();
      // You no longer own an organization, so creating one is allowed again.
      void bootstrapService.refreshBootstrap().catch(() => undefined);
      if (activeOrgId) queryClient.invalidateQueries({ queryKey: orgQueryKeys.members(activeOrgId) });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to transfer ownership")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orgApi.deleteOrganization(activeOrgId!),
    onSuccess: () => {
      toast.success("Organization deleted");
      setShowDelete(false);
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
      // A deleted organization no longer counts toward the one-owned limit.
      void bootstrapService.refreshBootstrap().catch(() => undefined);
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Failed to delete organization")),
  });

  useEffect(() => {
    if (profileState.ok) toast.success("Organization profile saved");
    if (profileState.error) toast.error(profileState.error);
  }, [profileState]);

  useEffect(() => {
    if (preferencesState.ok) toast.success("Organization preferences saved");
    if (preferencesState.error) toast.error(preferencesState.error);
  }, [preferencesState]);

  if ((orgFailed && !org) || (settingsFailed && !settings)) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="Settings" description={PAGE_DESCRIPTION} />
        <div className={SETTINGS_COLUMN}>
          <Sheet label="Settings">
            <SheetError
              title="Could not load organization settings"
              message={apiErrorMessage(orgError ?? settingsError, "The settings request failed.")}
              onRetry={() => {
                void refetchOrg();
                void refetchSettings();
              }}
            />
          </Sheet>
        </div>
      </WorkspacePage>
    );
  }

  if (orgLoading || settingsLoading || !org || !settings) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="Settings" description={PAGE_DESCRIPTION} />
        <div className={cn(SETTINGS_COLUMN, "flex flex-col gap-6")}>
          <Sheet title="Organization profile">
            <SheetLoading rows={3} label="Loading organization profile" />
          </Sheet>
          <Sheet title="Security policy">
            <SheetLoading rows={3} label="Loading security policy" />
          </Sheet>
        </div>
      </WorkspacePage>
    );
  }

  const ownerOnly = me?.role === "owner";
  const enforceMfa = mfaDraft ?? settings.enforceMfa;
  const transferCandidates = (members?.data ?? []).filter((member) => member.userId !== me?.userId);
  const selectedOwner = transferCandidates.find((member) => member.userId === newOwnerUserId);

  const closeDelete = () => {
    setShowDelete(false);
    setConfirmSlug("");
    setSlugMismatch(false);
  };

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Settings"
        description={PAGE_DESCRIPTION}
        // Saved values, so the header matches the dashboard's access controls ledger.
        meta={[
          { label: "MFA", value: settings.enforceMfa ? "Required" : "Optional" },
          { label: "SSO", value: settings.enforceSso ? "Required" : "Optional" },
          { label: "Session timeout", value: `${settings.sessionTimeoutMinutes} min`, mono: true },
          { label: "Audit retention", value: `${settings.auditLogRetentionDays} days`, mono: true },
        ]}
      />

      <div className={cn(SETTINGS_COLUMN, "flex flex-col gap-6")}>
        {!ownerOnly && (
          <Notice tone="neutral" title="Some actions need owner access">
            Ownership transfer and organization deletion are limited to the organization owner.
          </Notice>
        )}

        <Panel
          title="Organization profile"
          description="Shown to members and used on billing documents."
          footer={
            <UiButton type="submit" form={PROFILE_FORM_ID} size="lg" disabled={profilePending}>
              {profilePending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              Save profile
            </UiButton>
          }
        >
          <form id={PROFILE_FORM_ID} action={saveProfile} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DialogField label="Organization name" name="settings-org-name" required>
              <input id="settings-org-name" name="name" defaultValue={org.name} className={fieldInputClass} required />
            </DialogField>
            <DialogField label="Slug" name="settings-org-slug" hint={`Used in URLs such as /${org.slug}/admin.`}>
              <input id="settings-org-slug" value={org.slug} className={fieldMonoClass} disabled readOnly />
            </DialogField>
            <DialogField
              label="Logo URL"
              name="settings-org-logo"
              hint="SVG or PNG URL. File upload is not enabled by the backend yet."
            >
              <input
                id="settings-org-logo"
                name="logoUrl"
                defaultValue={org.logoUrl || ""}
                className={fieldInputClass}
                placeholder="https://"
              />
            </DialogField>
          </form>
        </Panel>

        {/* One form spans the three preference panels; the save in the last footer submits all of them. */}
        <form id={PREFERENCES_FORM_ID} action={savePreferences} className="flex flex-col gap-6">
          <Panel
            title="General preferences"
            description="Defaults applied across dashboards and scheduled reports."
            bodyClassName="p-0"
          >
            <RowStack>
              <Row>
                <SettingRow
                  label="Default timezone"
                  description="Used for charts, digests, and exported timestamps."
                  htmlFor="settings-timezone"
                >
                  <select
                    id="settings-timezone"
                    name="timezone"
                    defaultValue={org.timezone || "UTC"}
                    className={cn(fieldInputClass, "w-[200px]")}
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
                    <Pill tone="amber" dot>
                      Allowed
                    </Pill>
                  ) : (
                    <Pill tone="green" dot>
                      Blocked
                    </Pill>
                  )}
                </SettingRow>
              </Row>
            </RowStack>
          </Panel>

          <Panel
            title="Security policy"
            description="Authentication requirements and session behaviour for every member."
            bodyClassName="p-0"
          >
            <RowStack>
              <Row>
                <SettingRow
                  label="Require MFA for all members"
                  description="Members without a second factor are prompted to enrol on their next sign-in and cannot skip it."
                  htmlFor="settings-enforce-mfa"
                >
                  <Toggle
                    id="settings-enforce-mfa"
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
                  description="Managed with the identity provider. When required, password sign-in is refused for org members."
                >
                  {settings.enforceSso ? (
                    <Pill tone="green" dot>
                      Required
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Optional</Pill>
                  )}
                  <TextLink to={href("sso")} size="sm" arrow className="whitespace-nowrap">
                    Manage SSO
                  </TextLink>
                </SettingRow>
              </Row>
              <Row>
                <SettingRow
                  label="Session timeout"
                  description="Idle sessions are signed out after this period. Shorter windows limit exposure on an unattended device."
                  htmlFor="settings-session-timeout"
                >
                  <select
                    id="settings-session-timeout"
                    name="sessionTimeoutMinutes"
                    defaultValue={settings.sessionTimeoutMinutes}
                    className={cn(fieldInputClass, "w-[160px] tabular-nums")}
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
            bodyClassName="p-0"
            footer={
              <>
                <span className="mr-auto text-[12px] text-[var(--text3)]">
                  Saves preferences, security policy, and retention together.
                </span>
                <UiButton type="submit" form={PREFERENCES_FORM_ID} size="lg" disabled={preferencesPending}>
                  {preferencesPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  Save preferences
                </UiButton>
              </>
            }
          >
            <RowStack>
              <Row>
                <SettingRow
                  label="Data residency"
                  description="Region that stores ingested telemetry. Changing it applies to newly ingested data only."
                  htmlFor="settings-data-region"
                >
                  <select
                    id="settings-data-region"
                    name="dataRegion"
                    defaultValue={settings.dataRegion}
                    className={cn(fieldInputClass, "w-[160px]")}
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
                  description="How long request and event payloads stay queryable in dashboards and exports."
                  htmlFor="settings-data-retention"
                >
                  <select
                    id="settings-data-retention"
                    name="dataRetentionDays"
                    defaultValue={settings.dataRetentionDays}
                    className={cn(fieldInputClass, "w-[160px] tabular-nums")}
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
                  description="Privileged action history kept for compliance review. Most compliance programmes expect at least 90 days."
                  htmlFor="settings-audit-retention"
                >
                  <select
                    id="settings-audit-retention"
                    name="auditLogRetentionDays"
                    defaultValue={settings.auditLogRetentionDays}
                    className={cn(fieldInputClass, "w-[160px] tabular-nums")}
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
            danger
            bodyClassName="p-0"
          >
            <RowStack>
              <Row className="flex flex-col gap-4">
                <SettingRow
                  label="Transfer ownership"
                  description="The selected member becomes the owner and you are downgraded to admin."
                >
                  <UiButton
                    variant="destructive"
                    size="lg"
                    disabled={!newOwnerUserId || transferMutation.isPending}
                    onClick={() => setShowTransfer(true)}
                  >
                    Transfer ownership
                  </UiButton>
                </SettingRow>
                <DialogField
                  label="New owner"
                  name="settings-new-owner"
                  hint="Only active members other than you can be selected."
                  className="max-w-[360px]"
                >
                  <select
                    id="settings-new-owner"
                    value={newOwnerUserId}
                    onChange={(event) => setNewOwnerUserId(event.target.value)}
                    className={fieldInputClass}
                  >
                    <option value="">Select a member</option>
                    {transferCandidates.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {`${member.fullName || member.email} (${member.role})`}
                      </option>
                    ))}
                  </select>
                </DialogField>
              </Row>
              <Row>
                <SettingRow
                  label="Delete organization"
                  description="All API logs, monitors, and member data are permanently deleted. This cannot be undone."
                >
                  <UiButton
                    variant="destructive"
                    size="lg"
                    disabled={deleteMutation.isPending}
                    onClick={() => setShowDelete(true)}
                  >
                    Delete organization
                  </UiButton>
                </SettingRow>
              </Row>
            </RowStack>
          </Panel>
        )}
      </div>

      <ConfirmDialog
        open={showTransfer}
        onOpenChange={setShowTransfer}
        title="Transfer ownership"
        description="The selected member becomes the owner. You are downgraded to admin and cannot undo this yourself."
        confirmLabel="Transfer ownership"
        pending={transferMutation.isPending}
        onConfirm={() => {
          if (!newOwnerUserId) return;
          transferMutation.mutate();
        }}
      >
        <p className="text-[13px] text-[var(--text2)]">
          New owner:{" "}
          <span className="text-[var(--text)]">
            {selectedOwner?.fullName || selectedOwner?.email || "No member selected"}
          </span>
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={(open) => {
          if (open) setShowDelete(true);
          else closeDelete();
        }}
        title="Delete organization"
        description="All API logs, monitors, and member data are permanently deleted. Type the organization slug to confirm."
        confirmLabel="Delete organization"
        pending={deleteMutation.isPending}
        onConfirm={() => {
          // Typed confirmation: nothing is deleted until the slug matches exactly.
          if (confirmSlug !== org.slug) {
            setSlugMismatch(true);
            return;
          }
          deleteMutation.mutate();
        }}
      >
        <DialogField label="Confirm slug" name="settings-confirm-slug" hint={`Type ${org.slug} exactly.`}>
          <input
            id="settings-confirm-slug"
            value={confirmSlug}
            onChange={(event) => {
              setConfirmSlug(event.target.value);
              setSlugMismatch(false);
            }}
            placeholder={org.slug}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={slugMismatch || undefined}
            aria-describedby={slugMismatch ? "settings-confirm-slug-error" : undefined}
            className={fieldMonoClass}
          />
        </DialogField>
        {slugMismatch && (
          <p id="settings-confirm-slug-error" role="alert" className="text-[12px] leading-[1.5] text-[var(--red)]">
            The slug does not match. Type {org.slug} exactly to delete this organization.
          </p>
        )}
      </ConfirmDialog>
    </WorkspacePage>
  );
}
