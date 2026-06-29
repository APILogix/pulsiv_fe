import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { useInvoice } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, StatusBadge, Table, Tr, Td, Button, formatDate, demoSuccess, DetailSkeleton } from "@/shared/observe";

export default function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const navigate = useNavigate();
  const { data: inv, isLoading } = useInvoice(invoiceId);

  if (isLoading) return <DetailSkeleton />;
  if (!inv) return <div className="p-8 text-[var(--text2)]">Invoice not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to invoices</Button>
      <PageHeader
        title={inv.number}
        breadcrumbs={[{ label: "Billing" }, { label: "Invoices" }, { label: inv.number }]}
        actions={<><StatusBadge status={inv.status} /><Button variant="secondary" onClick={() => demoSuccess("Invoice downloaded")}><Download className="size-4" /> Download PDF</Button></>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Meta label="Issued" value={formatDate(inv.date)} />
        <Meta label="Due" value={formatDate(inv.dueDate)} />
        <Meta label="Payment" value={inv.paymentMethod ?? "—"} />
        <Meta label="Total" value={`$${inv.total}`} />
      </div>

      <SectionCard title="Line items" className="p-0">
        <Table headers={["Description", "Qty", "Unit price", "Amount"]}>
          {inv.lineItems.map((li, i) => (
            <Tr key={i}>
              <Td>{li.description}</Td>
              <Td className="tabular-nums text-[var(--text2)]">{li.quantity.toLocaleString()}</Td>
              <Td className="tabular-nums text-[var(--text2)]">${li.unitPrice}</Td>
              <Td className="font-semibold tabular-nums">${li.amount}</Td>
            </Tr>
          ))}
        </Table>
        <div className="flex flex-col items-end gap-1 border-t border-[var(--border)] p-4 text-[13px]">
          <div className="flex w-48 justify-between"><span className="text-[var(--text3)]">Subtotal</span><span className="tabular-nums text-[var(--text)]">${inv.subtotal}</span></div>
          <div className="flex w-48 justify-between"><span className="text-[var(--text3)]">Tax</span><span className="tabular-nums text-[var(--text)]">${inv.tax}</span></div>
          <div className="flex w-48 justify-between border-t border-[var(--border)] pt-1 font-semibold"><span>Total</span><span className="tabular-nums">${inv.total}</span></div>
        </div>
      </SectionCard>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-3">
      <div className="text-[11px] uppercase tracking-wider text-[var(--text3)]">{label}</div>
      <div className="mt-1 text-[13px] font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}
