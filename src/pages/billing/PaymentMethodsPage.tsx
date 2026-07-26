import { useActionState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { PaymentMethod } from "@/modules/organizations/types/org.types";
import { Button, Field, SubmitButton } from "@/shared/observe";
import {
  EmptyPanel,
  HeroFacts,
  IconChip,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  fieldInputClass,
  type HeroFact,
} from "@/shared/ui/pulse";

interface AddCardState {
  ok: boolean;
  error: string | null;
}

const INITIAL_ADD_STATE: AddCardState = { ok: false, error: null };
const SKELETON_ROWS = ["one", "two"];

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function isExpired(method: PaymentMethod) {
  if (!method.expYear || !method.expMonth) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return method.expYear < currentYear || (method.expYear === currentYear && method.expMonth < currentMonth);
}

function expiryLabel(method: PaymentMethod) {
  if (!method.expYear || !method.expMonth) return "No expiry on file";
  return `${String(method.expMonth).padStart(2, "0")}/${method.expYear}`;
}

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data: methods, isLoading } = useQuery({
    queryKey: orgQueryKeys.paymentMethods(activeOrgId!),
    queryFn: () => orgApi.listPaymentMethods(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const [state, addAction] = useActionState(async (_prevState: AddCardState, form: FormData) => {
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
      return { ok: true, error: null };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || "Failed to add payment method" };
    }
  }, INITIAL_ADD_STATE);

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

  const items = methods ?? [];
  const defaultMethod = items.find((method) => method.isDefault);
  const expiredCount = items.filter(isExpired).length;

  const facts: HeroFact[] = [
    { label: "Stored methods", value: items.length, icon: CreditCard },
    {
      label: "Default method",
      value: defaultMethod ? `${titleCase(defaultMethod.brand)} ···· ${defaultMethod.last4}` : "None set",
      tone: defaultMethod ? "green" : "amber",
      icon: ShieldCheck,
    },
    {
      label: "Expired cards",
      value: expiredCount,
      tone: expiredCount > 0 ? "red" : "neutral",
      icon: CreditCard,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Payments"
        title="Payment methods"
        description="Cards and accounts this organization can be charged against."
        icon={CreditCard}
      >
        {!isLoading && <HeroFacts facts={facts} />}
      </PageHero>

      {isLoading ? (
        <Panel title="Stored methods" icon={CreditCard}>
          <div className="flex flex-col gap-3">
            {SKELETON_ROWS.map((row) => (
              <Skeleton key={row} className="h-14 w-full rounded-[9px]" />
            ))}
          </div>
        </Panel>
      ) : items.length === 0 ? (
        <EmptyPanel
          icon={CreditCard}
          title="No payment methods stored"
          description="Add a card below to keep this organization's subscription active."
        />
      ) : (
        <Panel
          title="Stored methods"
          description="The default method is charged on each billing cycle."
          icon={CreditCard}
          bodyClassName="p-0"
        >
          <RowStack>
            {items.map((method) => {
              const expired = isExpired(method);
              return (
                <Row key={method.id} className="flex items-start gap-4">
                  <IconChip icon={CreditCard} tone={expired ? "red" : method.isDefault ? "brand" : "neutral"} />
                  <SettingRow
                    className="flex-1"
                    label={titleCase(method.brand)}
                    description={
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-[family-name:var(--mono)] text-[12.5px] tabular-nums text-[var(--text2)]">
                          ···· ···· ···· {method.last4}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{expired ? "Expired" : "Expires"} {expiryLabel(method)}</span>
                      </span>
                    }
                  >
                    {method.isDefault && <Pill tone="green">Default</Pill>}
                    {expired && <Pill tone="red">Expired</Pill>}
                    {!method.isDefault && (
                      <Button
                        variant="secondary"
                        disabled={defaultMutation.isPending}
                        onClick={() => defaultMutation.mutate(method.id)}
                      >
                        Set default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(method.id)}
                    >
                      Remove
                    </Button>
                  </SettingRow>
                </Row>
              );
            })}
          </RowStack>
        </Panel>
      )}

      <Panel title="Add a card" description="Add a card that this organization's subscription can be charged to." icon={Plus}>
        <form action={addAction} className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Card number">
              <input
                name="cardNumber"
                required
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                className={`${fieldInputClass} font-[family-name:var(--mono)] tabular-nums`}
              />
            </Field>
          </div>
          <Field label="Expiry">
            <input
              name="expiry"
              required
              autoComplete="cc-exp"
              placeholder="MM/YY"
              className={`${fieldInputClass} font-[family-name:var(--mono)] tabular-nums`}
            />
          </Field>
          <Field label="CVC">
            <input
              name="cvc"
              required
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              className={`${fieldInputClass} font-[family-name:var(--mono)] tabular-nums`}
            />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>
              <Plus className="size-4" aria-hidden="true" /> Add card
            </SubmitButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
