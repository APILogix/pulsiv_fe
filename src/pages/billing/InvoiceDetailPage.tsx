import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { PageHeader, SectionCard, StatusBadge, Table, Tr, Td, Button, formatDate, DetailSkeleton } from "@/shared/observe";
import { toast } from "sonner";

export default function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const navigate = useNavigate();
  const { activeOrgId } = useOrganizations();

  const { data: inv, isLoading } = useQuery({
    queryKey: [...orgQueryKeys.invoices(activeOrgId!), invoiceId],
    queryFn: () => orgApi.getInvoice(activeOrgId!, invoiceId),
    enabled: !!activeOrgId && !!invoiceId,
  });

  if (isLoading) return <DetailSkeleton />;
  if (!inv) return <div className="p-8 text-[var(--text2)]">Invoice not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4 mr-2" /> Back to invoices</Button>
      </div>
      <PageHeader
        title={inv.number}
        breadcrumbs={[{ label: "Billing" }, { label: "Invoices" }, { label: inv.number }]}
        actions={<><StatusBadge status={inv.status as any} /><Button variant="secondary" onClick={() => { if (inv.pdfUrl) { window.open(inv.pdfUrl, '_blank'); } else { toast.info("PDF not available"); } }}><Download className="size-4 mr-2" /> Download PDF</Button></>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Meta label="Issued" value={formatDate(new Date(inv.issueDate).getTime())} />
        <Meta label="Due" value={formatDate(new Date(inv.dueDate).getTime())} />
        <Meta label="Payment" value="—" />
        <Meta label="Total" value={`$${inv.amount.toFixed(2)}`} />
      </div>

      <SectionCard title="Line items" className="p-0">
        <Table headers={["Description", "Amount"]}>
          {(inv.items || []).map((li) => (
            <Tr key={li.description}>
              <Td>{li.description}</Td>
              <Td className="font-semibold tabular-nums">${li.amount.toFixed(2)}</Td>
            </Tr>
          ))}
        </Table>
        <div className="flex flex-col items-end gap-1 border-t border-[var(--border)] p-4 text-[13px]">
          <div className="flex w-48 justify-between border-t border-[var(--border)] pt-1 font-semibold"><span>Total</span><span className="tabular-nums">${inv.amount.toFixed(2)}</span></div>
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
