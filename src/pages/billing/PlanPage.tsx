import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Ban,
  Check,
  CreditCard,
  ExternalLink,
  Gauge,
  Minus,
  Receipt,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
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

/* ── Types for the billing-summary payload this page reads ──────────
   The API layer is untouched; this is a local read-shape so the page can
   render the response without `any` access. */
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

const UNLIMITED_SENTINEL = 999_999_999;
const SKELETON_ROWS = ["one", "two", "three", "four"];
const PLAN_CHANGE_MESSAGE = "Plan change flow is not surfaced yet";
const PORTAL_MESSAGE = "Customer billing portal flow is not surfaced yet";

function normalizeLimit(limit: number | null | undefined): number | null {
  if (limit === null || limit === undefined) return null;
  if (limit === -1 || limit >= UNLIMITED_SENTINEL) return null;
  return limit;
}

function formatLimit(limit: number | null | undefined): string {
  const normalized = normalizeLimit(limit);
  return normalized === null ? "∞" : formatCompact(normalized);
}

function statusTone(status: string | null | undefined): SurfaceTone {
  return STATUS_TONE[String(status ?? "").toLowerCase()] ?? "neutral";
}

function titleCase(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function entitlementLabel(featureKey: string): string {
  return featureKey
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function entitlementDisplay(value: EntitlementValue): { value: string; enabled: boolean } {
  if (value.booleanValue !== null && value.booleanValue !== undefined) {
    return { value: value.booleanValue ? "Included" : "Off", enabled: value.booleanValue };
  }
  if (value.integerValue !== null && value.integerValue !== undefined) {
    return { value: formatLimit(value.integerValue), enabled: value.integerValue !== 0 };
  }
  if (value.decimalValue !== null && value.decimalValue !== undefined) {
    return { value: String(value.decimalValue), enabled: value.decimalValue !== 0 };
  }
  if (value.stringValue !== null && value.stringValue !== undefined) {
    return { value: value.stringValue, enabled: true };
  }
  return { value: "Not configured", enabled: false };
}

/* ── One-off rows for the plan cards ─────────────────────────────── */

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

  const status = String(plan.subscriptionStatus ?? "unknown");
  const tone = statusTone(status);
  const planName = titleCase(plan.planTier, "Unassigned");
  const eventCeiling = plan.eventLimitMonthly ?? events?.limit ?? null;
  const entitlementRows = Object.entries(entitlements ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([featureKey, value]) => ({ featureKey, ...entitlementDisplay(value) }));

  const facts: HeroFact[] = [
    { label: "Plan", value: planName, icon: CreditCard },
    { label: "Subscription", value: titleCase(status, "Unknown"), tone, icon: ShieldCheck },
    {
      label: "Seats",
      value: `${formatNumber(seats?.used ?? 0)} / ${formatLimit(seats?.limit)}`,
      icon: Users,
    },
    { label: "Events per month", value: formatLimit(eventCeiling), icon: Gauge },
  ];

  const ssoEnabled = Boolean(sso?.enabled);
  const scimEnabled = Boolean(scim?.enabled);
  const headroomAvailable =
    !ssoEnabled || !scimEnabled || normalizeLimit(eventCeiling) !== null || normalizeLimit(seats?.limit) !== null;

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
            <Button variant="primary" onClick={() => toast.info(PLAN_CHANGE_MESSAGE)}>
              <ArrowUpRight className="size-4" aria-hidden="true" />
              Upgrade plan
            </Button>
          </>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <SectionHeading
        title="Plan"
        description="Your current tier and the entitlements a higher tier would raise."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel
          title={planName}
          description="Everything active on this organization today."
          icon={CreditCard}
          tone="brand"
          actions={<Pill tone="green">Current plan</Pill>}
          footer={
            <span className="text-[12px] text-[var(--text3)]">
              Hard cap {plan.hardCap ? "enabled" : "disabled"} on monthly events
            </span>
          }
        >
          <div className="divide-y divide-[var(--border)]">
            {entitlementRows.length > 0 ? entitlementRows.map((entitlement) => (
              <EntitlementLine
                key={entitlement.featureKey}
                label={entitlementLabel(entitlement.featureKey)}
                value={entitlement.value}
                enabled={entitlement.enabled}
              />
            )) : (
              <EntitlementLine label="Monthly events" value={formatLimit(eventCeiling)} enabled />
            )}
          </div>
        </Panel>

        <Panel
          title="More headroom"
          description="Raising your tier lifts these ceilings and unlocks the enterprise identity channel."
          icon={ArrowUpRight}
          tone="brand"
          className="border-[var(--brand)]/40"
          actions={<Pill tone="brand">Recommended</Pill>}
          footer={
            <Button variant="primary" onClick={() => toast.info(PLAN_CHANGE_MESSAGE)}>
              <ArrowUpRight className="size-4" aria-hidden="true" />
              Upgrade plan
            </Button>
          }
        >
          {headroomAvailable ? (
            <div className="divide-y divide-[var(--border)]">
              <EntitlementLine
                label="Monthly event ceiling"
                value={`Now ${formatLimit(eventCeiling)}`}
                enabled={false}
              />
              <EntitlementLine label="Team seats" value={`Now ${formatLimit(seats?.limit)}`} enabled={false} />
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
          ) : (
            <p className="text-[13px] leading-relaxed text-[var(--text2)]">
              This organization already runs on unlimited ceilings with the enterprise identity channel enabled.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Quota and entitlement usage"
        description="Consumption against the ceilings granted by this plan."
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
              label="Monthly events"
              used={events.used ?? 0}
              limit={normalizeLimit(events.limit)}
              format={formatCompact}
              hint={
                events.remaining === null || events.remaining === undefined
                  ? undefined
                  : `${formatCompact(events.remaining)} remaining this cycle`
              }
            />
          )}
          {aiCredits && (
            <Meter
              label="AI credits"
              used={aiCredits.used ?? 0}
              limit={normalizeLimit(aiCredits.limit)}
              format={formatCompact}
              hint={
                aiCredits.remaining === null || aiCredits.remaining === undefined
                  ? undefined
                  : `${formatCompact(aiCredits.remaining)} credits remaining`
              }
            />
          )}
          {seats && (
            <Meter label="Team seats" used={seats.used ?? 0} limit={normalizeLimit(seats.limit)} format={formatNumber} />
          )}
          {sso && (
            <Meter
              label="SSO providers"
              used={sso.used ?? 0}
              limit={normalizeLimit(sso.limit)}
              format={formatNumber}
              hint={ssoEnabled ? undefined : "Not included in this plan"}
            />
          )}
          {scim && (
            <Meter
              label="SCIM tokens"
              used={scim.used ?? 0}
              limit={normalizeLimit(scim.limit)}
              format={formatNumber}
              hint={scimEnabled ? undefined : "Not included in this plan"}
            />
          )}
        </div>
      </Panel>

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
              label="Downgrade plan"
              description="Lower ceilings apply at the start of the next billing cycle. Usage above the new ceiling is rejected once the hard cap is on."
            >
              <Button variant="secondary" onClick={() => toast.info(PLAN_CHANGE_MESSAGE)}>
                Downgrade
              </Button>
            </SettingRow>
          </Row>
          <Row>
            <SettingRow
              label="Cancel subscription"
              description="Ingestion stops at the end of the paid period and dashboards move to read-only."
            >
              <Button variant="danger" onClick={() => toast.info(PLAN_CHANGE_MESSAGE)}>
                <Ban className="size-4" aria-hidden="true" />
                Cancel subscription
              </Button>
            </SettingRow>
          </Row>
        </RowStack>
      </Panel>
    </div>
  );
}
