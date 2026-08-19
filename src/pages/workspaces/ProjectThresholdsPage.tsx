import { useMemo, useState } from "react";
import {
  Sliders,
  Search,
  CheckCircle2,
  Shield,
  Clock,
  Layers,
  Plus,
  MinusCircle,
  Loader2,
  X,
  Zap,
  Flame,
  Activity,
  Lock,
  Database,
  Cpu,
  Check,
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
  ProjectOverride,
} from "@/modules/alerting/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import { apiErrorMessage, ConfirmDialog } from "@/modules/projects/components/project-ui";
import {
  ProjectOverrideModal,
  formatThreshold,
  formatDuration,
} from "@/modules/alerting/components/ProjectOverrideModal";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

function ModernSeverityBadge({ severity }: { severity?: AlertSeverity | string | null }) {
  const normalized = (severity || "info").toLowerCase();
  const styles: Record<string, { bg: string; dot: string }> = {
    critical: { bg: "bg-rose-500/15 text-rose-400 border-rose-500/30", dot: "bg-rose-400" },
    fatal: { bg: "bg-rose-500/15 text-rose-400 border-rose-500/30", dot: "bg-rose-400" },
    error: { bg: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-400" },
    warning: { bg: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
    info: { bg: "bg-sky-500/15 text-sky-300 border-sky-500/30", dot: "bg-sky-400" },
  };

  const current = styles[normalized] || { bg: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30", dot: "bg-zinc-400" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider",
        current.bg,
      )}
    >
      <span className={cn("size-1.5 rounded-full", current.dot)} />
      {normalized}
    </span>
  );
}

function getCategoryIcon(category?: string) {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "errors":
      return <Flame className="size-3.5 text-rose-400" />;
    case "performance":
      return <Activity className="size-3.5 text-sky-400" />;
    case "availability":
      return <Zap className="size-3.5 text-emerald-400" />;
    case "infrastructure":
      return <Cpu className="size-3.5 text-amber-400" />;
    case "security":
      return <Lock className="size-3.5 text-red-400" />;
    case "database":
      return <Database className="size-3.5 text-violet-400" />;
    default:
      return <Shield className="size-3.5 text-emerald-400" />;
  }
}

function getCategoryBadgeColor(category?: string) {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "errors":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "performance":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "availability":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "infrastructure":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "security":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "database":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    default:
      return "border-zinc-700 bg-zinc-800/60 text-zinc-300";
  }
}

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

export default function ProjectThresholdsPage() {
  const { projectId, project } = useCurrentProject();
  const [page, setPage] = useState(0);
  const { data: policiesPage, isLoading: policiesLoading } = useOrganizationAlertPolicies({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const policies = policiesPage?.data ?? [];
  const totalPolicies = policiesPage?.total ?? policies.length;
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useProjectPolicySubscriptions(projectId);
  const mutations = useProjectPolicyMutations(projectId);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | "subscribed" | "overridden" | "unsubscribed">("all");

  // Modal states
  const [selectedSubscription, setSelectedSubscription] = useState<ProjectSubscription | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<OrganizationAlertPolicy | null>(null);
  const [unsubscribingTarget, setUnsubscribingTarget] = useState<{
    policy: OrganizationAlertPolicy;
    subscription: ProjectSubscription;
  } | null>(null);

  // Subscribing in-flight tracking
  const [subscribingPolicyId, setSubscribingPolicyId] = useState<string | null>(null);

  // Derived counts for stat cards & filters
  const subscribedCount = useMemo(() => {
    return ((policies ?? []) as any[]).filter((p: any) => {
      const sub = findSubscriptionForPolicy(p, subscriptions);
      return Boolean(sub);
    }).length;
  }, [policies, subscriptions]);

  const overriddenCount = useMemo(() => {
    return ((policies ?? []) as any[]).filter((p: any) => {
      const sub = findSubscriptionForPolicy(p, subscriptions);
      return Boolean(extractOverride(sub));
    }).length;
  }, [policies, subscriptions]);

  const unsubscribedCount = useMemo(() => {
    return Math.max(0, policies.length - subscribedCount);
  }, [policies.length, subscribedCount]);

  // Categories extracted from policies
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of ((policies ?? []) as any[])) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [policies]);

  // Filtered policies list
  const filteredPolicies = useMemo(() => {
    return ((policies ?? []) as any[]).filter((policy: any) => {
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

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-inner">
              <Sliders className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Project Alert Rules & Subscriptions
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Subscribe to organization alert rules, customize project-level metric thresholds, cooldowns, and notification targets.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Entitlement Notification */}
      <EntitlementRestrictedBanner projectId={projectId} />

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="group rounded-xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-sm transition-all hover:border-border hover:bg-card/80">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider font-mono">Catalog Rules</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">{totalPolicies}</span>
            <span className="text-[11px] text-muted-foreground font-mono">available</span>
          </div>
        </div>

        <div className="group rounded-xl border border-emerald-500/20 bg-card/60 p-4 shadow-xs backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-card/80">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-emerald-400/90 uppercase tracking-wider font-mono">Subscribed</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-emerald-400">{subscribedCount}</span>
            <span className="text-[11px] text-muted-foreground font-mono">active rules</span>
          </div>
        </div>

        <div className="group rounded-xl border border-amber-500/20 bg-card/60 p-4 shadow-xs backdrop-blur-sm transition-all hover:border-amber-500/40 hover:bg-card/80">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-amber-400/90 uppercase tracking-wider font-mono">Custom Overrides</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sliders className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-amber-400">{overriddenCount}</span>
            <span className="text-[11px] text-muted-foreground font-mono">tuned thresholds</span>
          </div>
        </div>

        <div className="group rounded-xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-sm transition-all hover:border-border hover:bg-card/80">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider font-mono">Available</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Shield className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-muted-foreground">{unsubscribedCount}</span>
            <span className="text-[11px] text-muted-foreground font-mono">unsubscribed</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter policies by name, metric, slug..."
            className="w-full rounded-xl border border-border/80 bg-card/80 pl-10 pr-9 py-2 text-xs text-foreground placeholder-muted-foreground/70 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subscription state filter tabs */}
          <div className="flex items-center rounded-xl border border-border/80 bg-card/80 p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSubscriptionFilter("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                subscriptionFilter === "all"
                  ? "bg-zinc-800 text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
                All ({totalPolicies})
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionFilter("subscribed")}
              className={cn(
                "rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                subscriptionFilter === "subscribed"
                  ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Subscribed ({subscribedCount})
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionFilter("overridden")}
              className={cn(
                "rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                subscriptionFilter === "overridden"
                  ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Overridden ({overriddenCount})
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionFilter("unsubscribed")}
              className={cn(
                "rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                subscriptionFilter === "unsubscribed"
                  ? "bg-zinc-800 text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Available ({unsubscribedCount})
            </button>
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-border/80 bg-card/80 px-3.5 py-2 text-xs text-foreground focus:border-emerald-500/60 focus:outline-none capitalize cursor-pointer font-mono shadow-xs"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {totalPolicies > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-3 py-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            Page {page + 1} of {Math.max(1, Math.ceil(totalPolicies / PAGE_SIZE))}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
              className="rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalPolicies}
              className="rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      {policiesLoading || subscriptionsLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-16 text-center text-sm text-muted-foreground space-y-3 font-mono">
          <div className="size-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-zinc-300 font-semibold">Loading organization alert policy catalog & subscriptions…</div>
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-14 text-center text-sm text-muted-foreground font-mono">
          No organization policies are configured.
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-14 text-center text-sm text-muted-foreground font-mono">
          No policies match your search query & filter criteria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-lg backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-zinc-900/60 font-mono text-[10.5px] uppercase tracking-wider font-semibold text-zinc-400">
                <tr>
                  <th className="py-3.5 px-4 pl-5">Policy Rule</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Org Base Default</th>
                  <th className="py-3.5 px-4">Project Effective Setting</th>
                  <th className="py-3.5 px-4">Subscription Status</th>
                  <th className="py-3.5 px-4 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {((filteredPolicies ?? []) as any[]).map((policy: any) => {
                  const subscription = findSubscriptionForPolicy(policy, subscriptions);
                  const isSubscribed = Boolean(subscription);
                  const override = extractOverride(subscription);
                  const hasOverride = Boolean(override);

                  const defaultThresholdDisplay = formatThreshold(policy.defaultThreshold);
                  const effectiveThresholdDisplay = override?.threshold != null ? formatThreshold(override.threshold) : defaultThresholdDisplay;
                  const effectiveCooldown = override?.cooldownSeconds != null ? override.cooldownSeconds : policy.cooldownSeconds;
                  const effectiveSeverity = override?.severity != null ? override.severity : policy.severity;

                  const isCurrentlySubscribing = subscribingPolicyId === policy.id;

                  return (
                    <tr
                      key={policy.id}
                      className={cn(
                        "group transition-colors",
                        isSubscribed
                          ? "bg-emerald-500/[0.02] hover:bg-zinc-800/40"
                          : "opacity-80 hover:opacity-100 hover:bg-zinc-800/30",
                      )}
                    >
                      {/* Policy info */}
                      <td className="py-4 px-4 pl-5 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-semibold text-foreground tracking-tight group-hover:text-emerald-300 transition-colors">
                            {policy.name}
                          </span>
                          <ModernSeverityBadge severity={effectiveSeverity} />
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <code className="font-mono text-[10.5px] text-zinc-400 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800">
                            {policy.slug}
                          </code>
                        </div>
                        {policy.description && (
                          <p className="mt-1.5 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2 max-w-sm">
                            {policy.description}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 align-top">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium capitalize",
                            getCategoryBadgeColor(policy.category),
                          )}
                        >
                          {getCategoryIcon(policy.category)}
                          <span>{policy.category || "General"}</span>
                        </span>
                      </td>

                      {/* Org Base Default */}
                      <td className="py-4 px-4 align-top space-y-1">
                        <div className="font-mono font-bold text-foreground text-[13px]">
                          {defaultThresholdDisplay}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 font-mono">
                          <Clock className="size-3 text-zinc-500" />
                          <span>
                            {formatDuration(policy.cooldownSeconds)} cooldown • {formatDuration(policy.evaluationWindowSeconds)} win
                          </span>
                        </div>
                      </td>

                      {/* Project Effective Setting */}
                      <td className="py-4 px-4 align-top">
                        {isSubscribed ? (
                          hasOverride ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-400 text-[13px]">
                                  {effectiveThresholdDisplay}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 shadow-xs">
                                  <Sliders className="size-2.5" />
                                  OVERRIDDEN
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {formatDuration(effectiveCooldown)} cooldown
                                {override?.channels && override.channels.length > 0 && ` • ${override.channels.join(", ")}`}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-foreground text-[13px]">
                                  {defaultThresholdDisplay}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 shadow-xs">
                                  <Check className="size-2.5" />
                                  ORG DEFAULT
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {formatDuration(policy.cooldownSeconds)} cooldown
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground/50 italic">
                            — Not subscribed
                          </span>
                        )}
                      </td>

                      {/* Subscription Status Indicator */}
                      <td className="py-4 px-4 align-top">
                        {subscription ? (
                          <div className="inline-flex items-center gap-2">
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
                                    onError: (error) =>
                                      toast.error(apiErrorMessage(error, "Could not update subscription.")),
                                  },
                                )
                              }
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-xs capitalize font-mono font-semibold transition-all focus:outline-none cursor-pointer shadow-xs",
                                subscription.state === "subscribed"
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/60"
                                  : subscription.state === "paused"
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-500/60"
                                    : subscription.state === "muted"
                                      ? "border-purple-500/40 bg-purple-500/10 text-purple-300 hover:border-purple-500/60"
                                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600",
                              )}
                            >
                              <option value="subscribed" className="bg-zinc-950 text-emerald-400">● Subscribed</option>
                              <option value="paused" className="bg-zinc-950 text-amber-300">● Paused</option>
                              <option value="muted" className="bg-zinc-950 text-purple-300">● Muted</option>
                              <option value="disabled" className="bg-zinc-950 text-zinc-400">● Disabled</option>
                            </select>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-zinc-900/60 px-2.5 py-1 font-mono text-[10.5px] font-medium text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-zinc-500/70" />
                            Available
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-4 pr-5 text-right align-top">
                        {subscription ? (
                          <div className="inline-flex items-center gap-2">
                            {/* Override Button */}
                            <button
                              type="button"
                              onClick={() => openOverrideModal(subscription, policy)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-zinc-800 hover:border-border cursor-pointer shadow-xs font-mono"
                            >
                              <Sliders className="size-3.5 text-emerald-400" />
                              <span>{hasOverride ? "Edit Override" : "Override Rule"}</span>
                            </button>

                            {/* Unsubscribe Button */}
                            <button
                              type="button"
                              onClick={() => setUnsubscribingTarget({ policy, subscription })}
                              className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer font-mono"
                              title="Unsubscribe project from this policy"
                            >
                              <MinusCircle className="size-3.5" />
                              <span>Unsubscribe</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSubscribe(policy)}
                            disabled={isCurrentlySubscribing || mutations.subscribe.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-zinc-950 shadow-xs transition-all hover:bg-emerald-400 cursor-pointer disabled:opacity-50 font-mono"
                          >
                            {isCurrentlySubscribing ? (
                              <Loader2 className="size-3.5 animate-spin text-zinc-950" />
                            ) : (
                              <Plus className="size-3.5 text-zinc-950" />
                            )}
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

      {/* Unsubscribe Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(unsubscribingTarget)}
        onOpenChange={(open) => {
          if (!open) setUnsubscribingTarget(null);
        }}
        title={`Unsubscribe from ${unsubscribingTarget?.policy.name || "Rule"}?`}
        description={`This will detach this alert rule from ${project.name || "this project"}. Custom threshold overrides will be cleared, and incidents for this policy will no longer be generated for this project.`}
        confirmLabel="Unsubscribe"
        destructive={true}
        pending={mutations.remove.isPending}
        onConfirm={handleConfirmUnsubscribe}
      />
    </div>
  );
}
