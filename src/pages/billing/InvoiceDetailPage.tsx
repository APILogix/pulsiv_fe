import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Receipt, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Invoice } from "@/modules/organizations/types/org.types";
import {
  Button,
  CopyButton,
  DetailSkeleton,
  StatusBadge,
  Table,
  Td,
  Tr,
  formatDate,
} from "@/shared/observe";
import {
  EmptyPanel,
  KeyValueGrid,
  Notice,
  PageHero,
  Panel,
  type Crumb,
  type KeyValueItem,
} from "@/shared/ui/pulse";

const CRUMBS: Crumb[] = [
  { label: "Billing", to: "/billing" },
  { label: "Invoices", to: "/billing/invoices" },
];

const LINE_ITEM_HEADERS = ["Description", "Amount"];

const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function isOverdue(invoice: Invoice) {
  return invoice.status === "open" && new Date(invoice.dueDate).getTime() < Date.now();
}

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

  if (!inv) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero eyebrow="Invoice" title="Invoice not found" icon={Receipt} breadcrumbs={CRUMBS} />
        <Notice tone="red" icon={TriangleAlert} title="We could not load this invoice">
          The invoice may have been removed, or it belongs to another organization.
        </Notice>
      </div>
    );
  }

  const status = isOverdue(inv) ? "overdue" : inv.status;
  const lineItems = inv.items ?? [];
  const lineItemTotal = lineItems.reduce((total, item) => total + item.amount, 0);
  const crumbs: Crumb[] = [...CRUMBS, { label: inv.number }];

  const summaryItems: KeyValueItem[] = [
    {
      label: "Invoice number",
      value: (
        <span className="flex items-center gap-2">
          <span className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{inv.number}</span>
          <CopyButton value={inv.number} label="Copy" />
        </span>
      ),
    },
    { label: "Status", value: <StatusBadge status={status} /> },
    {
      label: "Issued",
      value: <span className="tabular-nums">{formatDate(inv.issueDate)}</span>,
    },
    {
      label: "Due",
      value: <span className="tabular-nums">{formatDate(inv.dueDate)}</span>,
    },
    {
      label: "Amount due",
      value: (
        <span className="font-[family-name:var(--mono)] text-[13px] font-semibold tabular-nums text-[var(--text)]">
          {CURRENCY.format(inv.amount)}
        </span>
      ),
    },
    {
      label: "Receipt",
      value: inv.pdfUrl ? (
        <span className="text-[var(--text)]">PDF available</span>
      ) : (
        <span className="text-[var(--text3)]">No PDF issued</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Invoice"
        title={inv.number}
        description={`Issued ${formatDate(inv.issueDate)} · due ${formatDate(inv.dueDate)}`}
        icon={Receipt}
        breadcrumbs={crumbs}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
            <StatusBadge status={status} />
            <Button
              variant="primary"
              onClick={() => {
                if (inv.pdfUrl) {
                  window.open(inv.pdfUrl, "_blank");
                  return;
                }
                toast.info("PDF not available");
              }}
            >
              <Download className="size-4" aria-hidden="true" />
              Download PDF
            </Button>
          </>
        }
      />

      <Panel title="Summary" description="Billing details recorded for this invoice." icon={FileText}>
        <KeyValueGrid items={summaryItems} columns={3} />
      </Panel>

      <Panel
        title="Line items"
        description="Charges that make up this invoice."
        icon={Receipt}
        bodyClassName="p-0"
        footer={
          <span className="flex items-baseline gap-6">
            <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--text3)]">Total</span>
            <span className="font-[family-name:var(--mono)] text-[14px] font-semibold tabular-nums text-[var(--text)]">
              {CURRENCY.format(inv.amount)}
            </span>
          </span>
        }
      >
        {lineItems.length === 0 ? (
          <div className="p-5">
            <EmptyPanel
              icon={Receipt}
              title="No line items"
              description="This invoice was issued without itemised charges."
            />
          </div>
        ) : (
          <>
            <Table headers={LINE_ITEM_HEADERS} maxHeight="40vh">
              {lineItems.map((item) => (
                <Tr key={item.description}>
                  <Td className="text-[13px]">{item.description}</Td>
                  <Td className="font-[family-name:var(--mono)] text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                    {CURRENCY.format(item.amount)}
                  </Td>
                </Tr>
              ))}
            </Table>
            <dl className="flex flex-col gap-2 border-t border-[var(--border)] px-5 py-4">
              <div className="flex items-baseline justify-end gap-6">
                <dt className="text-[12.5px] text-[var(--text2)]">Line items</dt>
                <dd className="w-32 text-right font-[family-name:var(--mono)] text-[12.5px] tabular-nums text-[var(--text2)]">
                  {CURRENCY.format(lineItemTotal)}
                </dd>
              </div>
              <div className="flex items-baseline justify-end gap-6 border-t border-[var(--border)] pt-2">
                <dt className="text-[12.5px] font-semibold text-[var(--text)]">Total</dt>
                <dd className="w-32 text-right font-[family-name:var(--mono)] text-[13px] font-semibold tabular-nums text-[var(--text)]">
                  {CURRENCY.format(inv.amount)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </Panel>
    </div>
  );
}
