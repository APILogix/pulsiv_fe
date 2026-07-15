import { useActionState, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Globe2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Server,
  Plus,
  AlertCircle,
  Eye,
  PencilLine
} from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { CreatedVerifiedDomain, VerifiedDomain } from "@/modules/organizations/types/org.types";
import {
  Button,
  CopyButton,
  Field,
  PageHeader,
  SubmitButton,
  inputClass,
} from "@/shared/observe";
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

function DnsVerificationOverlay({ domain }: { domain: string }) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8">
        <DomainVerificationAnimation isVerified={false} />

        {/* Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-semibold text-[var(--text)]">Verifying DNS</h2>
          <p className="max-w-[300px] text-[14px] text-[var(--text2)]">
            Checking TXT records for <span className="font-medium text-[var(--text)]">{domain}</span>...
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-[200px] overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: "60%", animation: "pulse-fast 1s ease-in-out infinite" }} />
        </div>

        <p className="text-[12px] text-[var(--text3)]">
          Please wait — this may take a few seconds
        </p>
      </div>
    </div>
  );
}

function DomainCard({
  domain,
  onVerify,
  onPrimary,
  onAutoJoin,
  onDelete,
  onView,
  onEdit,
  pending,
}: {
  domain: VerifiedDomain;
  onVerify: () => void;
  onPrimary: () => void;
  onAutoJoin: () => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
  pending: boolean;
}) {
  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] transition-all hover:border-[var(--border-hover)] hover:shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bg2)] text-[var(--text2)] transition-colors group-hover:bg-[var(--brand)]/10 group-hover:text-[var(--brand)]">
            <Globe2 className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15px] font-medium tracking-tight text-[var(--text)]">
                {domain.domain}
              </h2>
              {domain.isPrimary && (
                <span className="inline-flex items-center rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[var(--brand)] uppercase">
                  Primary
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--text2)]">
              {domain.isVerified ? (
                <>
                  <CheckCircle2 className="size-3.5 text-[var(--green)]" />
                  Verified {domain.verifiedAt ? new Date(domain.verifiedAt).toLocaleDateString() : ""}
                </>
              ) : (
                <>
                  <AlertCircle className="size-3.5 text-[var(--amber)]" />
                  Awaiting DNS verification
                </>
              )}
            </p>
            {domain.isVerified && domain.autoJoinEnabled && (
              <p className="mt-2 text-[12px] text-[var(--text3)]">
                Auto-join is active for users signing up with this domain.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {domain.isVerified && !domain.isPrimary && (
            <Button variant="outline" className="h-8" disabled={pending} onClick={onPrimary}>
              <Star className="mr-1.5 size-3.5" />
              Make primary
            </Button>
          )}
          {!domain.isVerified && (
            <Button variant="secondary" className="h-8" disabled={pending} onClick={onVerify}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Verify DNS
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem disabled={pending} onClick={onView}>
                <Eye className="mr-2 size-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem disabled={pending} onClick={onEdit}>
                <PencilLine className="mr-2 size-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={pending} onClick={onVerify}>
                <RefreshCw className="mr-2 size-4" />
                {domain.isVerified ? "Recheck DNS" : "Verify DNS"}
              </DropdownMenuItem>
              {domain.isVerified && (
                <DropdownMenuItem disabled={pending} onClick={onAutoJoin}>
                  {domain.autoJoinEnabled ? "Disable auto-join" : "Enable auto-join"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pending}
                onClick={onDelete}
                className="text-[var(--red)] focus:bg-[var(--red-bg)] focus:text-[var(--red)]"
              >
                <Trash2 className="mr-2 size-4" />
                Remove domain
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}

function safeJson(value: Record<string, unknown>) {
  return JSON.stringify(value ?? {}, null, 2);
}

export default function DomainsPage() {
  const { activeOrgId } = useOrganizations();
  const qc = useQueryClient();
  const [created, setCreated] = useState<CreatedVerifiedDomain | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DomainDialogMode | null>(null);
  const [metadataDraft, setMetadataDraft] = useState("{}");

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
    mutationFn: async ({
      type,
      id,
      enabled,
      metadata,
      domainName: _domainName,
    }: {
      type: "verify" | "primary" | "auto" | "delete" | "edit";
      id: string;
      enabled?: boolean;
      metadata?: Record<string, unknown>;
      domainName?: string;
    }) => {
      if (!activeOrgId) throw new Error("No active organization");
      if (type === "verify") return orgApi.verifyDomain(activeOrgId, id);
      if (type === "primary") return orgApi.makePrimaryDomain(activeOrgId, id);
      if (type === "auto") return orgApi.setDomainAutoJoin(activeOrgId, id, !!enabled);
      if (type === "edit") return orgApi.updateDomain(activeOrgId, id, { metadata: metadata ?? {} });
      return orgApi.deleteDomain(activeOrgId, id);
    },
    onMutate: ({ type, domainName }) => {
      if (type === "verify" && domainName) {
        setVerifyingDomain(domainName);
      }
    },
    onSuccess: (_, v) => {
      setVerifyingDomain(null);
      if (v.type === "edit") {
        setDialogMode(null);
        setSelectedDomainId(null);
      }
      toast.success(v.type === "delete" ? "Domain removed" : "Domain updated");
      invalidate();
    },
    onError: (e: any) => {
      setVerifyingDomain(null);
      toast.error(e?.response?.data?.error?.message ?? e?.message ?? "Domain action failed");
    },
  });

  const [state, createAction] = useActionState(
    async (_: unknown, form: FormData) => {
      if (!activeOrgId) return { error: "No active organization" };
      try {
        const domain = String(form.get("domain") ?? "")
          .trim()
          .toLowerCase();
        const result = await orgApi.createDomain(activeOrgId, { domain });
        setCreated(result);
        invalidate();
        form.set("domain", ""); // clear input
        return { error: null };
      } catch (e: any) {
        return {
          error: e?.response?.data?.error?.message ?? "Unable to add domain",
        };
      }
    },
    { error: null as string | null }
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

  if (isLoading)
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--brand)]" />
      </div>
    );

  if (isError) {
    const message =
      (error as any)?.response?.data?.error?.message ??
      (error as Error)?.message ??
      "Unable to load domains";
    return (
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4 rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-6">
        <PageHeader
          title="Verified Domains"
          description="Prove company-domain ownership before enabling SSO discovery or automatic membership."
        />
        <div className="rounded-[12px] border border-[var(--red)]/20 bg-[var(--red-bg)] p-4 text-[13px] text-[var(--text2)]">
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] w-full flex flex-col gap-10 pb-20">
      <PageHeader
        title="Verified Domains"
        description="Prove company-domain ownership before enabling SSO discovery or automatic membership."
      />

      {/* Add Domain Section */}
      <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--brand)]/10 text-[var(--brand)]">
            <Plus className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Add a company domain</h3>
            <p className="text-[13px] text-[var(--text2)]">
              Verify ownership to claim this domain for your organization.
            </p>
          </div>
        </div>

        <form action={createAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label="Domain Name">
              <input
                name="domain"
                required
                placeholder="acme.com"
                autoCapitalize="none"
                autoCorrect="off"
                className={inputClass}
              />
            </Field>
          </div>
          <SubmitButton className="h-10 w-full sm:w-auto">
            <ShieldCheck className="mr-2 size-4" />
            Create verification
          </SubmitButton>
        </form>

        {created && (
          <div className="mt-8 animate-in fade-in slide-in-from-top-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server className="size-4 text-[var(--brand)]" />
              <h4 className="font-semibold text-[var(--text)]">Publish DNS TXT record</h4>
            </div>
            <p className="mb-5 text-[13px] leading-relaxed text-[var(--text2)]">
              Add this record at your DNS provider, then select “Verify DNS” on the domain card below.
              <br />
              <span className="font-medium text-[var(--amber)]">
                Important: This token is shown only for this creation session.
              </span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] p-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">
                  Host / Name
                </div>
                <CopyButton
                  value={created.dnsInstructions.host}
                  label={created.dnsInstructions.host}
                />
              </div>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] p-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">
                  TXT Value
                </div>
                <CopyButton
                  value={created.dnsInstructions.value}
                  label="Copy verification value"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Domain List Section */}
      <section className="flex flex-col gap-4">
        <h3 className="font-semibold text-[var(--text)]">Your Domains</h3>
        
        {domains.length > 0 ? (
          <div className="grid gap-4">
            {domains.map((d) => (
              <DomainCard
                key={d.id}
                domain={d}
                pending={action.isPending}
                onVerify={() => action.mutate({ type: "verify", id: d.id, domainName: d.domain })}
                onPrimary={() => action.mutate({ type: "primary", id: d.id })}
                onAutoJoin={() =>
                  action.mutate({ type: "auto", id: d.id, enabled: !d.autoJoinEnabled })
                }
                onView={() => openDialog("view", d.id)}
                onEdit={() => openDialog("edit", d.id)}
                onDelete={() => {
                  if (confirm(`Are you sure you want to remove ${d.domain}?`)) {
                    action.mutate({ type: "delete", id: d.id });
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--bg1)] py-16 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--bg2)] text-[var(--text3)]">
              <Globe2 className="size-6" />
            </div>
            <h4 className="font-medium text-[var(--text)]">No domains added</h4>
            <p className="mt-1 text-[13px] text-[var(--text2)] max-w-[280px]">
              Add a company domain above to start the verification process.
            </p>
          </div>
        )}
      </section>

      {/* DNS Verification Overlay */}
      {verifyingDomain && <DnsVerificationOverlay domain={verifyingDomain} />}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edit domain details" : "Domain details"}</DialogTitle>
            <DialogDescription>
              {selectedDomain?.domain ?? "Loading domain information"}
            </DialogDescription>
          </DialogHeader>

          {isSelectedDomainLoading || !selectedDomain ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
            </div>
          ) : dialogMode === "edit" ? (
            <div className="grid gap-4">
              <Field label="Domain">
                <input value={selectedDomain.domain} disabled className={inputClass} />
              </Field>
              <Field label="Metadata (JSON)">
                <Textarea
                  rows={12}
                  value={metadataDraft}
                  onChange={(e) => setMetadataDraft(e.target.value)}
                  className="font-mono text-sm"
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-3 text-[13px] text-[var(--text2)]">
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><span className="text-[var(--text3)]">Domain:</span> {selectedDomain.domain}</div>
                  <div><span className="text-[var(--text3)]">Verified:</span> {selectedDomain.isVerified ? "Yes" : "No"}</div>
                  <div><span className="text-[var(--text3)]">Primary:</span> {selectedDomain.isPrimary ? "Yes" : "No"}</div>
                  <div><span className="text-[var(--text3)]">Auto-join:</span> {selectedDomain.autoJoinEnabled ? "Enabled" : "Disabled"}</div>
                  <div><span className="text-[var(--text3)]">Created:</span> {new Date(selectedDomain.createdAt).toLocaleString()}</div>
                  <div><span className="text-[var(--text3)]">Updated:</span> {new Date(selectedDomain.updatedAt).toLocaleString()}</div>
                </div>
              </div>
              <Field label="Metadata">
                <Textarea rows={12} value={safeJson(selectedDomain.metadata)} readOnly className="font-mono text-sm" />
              </Field>
            </div>
          )}

          <DialogFooter showCloseButton={dialogMode === "view"}>
            {dialogMode === "edit" && (
              <>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={submitMetadataUpdate} disabled={action.isPending || isSelectedDomainLoading}>
                  Save changes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
