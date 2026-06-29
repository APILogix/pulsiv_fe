import { PageHeader, KpiCard, Button, SectionCard, demoAction } from "@/shared/observe";
import { Check } from "lucide-react";

const CURRENT_PLAN = {
  name: "Team",
  price: "$299",
  billingCycle: "Monthly",
  nextInvoice: "Jul 1",
  amountDue: "$1,832.80",
  features: ["5M events/mo", "Unlimited projects", "90-day retention", "All channels", "SSO"],
};

export default function PlanPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Plan & Subscription" description="Organization subscription state and plan details." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Current plan" value={CURRENT_PLAN.name} />
        <KpiCard label="Billing cycle" value={CURRENT_PLAN.billingCycle} />
        <KpiCard label="Next invoice" value={CURRENT_PLAN.nextInvoice} />
        <KpiCard label="Amount due" value={CURRENT_PLAN.amountDue} />
      </div>

      <SectionCard title="Your Current Plan">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold text-[var(--text)]">{CURRENT_PLAN.name} Plan</span>
              <span className="rounded-full bg-[var(--brand-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--brand)]">Active</span>
            </div>
            <div className="mt-2 text-xl font-medium text-[var(--text2)]">
              {CURRENT_PLAN.price}<span className="text-sm font-normal text-[var(--text3)]">/mo</span>
            </div>
            
            <div className="mt-6">
              <h4 className="text-[13px] font-medium text-[var(--text)] mb-3 uppercase tracking-wider">Plan Benefits</h4>
              <ul className="flex flex-col gap-2.5">
                {CURRENT_PLAN.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[13.5px] text-[var(--text2)]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-bg)]">
                      <Check className="size-3 text-[var(--brand)]" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 md:min-w-[200px]">
            <Button variant="primary" onClick={() => demoAction("Upgrade Plan")}>
              Upgrade plan
            </Button>
            <Button variant="secondary" onClick={() => demoAction("Manage Billing")}>
              Manage billing
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
