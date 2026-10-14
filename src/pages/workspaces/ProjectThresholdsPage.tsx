import { useMemo, useState, type ReactNode } from "react";
import { BellOff, Loader2, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  useOrganizationAlertPolicies,
  useProjectPolicyMutations,
  useProjectPolicySubscriptions,
} from "@/modules/alerting/hooks/useAlerting";
import type {
  AlertSeverity,
  OrganizationAlertPolicy,
  ProjectOverride,
  ProjectSubscription,
  SubscriptionState,
} from "@/modules/alerting/api/types";
import {
  ProjectOverrideModal,
  formatDuration,
  formatThreshold,
} from "@/modules/alerting/components/ProjectOverrideModal";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import { orgRoutes } from "@/app/router/org-routes";
import { apiErrorMessage, ConfirmDialog } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_XL,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Pill, SegmentedControl, type SegmentOption } from "@/shared/ui/pulse";
import { FilterSelect, SeverityBadge, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 15;

type SubscriptionFilter = "all" | "subscribed" | "overridden" | "unsubscribed";

const NO_SUBSCRIPTIONS: ProjectSubscription[] = [];

const STATE_OPTIONS: Array<{ value: SubscriptionState; label: string }> = [
  { value: "subscribed", label: "Subscribed" },
  { value: "paused", label: "Paused" },
  { value: "muted", label: "Muted" },
  { value: "disabled", label: "Disabled" },
];

// The dot carries the state colour so the control itself stays neutral.
const STATE_DOT: Record<SubscriptionState, string> = {
  subscribed: "bg-[var(--green)]",
  paused: "bg-[var(--amber)]",
  muted: "bg-[var(--amber)]",
  disabled: "bg-[var(--text3)]",
  archived: "bg-[var(--text3)]",
};

const STATE_SELECT_CLASS =
  "h-8 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2 text-[12px] text-[var(--text)] outline-none transition-colors hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)]";

const COLUMNS: SheetColumn[] = [
  { key: "rule", header: "Rule" },
  { key: "category", header: "Category", className: `w-[128px] ${HIDE_BELOW_XL}` },
  { key: "threshold", header: "Threshold", className: "w-[156px]" },
  { key: "window", header: "Window", className: `w-[128px] ${HIDE_BELOW_LG}` },
  { key: "severity", header: "Severity", className: `w-[112px] ${HIDE_BELOW_MD}` },
  { key: "state", header: "State", className: "w-[164px]" },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[56px]" },
];

// ── data helpers ─────────────────────────────────────────────

/** Matches a policy to its active project subscription across all possible IDs and slugs */
function findSubscriptionForPolicy(
  policy: OrganizationAlertPolicy,
  subscriptions: ProjectSubscription[],
): ProjectSubscription | undefined {
  return subscriptions.find(
    (s) =>
      s.policyId === policy.id ||
      s.catalogPolicyId === policy.id ||
      s.ruleId === policy.id ||
      (s.presetKey && s.presetKey === policy.slug) ||
      s.policyId === policy.slug ||
      s.policy?.id === policy.id ||
      s.policy?.slug === policy.slug,
  );
}

/** Extracts valid override data from either structured or flat subscription payload */
function extractOverride(subscription?: ProjectSubscription | null): ProjectOverride | null {
  if (!subscription) return null;
  if (subscription.override) {
    const o = subscription.override;
    const hasValues =
      (o.threshold != null && (typeof o.threshold !== "object" || Object.keys(o.threshold).length > 0)) ||
      o.cooldownSeconds != null ||
      o.evaluationWindowSeconds != null ||
      o.severity != null ||
      (o.channels != null && o.channels.length > 0) ||
      o.escalationPolicyId != null;
    if (hasValues) return o;
  }

  const hasFlatValues =
    (subscription.threshold != null && (typeof subscription.threshold !== "object" || Object.keys(subscription.threshold).length > 0)) ||
    subscription.cooldownSeconds != null ||
    subscription.evaluationWindowSeconds != null ||
    subscription.severity != null ||
    (subscription.channels != null && subscription.channels.length > 0) ||
    subscription.escalationPolicyId != null ||
    subscription.mode === "override";

  if (hasFlatValues) {
    return {
      id: subscription.id,
      subscriptionId: subscription.id,
      projectId: subscription.projectId,
      policyId: subscription.policyId,
      threshold: subscription.threshold,
      cooldownSeconds: subscription.cooldownSeconds,
      evaluationWindowSeconds: subscription.evaluationWindowSeconds,
      severity: subscription.severity,
      channels: subscription.channels,
      escalationPolicyId: subscription.escalationPolicyId,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  return null;
}

/** A threshold override counts only when it carries a value, not an empty object. */
function hasThresholdValue(threshold: unknown): boolean {
  return threshold != null && (typeof threshold !== "object" || Object.keys(threshold as object).length > 0);
}

const labelCase = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

/** Names what a project override changes, for the row's accessible description. */
function overrideSummary(override: ProjectOverride): string {
  const parts: string[] = [];
  if (hasThresholdValue(override.threshold)) parts.push("threshold");
  if (override.evaluationWindowSeconds != null) parts.push("window");
  if (override.cooldownSeconds != null) parts.push("cooldown");
  if (override.severity != null) parts.push("severity");
  if (override.channels && override.channels.length > 0) parts.push(`channels (${override.channels.join(", ")})`);
  if (override.environment) parts.push(`environment (${override.environment})`);
  if (override.escalationPolicyId) parts.push("escalation policy");
  return parts.length > 0 ? `Project overrides: ${parts.join(", ")}` : "Project overrides organization defaults";
}

/** Readings for every subscription of this project, independent of the catalog page. */
function summarizeSubscriptions(subscriptions: ProjectSubscription[]) {
  let enabled = 0;
  let disabled = 0;
  let overridden = 0;
  for (const subscription of subscriptions) {
    if (subscription.state === "disabled" || subscription.state === "archived") disabled += 1;
    else enabled += 1;
    if (extractOverride(subscription)) overridden += 1;
  }
  return { subscribed: subscriptions.length, enabled, disabled, overridden };
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectThresholdsPage() {
  const { projectId, project, orgSlug } = useCurrentProject();
  const [page, setPage] = useState(0);
  const {
    data: policiesPage,
    isLoading: policiesLoading,
    error: policiesError,
    refetch: refetchPolicies,
  } = useOrganizationAlertPolicies({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const policies = policiesPage?.data ?? [];
  const totalPolicies = policiesPage?.total ?? policies.length;
  const {
    data: subscriptionsData,
    isLoading: subscriptionsLoading,
    error: subscriptionsError,
    refetch: refetchSubscriptions,
  } = useProjectPolicySubscriptions(projectId);
  const subscriptions = subscriptionsData ?? NO_SUBSCRIPTIONS;
  const mutations = useProjectPolicyMutations(projectId);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>("all");

  // Modal states
  const [selectedSubscription, setSelectedSubscription] = useState<ProjectSubscription | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<OrganizationAlertPolicy | null>(null);
  const [unsubscribingTarget, setUnsubscribingTarget] = useState<{
    policy: OrganizationAlertPolicy;
    subscription: ProjectSubscription;
  } | null>(null);

  // Subscribing in-flight tracking
  const [subscribingPolicyId, setSubscribingPolicyId] = useState<string | null>(null);

  // Counts for the filter control. Filters run on the loaded catalog page.
  const subscribedCount = useMemo(() => {
    return policies.filter((p) => {
      const sub = findSubscriptionForPolicy(p, subscriptions);
      return Boolean(sub);
    }).length;
  }, [policies, subscriptions]);

  const overriddenCount = useMemo(() => {
    return policies.filter((p) => {
      const sub = findSubscriptionForPolicy(p, subscriptions);
      return Boolean(extractOverride(sub));
    }).length;
  }, [policies, subscriptions]);

  const unsubscribedCount = useMemo(() => {
    return Math.max(0, policies.length - subscribedCount);
  }, [policies.length, subscribedCount]);

  // Readings for the whole project, not the page or the filter.
  const summary = useMemo(() => summarizeSubscriptions(subscriptions), [subscriptions]);

  // Categories extracted from policies
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of policies) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [policies]);

  // Filtered policies list
  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === "all" || policy.category === selectedCategory;

      const sub = findSubscriptionForPolicy(policy, subscriptions);
      const isSubscribed = Boolean(sub);
      const isOverridden = Boolean(extractOverride(sub));

      const matchesSubscription =
        subscriptionFilter === "all" ||
        (subscriptionFilter === "subscribed" && isSubscribed) ||
        (subscriptionFilter === "overridden" && isSubscribed && isOverridden) ||
        (subscriptionFilter === "unsubscribed" && !isSubscribed);

      return matchesSearch && matchesCategory && matchesSubscription;
    });
  }, [policies, searchQuery, selectedCategory, subscriptionFilter, subscriptions]);

  const openOverrideModal = (subscription: ProjectSubscription, policy: OrganizationAlertPolicy) => {
    setSelectedSubscription(subscription);
    setSelectedPolicy(policy);
  };

  const handleSubscribe = (policy: OrganizationAlertPolicy) => {
    setSubscribingPolicyId(policy.id);
    mutations.subscribe.mutate(policy.id, {
      onSuccess: () => {
        toast.success(`Subscribed project to ${policy.name}`);
        setSubscribingPolicyId(null);
      },
      onError: (error) => {
        toast.error(apiErrorMessage(error, "Could not subscribe project."));
        setSubscribingPolicyId(null);
      },
    });
  };

  const handleStateChange = (subscription: ProjectSubscription, state: SubscriptionState) => {
    mutations.updateState.mutate(
      {
        subscriptionId: subscription.id,
        state,
      },
      {
        onSuccess: () => toast.success("Subscription state updated"),
        onError: (error) => toast.error(apiErrorMessage(error, "Could not update subscription.")),
      },
    );
  };

  const handleSaveOverride = (payload: {
    subscriptionId: string;
    override: {
      threshold?: Record<string, unknown> | null;
      cooldownSeconds?: number | null;
      evaluationWindowSeconds?: number | null;
      severity?: AlertSeverity | null;
      channels?: string[] | null;
      environment?: string | null;
    };
  }) => {
    mutations.updateOverride.mutate(
      {
        subscriptionId: payload.subscriptionId,
        override: payload.override as Record<string, unknown>,
      },
      {
        onSuccess: () => {
          toast.success("Policy override saved successfully");
          setSelectedSubscription(null);
          setSelectedPolicy(null);
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not save override.")),
      },
    );
  };

  const handleRemoveOverride = (subscriptionId: string) => {
    mutations.updateOverride.mutate(
      {
        subscriptionId,
        override: {
          threshold: null,
          cooldownSeconds: null,
          evaluationWindowSeconds: null,
          severity: null,
          channels: null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Overrides cleared. Policy reset to organization defaults.");
          setSelectedSubscription(null);
          setSelectedPolicy(null);
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not clear overrides.")),
      },
    );
  };

  const handleConfirmUnsubscribe = () => {
    if (!unsubscribingTarget) return;
    const { policy, subscription } = unsubscribingTarget;
    mutations.remove.mutate(subscription.id, {
      onSuccess: () => {
        toast.success(`Unsubscribed project from ${policy.name}`);
        setUnsubscribingTarget(null);
      },
      onError: (error) => {
        toast.error(apiErrorMessage(error, "Could not unsubscribe project."));
      },
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSubscriptionFilter("all");
  };

  // ── derived view state ─────────────────────────────────────

  const tableLoading =
    (policiesLoading && policies.length === 0) || (subscriptionsLoading && subscriptions.length === 0);
  const policiesFailed = Boolean(policiesError) && !policiesPage;
  const subscriptionsFailed = Boolean(subscriptionsError) && !subscriptionsData;
  const loadFailed = policiesFailed || subscriptionsFailed;
  const paginated = page > 0 || totalPolicies > PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(totalPolicies / PAGE_SIZE));
  const onThisPage = paginated ? " on this page" : "";

  const readouts: Readout[] = [
    { label: "Catalog rules", value: formatNumber(totalPolicies), sub: "In the organization catalog" },
    { label: "Subscribed", value: formatNumber(summary.subscribed), sub: `${formatNumber(summary.enabled)} enabled` },
    { label: "Overridden", value: formatNumber(summary.overridden), sub: "Set project-specific values" },
    {
      label: "Disabled",
      value: formatNumber(summary.disabled),
      tone: summary.disabled > 0 ? "warn" : "neutral",
      sub: summary.disabled > 0 ? "Subscribed but switched off" : "None disabled",
    },
  ];

  const filterOptions: SegmentOption<SubscriptionFilter>[] = [
    { value: "all", label: "All", count: policies.length },
    { value: "subscribed", label: "Subscribed", count: subscribedCount },
    { value: "overridden", label: "Overridden", count: overriddenCount },
    { value: "unsubscribed", label: "Not subscribed", count: unsubscribedCount },
  ];

  const categoryOptions = [
    { value: "all", label: "All" },
    ...categories.map((category) => ({ value: category, label: labelCase(category) })),
  ];

  let body: ReactNode;
  if (tableLoading) {
    body = <SheetLoading rows={8} label="Loading alert rules" />;
  } else if (policiesFailed) {
    body = (
      <SheetError
        title="Could not load alert rules"
        message={apiErrorMessage(policiesError, "The organization's rule catalog is unavailable right now.")}
        onRetry={() => void refetchPolicies()}
      />
    );
  } else if (subscriptionsFailed) {
    body = (
      <SheetError
        title="Could not load this project's subscriptions"
        message={apiErrorMessage(subscriptionsError, "Subscriptions are unavailable right now.")}
        onRetry={() => void refetchSubscriptions()}
      />
    );
  } else if (policies.length === 0) {
    body =
      page > 0 ? (
        <SheetEmpty
          title="No rules on this page"
          description="The catalog has fewer rules than this page expects."
          action={
            <UiButton variant="outline" size="lg" onClick={() => setPage(0)}>
              Go to first page
            </UiButton>
          }
        />
      ) : (
        <SheetEmpty
          title="No alert rules in the catalog"
          description="Alert rules are defined once for the organization, and each project subscribes to the ones it needs. Once the catalog has rules, subscribe this project to them here."
          action={
            <TextLink to={orgRoutes.alerts(orgSlug, "rules")} arrow>
              Open organization alert rules
            </TextLink>
          }
        />
      );
  } else if (filteredPolicies.length === 0) {
    body = (
      <SheetEmpty
        title="No rules match"
        description={
          searchQuery.trim()
            ? `Nothing${onThisPage} matches “${searchQuery.trim()}” with the current filters.`
            : `No rule${onThisPage} matches the current filters.`
        }
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Alert rules for this project" minWidth={600}>
        {filteredPolicies.map((policy) => {
          const subscription = findSubscriptionForPolicy(policy, subscriptions);
          const override = extractOverride(subscription);
          const thresholdOverridden = hasThresholdValue(override?.threshold);

          const defaultThresholdDisplay = formatThreshold(policy.defaultThreshold);
          const effectiveThresholdDisplay = thresholdOverridden
            ? formatThreshold(override?.threshold)
            : defaultThresholdDisplay;
          const effectiveCooldown = override?.cooldownSeconds ?? policy.cooldownSeconds;
          const effectiveWindow = override?.evaluationWindowSeconds ?? policy.evaluationWindowSeconds;
          const effectiveSeverity = override?.severity ?? policy.severity;
          const signal = policy.expression || policy.metricSource || policy.slug;
          const overrideNote = override ? overrideSummary(override) : null;

          const isCurrentlySubscribing = subscribingPolicyId === policy.id;

          return (
            <SheetRow key={policy.id}>
              <SheetCell>
                <RowTitle
                  title={
                    <span title={policy.description || undefined}>
                      {policy.name}
                      {policy.description && <span className="sr-only">. {policy.description}</span>}
                    </span>
                  }
                  badges={
                    <>
                      <code className="hidden shrink-0 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)] 2xl:inline">
                        {policy.slug}
                      </code>
                      {overrideNote && (
                        <span className="shrink-0" title={overrideNote}>
                          <Pill>Overridden</Pill>
                          <span className="sr-only">{overrideNote}</span>
                        </span>
                      )}
                    </>
                  }
                  subtitle={<span title={signal}>{signal}</span>}
                  subtitleMono
                />
              </SheetCell>

              <SheetCell className={HIDE_BELOW_XL}>
                <span className="block truncate text-[12px] text-[var(--text2)]">
                  {labelCase(policy.category || "general")}
                </span>
              </SheetCell>

              <SheetCell>
                <div className="flex min-w-0 flex-col gap-0.5 leading-[1.35]">
                  <span
                    className="truncate font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]"
                    title={effectiveThresholdDisplay}
                  >
                    {effectiveThresholdDisplay}
                  </span>
                  <span className="truncate text-[12px] text-[var(--text3)]">
                    {thresholdOverridden ? (
                      <>
                        Org default{" "}
                        <span className="font-[family-name:var(--mono)] tabular-nums">{defaultThresholdDisplay}</span>
                      </>
                    ) : (
                      "Org default"
                    )}
                  </span>
                </div>
              </SheetCell>

              <SheetCell className={HIDE_BELOW_LG}>
                <div className="flex flex-col gap-0.5 leading-[1.35]">
                  <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                    {formatDuration(effectiveWindow)}
                  </span>
                  <span className="text-[12px] text-[var(--text3)]">
                    <span className="font-[family-name:var(--mono)] tabular-nums">{formatDuration(effectiveCooldown)}</span>{" "}
                    cooldown
                  </span>
                </div>
              </SheetCell>

              <SheetCell className={HIDE_BELOW_MD}>
                <SeverityBadge severity={effectiveSeverity} />
              </SheetCell>

              <SheetCell>
                {subscription ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 shrink-0 rounded-full", STATE_DOT[subscription.state] ?? "bg-[var(--text3)]")}
                    />
                    <select
                      value={subscription.state}
                      onChange={(event) => handleStateChange(subscription, event.target.value as SubscriptionState)}
                      aria-label={`Subscription state for ${policy.name}`}
                      className={STATE_SELECT_CLASS}
                    >
                      {STATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <UiButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubscribe(policy)}
                    disabled={isCurrentlySubscribing || mutations.subscribe.isPending}
                    aria-label={`Subscribe to ${policy.name}`}
                  >
                    {isCurrentlySubscribing ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Plus className="size-3.5" aria-hidden="true" />
                    )}
                    Subscribe
                  </UiButton>
                )}
              </SheetCell>

              <SheetCell align="right">
                {subscription && (
                  <RowActions label={`Actions for ${policy.name}`}>
                    <DropdownMenuItem onSelect={() => openOverrideModal(subscription, policy)}>
                      <SlidersHorizontal aria-hidden="true" /> {override ? "Edit overrides" : "Override defaults"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setUnsubscribingTarget({ policy, subscription })}>
                      <BellOff aria-hidden="true" /> Unsubscribe
                    </DropdownMenuItem>
                  </RowActions>
                )}
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Alert rules"
        description="Subscribe this project to your organization's alert rules, then override their thresholds, cooldowns, and notification targets for it."
      />

      {/* Plan entitlement notice */}
      <EntitlementRestrictedBanner projectId={projectId} />

      {!loadFailed && (
        <Readouts
          cells={readouts}
          loading={(policiesLoading && !policiesPage) || (subscriptionsLoading && !subscriptionsData)}
          label="Alert rules summary"
        />
      )}

      <Sheet
        label="Alert rules"
        toolbar={
          <>
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, slug, or category"
              label="Search alert rules"
            />
            {/* Scrolls sideways on narrow screens instead of widening the page. */}
            <div className="sidebar-scroll max-w-full overflow-x-auto">
              <SegmentedControl
                value={subscriptionFilter}
                onChange={setSubscriptionFilter}
                options={filterOptions}
                ariaLabel="Filter rules by subscription"
              />
            </div>
            {categories.length > 0 && (
              <FilterSelect
                label="Category"
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categoryOptions}
              />
            )}
            {!tableLoading && !loadFailed && (
              <ToolbarCount>
                {formatNumber(filteredPolicies.length)} {filteredPolicies.length === 1 ? "rule" : "rules"}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          paginated ? (
            <>
              <span className="tabular-nums">
                {policiesPage ? `Page ${page + 1} of ${pageCount}.` : `Page ${page + 1}.`} Search and filters apply to the
                rules on this page.
              </span>
              <div className="flex items-center gap-2">
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0}
                >
                  Previous
                </UiButton>
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalPolicies}
                >
                  Next
                </UiButton>
              </div>
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      {/* Override Configuration Modal */}
      <ProjectOverrideModal
        open={Boolean(selectedSubscription && selectedPolicy)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSubscription(null);
            setSelectedPolicy(null);
          }
        }}
        subscription={selectedSubscription}
        policy={selectedPolicy}
        isSaving={mutations.updateOverride.isPending}
        onSave={handleSaveOverride}
        onRemoveOverride={handleRemoveOverride}
      />

      {/* Unsubscribe Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(unsubscribingTarget)}
        onOpenChange={(open) => {
          if (!open) setUnsubscribingTarget(null);
        }}
        title={`Unsubscribe from ${unsubscribingTarget?.policy.name || "this rule"}?`}
        description={`This detaches the rule from ${project.name || "this project"}. Its project overrides are cleared, and it stops raising incidents for this project.`}
        confirmLabel="Unsubscribe"
        destructive={true}
        pending={mutations.remove.isPending}
        onConfirm={handleConfirmUnsubscribe}
      />
    </WorkspacePage>
  );
}
