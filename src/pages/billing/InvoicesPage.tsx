import { useNavigate } from "react-router";
import { useInvoices } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, Timestamp, Button, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Invoice } from "@/lib/dummy-data";

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useInvoices();
  const invoices = data ?? [];

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Number", width: "1fr", cell: (i) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{i.number}</span> },
    { key: "date", header: "Date", width: "130px", cell: (i) => <Timestamp value={i.date} /> },
    { key: "amount", header: "Amount", width: "110px", align: "right", cell: (i) => <span className="font-semibold tabular-nums">${i.total}</span> },
    { key: "status", header: "Status", width: "110px", cell: (i) => <StatusBadge status={i.status} /> },
    { key: "due", header: "Due", width: "130px", cell: (i) => <Timestamp value={i.dueDate} /> },
    { key: "actions", header: "", width: "120px", cell: (i) => <div onClick={(e) => e.stopPropagation()}><Button variant="ghost" onClick={() => demoSuccess(`Downloaded ${i.number}`)}>Download</Button></div> },
  ];

  return (
    <FillPage>
      <PageHeader title="Invoices" description="Invoice history and payment actions." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Invoices" value={invoices.length} />
        <KpiCard label="Paid" value={invoices.filter((i) => i.status === "paid").length} />
        <KpiCard label="Open" value={invoices.filter((i) => i.status === "open").length} />
        <KpiCard label="Overdue" value={invoices.filter((i) => i.status === "overdue").length} trend="down" />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={invoices}
        queryKey={["invoices"]}
        columns={columns}
        getKey={(i) => i.id}
        onRowClick={(i) => navigate(`/billing/invoices/${i.id}`)}
      />
    </FillPage>
  );
}
