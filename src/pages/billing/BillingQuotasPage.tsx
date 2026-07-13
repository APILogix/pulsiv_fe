import { useActionState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { QuotaRequest } from "@/modules/organizations/types/org.types";
import {
  PageHeader, SectionCard, Button, formatNumber, Field, SubmitButton, inputClass, textareaClass, InfiniteTable, StatusBadge, Timestamp
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Check, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function BillingQuotasPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  // Quotas overview query
  const { data: limits, isLoading: limitsLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageLimits"],
    queryFn: () => orgApi.getUsageLimits(activeOrgId!),
    enabled: !!activeOrgId,
  });

  // Quota requests history query
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: orgQueryKeys.quotaRequests(activeOrgId!),
    queryFn: () => orgApi.listQuotaRequests(activeOrgId!, { limit: 100 }),
    enabled: !!activeOrgId,
  });

  // Me query to check role for approvals
  const { data: me } = useQuery({
    queryKey: [...orgQueryKeys.members(activeOrgId!), "me"],
    queryFn: () => orgApi.getMe(activeOrgId!),
    enabled: !!activeOrgId,
  });

  // Review (Approve/Reject) mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, decision }: { requestId: string; decision: "approve" | "reject" }) => {
      if (!activeOrgId) throw new Error("No active org");
      if (decision === "approve") return orgApi.approveQuotaRequest(activeOrgId, requestId);
      return orgApi.rejectQuotaRequest(activeOrgId, requestId);
    },
    onSuccess: (_, variables) => {
      toast.success(`Quota request ${variables.decision}d`);
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.quotaRequests(activeOrgId!) });
      queryClient.invalidateQueries({ queryKey: [...orgQueryKeys.billing(activeOrgId!), "usageLimits"] }); // Refresh limits too
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to review quota request"),
  });

  // Create request state/action
  const [state, requestAction] = useActionState(
    async (_prevState: any, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active org" };
      try {
        const data = {
          quotaType: form.get("resource") as string,
          requestedLimit: parseInt(form.get("limit") as string, 10),
          currentLimit: 0,
          reason: form.get("justification") as string,
        };
        await orgApi.createQuotaRequest(activeOrgId, data);
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.quotaRequests(activeOrgId) });
        return { ok: true, resource: data.quotaType };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to submit request" };
      }
    },
    { ok: false, error: null, resource: undefined }
  );

  useEffect(() => {
    if (state.ok && state.resource) {
      toast.success(`Quota request submitted for ${state.resource}`);
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (limitsLoading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>;
  }

  const quotaCards = limits ? [
    { name: "Members", unit: "members", ...limits.limits.members },
    { name: "Environments", unit: "envs", ...limits.limits.environments },
    { name: "API Keys", unit: "keys", ...limits.limits.apiKeys },
    { name: "SSO Providers", unit: "providers", ...limits.limits.ssoProviders },
    { name: "SCIM Tokens", unit: "tokens", ...limits.limits.scimTokens },
    { name: "Events Monthly", unit: "events", ...limits.limits.eventsMonthly },
  ] : [];

  const canReview = me?.role === "owner";

  const columns: Column<QuotaRequest>[] = [
    { key: "resource", header: "Resource", width: "1fr", cell: (r) => <span className="truncate font-medium capitalize">{r.quotaType.replace('_', ' ')}</span> },
    { key: "current", header: "Current", width: "120px", align: "right", cell: (r) => <span className="tabular-nums text-[var(--text2)]">{formatNumber(r.currentLimit)}</span> },
    { key: "requested", header: "Requested", width: "120px", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.requestedLimit)}</span> },
    { key: "status", header: "Status", width: "110px", cell: (r) => <StatusBadge status={r.status as any} /> },
    { key: "reason", header: "Reason", width: "140px", cell: (r) => <span className="truncate text-[var(--text2)]" title={r.reason}>{r.reason}</span> },
    { key: "when", header: "When", width: "120px", cell: (r) => <Timestamp value={new Date(r.createdAt).getTime()} /> },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right" as const,
      cell: (r) => canReview && r.status === "pending" ? (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ requestId: r.id, decision: "approve" })}>
                <Check className="mr-2 h-4 w-4 text-[var(--green)]" /> Approve
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ requestId: r.id, decision: "reject" })} className="text-[var(--red)] focus:text-[var(--red)] focus:bg-[var(--red-bg)]">
                <X className="mr-2 h-4 w-4" /> Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader
        title="Quotas"
        description="Quota overview, usage levels, and increase requests."
      />

      {/* Quota Progress Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quotaCards.map((quota) => {
          const used = quota.used ?? 0;
          const limit = quota.limit ?? 0;
          const pct = limit > 0 ? (used / limit) * 100 : 0;
          const tone = pct > 90 ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)";
          return (
            <SectionCard key={quota.name}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text)]">{quota.name}</span>
                <span className="text-[12px] tabular-nums text-[var(--text3)]">
                  {formatNumber(used)} / {quota.limit === null ? "Unlimited" : formatNumber(limit)} {quota.unit}
                </span>
              </div>
              {"pending" in quota && typeof quota.pending === "number" ? (
                <div className="mt-2 text-xs text-[var(--text3)]">Pending: {formatNumber(quota.pending)}</div>
              ) : null}
              {"enabled" in quota && quota.enabled === false ? (
                <div className="mt-2 text-xs text-[var(--amber)]">Feature not enabled on the current plan</div>
              ) : null}
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--bg3)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: tone }} />
              </div>
            </SectionCard>
          );
        })}
      </div>

      {/* Request increase section */}
      <SectionCard title="Request a quota increase">
        <form action={requestAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Resource">
            <select name="resource" className={inputClass}>
              <option value="event_ingestion">Event ingestion</option>
              <option value="data_retention">Data retention</option>
              <option value="team_seats">Team seats</option>
              <option value="api_rate_limit">API rate limit</option>
            </select>
          </Field>
          <Field label="Requested limit">
            <input name="limit" type="number" required placeholder="5000000" className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Justification">
              <textarea name="justification" required className={textareaClass} placeholder="Why do you need this increase?" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Submit request</SubmitButton>
          </div>
        </form>
      </SectionCard>

      {/* History table */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--text)] px-1">Quota Requests History</h3>
        <InfiniteTable 
          className="min-h-[240px]" 
          loading={requestsLoading} 
          items={requests?.data || []} 
          queryKey={["quotaRequests-table", activeOrgId]} 
          columns={columns} 
          getKey={(r) => r.id} 
        />
      </div>
    </div>
  );
}
