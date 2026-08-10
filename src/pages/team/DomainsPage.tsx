import { useActionState, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Eye,
  Globe2,
  MoreHorizontal,
  PencilLine,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Star,
  Trash2,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { getErrorCode, getErrorMessage } from "@/infrastructure/api-client/error.interceptor";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { CreatedVerifiedDomain, VerifiedDomain } from "@/modules/organizations/types/org.types";
import { Button, CardSkeleton, CopyButton, Field, StatusBadge, SubmitButton, Timestamp, inputClass } from "@/shared/observe";
import {
  EmptyPanel,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { DomainVerificationAnimation } from "@/shared/components/animations/DomainVerificationAnimation";

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

function safeJson(value: Record<string, unknown>) {
  return JSON.stringify(value ?? {}, null, 2);
}

// ── one-off local component: full-screen DNS verification overlay ──
function DnsVerificationOverlay({ domain }: { domain: string }) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-7">
        <DomainVerificationAnimation isVerified={false} />
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-[family-name:var(--display)] text-[19px] font-semibold text-[var(--text)]">Checking DNS</h2>
          <p className="max-w-[320px] text-[13px] text-[var(--text2)]">
            Looking up the TXT record for{" "}
            <span className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{domain}</span>
          </p>
        </div>
        <div className="pulse-sweep relative h-1 w-[220px] overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true" />
        <p className="text-[12px] text-[var(--text3)]">DNS propagation can take a few minutes</p>
      </div>
    </div>
  );
}

// ── one-off local component: one domain row inside the list panel ──
function DomainRow({
  domain,
  pending,
  onVerify,
  onRecheck,
  onPrimary,
  onAutoJoin,
  onDelete,
  onView,
  onEdit,
}: {
  domain: VerifiedDomain;
  pending: boolean;
  onVerify: () => void;
  onRecheck: () => void;
  onPrimary: () => void;
  onAutoJoin: (next: boolean) => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
}) {
  return (
    <Row className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bg2)] text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]"
          >
            <Globe2 className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-[family-name:var(--mono)] text-[13.5px] font-medium text-[var(--text)]">
                {domain.domain}
              </h3>
              {domain.isPrimary && <Pill tone="brand">Primary</Pill>}
              <StatusBadge status={domain.isVerified ? "verified" : "pending"} />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-[var(--text2)]">
              {domain.isVerified ? (
                <>
                  <CheckCircle2 className="size-3.5 text-[var(--green)]" aria-hidden="true" />
                  Verified {domain.verifiedAt ? <Timestamp value={domain.verifiedAt} /> : null}
                </>
              ) : (
                <>
                  <TriangleAlert className="size-3.5 text-[var(--amber)]" aria-hidden="true" />
                  Awaiting the DNS TXT record
                </>
              )}
              {domain.lastVerificationCheckAt && (
                <span className="text-[var(--text3)]">
                  · last checked <Timestamp value={domain.lastVerificationCheckAt} />
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {domain.isVerified && !domain.isPrimary && (
            <Button variant="secondary" disabled={pending} onClick={onPrimary}>
              <Star className="size-3.5" aria-hidden="true" />
              Make primary
            </Button>
          )}
          {domain.isVerified ? (
            <Button variant="secondary" disabled={pending} onClick={onRecheck}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Recheck DNS
            </Button>
          ) : (
            <Button variant="primary" disabled={pending} onClick={onVerify}>
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Verify DNS
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-9 px-0">
                <span className="sr-only">Domain actions</span>
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[190px]">
              <DropdownMenuItem disabled={pending} onClick={onView}>
                <Eye className="mr-2 size-4" aria-hidden="true" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem disabled={pending} onClick={onEdit}>
                <PencilLine className="mr-2 size-4" aria-hidden="true" />
                Edit metadata
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={pending} onClick={domain.isVerified ? onRecheck : onVerify}>
                <RefreshCw className="mr-2 size-4" aria-hidden="true" />
                {domain.isVerified ? "Recheck DNS" : "Verify DNS"}
              </DropdownMenuItem>
              {domain.isVerified && (
                <DropdownMenuItem disabled={pending} onClick={() => onAutoJoin(!domain.autoJoinEnabled)}>
                  <UserPlus className="mr-2 size-4" aria-hidden="true" />
                  {domain.autoJoinEnabled ? "Disable auto-join" : "Enable auto-join"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pending}
                onClick={onDelete}
                className="text-[var(--red)] focus:bg-[var(--red-bg)] focus:text-[var(--red)]"
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Remove domain
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {domain.isVerified && (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
          <SettingRow
            label="Auto-join"
            description="New users signing up with this email domain join the organization automatically."
            htmlFor={`auto-join-${domain.id}`}
          >
            <Toggle
              id={`auto-join-${domain.id}`}
              label={`Auto-join for ${domain.domain}`}
              checked={domain.autoJoinEnabled}
              disabled={pending}
              onChange={onAutoJoin}
            />
          </SettingRow>
        </div>
      )}
    </Row>
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

  const { data, isLoading, isError, error } = useQuery({
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

  const [state, createAction] = useActionState(
    async (_prev: { error: string | null }, form: FormData) => {
      if (!activeOrgId) return { error: "No active organization" };
      try {
        const domain = String(form.get("domain") ?? "")
          .trim()
          .toLowerCase();
        const result = await orgApi.createDomain(activeOrgId, { domain });
        setCreated(result);
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

  const domains = data?.data ?? [];
  const verified = domains.filter((domain) => domain.isVerified).length;
  const autoJoin = domains.filter((domain) => domain.autoJoinEnabled).length;
  const pendingCount = domains.length - verified;

  const facts: HeroFact[] = [
    { label: "Domains", value: domains.length, icon: Globe2 },
    { label: "Verified", value: verified, tone: verified > 0 ? "green" : "neutral", icon: CheckCircle2 },
    { label: "Pending DNS", value: pendingCount, tone: pendingCount > 0 ? "amber" : "neutral", icon: TriangleAlert },
    { label: "Auto-join enabled", value: autoJoin, tone: autoJoin > 0 ? "blue" : "neutral", icon: UserPlus },
  ];

  const steps: SetupStepItem[] = [
    { title: "Add the domain", description: "Enter the company domain you control, for example acme.com.", done: domains.length > 0 },
    { title: "Publish the TXT record", description: "Copy the host and value into your DNS provider.", done: verified > 0 },
    { title: "Run verification", description: "Select Verify DNS. Propagation can take a few minutes.", done: verified > 0 },
    { title: "Choose a primary domain", description: "The primary domain is used for SSO discovery.", done: domains.some((domain) => domain.isPrimary) },
    { title: "Enable auto-join", description: "Optional. Signups on a verified domain join automatically.", done: autoJoin > 0 },
  ];

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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Identity"
          title="Verified domains"
          description="Prove company-domain ownership before enabling SSO discovery or automatic membership."
          icon={Globe2}
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
        title="Verified domains"
        description="Prove company-domain ownership before enabling SSO discovery or automatic membership."
        icon={Globe2}
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {isError && (
        <Notice tone="red" icon={TriangleAlert} title="Unable to load domains">
          {getErrorMessage(error)}
        </Notice>
      )}

      {stepUpBlocked && (
        <Notice tone="amber" icon={ShieldCheck} title="Additional verification required">
          {STEP_UP_MESSAGE} Auto-join, primary domain, and domain removal are all step-up protected.
        </Notice>
      )}

      <SplitShell
        rail={
          <>
            <Panel title="Verification guide" description="What to expect while claiming a domain." icon={ShieldCheck} tone="ai">
              <SetupSteps steps={steps} />
            </Panel>
            <Panel title="Record type" description="Sentinel verifies ownership with a single DNS TXT record." icon={Server} tone="brand">
              <dl className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[12.5px] text-[var(--text2)]">Record type</dt>
                  <dd className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">TXT</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[12.5px] text-[var(--text2)]">Propagation</dt>
                  <dd className="text-[12.5px] text-[var(--text)]">Usually under 5 minutes</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[12.5px] text-[var(--text2)]">Re-checks</dt>
                  <dd className="text-[12.5px] text-[var(--text)]">On demand, any time</dd>
                </div>
              </dl>
            </Panel>
          </>
        }
      >
        <Panel
          title="Add a company domain"
          description="Claim a domain you control, then publish the DNS record we generate."
          icon={Plus}
          tone="brand"
        >
          <form action={createAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Field label="Domain name" hint="Root domain without protocol, for example acme.com.">
                <input
                  name="domain"
                  required
                  placeholder="acme.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`}
                />
              </Field>
            </div>
            <SubmitButton className="h-10 w-full sm:w-auto">Create verification</SubmitButton>
          </form>

          {created && (
            <div className="mt-6 flex flex-col gap-4">
              <Notice tone="amber" icon={TriangleAlert} title="Copy this record now">
                The verification value is shown for this creation session only. Publish it at your DNS provider, then run
                Verify DNS on {created.domain}.
              </Notice>
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretField label="Host / name" value={created.dnsInstructions.host} />
                <SecretField label="TXT value" value={created.dnsInstructions.value} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text3)]">
                <span className="font-[family-name:var(--mono)]">
                  {created.dnsInstructions.recordType} {created.dnsInstructions.host}
                </span>
                <CopyButton
                  value={`${created.dnsInstructions.recordType} ${created.dnsInstructions.host} ${created.dnsInstructions.value}`}
                  label="Copy full record"
                />
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Your domains"
          description="Verified domains unlock SSO routing and optional auto-join."
          icon={Globe2}
          tone="brand"
          bodyClassName="p-0"
        >
          {domains.length === 0 ? (
            <EmptyPanel
              className="rounded-none border-0 border-t border-dashed"
              icon={Globe2}
              title="No domains claimed yet"
              description="Add a company domain above to start DNS verification."
            />
          ) : (
            <RowStack>
              {domains.map((domain) => (
                <DomainRow
                  key={domain.id}
                  domain={domain}
                  pending={action.isPending}
                  onVerify={() => action.mutate({ type: "verify", id: domain.id, domainName: domain.domain })}
                  onRecheck={() => action.mutate({ type: "recheck", id: domain.id, domainName: domain.domain })}
                  onPrimary={() => action.mutate({ type: "primary", id: domain.id })}
                  onAutoJoin={(next) => action.mutate({ type: "auto", id: domain.id, enabled: next })}
                  onView={() => openDialog("view", domain.id)}
                  onEdit={() => openDialog("edit", domain.id)}
                  onDelete={() => setDeleteTarget(domain)}
                />
              ))}
            </RowStack>
          )}
        </Panel>
      </SplitShell>

      {verifyingDomain && <DnsVerificationOverlay domain={verifyingDomain} />}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edit domain metadata" : "Domain details"}</DialogTitle>
            <DialogDescription>{selectedDomain?.domain ?? "Loading domain information"}</DialogDescription>
          </DialogHeader>

          {isSelectedDomainLoading || !selectedDomain ? (
            <div className="flex min-h-[160px] flex-col gap-3">
              <CardSkeleton />
            </div>
          ) : dialogMode === "edit" ? (
            <div className="grid gap-4">
              <Field label="Domain">
                <input value={selectedDomain.domain} disabled readOnly className={`${inputClass} font-[family-name:var(--mono)] text-[12.5px]`} />
              </Field>
              <Field label="Metadata (JSON)" hint="Stored alongside the domain record and returned by the API.">
                <Textarea
                  rows={12}
                  value={metadataDraft}
                  onChange={(event) => setMetadataDraft(event.target.value)}
                  className="font-[family-name:var(--mono)] text-[12.5px]"
                />
              </Field>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Domain</dt>
                  <dd className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{selectedDomain.domain}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">State</dt>
                  <dd><StatusBadge status={selectedDomain.isVerified ? "verified" : "pending"} /></dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Primary</dt>
                  <dd className="text-[13px] text-[var(--text)]">{selectedDomain.isPrimary ? "Yes" : "No"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Auto-join</dt>
                  <dd className="text-[13px] text-[var(--text)]">{selectedDomain.autoJoinEnabled ? "Enabled" : "Disabled"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Created</dt>
                  <dd className="text-[13px] text-[var(--text)]"><Timestamp value={selectedDomain.createdAt} /></dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Updated</dt>
                  <dd className="text-[13px] text-[var(--text)]"><Timestamp value={selectedDomain.updatedAt} /></dd>
                </div>
              </dl>
              <Field label="Metadata">
                <Textarea rows={10} value={safeJson(selectedDomain.metadata)} readOnly className="font-[family-name:var(--mono)] text-[12.5px]" />
              </Field>
            </div>
          )}

          <DialogFooter showCloseButton={dialogMode === "view"}>
            {dialogMode === "edit" && (
              <>
                <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                <Button variant="primary" onClick={submitMetadataUpdate} disabled={action.isPending || isSelectedDomainLoading}>
                  Save changes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove domain</DialogTitle>
            <DialogDescription>
              SSO routing and auto-join stop working for this domain immediately. Removal requires a fresh multi-factor
              check.
            </DialogDescription>
          </DialogHeader>
          <p className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{deleteTarget?.domain}</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={action.isPending}
              onClick={() => {
                if (deleteTarget) action.mutate({ type: "delete", id: deleteTarget.id });
              }}
            >
              Remove domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
