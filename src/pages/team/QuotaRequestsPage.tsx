import { useActionState } from "react";
import { useQuotaRequests } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, Field, SubmitButton, inputClass, textareaClass, Timestamp, formatNumber, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { QuotaRequest } from "@/lib/dummy-data";

export default function QuotaRequestsPage() {
  const { data, isLoading } = useQuotaRequests();
  const requests = data ?? [];

  const [, requestAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Quota request submitted for ${form.get("resource")}`);
    return { ok: true };
  }, { ok: false });

  const columns: Column<QuotaRequest>[] = [
    { key: "resource", header: "Resource", width: "1fr", cell: (r) => <span className="truncate font-medium">{r.resource}</span> },
    { key: "current", header: "Current", width: "120px", align: "right", cell: (r) => <span className="tabular-nums text-[var(--text2)]">{formatNumber(r.currentLimit)}</span> },
    { key: "requested", header: "Requested", width: "120px", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.requestedLimit)}</span> },
    { key: "status", header: "Status", width: "110px", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "by", header: "By", width: "140px", cell: (r) => <span className="truncate text-[var(--text2)]">{r.requestedBy}</span> },
    { key: "when", header: "When", width: "120px", cell: (r) => <Timestamp value={r.requestedAt} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Quota Requests" description="Quota request review and approvals." />

      <SectionCard title="Request a quota increase">
        <form action={requestAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Resource"><select name="resource" className={inputClass}><option>Event ingestion</option><option>Data retention</option><option>Team seats</option><option>API rate limit</option></select></Field>
          <Field label="Requested limit"><input name="limit" type="number" placeholder="5000000" className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field label="Justification"><textarea name="justification" className={textareaClass} placeholder="Why do you need this increase?" /></Field></div>
          <div className="sm:col-span-2"><SubmitButton>Submit request</SubmitButton></div>
        </form>
      </SectionCard>

      <InfiniteTable className="flex-1" loading={isLoading} items={requests} queryKey={["quotaRequests"]} columns={columns} getKey={(r) => r.id} />
    </FillPage>
  );
}
