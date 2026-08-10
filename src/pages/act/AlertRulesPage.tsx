import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Search,
  Shield,
  Layers,
  Sliders,
  Sparkles,
  Activity,
  Flame,
  Zap,
  Cpu,
  Lock,
  Database,
  Globe,
  AlarmClock,
  Check,
  CheckCircle2,
  AlertTriangle,
  Code,
  Clock,
  KeyRound,
  ShieldCheck,
  Pause,
  Package,
} from "lucide-react";
import { PolicyCatalogCard } from "@/modules/alerting/components/PolicyCatalogCard";
import {
  useOrganizationAlertPolicies,
  useOrganizationAlertPolicyMutations,
} from "@/modules/alerting/hooks/useAlerting";
import type { AlertSeverity, PolicyCategory } from "@/modules/alerting/api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { toast } from "sonner";
import {
  PageHero,
  HeroFacts,
  Toolbar,
  SegmentedControl,
  fieldInputClass,
  type HeroFact,
  type SegmentOption,
} from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";
import { formatCompact } from "@/shared/observe";
import { cn } from "@/lib/utils";

type TabFilter = "catalog" | "custom" | "effective";
type SortOption = "created_at" | "updated_at" | "name";

const TAB_OPTIONS: SegmentOption<TabFilter>[] = [
  { value: "catalog", label: "Catalog" },
  { value: "custom", label: "Custom" },
  { value: "effective", label: "Effective" },
];

const SORT_OPTIONS: SegmentOption<SortOption>[] = [
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Recently updated" },
  { value: "name", label: "Name" },
];

const CATEGORY_ITEMS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: "all", label: "All", icon: <Check className="size-3 shrink-0" /> },
  { id: "errors", label: "Errors", icon: <Flame className="size-3 text-rose-400 shrink-0" /> },
  { id: "performance", label: "Performance", icon: <Activity className="size-3 text-blue-400 shrink-0" /> },
  { id: "availability", label: "Availability", icon: <Zap className="size-3 text-emerald-400 shrink-0" /> },
  { id: "infrastructure", label: "Infrastructure", icon: <Cpu className="size-3 text-amber-400 shrink-0" /> },
  { id: "security", label: "Security", icon: <Lock className="size-3 text-red-400 shrink-0" /> },
  { id: "database", label: "Database", icon: <Database className="size-3 text-violet-400 shrink-0" /> },
  { id: "custom", label: "Custom", icon: <Shield className="size-3 text-[var(--brand)] shrink-0" /> },
];

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const { data: policies = [], isLoading } = useOrganizationAlertPolicies();
  const { create } = useOrganizationAlertPolicyMutations();

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
    let list = policies.filter((policy) => {
      const matchesSearch = `${policy.name} ${policy.slug} ${policy.description}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = category === "all" || policy.category.toLowerCase() === category;
      return matchesSearch && matchesCategory;
    });

    if (activeTab === "custom") {
      list = list.filter((p) => !p.isSystem || p.category === "custom");
    }

    return list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "updated_at") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, category, policies, search, sortBy]);

  const customPolicies = useMemo(() => {
    return policies.filter((p) => !p.isSystem || p.category === "custom");
  }, [policies]);

  const activeCount = useMemo(() => policies.filter((p) => p.enabled !== false).length, [policies]);
  const systemCount = useMemo(() => policies.filter((p) => p.isSystem).length, [policies]);
  const criticalCount = useMemo(() => policies.filter((p) => p.severity === "critical").length, [policies]);

  const facts: HeroFact[] = [
    { label: "POLICIES", value: policies.length, icon: Layers },
    { label: "ACTIVE", value: activeCount, tone: "green", icon: ShieldCheck },
    { label: "SYSTEM", value: systemCount, tone: "neutral", icon: Pause },
    { label: "CRITICAL", value: formatCompact(criticalCount), tone: criticalCount > 0 ? "red" : "neutral", icon: KeyRound },
  ];

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
    <div className="flex flex-col gap-6 p-6 mx-auto w-full max-w-[1400px]">
      {/* ── Page Hero Card with Stat Grid ────────────────────────── */}
      <PageHero
        eyebrow="WORKSPACES"
        title="Organization Alert Rules & Policies"
        description="Every organization-scoped alert policy, custom rules, and evaluation state. Open a policy to manage thresholds, triggers, and project subscriptions."
        icon={Shield}
        breadcrumbs={[{ label: "Workspaces", to: "/workspaces" }, { label: "Alert Rules" }]}
        actions={
          <UiButton
            size="lg"
            onClick={() => setOpen(true)}
            className="bg-white text-black hover:bg-white/90 font-medium text-[13px] shadow-sm cursor-pointer"
          >
            <Plus className="mr-1.5 size-4 stroke-[2.5]" /> Create policy
          </UiButton>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {/* ── Toolbar with Search & Segmented Controls ──────────────── */}
      <Toolbar
        trailing={
          <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
            {filteredPolicies.length} shown
          </span>
        }
      >
        <form
          className="relative min-w-[240px] flex-1 sm:max-w-md"
          onSubmit={(e) => e.preventDefault()}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules, then press Enter"
            className={fieldInputClass}
          />
        </form>

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={TAB_OPTIONS}
          ariaLabel="Policy View Tabs"
        />

        <SegmentedControl
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
          ariaLabel="Sort Policies"
        />
      </Toolbar>

      {/* ── Category Filter Strip ─────────────────────────────────── */}
      {activeTab !== "effective" && (
        <div className="sidebar-scroll flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="font-[family-name:var(--mono)] text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wider mr-1 shrink-0">
            Category:
          </span>
          {CATEGORY_ITEMS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer select-none",
                category === cat.id
                  ? "border-[var(--brand)] bg-[var(--brand-bg)] text-[var(--brand)] font-semibold"
                  : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:border-[var(--text3)] hover:text-[var(--text)]"
              )}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Main Tab Content ───────────────────────────────────────── */}
      {activeTab === "effective" ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Sliders className="size-4 text-[var(--green)] shrink-0" />
            <h3 className="text-[14px] font-semibold text-[var(--text)]">Computed Effective Policies</h3>
          </div>

          <p className="text-[13px] text-[var(--text2)] leading-relaxed">
            Effective policies represent merged rules generated when a project explicitly subscribes to an organization alert policy or applies project-level overrides.
          </p>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-8 text-center text-[13px] text-[var(--text3)]">
            No active subscriptions currently configured. Select a policy from the Catalog or Custom tab and click <strong className="text-[var(--brand)]">Subscribe</strong> to attach rules to your project scope.
          </div>
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center font-[family-name:var(--mono)] text-[13px] text-[var(--text3)]">
          Loading organization alert policies...
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg1)] p-12 text-center text-[13px] text-[var(--text3)] space-y-2">
          <Shield className="mx-auto size-8 text-[var(--text3)] opacity-60" />
          <div className="font-semibold text-[var(--text)]">No alert policies found</div>
          <div>No policies match your search or selected category filter.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPolicies.map((policy) => (
            <PolicyCatalogCard
              key={policy.id}
              policy={policy}
              onViewDetails={(item) => navigate(`/alerts/policies/${item.id}`)}
              onEdit={(item) => navigate(`/alerts/policies/${item.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Create Policy Modal Dialog ─────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-[680px] overflow-y-auto bg-[var(--bg1)] border-[var(--border)] p-6 shadow-2xl">
          <DialogHeader className="border-b border-[var(--border)] pb-3">
            <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-[var(--text)]">
              <Shield className="size-4.5 text-[var(--brand)] shrink-0" />
              <span>Create Organization Alert Policy</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 text-[12px] pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Policy Name</label>
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
                  className={fieldInputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Policy Slug</label>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="high_api_latency_p99"
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as PolicyCategory)}
                  className={fieldInputClass}
                >
                  {CATEGORY_ITEMS.filter((item) => item.id !== "all").map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                  className={fieldInputClass}
                >
                  {["info", "warning", "error", "critical"].map((sev) => (
                    <option key={sev} value={sev}>
                      {sev.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Metric Source</label>
                <input
                  required
                  value={metricSource}
                  onChange={(e) => setMetricSource(e.target.value)}
                  placeholder="http.request.duration"
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text2)]">Condition Expression</label>
              <input
                required
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="p99(http.request.duration) > 500ms for 5m"
                className={fieldInputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Threshold Value</label>
                <input
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  type="number"
                  placeholder="500"
                  className={fieldInputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Cooldown (Sec)</label>
                <input
                  value={cooldownSeconds}
                  onChange={(e) => setCooldownSeconds(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="900"
                  className={fieldInputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text2)]">Window (Sec)</label>
                <input
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(e.target.value)}
                  type="number"
                  min="1"
                  placeholder="300"
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text2)]">Policy Documentation</label>
              <textarea
                value={documentation}
                onChange={(e) => setDocumentation(e.target.value)}
                rows={3}
                placeholder="Explain the purpose of this rule, remediation steps, or runbook links..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-[12px] font-medium text-[var(--text2)] hover:bg-[var(--bg2)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-[12px] font-medium text-[var(--bg)] hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                <Plus className="size-3.5 shrink-0" />
                <span>{create.isPending ? "Creating..." : "Create Policy"}</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
