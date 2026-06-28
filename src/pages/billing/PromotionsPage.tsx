import { useActionState } from "react";
import { Gift } from "lucide-react";
import { usePromotions } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, Field, SubmitButton, inputClass, Timestamp, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Promotion } from "@/lib/dummy-data";

export default function PromotionsPage() {
  const { data, isLoading } = usePromotions();
  const promos = data ?? [];

  const [, applyAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Promo code "${form.get("code")}" applied`);
    return { ok: true };
  }, { ok: false });

  const columns: Column<Promotion>[] = [
    { key: "code", header: "Code", width: "140px", cell: (p) => <span className="font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--brand)]">{p.code}</span> },
    { key: "desc", header: "Description", width: "1fr", cell: (p) => <span className="truncate text-[var(--text2)]">{p.description}</span> },
    { key: "discount", header: "Discount", width: "100px", cell: (p) => <span className="font-semibold">{p.discount}</span> },
    { key: "status", header: "Status", width: "110px", cell: (p) => <StatusBadge status={p.status} /> },
    { key: "expires", header: "Expires", width: "130px", cell: (p) => <Timestamp value={p.expiresAt} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Promotions" description="Coupons and promotional offers." />

      <SectionCard title="Apply a promo code">
        <form action={applyAction} className="flex items-end gap-3">
          <div className="min-w-[240px] flex-1"><Field label="Code"><input name="code" required placeholder="LAUNCH50" className={inputClass} /></Field></div>
          <SubmitButton><Gift className="size-4" /> Apply</SubmitButton>
        </form>
      </SectionCard>

      <InfiniteTable className="flex-1" loading={isLoading} items={promos} queryKey={["promotions"]} columns={columns} getKey={(p) => p.id} />
    </FillPage>
  );
}
