import { PageHeader, KpiCard, Button, SectionCard } from "@/shared/observe";
import { Check, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { toast } from "sonner";

/* ── Feature key → human label mapping ─────────────────────── */
const LABEL: Record<string, string> = {
  max_projects: "Max Projects",
  max_environments: "Max Environments",
  max_team_members: "Team Members",
  max_api_keys: "API Keys",
  event_limit_monthly: "Monthly Events",
  log_retention_days: "Log Retention",
  audit_log_retention_days: "Audit Log Retention",
  queue_size_max: "Queue Size",
  breadcrumbs_max: "Breadcrumbs",
  alert_rules_max: "Alert Rules",
  notification_channels_max: "Notification Channels",
  custom_webhooks_max: "Custom Webhooks",
  batch_size: "Batch Size",
  compression: "Compression",
  custom_plugins_max: "Custom Plugins",
  email_alerts: "Email Alerts & Error Tracking",
  error_tracking: "Error Tracking",
  global_error_handlers: "Global Error Handlers",
  sso_saml: "SSO SAML",
  scim: "SCIM Provisioning",
  priority_support: "Priority Support",
  slack_integration: "Slack Integration",
  pagerduty_integration: "PagerDuty Integration",
  log_export_s3: "Log Export (S3)",
  ai_error_root_cause: "AI Error Root Cause",
  session_management: "Session Management",
  metrics_collection: "Metrics Collection",
  sla_uptime_guarantee: "SLA Uptime Guarantee",
};

/* ── Keys shown as hero limit cards (only the important ones) ─── */
const CORE_LIMIT_KEYS = [
  "max_projects",
  "max_environments",
  "max_team_members",
  "max_api_keys",
];

/* ── Group definitions for included features ─────────────────── */
const FEATURE_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Data & Capacity",
    keys: [
      "log_retention_days",
      "audit_log_retention_days",
      "queue_size_max",
      "breadcrumbs_max",
    ],
  },
  {
    title: "Monitoring & Alerts",
    keys: [
      "email_alerts",
      "global_error_handlers",
      "alert_rules_max",
      "notification_channels_max",
    ],
  },
];

/* ── Features to tease in the "not in current plan" box ────── */
const UPGRADE_TEASE_KEYS = [
  "sso_saml",
  "priority_support",
  "slack_integration",
  "pagerduty_integration",
  "log_export_s3",
  "ai_error_root_cause",
  "session_management",
  "custom_plugins_max",
];

function label(key: string) {
  return LABEL[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === -1 || value === "-1") return "∞";
  if (typeof value === "boolean") return value ? "ENABLED" : "DISABLED";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value === "none") return "None";
    return value;
  }
  return String(value ?? "-");
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string" && !isNaN(Number(value)) && value !== "") return true;
  return false;
}

function suffixForKey(key: string, value: unknown): string {
  if (value === -1 || value === "-1") return "";
  if (key.includes("retention") && isNumericLike(value)) return " Days";
  return "";
}

export default function PlanPage() {
  const { activeOrgId } = useOrganizations();

  const { data: summary, isLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "summary"],
    queryFn: () => orgApi.getBillingSummary(activeOrgId!),
    enabled: !!activeOrgId,
  });

  if (isLoading)
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  if (!summary)
    return <div className="text-sm text-[var(--text2)]">Billing summary unavailable.</div>;

  const features: Record<string, unknown> = summary.plan.features || {};

  /* Derive lists */
  const coreLimits = CORE_LIMIT_KEYS
    .filter((k) => features[k] !== undefined)
    .map((k) => ({ key: k, value: features[k] }));

  const disabledTeaseFeatures = UPGRADE_TEASE_KEYS.filter((k) => {
    const v = features[k];
    return v === false || v === 0 || v === "none" || v === undefined;
  });

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Plan & Subscription"
          description="Manage your organization's subscription state and plan details."
        />
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => toast.info("Customer billing portal flow is not surfaced yet")}
          >
            Billing Portal
          </Button>
          <Button
            variant="primary"
            onClick={() => toast.info("Plan change flow is not surfaced yet")}
          >
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Plan key" value={summary.plan.key || "unassigned"} />
        <KpiCard label="Plan tier" value={summary.plan.tier || "unassigned"} />
        <KpiCard label="Subscription" value={summary.subscription.status} />
        <KpiCard
          label="Monthly event limit"
          value={
            summary.plan.eventLimitMonthly === -1
              ? "∞"
              : summary.plan.eventLimitMonthly >= 999999999
              ? "Unlimited"
              : summary.plan.eventLimitMonthly.toLocaleString()
          }
        />
      </div>

      <SectionCard title="Current Plan Entitlements">
        <div className="flex flex-col gap-8">
          {/* Plan hero */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-[var(--text)]">
                  {summary.plan.tier || summary.plan.key || "Plan"}
                </span>
                <span className="rounded-full bg-[var(--brand-bg)] px-3 py-1 text-xs font-semibold text-[var(--brand)] uppercase tracking-wide">
                  {summary.subscription.status}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-[var(--text2)]">
                <span>
                  Hard cap:{" "}
                  <span className="font-medium text-[var(--text)]">
                    {summary.plan.hardCap ? "Enabled" : "Disabled"}
                  </span>
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[var(--text)]">
                {summary.plan.eventLimitMonthly === -1
                  ? "∞"
                  : summary.plan.eventLimitMonthly >= 999999999
                  ? "Unlimited"
                  : summary.plan.eventLimitMonthly.toLocaleString()}
              </div>
              <div className="text-sm text-[var(--text2)] mt-1">Events / month</div>
            </div>
          </div>

          {/* ── CORE PLAN LIMITS ────────────────────────────── */}
          {coreLimits.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mb-4">
                Core Plan Limits
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {coreLimits.map(({ key, value }) => (
                  <div
                    key={key}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-[var(--text2)]">{label(key)}</span>
                    <span className="text-3xl font-bold text-[var(--brand)]">
                      {formatValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INCLUDED FEATURES (grouped) ────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mb-6">
              Included Features
            </h3>
            <div className="flex flex-col gap-8">
              {FEATURE_GROUPS.map((group) => {
                const items = group.keys.filter((k) => features[k] !== undefined);
                if (items.length === 0) return null;
                return (
                  <div key={group.title}>
                    <h4 className="text-[15px] font-bold text-[var(--text)] mb-4">{group.title}</h4>
                    <div className="flex flex-col gap-2">
                      {items.map((k) => {
                        const v = features[k];
                        const isBool = typeof v === "boolean";
                        const isEnabled = v === true || (isNumericLike(v) && (Number(v) > 0 || Number(v) === -1));
                        const suffix = suffixForKey(k, v);
                        return (
                          <div
                            key={k}
                            className="flex items-center justify-between py-2.5 px-1 border-b border-[var(--border)]"
                          >
                            <div className="flex items-center gap-3">
                              {isEnabled ? (
                                <Check className="size-4 shrink-0 text-[var(--brand)]" />
                              ) : (
                                <X className="size-4 shrink-0 text-[var(--text3)]" />
                              )}
                              <span
                                className={
                                  isEnabled
                                    ? "text-sm font-medium text-[var(--text)]"
                                    : "text-sm text-[var(--text3)]"
                                }
                              >
                                {label(k)}
                              </span>
                            </div>
                            <div>
                              {isBool ? (
                                <span
                                  className={`text-xs font-bold uppercase tracking-wider ${
                                    isEnabled ? "text-[var(--brand)]" : "text-[var(--text3)]"
                                  }`}
                                >
                                  {isEnabled ? "Enabled" : "Disabled"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-[var(--bg3)] px-2.5 py-1 text-xs font-semibold font-mono text-[var(--brand)]">
                                  {formatValue(v)}{suffix}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── FEATURES NOT IN CURRENT PLAN ────────────────── */}
          {disabledTeaseFeatures.length > 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg2)] p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">
                  Features Not In Current Plan
                </h3>
                <Button
                  variant="secondary"
                  onClick={() => toast.info("Plan change flow is not surfaced yet")}
                >
                  Upgrade Plan
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                {disabledTeaseFeatures.slice(0, 8).map((k) => (
                  <div key={k} className="flex items-center gap-2.5">
                    <X className="size-3.5 shrink-0 text-[var(--text3)]" />
                    <span className="text-sm text-[var(--text3)]">{label(k)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
