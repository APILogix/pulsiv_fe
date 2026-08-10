import { useMemo, useState } from "react";
import {
  Sliders,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  useOrganizationAlertPolicies,
  useProjectPolicyMutations,
  useProjectPolicySubscriptions,
} from "@/modules/alerting/hooks/useAlerting";
import type {
  OrganizationAlertPolicy,
  ProjectSubscription,
  SubscriptionState,
  AlertSeverity,
} from "@/modules/alerting/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { SeverityBadge } from "@/shared/observe";
import {
  ProjectOverrideModal,
  formatThreshold,
  formatDuration,
} from "@/modules/alerting/components/ProjectOverrideModal";
import { cn } from "@/lib/utils";

export default function ProjectThresholdsPage() {
  const { projectId } = useCurrentProject();
  const { data: policies = [], isLoading: policiesLoading } = useOrganizationAlertPolicies();
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useProjectPolicySubscriptions(projectId);
  const mutations = useProjectPolicyMutations(projectId);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");

  // Modal states
  const [selectedSubscription, setSelectedSubscription] = useState<ProjectSubscription | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<OrganizationAlertPolicy | null>(null);

  const subscribedPolicyIds = useMemo(() => new Set(subscriptions.map((item) => item.policyId)), [subscriptions]);

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

      const isSubscribed = subscribedPolicyIds.has(policy.id);
      const matchesSubscription =
        subscriptionFilter === "all" ||
        (subscriptionFilter === "subscribed" && isSubscribed) ||
        (subscriptionFilter === "unsubscribed" && !isSubscribed);

      return matchesSearch && matchesCategory && matchesSubscription;
    });
  }, [policies, searchQuery, selectedCategory, subscriptionFilter, subscribedPolicyIds]);

  const openOverrideModal = (subscription: ProjectSubscription, policy: OrganizationAlertPolicy) => {
    setSelectedSubscription(subscription);
    setSelectedPolicy(policy);
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
      }
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
          environment: null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Overrides cleared. Policy reset to organization defaults.");
          setSelectedSubscription(null);
          setSelectedPolicy(null);
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not clear overrides.")),
      }
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)]">
              <Sliders className="size-5" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Project Alert Subscriptions</h1>
          </div>
          <p className="mt-1 text-xs text-[var(--text3)]">
            Projects subscribe directly to organization policies. Configure customized metric thresholds, cooldowns, and notification routing without modifying base policy definitions.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] px-3 py-1.5 flex items-center gap-2">
            <span className="text-[var(--text3)]">Available:</span>
            <strong className="text-[var(--text)]">{policies.length}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] px-3 py-1.5 flex items-center gap-2">
            <span className="text-[var(--text3)]">Subscribed:</span>
            <strong className="text-emerald-400">{subscriptions.length}</strong>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-[var(--text3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search policies by name, slug, or metric..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg1)] pl-9 pr-4 py-2 text-xs text-[var(--text)] placeholder-[var(--text3)] focus:border-[var(--brand)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subscription state filter */}
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg1)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSubscriptionFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 transition-all cursor-pointer",
                subscriptionFilter === "all" ? "bg-[var(--bg2)] text-[var(--text)] font-semibold shadow-xs" : "text-[var(--text3)] hover:text-[var(--text)]"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionFilter("subscribed")}
              className={cn(
                "rounded-md px-2.5 py-1 transition-all cursor-pointer",
                subscriptionFilter === "subscribed" ? "bg-[var(--bg2)] text-[var(--text)] font-semibold shadow-xs" : "text-[var(--text3)] hover:text-[var(--text)]"
              )}
            >
              Subscribed ({subscriptions.length})
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionFilter("unsubscribed")}
              className={cn(
                "rounded-md px-2.5 py-1 transition-all cursor-pointer",
                subscriptionFilter === "unsubscribed" ? "bg-[var(--bg2)] text-[var(--text)] font-semibold shadow-xs" : "text-[var(--text3)] hover:text-[var(--text)]"
              )}
            >
              Available
            </button>
          </div>

          {/* Category Dropdown/Selector */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] px-3 py-1.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:outline-none capitalize"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      {policiesLoading || subscriptionsLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-16 text-center text-sm text-[var(--text3)] space-y-2">
          <div className="size-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto" />
          <div>Loading organization policy catalog & subscriptions…</div>
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--text3)]">
          No organization policies are available.
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--text3)]">
          No policies match your search and filter criteria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--bg2)]/70 text-[10.5px] uppercase tracking-wider font-semibold text-[var(--text3)]">
                <tr>
                  <th className="p-3.5 pl-4">Policy</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Org Base Default</th>
                  <th className="p-3.5">Project Effective Setting</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60">
                {filteredPolicies.map((policy) => {
                  const subscription = subscriptions.find((item) => item.policyId === policy.id);
                  const isSubscribed = Boolean(subscription);
                  const override = subscription?.override;
                  const hasOverride = Boolean(
                    override &&
                      (override.threshold != null ||
                        override.cooldownSeconds != null ||
                        override.evaluationWindowSeconds != null ||
                        override.severity != null ||
                        (override.channels && override.channels.length > 0) ||
                        override.environment != null)
                  );

                  const defaultThresholdDisplay = formatThreshold(policy.defaultThreshold);
                  const effectiveThresholdDisplay = override?.threshold != null ? formatThreshold(override.threshold) : defaultThresholdDisplay;
                  const effectiveCooldown = override?.cooldownSeconds != null ? override.cooldownSeconds : policy.cooldownSeconds;
                  const effectiveSeverity = override?.severity != null ? override.severity : policy.severity;

                  return (
                    <tr
                      key={policy.id}
                      className={cn(
                        "transition-colors hover:bg-[var(--bg2)]/40",
                        isSubscribed ? "bg-transparent" : "opacity-90"
                      )}
                    >
                      {/* Policy info */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-[var(--text)]">{policy.name}</div>
                          <SeverityBadge severity={effectiveSeverity} />
                        </div>
                        <div className="font-mono text-[11px] text-[var(--text3)] mt-0.5">{policy.slug}</div>
                        {policy.description && (
                          <div className="text-[11px] text-[var(--text3)] mt-0.5 line-clamp-1 max-w-sm">
                            {policy.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center rounded-md bg-[var(--bg2)] px-2 py-0.5 font-medium text-[11px] capitalize text-[var(--text2)] border border-[var(--border)]">
                          {policy.category || "General"}
                        </span>
                      </td>

                      {/* Org Default */}
                      <td className="p-3.5 space-y-0.5">
                        <div className="font-mono font-medium text-[var(--text)]">{defaultThresholdDisplay}</div>
                        <div className="text-[10.5px] text-[var(--text3)] font-mono">
                          {formatDuration(policy.cooldownSeconds)} cooldown • {formatDuration(policy.evaluationWindowSeconds)} window
                        </div>
                      </td>

                      {/* Project Effective */}
                      <td className="p-3.5">
                        {isSubscribed ? (
                          hasOverride ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-amber-400">
                                  {effectiveThresholdDisplay}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  <Sliders className="size-2.5" />
                                  Overridden
                                </span>
                              </div>
                              <div className="text-[10.5px] text-[var(--text3)] font-mono">
                                {formatDuration(effectiveCooldown)} cooldown
                                {override?.environment && ` • env: ${override.environment}`}
                                {override?.channels && override.channels.length > 0 && ` • ${override.channels.join(", ")}`}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[var(--text2)]">{defaultThresholdDisplay}</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="size-2.5" />
                                  Org Default
                                </span>
                              </div>
                              <div className="text-[10.5px] text-[var(--text3)] font-mono">
                                {formatDuration(policy.cooldownSeconds)} cooldown
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-[var(--text3)] italic text-[11px]">Not subscribed</span>
                        )}
                      </td>

                      {/* State / Subscription */}
                      <td className="p-3.5">
                        {subscription ? (
                          <select
                            value={subscription.state}
                            onChange={(event) =>
                              mutations.updateState.mutate(
                                {
                                  subscriptionId: subscription.id,
                                  state: event.target.value as SubscriptionState,
                                },
                                {
                                  onSuccess: () => toast.success("Subscription state updated"),
                                  onError: (error) => toast.error(apiErrorMessage(error, "Could not update subscription.")),
                                }
                              )
                            }
                            className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1 text-xs capitalize text-[var(--text)] font-medium focus:border-[var(--brand)] focus:outline-none cursor-pointer"
                          >
                            <option value="subscribed">Subscribed</option>
                            <option value="paused">Paused</option>
                            <option value="muted">Muted</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[var(--bg2)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text3)] border border-[var(--border)]">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 pr-4 text-right">
                        {subscription ? (
                          <button
                            type="button"
                            onClick={() => openOverrideModal(subscription, policy)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all cursor-pointer"
                          >
                            <Sliders className="size-3.5" />
                            <span>{hasOverride ? "Edit Override" : "Override"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              mutations.subscribe.mutate(policy.id, {
                                onSuccess: () => toast.success(`Subscribed to ${policy.name}`),
                                onError: (error) => toast.error(apiErrorMessage(error, "Could not subscribe project.")),
                              })
                            }
                            disabled={mutations.subscribe.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-1.5 text-xs font-semibold text-[var(--bg)] shadow-xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <span>Subscribe</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </div>
  );
}

