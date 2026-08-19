import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Search,
  Shield,
  Sliders,
  Activity,
  Flame,
  Zap,
  Cpu,
  Lock,
  Database,
  Check,
  Package,
} from "lucide-react";
import {
  useOrganizationAlertPolicies,
  useOrganizationAlertPolicyMutations,
} from "@/modules/alerting/hooks/useAlerting";
import type { AlertSeverity, PolicyCategory } from "@/modules/alerting/api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { toast } from "sonner";
import { formatCompact } from "@/shared/observe";
import { cn } from "@/lib/utils";

type TabFilter = "catalog" | "custom" | "effective";
type SortOption = "created_at" | "updated_at" | "name";

const TAB_OPTIONS: Array<{ value: TabFilter; label: string }> = [
  { value: "catalog", label: "CATALOG" },
  { value: "custom", label: "CUSTOM RULES" },
  { value: "effective", label: "EFFECTIVE POLICIES" },
];

const CATEGORY_ITEMS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: "all", label: "All Categories", icon: <Check className="size-3 shrink-0" /> },
  { id: "errors", label: "Errors", icon: <Flame className="size-3 text-[var(--error)] shrink-0" /> },
  { id: "performance", label: "Performance", icon: <Activity className="size-3 text-[var(--brand)] shrink-0" /> },
  { id: "availability", label: "Availability", icon: <Zap className="size-3 text-[var(--success)] shrink-0" /> },
  { id: "infrastructure", label: "Infrastructure", icon: <Cpu className="size-3 text-[var(--warning)] shrink-0" /> },
  { id: "security", label: "Security", icon: <Lock className="size-3 text-[var(--error)] shrink-0" /> },
  { id: "database", label: "Database", icon: <Database className="size-3 text-[var(--brand)] shrink-0" /> },
  { id: "custom", label: "Custom", icon: <Shield className="size-3 text-[var(--text-secondary)] shrink-0" /> },
];

function formatPolicyThreshold(value: unknown): string {
  if (value == null) return "Not set";
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const rawValue = record.value ?? record.threshold ?? record.default ?? record.amount;
    const unit = typeof record.unit === "string" && record.unit.length > 0 ? ` ${record.unit}` : "";
    if (rawValue != null) return `${String(rawValue)}${unit}`;
  }
  return "Configured";
}

function formatSeconds(seconds?: number | null): string {
  if (seconds == null) return "Not set";
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function severityTone(severity?: AlertSeverity | string | null): string {
  switch ((severity ?? "info").toLowerCase()) {
    case "critical":
    case "fatal":
      return "border-[var(--error)]/30 bg-[var(--error-muted)] text-[var(--error)]";
    case "error":
      return "border-[var(--error)]/25 bg-[var(--error-muted)] text-[var(--error)]";
    case "warning":
    case "warn":
      return "border-[var(--warning)]/30 bg-[var(--warning-muted)] text-[var(--warning)]";
    default:
      return "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)]";
  }
}

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const { data: policiesData, isLoading } = useOrganizationAlertPolicies();
  const { create } = useOrganizationAlertPolicyMutations();

  const policies = policiesData?.data ?? [];
  const totalPolicies = policiesData?.total ?? policies.length;

  const [activeTab, setActiveTab] = useState<TabFilter>("catalog");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory>("custom");
  const [severity, setSeverity] = useState<AlertSeverity>("warning");
  const [metricSource, setMetricSource] = useState("");
  const [expression, setExpression] = useState("");
  const [threshold, setThreshold] = useState("0");
  const [cooldownSeconds, setCooldownSeconds] = useState("900");
  const [windowSeconds, setWindowSeconds] = useState("300");
  const [documentation, setDocumentation] = useState("");

  const filteredPolicies = useMemo(() => {
    let list = (policies as any[]).filter((policy: any) => {
      const matchesSearch = `${policy.name} ${policy.slug} ${policy.description}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = category === "all" || policy.category.toLowerCase() === category;
      return matchesSearch && matchesCategory;
    });

    if (activeTab === "custom") {
      list = list.filter((p: any) => !p.isSystem || p.category === "custom");
    }

    return list.sort((a: any, b: any) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "updated_at") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, category, policies, search, sortBy]);

  const activeCount = useMemo(() => (policies as any[]).filter((p: any) => p.enabled !== false).length, [policies]);
  const systemCount = useMemo(() => (policies as any[]).filter((p: any) => p.isSystem).length, [policies]);
  const criticalCount = useMemo(() => (policies as any[]).filter((p: any) => p.severity === "critical").length, [policies]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate(
      {
        slug,
        name,
        description: documentation || `Organization policy for ${metricSource}`,
        category: selectedCategory,
        severity,
        metricSource,
        expression,
        defaultThreshold: { value: Number(threshold) || 0 },
        recoveryThreshold: {},
        cooldownSeconds: Number(cooldownSeconds),
        evaluationWindowSeconds: Number(windowSeconds),
        documentation,
        dependencies: [],
      },
      {
        onSuccess: () => {
          toast.success("Organization policy created successfully");
          setOpen(false);
          setName("");
          setSlug("");
          setMetricSource("");
          setExpression("");
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not create policy.")),
      }
    );
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Page Command Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Alerts & Incident Ops</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Rule Catalog</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Organization Alert Policies &amp; Thresholds
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Every organization-scoped alert policy, threshold baseline, cooldown rule, and project subscription matrix.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand)] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-[var(--brand)]/90 transition-all cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Create Policy</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total Policies</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {totalPolicies}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Catalog definitions</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Active Evaluators</span>
            <span className="size-2 rounded-full bg-[var(--success)]" />
          </div>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--success)] font-[family-name:var(--mono)] tabular-nums">
            {activeCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Currently monitoring</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">System Managed</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {systemCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Pre-packaged presets</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Critical Guardrails</span>
            <span className={cn("size-2 rounded-full", criticalCount > 0 ? "bg-[var(--error)] animate-pulse" : "bg-[var(--surface-4)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            criticalCount > 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            {formatCompact(criticalCount)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">P0 fatal triggers</div>
        </div>
      </div>

      {/* ── 3. Filters & Category Strip ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] p-0.5">
            {TAB_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  "rounded-[3px] px-3 py-1 text-[11px] font-semibold font-[family-name:var(--mono)] transition-colors",
                  activeTab === t.value
                    ? "bg-[var(--surface-3)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter rules…"
                className="h-8 w-56 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] pl-8 pr-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] px-2.5 text-[11.5px] text-[var(--text-secondary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
            >
              <option value="created_at">Newest First</option>
              <option value="updated_at">Recently Updated</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        {activeTab !== "effective" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORY_ITEMS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 shrink-0 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer select-none font-[family-name:var(--mono)]",
                  category === cat.id
                    ? "border-[var(--brand-border)] bg-[var(--brand-muted)] text-[var(--brand)]"
                    : "border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                )}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Main Policy Matrix / Table ── */}
      {activeTab === "effective" ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <Sliders className="size-4 text-[var(--success)] shrink-0" />
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Computed Effective Policies
            </h3>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
            Effective policies represent merged rules generated when a project explicitly subscribes to an organization alert policy or applies project-level threshold overrides.
          </p>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-6 text-center text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            No active project subscriptions configured. Attach policies to your project scope to activate automated alerting.
          </div>
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center font-[family-name:var(--mono)] text-[12px] text-[var(--text-tertiary)]">
          Loading organization alert catalog…
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--surface-1)] p-12 text-center text-[13px] text-[var(--text-tertiary)] space-y-2">
          <Shield className="mx-auto size-8 text-[var(--text-tertiary)] opacity-60" />
          <div className="font-semibold text-[var(--text-primary)]">No alert policies found</div>
          <div>No policies match your search or selected category filter.</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[12px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50 font-[family-name:var(--mono)] text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Policy Name &amp; Key</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Severity</th>
                  <th className="px-4 py-3 font-semibold">Metric Source</th>
                  <th className="px-4 py-3 font-semibold">Threshold</th>
                  <th className="px-4 py-3 font-semibold">Window</th>
                  <th className="px-4 py-3 font-semibold">Cooldown</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                {(filteredPolicies as any[]).map((policy: any) => (
                  <tr key={policy.id} className="transition-colors hover:bg-[var(--surface-2)]/40">
                    <td className="max-w-[320px] px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => navigate(`/alerts/policies/${policy.id}`)}
                        className="block text-left text-[13px] font-semibold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors"
                      >
                        {policy.name}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <code className="rounded border border-[var(--border-subtle)] bg-[var(--surface-2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--text-tertiary)]">
                          {policy.slug}
                        </code>
                        {policy.isSystem && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-1.5 py-0.5 text-[9.5px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
                            <Package className="size-3" />
                            System
                          </span>
                        )}
                      </div>
                      {policy.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                          {policy.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] capitalize text-[var(--text-secondary)] font-[family-name:var(--mono)]">
                        {CATEGORY_ITEMS.find((item) => item.id === policy.category)?.icon ?? <Shield className="size-3" />}
                        {policy.category || "general"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn("inline-flex rounded-[var(--radius-sm)] border px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase", severityTone(policy.severity))}>
                        {policy.severity}
                      </span>
                    </td>
                    <td className="max-w-[190px] px-4 py-3 align-top">
                      <code className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-secondary)]">
                        {policy.metricSource || "not configured"}
                      </code>
                    </td>
                    <td className="px-4 py-3 align-top font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--text-primary)]">
                      {formatPolicyThreshold(policy.defaultThreshold)}
                    </td>
                    <td className="px-4 py-3 align-top font-[family-name:var(--mono)] text-[11.5px] text-[var(--text-secondary)]">
                      {formatSeconds(policy.evaluationWindowSeconds)}
                    </td>
                    <td className="px-4 py-3 align-top font-[family-name:var(--mono)] text-[11.5px] text-[var(--text-secondary)]">
                      {formatSeconds(policy.cooldownSeconds)}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => navigate(`/alerts/policies/${policy.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--brand-border)] hover:text-[var(--brand)]"
                      >
                        <Sliders className="size-3" />
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Policy Modal Dialog ─────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-[620px] overflow-y-auto bg-[var(--surface-1)] border-[var(--border-default)] p-6 shadow-2xl rounded-[var(--radius-md)]">
          <DialogHeader className="border-b border-[var(--border-subtle)] pb-3">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              <Shield className="size-4 text-[var(--brand)] shrink-0" />
              <span>Create Organization Alert Policy</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 text-[12px] pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Policy Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, "_")
                        .replace(/^_|_$/g, "")
                    );
                  }}
                  placeholder="e.g. High API Latency P99"
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Policy Slug</label>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="high_api_latency_p99"
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as PolicyCategory)}
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2 text-[12px] text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
                >
                  {CATEGORY_ITEMS.filter((item) => item.id !== "all").map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2 text-[12px] text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
                >
                  {["info", "warning", "error", "critical"].map((sev) => (
                    <option key={sev} value={sev}>
                      {sev.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Metric Source</label>
                <input
                  required
                  value={metricSource}
                  onChange={(e) => setMetricSource(e.target.value)}
                  placeholder="http.request.duration"
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Condition Expression</label>
              <input
                required
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="p99(http.request.duration) > 500ms for 5m"
                className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Threshold Value</label>
                <input
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  type="number"
                  placeholder="500"
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Cooldown (Sec)</label>
                <input
                  value={cooldownSeconds}
                  onChange={(e) => setCooldownSeconds(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="900"
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Window (Sec)</label>
                <input
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(e.target.value)}
                  type="number"
                  min="1"
                  placeholder="300"
                  className="w-full h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-[family-name:var(--mono)]">Policy Documentation</label>
              <textarea
                value={documentation}
                onChange={(e) => setDocumentation(e.target.value)}
                rows={3}
                placeholder="Explain the purpose of this rule, remediation steps, or runbook links…"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-2.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--brand)] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--brand)] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--brand)]/90 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Plus className="size-3.5 shrink-0" />
                <span>{create.isPending ? "Creating…" : "Create Policy"}</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
