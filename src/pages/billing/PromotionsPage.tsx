import { useActionState, useEffect } from "react";
import { Gift } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { Promotion } from "@/modules/organizations/types/org.types";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, Field, SubmitButton, inputClass, Timestamp,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { toast } from "sonner";

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data: promos, isLoading } = useQuery({
    queryKey: orgQueryKeys.promotions(activeOrgId!),
    queryFn: () => orgApi.listPromotions(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const [state, applyAction] = useActionState(
    async (_prevState: any, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active org" };
      const code = form.get("code") as string;
      try {
        await orgApi.applyPromotion(activeOrgId, code);
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.promotions(activeOrgId) });
        return { ok: true, code };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to apply promotion" };
      }
    },
    { ok: false, error: null, code: undefined }
  );

  useEffect(() => {
    if (state.ok && state.code) toast.success(`Promo code "${state.code}" applied`);
    if (state.error) toast.error(state.error);
  }, [state]);

  const items = promos || [];

  const columns: Column<Promotion>[] = [
    { key: "code", header: "Code", width: "140px", cell: (p) => <span className="font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--brand)]">{p.code}</span> },
    { key: "desc", header: "Description", width: "1fr", cell: (p) => <span className="truncate text-[var(--text2)]">{p.description}</span> },
    { key: "discount", header: "Discount", width: "100px", cell: (p) => <span className="font-semibold">{p.discountAmount ? `$${p.discountAmount}` : p.discountPercent ? `${p.discountPercent}%` : '-'}</span> },
    { key: "status", header: "Status", width: "110px", cell: (p) => <StatusBadge status={p.isValid ? "active" : "expired"} /> },
    { key: "expires", header: "Expires", width: "130px", cell: (p) => p.expiresAt ? <Timestamp value={new Date(p.expiresAt).getTime()} /> : <span className="text-[var(--text3)]">-</span> },
  ];

  return (
    <FillPage>
      <PageHeader title="Promotions" description="Coupons and promotional offers." />

      <SectionCard title="Apply a promo code">
        <form action={applyAction} className="flex items-end gap-3">
          <div className="min-w-[240px] flex-1"><Field label="Code"><input name="code" required placeholder="LAUNCH50" className={inputClass} /></Field></div>
          <SubmitButton><Gift className="size-4 mr-2" /> Apply</SubmitButton>
        </form>
      </SectionCard>

      <InfiniteTable className="flex-1" loading={isLoading} items={items} queryKey={["promotions-table", activeOrgId]} columns={columns} getKey={(p) => p.id} />
    </FillPage>
  );
}
