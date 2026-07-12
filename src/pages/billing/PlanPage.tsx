import { ArrowUpRight, Check, CreditCard, Gauge, Sparkles, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  Button,
  DetailSkeleton,
  IconTile,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/shared/observe";

/* ── Feature key → human label mapping ─────────────────────── */
const LABEL: Record<string, string> = {
  max_projects: "Max projects",
  max_environments: "Max environments",
  max_team_members: "Team members",
  max_api_keys: "API keys",
  event_limit_monthly: "Monthly events",
  log_retention_days: "Log retention",
  audit_log_retention_days: "Audit log retention",
  queue_size_max: "Queue size",
  breadcrumbs_max: "Breadcrumbs",
  alert_rules_max: "Alert rules",
  notification_channels_max: "Notification channels",
  custom_webhooks_max: "Custom webhooks",
  batch_size: "Batch size",
  compression: "Compression",
  custom_plugins_max: "Custom plugins",
  email_alerts: "Email alerts & error tracking",
  error_tracking: "Error tracking",
  global_error_handlers: "Global error handlers",
  sso_saml: "SSO SAML",
  scim: "SCIM provisioning",
  priority_support: "Priority support",
  slack_integration: "Slack integration",
  pagerduty_integration: "PagerDuty integration",
  log_export_s3: "Log export (S3)",
  ai_error_root_cause: "AI error root cause",
  session_management: "Session management",
  metrics_collection: "Metrics collection",
  sla_uptime_guarantee: "SLA uptime guarantee",
};

/* ── Keys shown as hero limit cards (only the important ones) ─── */
const CORE_LIMIT_KEYS = ["max_projects", "max_environments", "max_team_members", "max_api_keys"];

/* ── Group definitions for included features ─────────────────── */
const FEATURE_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Data & capacity",
    keys: ["log_retention_days", "audit_log_retention_days", "queue_size_max", "breadcrumbs_max"],
  },
  {
    title: "Monitoring & alerts",
    keys: ["email_alerts", "global_error_handlers", "alert_rules_max", "notification_channels_max"],
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
  return LABEL[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === -1 || value === "-1") return "∞";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
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
  if (key.includes("retention") && isNumericLike(value)) return " days";
  return "";
}

function formatEventLimit(limit: number): string {
  if (limit === -1 || limit >= 999999999) return "Unlimited";
  return limit.toLocaleString();
}

export default function PlanPage() {
  const { activeOrgId } = useOrganizations();

  const { data: summary, isLoading } = useQuery({
    queryKey: [...orgQueryKeys.billing(activeOrgId!), "summary"],
    queryFn: () => orgApi.getBillingSummary(activeOrgId!),
    enabled: !!activeOrgId,
  });

  if (isLoading) return <DetailSkeleton />;
  if (!summary) return <div className="text-sm text-[var(--text2)]">Billing summary unavailable.</div>;

  const features: Record<string, unknown> = summary.plan.features || {};

  const coreLimits = CORE_LIMIT_KEYS.filter((k) => features[k] !== undefined).map((k) => ({
    key: k,
    value: features[k],
  }));

  const disabledTeaseFeatures = UPGRADE_TEASE_KEYS.filter((k) => {
    const v = features[k];
    return v === false || v === 0 || v === "none" || v === undefined;
  });

  const planName = summary.plan.tier || summary.plan.key || "Plan";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Plan & subscription"
        description="Manage your organization's subscription state and plan details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => toast.info("Customer billing portal flow is not surfaced yet")}>
              <CreditCard className="size-4" />
              Billing portal
            </Button>
            <Button variant="primary" onClick={() => toast.info("Plan change flow is not surfaced yet")}>
              <ArrowUpRight className="size-4" />
              Upgrade plan
            </Button>
          </div>
        }
      />

      {/* ── Current plan hero ── */}
      <div className="rounded-[12px] border border-[var(--brand)]/30 bg-[var(--bg1)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <IconTile icon={Sparkles} tone="brand" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Current plan</span>
                <StatusBadge status={summary.subscription.status} />
              </div>
              <h2 className="mt-0.5 text-2xl font-semibold capitalize text-[var(--text)]">{planName}</h2>
              <p className="mt-0.5 text-[12px] text-[var(--text2)]">
                Hard cap {summary.plan.hardCap ? "enabled" : "disabled"} — plan key{" "}
                <span className="font-[family-name:var(--mono)]">{summary.plan.key || "unassigned"}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col sm:items-end">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Events / month</span>
            <span className="mt-1 font-[family-name:var(--mono)] text-3xl font-semibold tabular-nums text-[var(--text)]">
              {formatEventLimit(summary.plan.eventLimitMonthly)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Core plan limits ── */}
      {coreLimits.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {coreLimits.map(({ key, value }) => (
            <div key={key} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">{label(key)}</span>
                <Gauge className="size-4 text-[var(--text3)]" />
              </div>
              <div className="mt-2 font-[family-name:var(--mono)] text-2xl font-semibold tabular-nums text-[var(--brand)]">
                {formatValue(value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Included features ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {FEATURE_GROUPS.map((group) => {
          const items = group.keys.filter((k) => features[k] !== undefined);
          if (items.length === 0) return null;
          return (
            <SectionCard key={group.title} title={group.title}>
              <div className="flex flex-col">
                {items.map((k, idx) => {
                  const v = features[k];
                  const isBool = typeof v === "boolean";
                  const isEnabled = v === true || (isNumericLike(v) && (Number(v) > 0 || Number(v) === -1));
                  const suffix = suffixForKey(k, v);
                  return (
                    <div
                      key={k}
                      className={`flex items-center justify-between gap-4 py-2.5 ${
                        idx < items.length - 1 ? "border-b border-[var(--border)]" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {isEnabled ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                            <Check className="size-3 text-[var(--green)]" />
                          </span>
                        ) : (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)]">
                            <X className="size-3 text-[var(--text3)]" />
                          </span>
                        )}
                        <span className={isEnabled ? "text-[13px] font-medium text-[var(--text)]" : "text-[13px] text-[var(--text3)]"}>
                          {label(k)}
                        </span>
                      </div>
                      {isBool ? (
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-wider ${
                            isEnabled ? "text-[var(--green)]" : "text-[var(--text3)]"
                          }`}
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center rounded-[5px] bg-[var(--bg3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[11px] font-semibold text-[var(--brand)]">
                          {formatValue(v)}
                          {suffix}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          );
        })}
      </div>

      {/* ── Upgrade teaser ── */}
      {disabledTeaseFeatures.length > 0 && (
        <div className="rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <IconTile icon={ArrowUpRight} tone="neutral" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Not in your current plan</h3>
                <p className="mt-0.5 text-[12px] text-[var(--text2)]">Upgrade to unlock these capabilities.</p>
              </div>
            </div>
            <Button variant="primary" onClick={() => toast.info("Plan change flow is not surfaced yet")}>
              Upgrade plan
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2">
            {disabledTeaseFeatures.slice(0, 8).map((k) => (
              <div key={k} className="flex items-center gap-2.5">
                <X className="size-3.5 shrink-0 text-[var(--text3)]" />
                <span className="text-[13px] text-[var(--text3)]">{label(k)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
