import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useOrganizationAlertPolicies,
  useOrganizationAlertPolicyMutations,
} from "@/modules/alerting/hooks/useAlerting";
import {
  ALERT_SEVERITIES,
  type AlertSeverity,
  type OrganizationAlertPolicy,
  type PolicyCategory,
} from "@/modules/alerting/api/types";
import { EnabledPill, labelize } from "@/modules/alerting/components/alerting-ui";
import { DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_XL,
  PageTabs,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  pageTabPanelProps,
  type PageTab,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Pill, fieldInputClass, fieldMonoClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { FilterSelect, SeverityBadge, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";

// ── module-level constants ───────────────────────────────────

type TabFilter = "catalog" | "custom" | "effective";
type SortOption = "created_at" | "updated_at" | "name";

const PAGE_SIZE = 15;
const TABS_ID = "alert-rules";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Recently updated" },
  { value: "name", label: "Name" },
];

/** Categories offered by the filter and the create form. */
const POLICY_CATEGORIES = [
  { value: "errors", label: "Errors" },
  { value: "performance", label: "Performance" },
  { value: "availability", label: "Availability" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "security", label: "Security" },
  { value: "database", label: "Database" },
  { value: "custom", label: "Custom" },
];

const CATEGORY_FILTER_OPTIONS = [{ value: "all", label: "All" }, ...POLICY_CATEGORIES];

const SEVERITY_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  ...[...ALERT_SEVERITIES].reverse().map((value) => ({ value, label: labelize(value) })),
];

const COLUMNS: SheetColumn[] = [
  { key: "policy", header: "Policy" },
  { key: "category", header: "Category", className: `w-[132px] ${HIDE_BELOW_MD}` },
  { key: "severity", header: "Severity", className: "w-[108px]" },
  { key: "threshold", header: "Threshold", className: `w-[112px] ${HIDE_BELOW_LG}` },
  { key: "window", header: "Window", className: `w-[88px] ${HIDE_BELOW_XL}` },
  { key: "cooldown", header: "Cooldown", className: `w-[96px] ${HIDE_BELOW_LG}` },
  { key: "state", header: "State", className: "w-[80px]" },
];

const policyPath = (id: string) => `/alerts/policies/${id}`;

// ── data helpers ─────────────────────────────────────────────

/** Same rule the custom tab has always used. */
const isCustomPolicy = (policy: OrganizationAlertPolicy) => !policy.isSystem || policy.category === "custom";

/** `{ value: 500, unit: "ms" }` → `500 ms`; `null` when nothing is set. */
function formatPolicyThreshold(value: unknown): { text: string; mono: boolean } | null {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return { text: String(value), mono: true };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const rawValue = record.value ?? record.threshold ?? record.default ?? record.amount;
    const unit = typeof record.unit === "string" && record.unit.length > 0 ? ` ${record.unit}` : "";
    if (rawValue != null) return { text: `${String(rawValue)}${unit}`, mono: true };
  }
  return { text: "Configured", mono: false };
}

function formatSeconds(seconds?: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function NotSet() {
  return <span className="text-[12px] text-[var(--text3)]">Not set</span>;
}

function MonoValue({ children }: { children: ReactNode }) {
  return <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{children}</span>;
}

// ── page ─────────────────────────────────────────────────────

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const {
    data: policiesPage,
    isLoading,
    error,
    refetch,
  } = useOrganizationAlertPolicies({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const policies = useMemo(() => policiesPage?.data ?? [], [policiesPage]);
  const totalPolicies = policiesPage?.total ?? policies.length;
  const { create } = useOrganizationAlertPolicyMutations();

  const [activeTab, setActiveTab] = useState<TabFilter>("catalog");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [open, setOpen] = useState(false);

  // Form state
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
      const matchesSeverity = severityFilter === "all" || policy.severity === severityFilter;
      return matchesSearch && matchesCategory && matchesSeverity;
    });

    if (activeTab === "custom") {
      list = list.filter(isCustomPolicy);
    }

    return list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "updated_at") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, category, policies, search, severityFilter, sortBy]);

  const activeCount = useMemo(() => policies.filter((p) => p.enabled !== false).length, [policies]);
  const customCount = useMemo(() => policies.filter(isCustomPolicy).length, [policies]);
  const criticalCount = useMemo(() => policies.filter((p) => p.severity === "critical").length, [policies]);

  const loading = isLoading && !policiesPage;
  const loadFailed = Boolean(error) && !policiesPage;
  // The endpoint pages at 15, so per-policy readings only cover this page.
  const partial = totalPolicies > policies.length;
  const paged = totalPolicies > PAGE_SIZE;
  const hasFilters = search.trim() !== "" || category !== "all" || severityFilter !== "all";
  const tabPolicies = activeTab === "custom" ? policies.filter(isCustomPolicy) : policies;
  const pageScope = "Among policies on this page";

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setSeverityFilter("all");
  };

  const readouts: Readout[] = [
    {
      label: "Policies",
      value: formatNumber(totalPolicies),
      sub: partial ? `${formatNumber(policies.length)} loaded on this page` : "In the organization catalog",
    },
    {
      label: "Enabled",
      value: formatNumber(activeCount),
      sub: partial
        ? pageScope
        : policies.length === 0
          ? "No policies yet"
          : activeCount === policies.length
            ? "Every policy is on"
            : `${formatNumber(policies.length - activeCount)} turned off`,
    },
    {
      label: "Custom",
      value: formatNumber(customCount),
      sub: partial ? pageScope : "Listed in the Custom tab",
    },
    {
      label: "Critical",
      value: formatNumber(criticalCount),
      sub: partial ? pageScope : "Highest severity",
    },
  ];

  const tabs: PageTab<TabFilter>[] = [
    { value: "catalog", label: "Catalog", count: policiesPage ? totalPolicies : undefined },
    // Custom policies are only countable when the whole catalog is loaded.
    { value: "custom", label: "Custom", count: policiesPage && !partial ? customCount : undefined },
    { value: "effective", label: "Effective" },
  ];

  const handleCreate = () => {
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
          toast.success("Policy created");
          setOpen(false);
          setName("");
          setSlug("");
          setMetricSource("");
          setExpression("");
        },
        onError: (mutationError) =>
          toast.error(apiErrorMessage(mutationError, "Could not create the policy. Check the fields and try again.")),
      },
    );
  };

  const createButton = (
    <UiButton size="lg" onClick={() => setOpen(true)}>
      <Plus className="size-4" aria-hidden="true" />
      Create policy
    </UiButton>
  );

  // ── policy sheet body (catalog and custom) ──

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={6} label="Loading alert policies" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load alert policies"
        message={apiErrorMessage(error, "The policy catalog is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (tabPolicies.length === 0) {
    body =
      activeTab === "custom" ? (
        <SheetEmpty
          title={partial ? "No custom policies on this page" : "No custom policies yet"}
          description={
            partial
              ? "Custom policies may be on another page of the catalog. Use Previous and Next below, or create one."
              : "Custom policies are the ones your organization defines: a metric source, a condition, and a threshold. Create one to alert on something the system policies don't cover."
          }
          action={createButton}
        />
      ) : (
        <SheetEmpty
          title="No policies in the catalog yet"
          description="A policy names a metric source, the condition that breaches it, and how often it can alert. Create one to start."
          action={createButton}
        />
      );
  } else if (filteredPolicies.length === 0) {
    body = (
      <SheetEmpty
        title="No policies match"
        description={
          search.trim()
            ? `Nothing on this page matches “${search.trim()}” with the current filters.`
            : "No policy on this page matches the current category and severity filters."
        }
        action={
          hasFilters ? (
            <UiButton variant="outline" size="lg" onClick={clearFilters}>
              Clear filters
            </UiButton>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <SheetTable
        columns={COLUMNS}
        caption={activeTab === "custom" ? "Custom alert policies" : "Alert policy catalog"}
        minWidth={520}
      >
        {filteredPolicies.map((policy) => {
          const to = policyPath(policy.id);
          const thresholdValue = formatPolicyThreshold(policy.defaultThreshold);
          const windowValue = formatSeconds(policy.evaluationWindowSeconds);
          const cooldownValue = formatSeconds(policy.cooldownSeconds);
          const condition = policy.expression || policy.metricSource;
          return (
            <SheetRow key={policy.id} onActivate={() => navigate(to)}>
              <SheetCell className="w-full max-w-0">
                <RowTitle
                  title={policy.name}
                  to={to}
                  badges={policy.isSystem ? <Pill>System</Pill> : undefined}
                  subtitle={
                    condition ? (
                      <span title={condition}>{condition}</span>
                    ) : (
                      <span className="font-[family-name:var(--sans)]">No metric source</span>
                    )
                  }
                  subtitleMono
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <Pill>{labelize(policy.category || "general")}</Pill>
              </SheetCell>
              <SheetCell>
                <SeverityBadge severity={policy.severity} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {thresholdValue === null ? (
                  <NotSet />
                ) : thresholdValue.mono ? (
                  <MonoValue>{thresholdValue.text}</MonoValue>
                ) : (
                  <span className="text-[12px] text-[var(--text2)]">{thresholdValue.text}</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                {windowValue === null ? <NotSet /> : <MonoValue>{windowValue}</MonoValue>}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {cooldownValue === null ? <NotSet /> : <MonoValue>{cooldownValue}</MonoValue>}
              </SheetCell>
              <SheetCell>
                <EnabledPill enabled={policy.enabled !== false} />
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  const rangeStart = page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE + (policies.length || PAGE_SIZE), totalPolicies);

  const footer =
    paged && !loadFailed ? (
      <>
        <span>
          Showing{" "}
          <span className="font-[family-name:var(--mono)] tabular-nums">
            {formatNumber(rangeStart)}–{formatNumber(rangeEnd)}
          </span>{" "}
          of <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(totalPolicies)}</span>.
          Search and filters apply to this page.
        </span>
        <div className="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            aria-label="Previous page"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            aria-label="Next page"
            onClick={() => setPage((current) => current + 1)}
            disabled={(page + 1) * PAGE_SIZE >= totalPolicies}
          >
            Next
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </UiButton>
        </div>
      </>
    ) : undefined;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Alert rules"
        description="Every organization alert policy, with the metric it evaluates, its severity, and how often it can alert. Open a policy to manage thresholds, triggers, and project subscriptions."
        actions={createButton}
      />

      {!loadFailed && <Readouts cells={readouts} loading={loading} label="Policy summary" />}

      <PageTabs tabs={tabs} value={activeTab} onChange={setActiveTab} label="Policy views" idBase={TABS_ID} />

      <div {...pageTabPanelProps(TABS_ID, activeTab)}>
        {activeTab === "effective" ? (
          <Sheet label="Effective policies">
            <SheetEmpty
              title="Effective policies live on each project"
              description="Effective policies are the merged rules generated when a project subscribes to an organization alert policy or applies project-level overrides. This page lists the organization catalog only; subscribe a project and set its overrides from that project's Alert rules tab."
              action={
                <UiButton variant="outline" size="lg" onClick={() => setActiveTab("catalog")}>
                  Browse the catalog
                </UiButton>
              }
            />
          </Sheet>
        ) : (
          <Sheet
            label={activeTab === "custom" ? "Custom policies" : "Policy catalog"}
            toolbar={
              <>
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name, slug, or description"
                  label="Search policies"
                />
                <FilterSelect label="Category" value={category} onChange={setCategory} options={CATEGORY_FILTER_OPTIONS} />
                <FilterSelect
                  label="Severity"
                  value={severityFilter}
                  onChange={setSeverityFilter}
                  options={SEVERITY_FILTER_OPTIONS}
                />
                <FilterSelect
                  label="Sort"
                  value={sortBy}
                  onChange={(next) => setSortBy(next as SortOption)}
                  options={SORT_OPTIONS}
                />
                {!loading && !loadFailed && (
                  <ToolbarCount>
                    {formatNumber(filteredPolicies.length)} {filteredPolicies.length === 1 ? "policy" : "policies"}
                    {paged ? " on this page" : ""}
                  </ToolbarCount>
                )}
              </>
            }
            footer={footer}
          >
            {body}
          </Sheet>
        )}
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Create organization policy"
        description="Name the metric to evaluate, the condition that breaches it, and how often it can alert."
        submitLabel={create.isPending ? "Creating policy" : "Create policy"}
        pending={create.isPending}
        onSubmit={handleCreate}
        width="sm:max-w-[680px]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <DialogField label="Name" name="policy-name" required>
            <input
              id="policy-name"
              name="policy-name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(toSlug(e.target.value));
              }}
              placeholder="High API latency p99"
              className={fieldInputClass}
            />
          </DialogField>

          <DialogField label="Slug" name="policy-slug" hint="Filled in from the name. You can edit it." required>
            <input
              id="policy-slug"
              name="policy-slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="high_api_latency_p99"
              className={fieldMonoClass}
            />
          </DialogField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <DialogField label="Category" name="policy-category">
            <select
              id="policy-category"
              name="policy-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={fieldInputClass}
            >
              {POLICY_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </DialogField>

          <DialogField label="Severity" name="policy-severity">
            <select
              id="policy-severity"
              name="policy-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
              className={fieldInputClass}
            >
              {ALERT_SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {labelize(sev)}
                </option>
              ))}
            </select>
          </DialogField>

          <DialogField label="Metric source" name="policy-metric" required>
            <input
              id="policy-metric"
              name="policy-metric"
              required
              value={metricSource}
              onChange={(e) => setMetricSource(e.target.value)}
              placeholder="http.request.duration"
              className={fieldMonoClass}
            />
          </DialogField>
        </div>

        <DialogField label="Condition expression" name="policy-expression" required>
          <input
            id="policy-expression"
            name="policy-expression"
            required
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="p99(http.request.duration) > 500ms for 5m"
            className={fieldMonoClass}
          />
        </DialogField>

        <div className="grid gap-4 sm:grid-cols-3">
          <DialogField label="Threshold" name="policy-threshold">
            <input
              id="policy-threshold"
              name="policy-threshold"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              type="number"
              placeholder="500"
              className={fieldMonoClass}
            />
          </DialogField>

          <DialogField label="Cooldown (seconds)" name="policy-cooldown">
            <input
              id="policy-cooldown"
              name="policy-cooldown"
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(e.target.value)}
              type="number"
              min="0"
              placeholder="900"
              className={fieldMonoClass}
            />
          </DialogField>

          <DialogField label="Evaluation window (seconds)" name="policy-window">
            <input
              id="policy-window"
              name="policy-window"
              value={windowSeconds}
              onChange={(e) => setWindowSeconds(e.target.value)}
              type="number"
              min="1"
              placeholder="300"
              className={fieldMonoClass}
            />
          </DialogField>
        </div>

        <DialogField
          label="Documentation"
          name="policy-documentation"
          hint="Also used as the description. Left empty, the description names the metric source."
        >
          <textarea
            id="policy-documentation"
            name="policy-documentation"
            value={documentation}
            onChange={(e) => setDocumentation(e.target.value)}
            rows={3}
            placeholder="What this rule catches, how to remediate, and runbook links"
            className={fieldTextareaClass}
          />
        </DialogField>
      </FormDialog>
    </WorkspacePage>
  );
}
