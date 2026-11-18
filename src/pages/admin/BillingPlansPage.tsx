import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Zap, Shield, Sparkles, Rocket, ArrowRight } from "lucide-react";

import { Button, formatCompact, formatNumber } from "@/shared/observe";
import { Skeleton } from "@/components/ui/skeleton";
import { orgApi } from "@/modules/organizations/api/org.api";
import type { BillingPlan } from "@/modules/organizations/types/org.types";

interface DisplayPlan {
  id: string;
  key: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  icon: any;
  popular?: boolean;
  features: { name: string; included: boolean }[];
  highlightQuota: string;
}

const FALLBACK_PLANS: DisplayPlan[] = [
  {
    id: "starter",
    key: "starter",
    name: "Starter",
    description: "Essential telemetry and metrics for early-stage organizations and prototypes.",
    monthlyPrice: 15,
    annualPrice: 150,
    icon: Zap,
    popular: false,
    highlightQuota: "500,000 credits / mo",
    features: [
      { name: "500,000 billable credits / month", included: true },
      { name: "100 AI investigation credits", included: true },
      { name: "Up to 5 projects & 10 member seats", included: true },
      { name: "7-day telemetry data retention", included: true },
      { name: "Standard community support", included: true },
      { name: "SAML SSO & SCIM provisioning", included: false },
      { name: "2x soft-cap burst headroom", included: false },
    ],
  },
  {
    id: "growth",
    key: "growth",
    name: "Growth",
    description: "Expanded ingestion, soft-cap bursts, and extended retention for scaling systems.",
    monthlyPrice: 49,
    annualPrice: 490,
    icon: Sparkles,
    popular: true,
    highlightQuota: "2,000,000 credits / mo",
    features: [
      { name: "2,000,000 billable credits / month", included: true },
      { name: "300 AI investigation credits", included: true },
      { name: "Up to 20 projects & 50 member seats", included: true },
      { name: "14-day telemetry data retention", included: true },
      { name: "2x soft-cap burst headroom", included: true },
      { name: "Priority email & ticket support", included: true },
      { name: "SAML SSO & SCIM provisioning", included: false },
    ],
  },
  {
    id: "business",
    key: "business",
    name: "Business",
    description: "High-throughput telemetry, advanced alerting, and deep log rollups.",
    monthlyPrice: 199,
    annualPrice: 1990,
    icon: Rocket,
    popular: false,
    highlightQuota: "10,000,000 credits / mo",
    features: [
      { name: "10,000,000 billable credits / month", included: true },
      { name: "1,000 AI investigation credits", included: true },
      { name: "Up to 100 projects & 250 member seats", included: true },
      { name: "30-day retention & 90-day rollups", included: true },
      { name: "2x soft-cap burst headroom", included: true },
      { name: "Slack & PagerDuty notification channels", included: true },
      { name: "SAML SSO & SCIM provisioning", included: false },
    ],
  },
  {
    id: "enterprise",
    key: "enterprise",
    name: "Enterprise",
    description: "Maximum scale, enterprise compliance, custom quotas, and dedicated support.",
    monthlyPrice: null,
    annualPrice: null,
    icon: Shield,
    popular: false,
    highlightQuota: "50,000,000 credits / mo",
    features: [
      { name: "50,000,000 billable credits / month", included: true },
      { name: "5,000 AI investigation credits", included: true },
      { name: "500 projects & 2,500 member seats", included: true },
      { name: "60-day raw retention & 2-year rollups", included: true },
      { name: "7-year compliance audit logs", included: true },
      { name: "SAML single sign-on & SCIM tokens", included: true },
      { name: "24/7 dedicated enterprise support", included: true },
    ],
  },
];

export default function BillingPlansPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  const { data: remotePlans, isLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billing", "plans"],
    queryFn: () => orgApi.listBillingPlans(),
    staleTime: 60_000,
  });

  // Blend live backend plan data with display metadata
  const plans: DisplayPlan[] = (remotePlans && remotePlans.length > 0)
    ? remotePlans.map((bp) => {
        const key = (bp.key || bp.tier || "").toLowerCase();
        const fallback = FALLBACK_PLANS.find((f) => f.key === key) || FALLBACK_PLANS[0];
        const monthly = bp.monthlyPriceMinor !== null ? bp.monthlyPriceMinor / 100 : null;
        const annual = bp.annualPriceMinor !== null ? bp.annualPriceMinor / 100 : null;
        const eventsQuota = bp.baseQuotas?.["quota.monthly_events"] ?? bp.baseQuotas?.["quota.monthly_event_credits"];
        return {
          id: bp.id,
          key,
          name: bp.displayName || bp.name || fallback.name,
          description: bp.description || fallback.description,
          monthlyPrice: monthly,
          annualPrice: annual,
          icon: fallback.icon,
          popular: bp.tier === "growth" || bp.key === "growth",
          highlightQuota: eventsQuota ? `${formatCompact(eventsQuota)} credits / mo` : fallback.highlightQuota,
          features: fallback.features,
        };
      })
    : FALLBACK_PLANS;

  return (
    <div className="mx-auto max-w-[1280px] w-full flex flex-col gap-10 pb-20 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mt-10 mb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] tracking-tight mb-3">
          Predictable, Cost-Calibrated Pricing
        </h1>
        <p className="text-[var(--text2)] text-base max-w-2xl mx-auto leading-relaxed">
          Scale your ingestion with transparent, finite quotas. Every tier includes generous limits, clear telemetry boundaries, and soft-cap burst headroom.
        </p>

        {/* Interval Selector */}
        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-[var(--bg2)] border border-[var(--border)] shadow-xs">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
              interval === "monthly"
                ? "bg-[var(--brand)] text-white shadow-xs"
                : "text-[var(--text2)] hover:text-[var(--text)]"
            }`}
          >
            Monthly billing
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
              interval === "annual"
                ? "bg-[var(--brand)] text-white shadow-xs"
                : "text-[var(--text2)] hover:text-[var(--text)]"
            }`}
          >
            <span>Annual billing</span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
              interval === "annual" ? "bg-white/20 text-white" : "bg-[var(--green)]/15 text-[var(--green)]"
            }`}>
              Save ~17%
            </span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg1)] p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-32 mt-4" />
              <Skeleton className="h-10 w-full mt-2" />
              <div className="flex flex-col gap-2 mt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = interval === "monthly" ? plan.monthlyPrice : plan.annualPrice;
            const periodLabel = interval === "monthly" ? "/month" : "/year";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-[var(--bg1)] p-6 transition-all duration-200 ${
                  plan.popular
                    ? "border-[var(--brand)] shadow-[0_0_24px_rgba(var(--brand-rgb),0.12)] ring-1 ring-[var(--brand)]/30"
                    : "border-[var(--border)] hover:border-[var(--border2)]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand)] px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-xl ${plan.popular ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "bg-[var(--bg2)] text-[var(--text)]"}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text)] font-heading leading-tight">{plan.name}</h3>
                    <span className="text-[11px] font-mono text-[var(--text3)]">{plan.highlightQuota}</span>
                  </div>
                </div>

                <p className="text-[12.5px] text-[var(--text2)] leading-relaxed mb-5 min-h-[44px]">
                  {plan.description}
                </p>

                {/* Price Display */}
                <div className="mb-6 flex items-baseline gap-1">
                  {price !== null ? (
                    <>
                      <span className="text-3xl font-extrabold text-[var(--text)] font-heading tabular-nums tracking-tight">
                        $${formatNumber(price)}
                      </span>
                      <span className="text-[12.5px] text-[var(--text3)] font-medium">{periodLabel}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-extrabold text-[var(--text)] font-heading tracking-tight">
                      Custom Contract
                    </span>
                  )}
                </div>

                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  className="w-full h-10 mb-6 font-medium cursor-pointer"
                >
                  {plan.key === "enterprise" ? "Contact Enterprise Sales" : "Get Started"}
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>

                <div className="flex flex-col gap-2.5 flex-1 pt-4 border-t border-[var(--border)]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">
                    What's included
                  </span>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check className="size-3.5 text-[var(--green)] shrink-0 mt-0.5" />
                      ) : (
                        <X className="size-3.5 text-[var(--text3)]/60 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-[12px] leading-snug ${feature.included ? "text-[var(--text)]" : "text-[var(--text3)]"}`}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
