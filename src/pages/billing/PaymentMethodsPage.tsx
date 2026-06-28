import { useActionState } from "react";
import { CreditCard, Plus } from "lucide-react";
import { usePaymentMethods } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, Field, SubmitButton, inputClass, demoSuccess } from "@/shared/observe";

export default function PaymentMethodsPage() {
  const { data } = usePaymentMethods();
  const methods = data ?? [];

  const [, addAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 800));
    demoSuccess("Payment method added");
    return { ok: true };
  }, { ok: false });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Payment Methods" description="Stored payment method management." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((m) => (
          <div key={m.id} className="rounded-[12px] border border-[var(--border)] bg-gradient-to-br from-[var(--bg1)] to-[var(--bg2)] p-5">
            <div className="flex items-center justify-between">
              <CreditCard className="size-6 text-[var(--text2)]" />
              {m.isDefault && <span className="rounded-full bg-[var(--brand-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">Default</span>}
            </div>
            <div className="mt-4 font-[family-name:var(--mono)] text-lg tracking-widest text-[var(--text)]">•••• •••• •••• {m.last4}</div>
            <div className="mt-2 flex justify-between text-[12px] text-[var(--text3)]">
              <span>{m.brand}</span>
              <span>{String(m.expMonth).padStart(2, "0")}/{m.expYear}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionCard title="Add a card (mock Stripe)">
        <form action={addAction} className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Card number"><input placeholder="4242 4242 4242 4242" className={inputClass} /></Field></div>
          <Field label="Expiry"><input placeholder="MM/YY" className={inputClass} /></Field>
          <Field label="CVC"><input placeholder="123" className={inputClass} /></Field>
          <div className="sm:col-span-2"><SubmitButton><Plus className="size-4" /> Add card</SubmitButton></div>
        </form>
      </SectionCard>
    </div>
  );
}
