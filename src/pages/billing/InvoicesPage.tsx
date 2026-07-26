import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, Download, MoreHorizontal, Receipt, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Invoice } from "@/modules/organizations/types/org.types";
import {
  Button,
  FilterSelect,
  SearchInput,
  StatusBadge,
  Table,
  Td,
  Timestamp,
  Tr,
  formatDate,
} from "@/shared/observe";
import { EmptyPanel, PageHero, Panel, StatCard, Toolbar } from "@/shared/ui/pulse";

const TABLE_HEADERS = ["Invoice", "Issued", "Due", "Amount", "Status", " "];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
  { value: "uncollectible", label: "Uncollectible" },
];

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5"];

const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function isOverdue(invoice: Invoice) {
  return invoice.status === "open" && new Date(invoice.dueDate).getTime() < Date.now();
}

function displayStatus(invoice: Invoice) {
  return isOverdue(invoice) ? "overdue" : invoice.status;
}

function openPdf(invoice: Invoice) {
  if (invoice.pdfUrl) {
    window.open(invoice.pdfUrl, "_blank");
    return;
  }
  toast.info("PDF not available");
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useOrganizations();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: orgQueryKeys.invoices(activeOrgId!),
    queryFn: () => orgApi.listInvoices(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const items = invoices ?? [];
  const paidCount = items.filter((invoice) => invoice.status === "paid").length;
  const openInvoices = items.filter((invoice) => invoice.status === "open");
  const overdueCount = items.filter(isOverdue).length;
  const outstanding = openInvoices.reduce((total, invoice) => total + invoice.amount, 0);

  const needle = query.trim().toLowerCase();
  const visible = items.filter((invoice) => {
    const matchesStatus = status === "all" || displayStatus(invoice) === status;
    const matchesQuery = needle.length === 0 || invoice.number.toLowerCase().includes(needle);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Billing history"
        title="Invoices"
        description="Every invoice issued to this organization, with payment state and downloadable receipts."
        icon={Receipt}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Invoices" value={items.length} icon={Receipt} tone="brand" />
        <StatCard label="Paid" value={paidCount} icon={CircleDollarSign} tone="green" />
        <StatCard
          label="Outstanding"
          value={CURRENCY.format(outstanding)}
          icon={CircleDollarSign}
          tone={outstanding > 0 ? "amber" : "neutral"}
          footnote={`${openInvoices.length} open ${openInvoices.length === 1 ? "invoice" : "invoices"}`}
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={TriangleAlert}
          tone={overdueCount > 0 ? "red" : "neutral"}
          footnote={overdueCount > 0 ? "Past the due date" : "Nothing past due"}
        />
      </div>

      <Toolbar
        trailing={
          <span className="text-[12px] tabular-nums text-[var(--text3)]">
            {visible.length} of {items.length}
          </span>
        }
      >
        <SearchInput placeholder="Search invoice number…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </Toolbar>

      {isLoading ? (
        <Panel title="Invoices" icon={Receipt}>
          <div className="flex flex-col gap-3">
            {SKELETON_ROWS.map((row) => (
              <Skeleton key={row} className="h-10 w-full rounded-[9px]" />
            ))}
          </div>
        </Panel>
      ) : visible.length === 0 ? (
        <EmptyPanel
          icon={Receipt}
          title={items.length === 0 ? "No invoices yet" : "No invoices match these filters"}
          description={
            items.length === 0
              ? "Invoices appear here once the first billing cycle closes for this organization."
              : "Clear the search or pick another status to see more invoices."
          }
        />
      ) : (
        <Table headers={TABLE_HEADERS} maxHeight="60vh">
          {visible.map((invoice) => (
            <Tr key={invoice.id} onClick={() => navigate(`/billing/invoices/${invoice.id}`)}>
              <Td className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{invoice.number}</Td>
              <Td className="text-[13px]">
                <Timestamp value={invoice.issueDate} />
              </Td>
              <Td className="text-[13px] text-[var(--text2)] tabular-nums">{formatDate(invoice.dueDate)}</Td>
              <Td className="font-[family-name:var(--mono)] text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                {CURRENCY.format(invoice.amount)}
              </Td>
              <Td>
                <StatusBadge status={displayStatus(invoice)} />
              </Td>
              <Td className="text-right">
                <span className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 justify-center p-0">
                        <span className="sr-only">Invoice actions</span>
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openPdf(invoice)}>
                        <Download className="mr-2 size-4" aria-hidden="true" /> Download PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
