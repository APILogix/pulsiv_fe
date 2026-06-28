import { PageHeader, KpiCard, Button, demoAction } from "@/shared/observe";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const PLANS = [
  { name: "Starter", price: "$0", features: ["100k events/mo", "3 projects", "7-day retention", "Email alerts"], current: false },
  { name: "Team", price: "$299", features: ["5M events/mo", "Unlimited projects", "90-day retention", "All channels", "SSO"], current: true },
  { name: "Enterprise", price: "Custom", features: ["Unlimited events", "Custom retention", "SCIM", "Dedicated support", "SLA"], current: false },
];

export default function PlanPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Plan & Subscription" description="Subscription state and plan changes." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Current plan" value="Team" />
        <KpiCard label="Billing cycle" value="Monthly" />
        <KpiCard label="Next invoice" value="Jul 1" />
        <KpiCard label="Amount due" value="$1,832.80" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.name} className={cn("rounded-[12px] border bg-[var(--bg1)] p-5", p.current ? "border-[var(--brand)]" : "border-[var(--border)]")}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text)]">{p.name}</span>
              {p.current && <span className="rounded-full bg-[var(--brand-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">Current</span>}
            </div>
            <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{p.price}<span className="text-sm font-normal text-[var(--text3)]">{p.price !== "Custom" ? "/mo" : ""}</span></div>
            <ul className="mt-4 flex flex-col gap-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-[var(--text2)]"><Check className="size-4 text-[var(--brand)]" /> {f}</li>
              ))}
            </ul>
            <div className="mt-5">
              <Button variant={p.current ? "secondary" : "primary"} onClick={() => demoAction(p.current ? "Manage plan" : `Upgrade to ${p.name}`)}>
                {p.current ? "Manage" : p.name === "Enterprise" ? "Contact sales" : `Upgrade to ${p.name}`}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
