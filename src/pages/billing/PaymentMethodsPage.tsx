import { useActionState, useEffect } from "react";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { PageHeader, SectionCard, Field, SubmitButton, inputClass, Button } from "@/shared/observe";
import { toast } from "sonner";

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data: methods, isLoading } = useQuery({
    queryKey: orgQueryKeys.paymentMethods(activeOrgId!),
    queryFn: () => orgApi.listPaymentMethods(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const [state, addAction] = useActionState(
    async (_prevState: any, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active org" };
      try {
        const data = {
          type: "card",
          billingDetails: {
            cardNumber: form.get("cardNumber") as string,
            expiry: form.get("expiry") as string,
            cvc: form.get("cvc") as string,
          },
        };
        await orgApi.addPaymentMethod(activeOrgId, data);
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.paymentMethods(activeOrgId) });
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.response?.data?.message || "Failed to add payment method" };
      }
    },
    { ok: false, error: null }
  );

  const defaultMutation = useMutation({
    mutationFn: (id: string) => orgApi.setDefaultPaymentMethod(activeOrgId!, id),
    onSuccess: () => {
      toast.success("Default payment method updated");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.paymentMethods(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to set default payment method"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => orgApi.removePaymentMethod(activeOrgId!, id),
    onSuccess: () => {
      toast.success("Payment method removed");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.paymentMethods(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to remove payment method"),
  });

  useEffect(() => {
    if (state.ok) toast.success("Payment method added");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Payment Methods" description="Stored payment method management." />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(methods || []).map((method) => (
            <div key={method.id} className="rounded-[12px] border border-[var(--border)] bg-gradient-to-br from-[var(--bg1)] to-[var(--bg2)] p-5">
              <div className="flex items-center justify-between">
                <CreditCard className="size-6 text-[var(--text2)]" />
                {method.isDefault ? <span className="rounded-full bg-[var(--brand-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">Default</span> : null}
              </div>
              <div className="mt-4 font-[family-name:var(--mono)] text-lg tracking-widest text-[var(--text)]">**** **** **** {method.last4}</div>
              <div className="mt-2 flex justify-between text-[12px] text-[var(--text3)]">
                <span className="capitalize">{method.brand}</span>
                <span>{String(method.expMonth).padStart(2, "0")}/{method.expYear}</span>
              </div>
              <div className="mt-4 flex gap-2">
                {!method.isDefault ? <Button variant="secondary" disabled={defaultMutation.isPending} onClick={() => defaultMutation.mutate(method.id)}>Set default</Button> : null}
                <Button variant="ghost" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(method.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionCard title="Add a card">
        <form action={addAction} className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Card number"><input name="cardNumber" required placeholder="4242 4242 4242 4242" className={inputClass} /></Field></div>
          <Field label="Expiry"><input name="expiry" required placeholder="MM/YY" className={inputClass} /></Field>
          <Field label="CVC"><input name="cvc" required placeholder="123" className={inputClass} /></Field>
          <div className="sm:col-span-2"><SubmitButton><Plus className="mr-2 size-4" /> Add card</SubmitButton></div>
        </form>
      </SectionCard>
    </div>
  );
}
