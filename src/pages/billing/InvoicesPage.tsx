import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Invoice } from "@/modules/organizations/types/org.types";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, Timestamp, Button,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { toast } from "sonner";

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useOrganizations();

  const { data: invoices, isLoading } = useQuery({
    queryKey: orgQueryKeys.invoices(activeOrgId!),
    queryFn: () => orgApi.listInvoices(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const items = invoices || [];

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Number", width: "1fr", cell: (i) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{i.number}</span> },
    { key: "date", header: "Date", width: "130px", cell: (i) => <Timestamp value={new Date(i.issueDate).getTime()} /> },
    { key: "amount", header: "Amount", width: "110px", align: "right", cell: (i) => <span className="font-semibold tabular-nums">${i.amount.toFixed(2)}</span> },
    { key: "status", header: "Status", width: "110px", cell: (i) => <StatusBadge status={i.status as any} /> },
    { key: "due", header: "Due", width: "130px", cell: (i) => <Timestamp value={new Date(i.dueDate).getTime()} /> },
    { key: "actions", header: "", width: "120px", cell: (i) => <div onClick={(e) => e.stopPropagation()}><Button variant="ghost" onClick={() => { if (i.pdfUrl) { window.open(i.pdfUrl, '_blank'); } else { toast.info("PDF not available"); } }}>Download</Button></div> },
  ];

  return (
    <FillPage>
      <PageHeader title="Invoices" description="Invoice history and payment actions." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Invoices" value={items.length} />
        <KpiCard label="Paid" value={items.filter((i) => i.status === "paid").length} />
        <KpiCard label="Open" value={items.filter((i) => i.status === "open").length} />
        <KpiCard label="Overdue" value={items.filter((i) => i.status === "open" && new Date(i.dueDate) < new Date()).length} trend="down" />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={items}
        queryKey={["invoices-table", activeOrgId]}
        columns={columns}
        getKey={(i) => i.id}
        onRowClick={(i) => navigate(`/billing/invoices/${i.id}`)}
      />
    </FillPage>
  );
}
