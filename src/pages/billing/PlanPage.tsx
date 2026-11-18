import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  CreditCard,
  ExternalLink,
  Gauge,
  Minus,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { AddonCatalogItem, BillingPlan, SubscriptionAddon } from "@/modules/organizations/types/org.types";
import { Button, formatCompact, formatNumber } from "@/shared/observe";
import {
  HeroFacts,
  Meter,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SectionHeading,
  SettingRow,
  type HeroFact,
  type SurfaceTone,
} from "@/shared/ui/pulse";

interface SummaryBucket {
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
  enabled?: boolean;
}

interface PlanSummary {
  subscriptionStatus?: string | null;
  planTier?: string | null;
  eventLimitMonthly?: number | null;
  hardCap?: boolean;
  usage?: {
    activeMembers?: SummaryBucket;
    eventsMonthly?: SummaryBucket;
    aiCredits?: SummaryBucket;
    ssoProviders?: SummaryBucket;
    scimTokens?: SummaryBucket;
  };
}

interface EntitlementValue {
  booleanValue?: boolean | null;
  integerValue?: number | null;
  decimalValue?: number | null;
  stringValue?: string | null;
}

const STATUS_TONE: Record<string, SurfaceTone> = {
  active: "green",
  trialing: "green",
  past_due: "red",
  unpaid: "red",
  incomplete: "amber",
  paused: "amber",
  canceled: "amber",
  cancelled: "amber",
};

const SKELETON_ROWS = ["one", "two", "three", "four"];
const PORTAL_MESSAGE = "Customer billing portal flow is being prepared for self-serve management.";

function formatLimit(limit: number | null | undefined): string {
  if (limit === null || limit === undefined || limit <= 0) return "-";
  return formatCompact(limit);
}

function statusTone(status: string | null | undefined): SurfaceTone {
  return STATUS_TONE[String(status ?? "").toLowerCase()] ?? "neutral";
}

function titleCase(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function entitlementLabel(featureKey: string): string {
  if (featureKey === "quota.monthly_events") return "Monthly Billable Credits";
  if (featureKey === "quota.monthly_ai_credits") return "Monthly AI Credits";
  if (featureKey === "quota.retention_days") return "Telemetry Data Retention";
  if (featureKey === "quota.rollup_retention_days") return "Long-Term Rollup Retention";
  if (featureKey === "quota.members") return "Member Seats";
  if (featureKey === "quota.projects") return "Projects Limit";
  if (featureKey === "quota.alert_rules") return "Active Alert Rules";
  if (featureKey === "quota.sso_providers") return "SAML SSO Providers";
  if (featureKey === "quota.scim_tokens") return "SCIM Provisioning Tokens";
  return featureKey
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function entitlementDisplay(value: EntitlementValue): { value: string; enabled: boolean } {
  if (value.booleanValue !== null && value.booleanValue !== undefined) {
    return { value: value.booleanValue ? "Included" : "Off", enabled: value.booleanValue };
  }
  if (value.integerValue !== null && value.integerValue !== undefined) {
    return { value: formatLimit(value.integerValue), enabled: value.integerValue > 0 };
  }
  if (value.decimalValue !== null && value.decimalValue !== undefined) {
    return { value: String(value.decimalValue), enabled: value.decimalValue > 0 };
  }
  if (value.stringValue !== null && value.stringValue !== undefined) {
    return { value: value.stringValue, enabled: true };
  }
  return { value: "Not configured", enabled: false };
}

function EntitlementLine({ label, value, enabled }: { label: string; value: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 items-center gap-2.5 text-[13px]">
        {enabled ? (
          <Check className="size-4 shrink-0 text-[var(--green)]" aria-hidden="true" />
        ) : (
          <Minus className="size-4 shrink-0 text-[var(--text3)]" aria-hidden="true" />
        )}
        <span className={enabled ? "text-[var(--text)]" : "text-[var(--text3)]"}>{label}</span>
      </span>
      <span className="shrink-0 font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
        {value}
      </span>
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Subscription" icon={CreditCard}>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </Panel>
      <Panel title="Entitlements" icon={Gauge}>
        <div className="flex flex-col gap-4">
          {SKELETON_ROWS.map((row) => (
            <div key={row} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export default function PlanPage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "summary"],
    queryFn: () => orgApi.getBillingSummary(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: entitlements } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "entitlements"],
    queryFn: () => orgApi.getEntitlements(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: subscriptionAddons = [] } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "addons", "subscription"],
    queryFn: () => orgApi.listSubscriptionAddons(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: addonCatalog = [] } = useQuery({
    queryKey: ["billing", "addons", "catalog"],
    queryFn: () => orgApi.listAddons(),
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => orgApi.listBillingPlans(),
  });

  const subscribeAddonMutation = useMutation({
    mutationFn: ({ key, quantity }: { key: string; quantity: number }) =>
      orgApi.subscribeAddon(activeOrgId!, key, quantity),
    onSuccess: () => {
      toast.success("Add-on added to subscription");
      setIsAddonModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [...orgQueryKeys.billing(activeOrgId!), "addons"] });
      queryClient.invalidateQueries({ queryKey: [...orgQueryKeys.billing(activeOrgId!), "summary"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add add-on");
    },
  });

  const cancelAddonMutation = useMutation({
    mutationFn: (subscriptionAddonId: string) =>
      orgApi.cancelSubscriptionAddon(activeOrgId!, subscriptionAddonId),
    onSuccess: () => {
      toast.success("Add-on removed");
      queryClient.invalidateQueries({ queryKey: [...orgQueryKeys.billing(activeOrgId!), "addons"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove add-on");
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: (planId: string) => orgApi.changePlan(activeOrgId!, planId),
    onSuccess: () => {
      toast.success("Plan updated successfully");
      setIsUpgradeOpen(false);
      queryClient.invalidateQueries({ queryKey: [...orgQueryKeys.billing(activeOrgId!), "summary"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to change plan");
    },
  });

  if (isLoading) return <PlanSkeleton />;

  if (!summary) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Subscription"
          title="Plan & subscription"
          description="Entitlements, quota ceilings, and plan state for this organization."
          icon={CreditCard}
        />
        <Notice tone="red" icon={TriangleAlert} title="Billing summary unavailable">
          We could not load the subscription for this organization. Refresh the page or try again shortly.
        </Notice>
      </div>
    );
  }

  const plan = summary as unknown as PlanSummary;
  const usage = plan.usage ?? {};
  const seats = usage.activeMembers;
  const events = usage.eventsMonthly;
  const aiCredits = usage.aiCredits;
  const sso = usage.ssoProviders;
  const scim = usage.scimTokens;

  const status = String(plan.subscriptionStatus ?? "active");
  const tone = statusTone(status);
  const planName = titleCase(plan.planTier, "Enterprise");
  const eventCeiling = plan.eventLimitMonthly ?? events?.limit ?? 50000000;
  const entitlementRows = Object.entries(entitlements ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([featureKey, value]) => ({ featureKey, ...entitlementDisplay(value) }));

  const facts: HeroFact[] = [
    { label: "Plan", value: planName, icon: CreditCard },
    { label: "Subscription", value: titleCase(status, "Active"), tone, icon: ShieldCheck },
    {
      label: "Seats",
      value: `${formatNumber(seats?.used ?? 0)} / ${formatLimit(seats?.limit)}`,
      icon: Users,
    },
    { label: "Credits per month", value: formatLimit(eventCeiling), icon: Gauge },
  ];

  const ssoEnabled = Boolean(sso?.enabled);
  const scimEnabled = Boolean(scim?.enabled);
  const isEnterprise = (plan.planTier ?? "").toLowerCase() === "enterprise";

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Subscription"
        title="Plan & subscription"
        description="Entitlements, quota ceilings, and plan state for this organization."
        icon={CreditCard}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast.info(PORTAL_MESSAGE)}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Billing portal
            </Button>
            <Button variant="primary" onClick={() => setIsUpgradeOpen(true)}>
              <ArrowUpRight className="size-4" aria-hidden="true" />
              Change plan
            </Button>
          </>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <SectionHeading
        title="Plan"
        description="Your current tier, burst policies, and active entitlements."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel
          title={planName}
          description="Everything active on this organization today."
          icon={CreditCard}
          tone="brand"
          actions={
            <div className="flex items-center gap-2">
              <Pill tone="green">Current plan</Pill>
              {!plan.hardCap && (
                <Pill tone="brand">2x Burst Headroom</Pill>
              )}
            </div>
          }
          footer={
            <div className="flex justify-between items-center w-full text-[12px] text-[var(--text3)]">
              <span>
                Hard cap: {plan.hardCap ? "Enabled" : "Disabled (soft-cap bursts allowed)"}
              </span>
              <span>Priority: P0 Critical</span>
            </div>
          }
        >
          <div className="divide-y divide-[var(--border)]">
            {entitlementRows.length > 0 ? (
              entitlementRows.map((entitlement) => (
                <EntitlementLine
                  key={entitlement.featureKey}
                  label={entitlementLabel(entitlement.featureKey)}
                  value={entitlement.value}
                  enabled={entitlement.enabled}
                />
              ))
            ) : (
              <EntitlementLine label="Monthly billable credits" value={formatLimit(eventCeiling)} enabled />
            )}
          </div>
        </Panel>

        <Panel
          title={isEnterprise ? "Enterprise SLA & Governance" : "Upgrade Headroom"}
          description={
            isEnterprise
              ? "Enterprise contract guarantees high-throughput ingestion, priority queues, and compliance retention."
              : "Raising your tier lifts these ceilings and unlocks the enterprise identity channel."
          }
          icon={isEnterprise ? ShieldCheck : ArrowUpRight}
          tone="brand"
          className="border-[var(--brand)]/40"
          actions={<Pill tone="brand">{isEnterprise ? "Enterprise Tier" : "Recommended"}</Pill>}
          footer={
            <Button variant="primary" onClick={() => setIsUpgradeOpen(true)}>
              <ArrowUpRight className="size-4" aria-hidden="true" />
              {isEnterprise ? "Manage contract" : "Upgrade plan"}
            </Button>
          }
        >
          {isEnterprise ? (
            <div className="flex flex-col gap-3 py-1">
              <p className="text-[13px] leading-relaxed text-[var(--text2)]">
                This organization runs on the Enterprise tier with 50M monthly credits, 5k AI credits, dedicated priority queues, and custom compliance retention.
              </p>
              <div className="divide-y divide-[var(--border)] mt-2">
                <EntitlementLine label="Dedicated Priority Queue" value="P0 (Weight 100)" enabled />
                <EntitlementLine label="Audit Log Compliance Retention" value="7 Years (2,555d)" enabled />
                <EntitlementLine label="Telemetry Long-Term Rollups" value="2 Years (730d)" enabled />
                <EntitlementLine label="Enterprise Identity" value="SSO + SCIM Included" enabled />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              <EntitlementLine
                label="Monthly credit ceiling"
                value={`Now ${formatLimit(eventCeiling)}`}
                enabled={false}
              />
              <EntitlementLine label="Member seats" value={`Now ${formatLimit(seats?.limit)}`} enabled={false} />
              <EntitlementLine
                label="SAML single sign-on"
                value={ssoEnabled ? "Included" : "Not in plan"}
                enabled={ssoEnabled}
              />
              <EntitlementLine
                label="SCIM provisioning"
                value={scimEnabled ? "Included" : "Not in plan"}
                enabled={scimEnabled}
              />
            </div>
          )}
        </Panel>
      </div>

      {/* Quota and Entitlement Usage */}
      <Panel
        title="Quota and entitlement usage"
        description="Consumption against the cost-calibrated ceilings granted by this plan."
        icon={Gauge}
        actions={
          <Button variant="secondary" onClick={() => toast.info(PORTAL_MESSAGE)}>
            <Receipt className="size-4" aria-hidden="true" />
            Billing portal
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {events && (
            <Meter
              label="Monthly billable credits"
              used={events.used ?? 0}
              limit={events.limit ?? 50000000}
              format={formatCompact}
              hint={
                events.remaining !== null && events.remaining !== undefined
                  ? `${formatCompact(events.remaining)} credits remaining this cycle`
                  : undefined
              }
            />
          )}
          {aiCredits && (
            <Meter
              label="AI investigation credits"
              used={aiCredits.used ?? 0}
              limit={aiCredits.limit ?? 5000}
              format={formatCompact}
              hint={
                aiCredits.remaining !== null && aiCredits.remaining !== undefined
                  ? `${formatCompact(aiCredits.remaining)} credits remaining`
                  : undefined
              }
            />
          )}
          {seats && (
            <Meter
              label="Member seats"
              used={seats.used ?? 0}
              limit={seats.limit ?? 2500}
              format={formatNumber}
            />
          )}
          {sso && (
            <Meter
              label="SSO providers"
              used={sso.used ?? 0}
              limit={sso.limit ?? 10}
              format={formatNumber}
              hint={ssoEnabled ? "SAML 2.0 active" : "Not included in this plan"}
            />
          )}
          {scim && (
            <Meter
              label="SCIM tokens"
              used={scim.used ?? 0}
              limit={scim.limit ?? 20}
              format={formatNumber}
              hint={scimEnabled ? "Automated provisioning active" : "Not included in this plan"}
            />
          )}
        </div>
      </Panel>

      {/* Subscription Add-ons */}
      <Panel
        title="Subscription add-ons"
        description="Scale individual resources like ingestion volume, AI credits, or seats without tier upgrades."
        icon={Sparkles}
        actions={
          <Button variant="primary" onClick={() => setIsAddonModalOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add add-on
          </Button>
        }
      >
        {subscriptionAddons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptionAddons.map((addon, i) => (
              <div
                key={i}
                className="flex flex-col justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg1)]"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-[var(--text)]">{addon.name}</h4>
                    <Pill tone="green">Active</Pill>
                  </div>
                  <p className="text-xs text-[var(--text3)] font-mono">
                    Qty: {addon.quantity} &middot; ${formatNumber(addon.unitPriceMinor / 100)}/mo
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-end">
                  <Button
                    variant="ghost"
                    className="text-[var(--red)] hover:text-[var(--red)] cursor-pointer text-xs py-1 px-2.5"
                    onClick={() => cancelAddonMutation.mutate(addon.addonId)}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="size-8 text-[var(--text3)] mb-2 opacity-50" />
            <p className="text-sm font-medium text-[var(--text)]">No active add-ons</p>
            <p className="text-xs text-[var(--text3)] max-w-sm mt-1 mb-4">
              Expand ingestion headroom (+1M events), AI quotas (+100 credits), or projects with modular add-ons.
            </p>
            <Button variant="outline" onClick={() => setIsAddonModalOpen(true)}>
              <Plus className="size-3.5 mr-1.5" />
              Explore Add-on Catalog
            </Button>
          </div>
        )}
      </Panel>

      {/* Plan Changes & Downgrade Safety */}
      <Panel
        title="Plan changes"
        description="Downgrades and cancellation change what this organization can ingest."
        icon={TriangleAlert}
        danger
        bodyClassName="p-0"
      >
        <RowStack>
          <Row>
            <SettingRow
              label="Change billing cycle"
              description="Switch between monthly and annual billing to lock in savings."
            >
              <Button variant="secondary" onClick={() => setIsUpgradeOpen(true)}>
                Change cycle
              </Button>
            </SettingRow>
          </Row>
          <Row>
            <SettingRow
              label="Cancel subscription"
              description="The subscription stays active through the current period, then reverts to the base tier."
            >
              <Button
                variant="danger"
                onClick={() => toast.info("To cancel an enterprise contract, please reach out to your account manager.")}
              >
                Cancel subscription
              </Button>
            </SettingRow>
          </Row>
        </RowStack>
      </Panel>

      {/* Add-on Catalog Modal */}
      <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add-on Catalog</DialogTitle>
            <DialogDescription>
              Expand your organization quota independently of your plan tier.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto py-2">
            {addonCatalog.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--brand)] transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text)]">{item.name}</h4>
                  <p className="text-xs text-[var(--text2)] mt-0.5">{item.description}</p>
                  <span className="text-xs font-mono text-[var(--brand)] font-semibold mt-1 inline-block">
                    ${formatNumber(item.unitPriceMinor / 100)} / month
                  </span>
                </div>
                <Button
                  variant="primary"
                  onClick={() => subscribeAddonMutation.mutate({ key: item.key, quantity: 1 })}
                  disabled={subscribeAddonMutation.isPending}
                >
                  <Plus className="size-3.5 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddonModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Selection Modal */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose Organization Plan</DialogTitle>
            <DialogDescription>
              Select the tier that fits your ingestion, retention, and identity requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 max-h-[65vh] overflow-y-auto">
            {allPlans.map((p) => {
              const isCurrent = p.key.toLowerCase() === (plan.planTier ?? "").toLowerCase();
              const monthlyCost = p.monthlyPriceMinor !== null ? `$${formatNumber(p.monthlyPriceMinor / 100)}/mo` : "Custom Contract";
              const events = p.baseQuotas?.["quota.monthly_events"] ?? p.baseQuotas?.["quota.monthly_event_credits"];

              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between p-5 rounded-xl border bg-[var(--bg1)] transition-all ${
                    isCurrent ? "border-[var(--green)] ring-1 ring-[var(--green)]/30" : "border-[var(--border)]"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-base font-bold text-[var(--text)] font-heading">{p.displayName || p.name}</h4>
                      {isCurrent && <Pill tone="green">Current</Pill>}
                    </div>
                    <span className="text-lg font-extrabold text-[var(--text)] font-heading">
                      {monthlyCost}
                    </span>
                    <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed">{p.description}</p>
                    <div className="mt-3 text-xs font-mono text-[var(--text3)] space-y-1">
                      {events && <div>&bull; {formatCompact(events)} billable credits/mo</div>}
                      {p.baseQuotas?.["quota.ai_credits"] && (
                        <div>&bull; {formatNumber(p.baseQuotas["quota.ai_credits"])} AI investigation credits</div>
                      )}
                      {p.baseQuotas?.["quota.projects"] && (
                        <div>&bull; Up to {p.baseQuotas["quota.projects"]} projects</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--border)]">
                    {isCurrent ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Active Plan
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => changePlanMutation.mutate(p.id)}
                        disabled={changePlanMutation.isPending}
                      >
                        Switch to {p.displayName || p.name}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsUpgradeOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
