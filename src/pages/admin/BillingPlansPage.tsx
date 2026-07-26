import { Button } from "@/shared/observe";
import { Check, X, Zap, Shield, Sparkles } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Hobby",
    description: "Perfect for side projects and small teams getting started.",
    price: "$0",
    interval: "/month",
    icon: Zap,
    popular: false,
    features: [
      { name: "Up to 3 Projects", included: true },
      { name: "10,000 Events/month", included: true },
      { name: "Community Support", included: true },
      { name: "7-day Log Retention", included: true },
      { name: "Custom Webhooks", included: false },
      { name: "SSO/SAML", included: false },
    ],
  },
  {
    id: "pro",
    name: "Professional",
    description: "Advanced tools for growing teams that need more power.",
    price: "$49",
    interval: "/month",
    icon: Sparkles,
    popular: true,
    features: [
      { name: "Unlimited Projects", included: true },
      { name: "100,000 Events/month", included: true },
      { name: "Priority Email Support", included: true },
      { name: "30-day Log Retention", included: true },
      { name: "Custom Webhooks", included: true },
      { name: "SSO/SAML", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom limits, dedicated support, and enterprise features.",
    price: "Custom",
    interval: "",
    icon: Shield,
    popular: false,
    features: [
      { name: "Unlimited Projects", included: true },
      { name: "Unlimited Events", included: true },
      { name: "24/7 Phone Support", included: true },
      { name: "90-day Log Retention", included: true },
      { name: "Custom Webhooks", included: true },
      { name: "SSO/SAML & SCIM", included: true },
    ],
  },
];

export default function BillingPlansPage() {
  return (
    <div className="mx-auto max-w-[1200px] w-full flex flex-col gap-10 pb-20">
      <div className="text-center mt-8 mb-4">
        <h1 className="text-3xl font-bold text-[var(--text)] font-heading mb-4">Choose Your Plan</h1>
        <p className="text-[var(--text2)] max-w-2xl mx-auto">
          Whether you're just getting started or scaling up to millions of users, we have a plan that fits your needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          return (
            <div 
              key={plan.id} 
              className={`relative flex flex-col rounded-2xl border bg-[var(--bg1)] p-8 transition-all hover:-translate-y-1 hover:shadow-xl ${
                plan.popular 
                  ? "border-[var(--brand)] shadow-[0_0_20px_rgba(var(--brand-rgb),0.1)]" 
                  : "border-[var(--border)]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${plan.popular ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'bg-[var(--bg3)] text-[var(--text)]'}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] font-heading">{plan.name}</h3>
              </div>
              
              <p className="text-[13px] text-[var(--text2)] mb-6 min-h-[40px]">
                {plan.description}
              </p>
              
              <div className="mb-8 flex items-end gap-1">
                <span className="text-4xl font-bold text-[var(--text)] font-heading">{plan.price}</span>
                <span className="text-[14px] text-[var(--text3)] mb-1">{plan.interval}</span>
              </div>
              
              <Button 
                variant={plan.popular ? "primary" : "outline"} 
                className="w-full h-11 mb-8"
              >
                {plan.id === "enterprise" ? "Contact Sales" : "Get Started"}
              </Button>
              
              <div className="flex flex-col gap-3 flex-1">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text3)] mb-2">
                  What's included
                </span>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="size-4 text-[var(--brand)] shrink-0 mt-0.5" />
                    ) : (
                      <X className="size-4 text-[var(--text3)] shrink-0 mt-0.5" />
                    )}
                    <span className={`text-[13px] ${feature.included ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
