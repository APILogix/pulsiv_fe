import { startTransition, useActionState, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button as UiButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { getErrorCode, getErrorMessage } from "@/infrastructure/api-client/error.interceptor";
import { orgApi } from "@/modules/organizations/api/org.api";
import { CONTROL_LABEL, CONTROL_TONE, type ControlState } from "@/modules/organizations/components/org-page";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { CreatedVerifiedDomain, VerifiedDomain } from "@/modules/organizations/types/org.types";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
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
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { ConfirmDialog, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import { CopyButton, JsonViewer, Timestamp, formatNumber } from "@/shared/observe";
import {
  KeyValueGrid,
  Notice,
  Panel,
  Pill,
  Row,
  RowStack,
  SecretField,
  SettingRow,
  SetupSteps,
  SplitShell,
  Toggle,
  fieldMonoClass,
  fieldTextareaClass,
  type SetupStepItem,
} from "@/shared/ui/pulse";
import { DomainVerificationAnimation } from "@/shared/components/animations/DomainVerificationAnimation";
import { cn } from "@/lib/utils";

type DomainDialogMode = "view" | "edit";

type DomainActionType = "verify" | "recheck" | "primary" | "auto" | "delete" | "edit";

interface DomainActionInput {
  type: DomainActionType;
  id: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
  domainName?: string;
}

const ACTION_SUCCESS: Record<DomainActionType, string> = {
  verify: "Domain verification checked",
  recheck: "DNS record rechecked",
  primary: "Primary domain updated",
  auto: "Auto-join updated",
  delete: "Domain removed",
  edit: "Domain metadata saved",
};

const STEP_UP_MESSAGE =
  "This action needs a fresh multi-factor check. Complete the verification prompt, then try again.";

const PAGE_DESCRIPTION =
  "Prove ownership of your company domains through DNS before turning on SSO discovery or automatic membership.";

const DOMAIN_COLUMNS: SheetColumn[] = [
  { key: "domain", header: "Domain" },
  { key: "verification", header: "Verification", className: "w-[130px]" },
  { key: "autoJoin", header: "Auto-join", className: `w-[100px] ${HIDE_BELOW_SM}` },
  { key: "checked", header: "Last checked", className: `w-[150px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[140px] text-right", align: "right" },
];

const MONO_VALUE = "font-[family-name:var(--mono)] text-[12px] tabular-nums";

function safeJson(value: Record<string, unknown>) {
  return JSON.stringify(value ?? {}, null, 2);
}

function DetailsLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index} aria-hidden="true" className="loading-skeleton block h-8 w-full rounded-[4px]" />
      ))}
    </div>
  );
}

/**
 * Inline DNS check shown inside the selected domain panel while a verify or
 * recheck request runs. It does not block the page, so it needs no focus
 * management; the page-level live region announces it.
 */
function DnsCheckStatus({ domain }: { domain: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <DomainVerificationAnimation isVerified={false} />
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[14px] font-semibold text-[var(--text)]">Checking DNS</p>
        <p className="max-w-[320px] text-[13px] leading-[1.6] text-[var(--text2)]">
          Looking up the TXT record for{" "}
          <span className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{domain}</span>
        </p>
      </div>
      <div className="pulse-sweep relative h-1 w-[220px] max-w-full overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true" />
      <p className="text-[12px] text-[var(--text3)]">DNS propagation can take a few minutes</p>
    </div>
  );
}

/** Disabled menu items say why they are unavailable. */
function MenuItemLabel({ children, reason }: { children: string; reason?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span>{children}</span>
      {reason && <span className="text-[11.5px] text-[var(--text3)]">{reason}</span>}
    </span>
  );
}

export default function DomainsPage() {
  const { activeOrgId } = useOrganizations();
  const qc = useQueryClient();
  const [created, setCreated] = useState<CreatedVerifiedDomain | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DomainDialogMode | null>(null);
  const [metadataDraft, setMetadataDraft] = useState("{}");
  const [deleteTarget, setDeleteTarget] = useState<VerifiedDomain | null>(null);
  const [stepUpBlocked, setStepUpBlocked] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // The domain whose DNS record panel is shown under the table.
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: orgQueryKeys.domains(activeOrgId!),
    queryFn: () => orgApi.listDomains(activeOrgId!, { limit: 100 }),
    enabled: !!activeOrgId,
  });

  const { data: selectedDomain, isLoading: isSelectedDomainLoading } = useQuery({
    queryKey: selectedDomainId ? [...orgQueryKeys.domains(activeOrgId!), selectedDomainId] : ["domain-details", "idle"],
    queryFn: () => orgApi.getDomain(activeOrgId!, selectedDomainId!),
    enabled: !!activeOrgId && !!selectedDomainId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: orgQueryKeys.domains(activeOrgId!) });

  const action = useMutation({
    mutationFn: async ({ type, id, enabled, metadata }: DomainActionInput) => {
      if (!activeOrgId) throw new Error("No active organization");
      if (type === "verify") return orgApi.verifyDomain(activeOrgId, id);
      if (type === "recheck") return orgApi.recheckDomain(activeOrgId, id);
      if (type === "primary") return orgApi.makePrimaryDomain(activeOrgId, id);
      if (type === "auto") return orgApi.setDomainAutoJoin(activeOrgId, id, !!enabled);
      if (type === "edit") return orgApi.updateDomain(activeOrgId, id, { metadata: metadata ?? {} });
      return orgApi.deleteDomain(activeOrgId, id);
    },
    onMutate: ({ type, domainName }) => {
      setStepUpBlocked(false);
      if ((type === "verify" || type === "recheck") && domainName) {
        setVerifyingDomain(domainName);
      }
    },
    onSuccess: (_result, variables) => {
      setVerifyingDomain(null);
      if (variables.type === "edit") {
        setDialogMode(null);
        setSelectedDomainId(null);
      }
      if (variables.type === "delete") setDeleteTarget(null);
      toast.success(ACTION_SUCCESS[variables.type]);
      invalidate();
    },
    onError: (err: unknown) => {
      setVerifyingDomain(null);
      if (getErrorCode(err) === "STEP_UP_REQUIRED") {
        setStepUpBlocked(true);
        toast.error(STEP_UP_MESSAGE);
        return;
      }
      toast.error(getErrorMessage(err));
    },
  });

  const [state, createAction, createPending] = useActionState(
    async (_prev: { error: string | null }, form: FormData) => {
      if (!activeOrgId) return { error: "No active organization" };
      try {
        const domain = String(form.get("domain") ?? "")
          .trim()
          .toLowerCase();
        const result = await orgApi.createDomain(activeOrgId, { domain });
        setCreated(result);
        setFocusedId(result.id);
        setAddOpen(false);
        invalidate();
        return { error: null };
      } catch (err: unknown) {
        return { error: getErrorMessage(err) };
      }
    },
    { error: null as string | null },
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  useEffect(() => {
    if (dialogMode === "edit" && selectedDomain) {
      setMetadataDraft(safeJson(selectedDomain.metadata));
    }
  }, [dialogMode, selectedDomain]);

  // Warn before leaving while a DNS check is in flight.
  useEffect(() => {
    if (!verifyingDomain) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [verifyingDomain]);

  const loaded = data !== undefined;
  const domains = data?.data ?? [];
  const verified = domains.filter((domain) => domain.isVerified).length;
  const autoJoin = domains.filter((domain) => domain.autoJoinEnabled).length;
  const pendingCount = domains.length - verified;
  const primary = domains.find((domain) => domain.isPrimary) ?? null;
  const verifiedDomains = domains.filter((domain) => domain.isVerified);

  const focused =
    domains.find((domain) => domain.id === focusedId) ??
    domains.find((domain) => !domain.isVerified) ??
    domains[0] ??
    null;
  const focusedRecord = created && focused && created.id === focused.id ? created : null;

  // Mirrors the dashboard ledger's "Verified domains" row.
  const controlState: ControlState = !loaded
    ? "unknown"
    : verified > 0
      ? "active"
      : domains.length > 0
        ? "partial"
        : "off";

  const readouts: Readout[] = [
    {
      label: "Domains",
      value: formatNumber(domains.length),
      sub: "Claimed by this organization",
    },
    {
      label: "Verified",
      value: formatNumber(verified),
      sub: "Ownership proven through DNS",
      tone: verified > 0 ? "good" : "neutral",
    },
    {
      label: "Pending verification",
      value: formatNumber(pendingCount),
      sub: pendingCount > 0 ? "Awaiting the DNS TXT record" : "Nothing waiting on DNS",
      tone: pendingCount > 0 ? "warn" : "neutral",
    },
    {
      label: "Auto-join enabled",
      value: formatNumber(autoJoin),
      sub: verified > 0 ? `Across ${verified} verified ${verified === 1 ? "domain" : "domains"}` : "Needs a verified domain",
    },
  ];

  const steps: SetupStepItem[] = focused
    ? [
        { title: "Add the domain", description: "Enter the company domain you control, for example acme.com.", done: true },
        { title: "Publish the TXT record", description: "Copy the host and value into your DNS provider.", done: focused.isVerified },
        { title: "Run verification", description: "Select Verify DNS. Propagation can take a few minutes.", done: focused.isVerified },
        { title: "Choose a primary domain", description: "The primary domain is used for SSO discovery.", done: primary !== null },
        {
          title: "Enable auto-join",
          description: "Optional. Signups on a verified domain join automatically.",
          done: focused.autoJoinEnabled,
        },
      ]
    : [];

  const openDialog = (mode: DomainDialogMode, domainId: string) => {
    setSelectedDomainId(domainId);
    setDialogMode(mode);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedDomainId(null);
  };

  const submitMetadataUpdate = () => {
    if (!selectedDomainId) return;
    try {
      const parsed = JSON.parse(metadataDraft) as Record<string, unknown>;
      action.mutate({ type: "edit", id: selectedDomainId, metadata: parsed });
    } catch {
      toast.error("Metadata must be valid JSON");
    }
  };

  const verify = (domain: VerifiedDomain) => {
    setFocusedId(domain.id);
    action.mutate({ type: domain.isVerified ? "recheck" : "verify", id: domain.id, domainName: domain.domain });
  };

  const pending = action.isPending;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Domains"
        badges={
          loaded ? (
            <Pill tone={CONTROL_TONE[controlState]} dot={controlState === "active"}>
              {CONTROL_LABEL[controlState]}
            </Pill>
          ) : undefined
        }
        description={PAGE_DESCRIPTION}
        meta={[
          {
            label: "Verification",
            value: !loaded ? "—" : domains.length > 0 ? `${verified} of ${domains.length} verified` : "None",
            mono: true,
          },
          { label: "Primary domain", value: !loaded ? "—" : (primary?.domain ?? "None"), mono: true },
        ]}
        actions={
          <UiButton size="lg" onClick={() => setAddOpen(true)}>
            Add domain
          </UiButton>
        }
      />

      {/* One live region for DNS checks, whichever row started them. */}
      <p role="status" className="sr-only">
        {verifyingDomain ? `Checking DNS for ${verifyingDomain}` : ""}
      </p>

      {!(isError && !loaded) && <Readouts cells={readouts} loading={isLoading} label="Domain summary" />}

      <SplitShell
        rail={
          <>
            {stepUpBlocked && (
              <Notice tone="amber" title="Additional verification required">
                {STEP_UP_MESSAGE} Auto-join, primary domain, and domain removal are all step-up protected.
              </Notice>
            )}

            <Panel
              title="Auto-join"
              description="New users signing up with a verified email domain join the organization automatically."
              bodyClassName={verifiedDomains.length > 0 ? "p-0" : undefined}
            >
              {isLoading ? (
                <DetailsLoading label="Loading auto-join settings" />
              ) : verifiedDomains.length === 0 ? (
                <p className="text-[13px] leading-[1.6] text-[var(--text2)]">
                  Verify a domain to turn on auto-join for its email addresses.
                </p>
              ) : (
                <RowStack>
                  {verifiedDomains.map((domain) => (
                    <Row key={domain.id} className="px-5 py-4">
                      <SettingRow
                        label={domain.domain}
                        description={domain.autoJoinEnabled ? "Signups join automatically." : "Signups need an invitation."}
                        htmlFor={`auto-join-${domain.id}`}
                        className="sm:gap-4"
                      >
                        <Toggle
                          id={`auto-join-${domain.id}`}
                          label={`Auto-join for ${domain.domain}`}
                          checked={domain.autoJoinEnabled}
                          disabled={pending}
                          onChange={(next) => action.mutate({ type: "auto", id: domain.id, enabled: next })}
                        />
                      </SettingRow>
                    </Row>
                  ))}
                </RowStack>
              )}
            </Panel>
          </>
        }
      >
        <Sheet
          title="Claimed domains"
          description="Verified domains unlock SSO routing and optional auto-join. Select a domain to see its DNS record."
          footer={
            loaded && domains.length > 0 ? (
              <span>
                {verified} of {domains.length} verified
                {pendingCount > 0 ? `, ${pendingCount} pending` : ""}
              </span>
            ) : undefined
          }
        >
          {isLoading ? (
            <SheetLoading rows={3} label="Loading domains" />
          ) : isError && !loaded ? (
            <SheetError
              title="Could not load domains"
              message={getErrorMessage(error)}
              onRetry={() => void refetch()}
            />
          ) : domains.length === 0 ? (
            <SheetEmpty
              title="No domains claimed yet"
              description="Add a company domain you control. We generate a DNS TXT record for you to publish, then verify it."
              action={
                <UiButton variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  Add domain
                </UiButton>
              }
            />
          ) : (
            <SheetTable columns={DOMAIN_COLUMNS} caption="Claimed domains and their verification state" minWidth={440}>
              {domains.map((domain) => {
                const isFocused = focused?.id === domain.id;
                const isChecking = verifyingDomain === domain.domain;
                return (
                  <SheetRow
                    key={domain.id}
                    onActivate={() => setFocusedId(domain.id)}
                    className={cn(isFocused && "bg-[var(--bg2)]/50")}
                  >
                    <SheetCell>
                      <RowTitle
                        title={
                          <button
                            type="button"
                            onClick={() => setFocusedId(domain.id)}
                            aria-current={isFocused ? "true" : undefined}
                            aria-label={`Show DNS record for ${domain.domain}`}
                            className="max-w-full truncate rounded-[2px] font-[family-name:var(--mono)] text-[12.5px] decoration-[var(--border2)] underline-offset-[3px] hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
                          >
                            {domain.domain}
                          </button>
                        }
                        badges={domain.isPrimary ? <Pill>Primary</Pill> : undefined}
                        subtitle={
                          domain.isVerified ? (
                            domain.verifiedAt ? (
                              <>
                                Verified <Timestamp value={domain.verifiedAt} />
                              </>
                            ) : (
                              "Verified"
                            )
                          ) : (
                            "Awaiting the DNS TXT record"
                          )
                        }
                      />
                    </SheetCell>
                    <SheetCell>
                      <Pill tone={domain.isVerified ? "green" : "amber"} dot={domain.isVerified}>
                        {domain.isVerified ? "Verified" : "Pending"}
                      </Pill>
                    </SheetCell>
                    <SheetCell className={HIDE_BELOW_SM}>
                      <span className="text-[12px] text-[var(--text2)]">
                        {domain.isVerified ? (domain.autoJoinEnabled ? "On" : "Off") : "—"}
                      </span>
                    </SheetCell>
                    <SheetCell className={HIDE_BELOW_MD}>
                      <span className={cn(MONO_VALUE, "text-[11.5px] text-[var(--text3)]")}>
                        {domain.lastVerificationCheckAt ? <Timestamp value={domain.lastVerificationCheckAt} /> : "Never"}
                      </span>
                    </SheetCell>
                    <SheetCell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!domain.isVerified && (
                          <UiButton variant="outline" size="sm" disabled={pending} onClick={() => verify(domain)}>
                            {isChecking && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                            {isChecking ? "Checking" : "Verify"}
                            <span className="sr-only"> {domain.domain}</span>
                          </UiButton>
                        )}
                        <RowActions label={`Actions for ${domain.domain}`} disabled={pending}>
                          <DropdownMenuItem onClick={() => openDialog("view", domain.id)}>View details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDialog("edit", domain.id)}>Edit metadata</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {domain.isVerified && (
                            <DropdownMenuItem onClick={() => verify(domain)}>Recheck DNS</DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            disabled={!domain.isVerified || domain.isPrimary}
                            onClick={() => action.mutate({ type: "primary", id: domain.id })}
                          >
                            <MenuItemLabel
                              reason={
                                domain.isPrimary
                                  ? "Already the primary domain"
                                  : !domain.isVerified
                                    ? "Verify the domain first"
                                    : undefined
                              }
                            >
                              Make primary
                            </MenuItemLabel>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!domain.isVerified}
                            onClick={() => action.mutate({ type: "auto", id: domain.id, enabled: !domain.autoJoinEnabled })}
                          >
                            <MenuItemLabel reason={domain.isVerified ? undefined : "Verify the domain first"}>
                              {domain.autoJoinEnabled ? "Turn off auto-join" : "Turn on auto-join"}
                            </MenuItemLabel>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(domain)}>
                            Remove domain
                          </DropdownMenuItem>
                        </RowActions>
                      </div>
                    </SheetCell>
                  </SheetRow>
                );
              })}
            </SheetTable>
          )}
        </Sheet>

        {focused && (
          <Panel
            title="DNS record"
            description={`The TXT record that proves ownership of ${focused.domain}.`}
            footer={
              <UiButton
                variant={focused.isVerified ? "outline" : "default"}
                disabled={pending}
                onClick={() => verify(focused)}
              >
                {verifyingDomain === focused.domain && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {focused.isVerified ? "Recheck DNS" : "Verify DNS"}
              </UiButton>
            }
          >
            {verifyingDomain ? (
              <DnsCheckStatus domain={verifyingDomain} />
            ) : (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_240px]">
                <div className="flex min-w-0 flex-col gap-5">
                  {focusedRecord ? (
                    <>
                      <Notice tone="amber" title="Copy this record now">
                        The verification value is shown for this creation session only. Publish it at your DNS provider,
                        then run Verify DNS on {focusedRecord.domain}.
                      </Notice>
                      <KeyValueGrid
                        columns={1}
                        items={[
                          {
                            label: "Record type",
                            value: <span className={MONO_VALUE}>{focusedRecord.dnsInstructions.recordType}</span>,
                          },
                          { label: "Host / name", value: <SecretField value={focusedRecord.dnsInstructions.host} /> },
                          { label: "TXT value", value: <SecretField value={focusedRecord.dnsInstructions.value} /> },
                        ]}
                      />
                      <div>
                        <CopyButton
                          value={`${focusedRecord.dnsInstructions.recordType} ${focusedRecord.dnsInstructions.host} ${focusedRecord.dnsInstructions.value}`}
                          label="Copy full record"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="max-w-[64ch] text-[13px] leading-[1.6] text-[var(--text2)]">
                        {focused.isVerified
                          ? "Ownership is proven. Keep the TXT record published and recheck DNS any time."
                          : "The verification value is shown once, when the domain is added. Publish that TXT record at your DNS provider, then select Verify DNS."}
                      </p>
                      <KeyValueGrid
                        items={[
                          { label: "Domain", value: <span className={MONO_VALUE}>{focused.domain}</span> },
                          {
                            label: "State",
                            value: (
                              <Pill tone={focused.isVerified ? "green" : "amber"} dot={focused.isVerified}>
                                {focused.isVerified ? "Verified" : "Pending"}
                              </Pill>
                            ),
                          },
                          focused.verificationMethod
                            ? { label: "Method", value: <span className={MONO_VALUE}>{focused.verificationMethod}</span> }
                            : { label: "Record type", value: <span className={MONO_VALUE}>TXT</span> },
                          focused.isVerified
                            ? {
                                label: "Verified",
                                value: focused.verifiedAt ? <Timestamp value={focused.verifiedAt} /> : "—",
                              }
                            : {
                                label: "Verification started",
                                value: focused.verificationStartedAt ? (
                                  <Timestamp value={focused.verificationStartedAt} />
                                ) : (
                                  "Not started"
                                ),
                              },
                          {
                            label: "Last checked",
                            value: focused.lastVerificationCheckAt ? (
                              <Timestamp value={focused.lastVerificationCheckAt} />
                            ) : (
                              "Never"
                            ),
                          },
                        ]}
                      />
                    </>
                  )}
                </div>
                <SetupSteps steps={steps} />
              </div>
            )}
          </Panel>
        )}
      </SplitShell>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add domain"
        description="Claim a domain you control, then publish the DNS record we generate."
        submitLabel="Add domain"
        pending={createPending}
        onSubmit={(form) => startTransition(() => createAction(form))}
      >
        <DialogField label="Domain name" name="domain" hint="Root domain without protocol, for example acme.com." required>
          <input
            id="domain"
            name="domain"
            required
            placeholder="acme.com"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className={fieldMonoClass}
          />
        </DialogField>
      </FormDialog>

      <FormDialog
        open={dialogMode === "edit"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title="Edit domain metadata"
        description={selectedDomain?.domain ?? "Loading domain information"}
        submitLabel="Save changes"
        pending={action.isPending || isSelectedDomainLoading || !selectedDomain}
        onSubmit={() => submitMetadataUpdate()}
        width="sm:max-w-[640px]"
      >
        {isSelectedDomainLoading || !selectedDomain ? (
          <DetailsLoading label="Loading domain details" />
        ) : (
          <>
            <DialogField label="Domain" name="domain-name">
              <input id="domain-name" name="domain-name" value={selectedDomain.domain} disabled readOnly className={fieldMonoClass} />
            </DialogField>
            <DialogField
              label="Metadata (JSON)"
              name="metadata"
              hint="Stored alongside the domain record and returned by the API."
            >
              <textarea
                id="metadata"
                name="metadata"
                rows={12}
                spellCheck={false}
                value={metadataDraft}
                onChange={(event) => setMetadataDraft(event.target.value)}
                className={cn(fieldTextareaClass, "font-[family-name:var(--mono)] text-[12px]")}
              />
            </DialogField>
          </>
        )}
      </FormDialog>

      <Dialog
        open={dialogMode === "view"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Domain details</DialogTitle>
            <DialogDescription>{selectedDomain?.domain ?? "Loading domain information"}</DialogDescription>
          </DialogHeader>

          {isSelectedDomainLoading || !selectedDomain ? (
            <DetailsLoading label="Loading domain details" />
          ) : (
            <div className="flex min-w-0 flex-col gap-5">
              <KeyValueGrid
                items={[
                  { label: "Domain", value: <span className={MONO_VALUE}>{selectedDomain.domain}</span> },
                  {
                    label: "State",
                    value: (
                      <Pill tone={selectedDomain.isVerified ? "green" : "amber"} dot={selectedDomain.isVerified}>
                        {selectedDomain.isVerified ? "Verified" : "Pending"}
                      </Pill>
                    ),
                  },
                  { label: "Primary", value: selectedDomain.isPrimary ? "Yes" : "No" },
                  { label: "Auto-join", value: selectedDomain.autoJoinEnabled ? "Enabled" : "Disabled" },
                  { label: "Created", value: <Timestamp value={selectedDomain.createdAt} /> },
                  { label: "Updated", value: <Timestamp value={selectedDomain.updatedAt} /> },
                ]}
              />
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[12px] text-[var(--text3)]">Metadata</p>
                <JsonViewer data={selectedDomain.metadata ?? {}} maxHeight={280} />
              </div>
            </div>
          )}

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remove domain"
        description="SSO routing and auto-join stop working for this domain immediately. Removal requires a fresh multi-factor check."
        confirmLabel="Remove domain"
        pending={action.isPending}
        onConfirm={() => {
          if (deleteTarget) action.mutate({ type: "delete", id: deleteTarget.id });
        }}
      >
        <p className="break-all font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{deleteTarget?.domain}</p>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
