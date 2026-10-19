import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Ban,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  useOrganizationAlertPolicies,
  useOrgEffectiveRules,
  useAlertingScope,
} from "@/modules/alerting/hooks/useAlerting";
import {
  projectSubscriptionsApi,
} from "@/modules/alerting/api/alerting.api";
import {
  ALERT_SEVERITIES,
  type AlertSeverity,
  type OrganizationAlertPolicy,
  type ProjectSubscription,
} from "@/modules/alerting/api/types";
import { EnabledPill, labelize } from "@/modules/alerting/components/alerting-ui";
import { ProjectOverrideModal } from "@/modules/alerting/components/ProjectOverrideModal";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
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
import { Pill } from "@/shared/ui/pulse";
import { FilterSelect, SeverityBadge, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";

// ── module-level constants ───────────────────────────────────

type TabFilter = "catalog" | "effective";
type SortOption = "created_at" | "updated_at" | "name";

const PAGE_SIZE = 15;
const TABS_ID = "alert-rules";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Recently updated" },
  { value: "name", label: "Name" },
];

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

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "using", label: "Using" },
  { value: "overridden", label: "Overridden" },
  { value: "opted_out", label: "Opted Out" },
];

const CATALOG_COLUMNS: SheetColumn[] = [
  { key: "policy", header: "Policy" },
  { key: "category", header: "Category", className: `w-[132px] ${HIDE_BELOW_MD}` },
  { key: "severity", header: "Severity", className: "w-[108px]" },
  { key: "threshold", header: "Threshold", className: `w-[112px] ${HIDE_BELOW_LG}` },
  { key: "window", header: "Window", className: `w-[88px] ${HIDE_BELOW_XL}` },
  { key: "cooldown", header: "Cooldown", className: `w-[96px] ${HIDE_BELOW_LG}` },
  { key: "state", header: "State", className: "w-[80px]" },
];

const EFFECTIVE_COLUMNS: SheetColumn[] = [
  { key: "rule", header: "Rule & Key" },
  { key: "project", header: "Project", className: `w-[140px] ${HIDE_BELOW_MD}` },
  { key: "status", header: "Project Status", className: "w-[130px]" },
  { key: "severity", header: "Severity", className: "w-[100px]" },
  { key: "threshold", header: "Effective Threshold", className: `w-[140px] ${HIDE_BELOW_LG}` },
  { key: "timing", header: "Window / Cooldown", className: `w-[140px] ${HIDE_BELOW_XL}` },
  { key: "actions", header: "Actions", className: "w-[160px] text-right" },
];

const policyPath = (id: string) => `/alerts/policies/${id}`;

// ── data helpers ─────────────────────────────────────────────

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

function NotSet() {
  return <span className="text-[12px] text-[var(--text3)]">Not set</span>;
}

function MonoValue({ children }: { children: ReactNode }) {
  return <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{children}</span>;
}

// ── page ─────────────────────────────────────────────────────

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrgId } = useAlertingScope();

  // Tab State
  const [activeTab, setActiveTab] = useState<TabFilter>("catalog");

  // Catalog Tab State
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogSortBy, setCatalogSortBy] = useState<SortOption>("name");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [catalogSeverity, setCatalogSeverity] = useState("all");

  // Effective Tab State
  const [effectiveProject, setEffectiveProject] = useState("all");
  const [effectiveStatus, setEffectiveStatus] = useState("all");
  const [effectiveSearch, setEffectiveSearch] = useState("");

  // Override Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEffectiveItem, setSelectedEffectiveItem] = useState<any>(null);
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Queries
  const {
    data: policiesPage,
    isLoading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useOrganizationAlertPolicies({ limit: PAGE_SIZE, offset: catalogPage * PAGE_SIZE });

  const {
    data: effectiveData,
    isLoading: effectiveLoading,
    error: effectiveError,
    refetch: refetchEffective,
  } = useOrgEffectiveRules({
    projectId: effectiveProject === "all" ? undefined : effectiveProject,
    status: effectiveStatus === "all" ? undefined : effectiveStatus,
    search: effectiveSearch.trim() || undefined,
  });

  const policies = useMemo(() => policiesPage?.data ?? [], [policiesPage]);
  const totalPolicies = policiesPage?.total ?? policies.length;

  const effectiveItems = useMemo(() => effectiveData?.items ?? [], [effectiveData]);
  const effectiveProjects = useMemo(() => effectiveData?.projects ?? [], [effectiveData]);
  const effectiveSummary = effectiveData?.summary;

  const projectFilterOptions = useMemo(() => {
    return [
      { value: "all", label: "All Projects" },
      ...effectiveProjects.map((p) => ({ value: p.id, label: p.name })),
    ];
  }, [effectiveProjects]);

  const filteredCatalogPolicies = useMemo(() => {
    const list = policies.filter((policy) => {
      const matchesSearch = `${policy.name} ${policy.slug} ${policy.description}`
        .toLowerCase()
        .includes(catalogSearch.toLowerCase());
      const matchesCategory = catalogCategory === "all" || policy.category.toLowerCase() === catalogCategory;
      const matchesSeverity = catalogSeverity === "all" || policy.severity === catalogSeverity;
      return matchesSearch && matchesCategory && matchesSeverity;
    });

    return list.sort((a, b) => {
      if (catalogSortBy === "name") return a.name.localeCompare(b.name);
      if (catalogSortBy === "updated_at") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [catalogCategory, catalogSearch, catalogSeverity, catalogSortBy, policies]);

  // Overall Readouts
  const readouts: Readout[] = [
    {
      label: "Global Catalog",
      value: formatNumber(totalPolicies),
      sub: "Platform catalog definitions",
    },
    {
      label: "Active In Projects",
      value: formatNumber(effectiveSummary?.usingCount ?? 0),
      sub: "Currently evaluating",
    },
    {
      label: "Custom Overrides",
      value: formatNumber(effectiveSummary?.overriddenCount ?? 0),
      sub: "Tuned threshold or window",
    },
    {
      label: "Opted Out",
      value: formatNumber(effectiveSummary?.optedOutCount ?? 0),
      sub: "Disabled by projects",
    },
  ];

  const tabs: PageTab<TabFilter>[] = [
    { value: "catalog", label: "Catalog", count: totalPolicies || undefined },
    { value: "effective", label: "Effective", count: effectiveSummary?.totalEffectiveRules || undefined },
  ];

  // ── Actions on Effective Rules ──

  const handleToggleOpt = async (item: any) => {
    if (!activeOrgId) return;
    try {
      if (item.status === "opted_out") {
        // Opt back in / subscribe
        await projectSubscriptionsApi.subscribe(activeOrgId, item.projectId, item.catalogKey);
        toast.success(`Project ${item.projectName} subscribed to ${item.title}`);
      } else {
        // Opt out / disable
        if (item.subscriptionId) {
          await projectSubscriptionsApi.delete(activeOrgId, item.projectId, item.subscriptionId);
        } else {
          // Explicitly subscribe then disable
          const sub = await projectSubscriptionsApi.subscribe(activeOrgId, item.projectId, item.catalogKey);
          if (sub?.id) {
            await projectSubscriptionsApi.delete(activeOrgId, item.projectId, sub.id);
          }
        }
        toast.info(`Project ${item.projectName} opted out of ${item.title}`);
      }
      void queryClient.invalidateQueries({ queryKey: ["alerting"] });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update project subscription"));
    }
  };

  const handleOpenTuneModal = (item: any) => {
    setSelectedEffectiveItem(item);
    setModalOpen(true);
  };

  const handleSaveOverride = async (payload: {
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
    if (!activeOrgId || !selectedEffectiveItem) return;
    setIsSavingOverride(true);
    try {
      const subId = selectedEffectiveItem.subscriptionId;
      if (subId) {
        await projectSubscriptionsApi.updateOverride(
          activeOrgId,
          selectedEffectiveItem.projectId,
          subId,
          payload.override,
        );
      } else {
        await projectSubscriptionsApi.subscribe(
          activeOrgId,
          selectedEffectiveItem.projectId,
          selectedEffectiveItem.catalogKey,
          payload.override as any,
        );
      }
      toast.success("Project override saved");
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["alerting"] });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save project override"));
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleRemoveOverride = async (subscriptionId: string) => {
    if (!activeOrgId || !selectedEffectiveItem) return;
    setIsSavingOverride(true);
    try {
      if (subscriptionId) {
        await projectSubscriptionsApi.updateOverride(
          activeOrgId,
          selectedEffectiveItem.projectId,
          subscriptionId,
          {},
        );
      }
      toast.success("Reset to catalog defaults");
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["alerting"] });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not reset override"));
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Convert selectedEffectiveItem into shape ProjectOverrideModal expects
  const modalSubscription: ProjectSubscription | null = useMemo(() => {
    if (!selectedEffectiveItem || !activeOrgId) return null;
    return {
      id: selectedEffectiveItem.subscriptionId || `synth-${selectedEffectiveItem.projectId}-${selectedEffectiveItem.catalogKey}`,
      organizationId: activeOrgId,
      projectId: selectedEffectiveItem.projectId,
      policyId: selectedEffectiveItem.catalogKey,
      catalogKey: selectedEffectiveItem.catalogKey,
      state: selectedEffectiveItem.status === "opted_out" ? "disabled" : "subscribed",
      override: selectedEffectiveItem.configOverrides
        ? {
            id: selectedEffectiveItem.subscriptionId || "",
            subscriptionId: selectedEffectiveItem.subscriptionId || "",
            projectId: selectedEffectiveItem.projectId,
            policyId: selectedEffectiveItem.catalogKey,
            threshold: selectedEffectiveItem.effectiveThreshold,
            cooldownSeconds: selectedEffectiveItem.effectiveCooldownSeconds,
            evaluationWindowSeconds: selectedEffectiveItem.effectiveWindowSeconds,
            severity: selectedEffectiveItem.effectiveSeverity,
            channels: (selectedEffectiveItem.configOverrides.channels as string[]) || [],
            environment: null,
            createdAt: selectedEffectiveItem.updatedAt,
            updatedAt: selectedEffectiveItem.updatedAt,
          }
        : null,
      createdAt: selectedEffectiveItem.updatedAt,
      updatedAt: selectedEffectiveItem.updatedAt,
    };
  }, [selectedEffectiveItem, activeOrgId]);

  const modalPolicy: OrganizationAlertPolicy | null = useMemo(() => {
    if (!selectedEffectiveItem || !activeOrgId) return null;
    return {
      id: selectedEffectiveItem.catalogId,
      organizationId: activeOrgId,
      version: 1,
      slug: selectedEffectiveItem.catalogKey,
      name: selectedEffectiveItem.title,
      description: selectedEffectiveItem.title,
      category: selectedEffectiveItem.category as any,
      severity: selectedEffectiveItem.effectiveSeverity,
      metricSource: selectedEffectiveItem.catalogKey,
      expression: `${selectedEffectiveItem.catalogKey} ${selectedEffectiveItem.effectiveOperator} threshold`,
      defaultThreshold: { value: selectedEffectiveItem.effectiveThreshold },
      recoveryThreshold: {},
      cooldownSeconds: selectedEffectiveItem.effectiveCooldownSeconds,
      evaluationWindowSeconds: selectedEffectiveItem.effectiveWindowSeconds,
      isSystem: true,
      enabled: true,
      createdAt: selectedEffectiveItem.updatedAt,
      updatedAt: selectedEffectiveItem.updatedAt,
    };
  }, [selectedEffectiveItem, activeOrgId]);

  // ── Catalog Body ──

  let catalogBody: ReactNode;
  if (catalogLoading && !policiesPage) {
    catalogBody = <SheetLoading rows={6} label="Loading global alert catalog" />;
  } else if (catalogError && !policiesPage) {
    catalogBody = (
      <SheetError
        title="Could not load alert catalog"
        message={apiErrorMessage(catalogError, "The global catalog is unavailable right now.")}
        onRetry={() => void refetchCatalog()}
      />
    );
  } else if (policies.length === 0) {
    catalogBody = (
      <SheetEmpty
        title="No alert catalog policies found"
        description="The platform global alert catalog is populated during deployment. Check your database connectivity."
      />
    );
  } else if (filteredCatalogPolicies.length === 0) {
    catalogBody = (
      <SheetEmpty
        title="No catalog policies match your filters"
        description="Try searching for a different keyword or resetting your filters."
        action={
          <UiButton
            variant="outline"
            size="sm"
            onClick={() => {
              setCatalogSearch("");
              setCatalogCategory("all");
              setCatalogSeverity("all");
            }}
          >
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    catalogBody = (
      <SheetTable columns={CATALOG_COLUMNS} caption="Global alert catalog">
        {filteredCatalogPolicies.map((policy) => {
          const thresholdSpec = formatPolicyThreshold(policy.defaultThreshold);
          const windowValue = formatSeconds(policy.evaluationWindowSeconds);
          const cooldownValue = formatSeconds(policy.cooldownSeconds);

          return (
            <SheetRow key={policy.id} onActivate={() => navigate(policyPath(policy.id))}>
              <SheetCell>
                <RowTitle
                  title={policy.name}
                  subtitle={policy.description || undefined}
                  to={policyPath(policy.id)}
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <span className="text-[12px] text-[var(--text2)]">{labelize(policy.category)}</span>
              </SheetCell>
              <SheetCell>
                <SeverityBadge severity={policy.severity} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {thresholdSpec === null ? (
                  <NotSet />
                ) : thresholdSpec.mono ? (
                  <MonoValue>{thresholdSpec.text}</MonoValue>
                ) : (
                  <span className="text-[12px] text-[var(--text2)]">{thresholdSpec.text}</span>
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

  // ── Effective Body ──

  let effectiveBody: ReactNode;
  if (effectiveLoading && !effectiveData) {
    effectiveBody = <SheetLoading rows={8} label="Resolving effective project policies" />;
  } else if (effectiveError && !effectiveData) {
    effectiveBody = (
      <SheetError
        title="Could not resolve effective policies"
        message={apiErrorMessage(effectiveError, "The effective policies endpoint is unavailable right now.")}
        onRetry={() => void refetchEffective()}
      />
    );
  } else if (effectiveItems.length === 0) {
    effectiveBody = (
      <SheetEmpty
        title="No effective policies match your selection"
        description="Try changing your project or status filter, or clearing your search."
        action={
          <UiButton
            variant="outline"
            size="sm"
            onClick={() => {
              setEffectiveProject("all");
              setEffectiveStatus("all");
              setEffectiveSearch("");
            }}
          >
            Reset effective filters
          </UiButton>
        }
      />
    );
  } else {
    effectiveBody = (
      <SheetTable columns={EFFECTIVE_COLUMNS} caption="Effective alert rules by project">
        {effectiveItems.map((item) => {
          const isOptedOut = item.status === "opted_out";
          const isOverridden = item.status === "overridden";

          return (
            <SheetRow key={`${item.projectId}-${item.catalogKey}`}>
              {/* Rule & Key */}
              <SheetCell>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-[var(--text)]">{item.title}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                      {item.catalogKey}
                    </span>
                    <Pill>{labelize(item.category)}</Pill>
                  </div>
                </div>
              </SheetCell>

              {/* Project */}
              <SheetCell className={HIDE_BELOW_MD}>
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-medium text-[var(--text2)]">{item.projectName}</span>
                  <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                    {item.projectSlug}
                  </span>
                </div>
              </SheetCell>

              {/* Status Badge */}
              <SheetCell>
                {item.status === "using" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11.5px] font-medium text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    Using
                  </span>
                )}
                {isOverridden && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11.5px] font-medium text-violet-400">
                    <Sliders className="size-3" />
                    Overridden
                  </span>
                )}
                {isOptedOut && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-[11.5px] font-medium text-zinc-400">
                    <Ban className="size-3" />
                    Opted Out
                  </span>
                )}
              </SheetCell>

              {/* Severity */}
              <SheetCell>
                <SeverityBadge severity={item.effectiveSeverity} />
              </SheetCell>

              {/* Effective Threshold */}
              <SheetCell className={HIDE_BELOW_LG}>
                <div className="flex items-center gap-1.5">
                  <span className="font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text2)]">
                    {item.effectiveOperator} {item.effectiveThreshold != null ? item.effectiveThreshold : "Default"}
                  </span>
                  {isOverridden && (
                    <span className="rounded bg-violet-500/15 px-1 py-0.5 text-[10px] font-semibold uppercase text-violet-300">
                      Tuned
                    </span>
                  )}
                </div>
              </SheetCell>

              {/* Timing */}
              <SheetCell className={HIDE_BELOW_XL}>
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                  {formatSeconds(item.effectiveWindowSeconds)} · {formatSeconds(item.effectiveCooldownSeconds)}
                </span>
              </SheetCell>

              {/* Actions */}
              <SheetCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <UiButton
                    variant={isOptedOut ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[11.5px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleToggleOpt(item);
                    }}
                  >
                    {isOptedOut ? "Opt In" : "Opt Out"}
                  </UiButton>
                  <UiButton
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11.5px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTuneModal(item);
                    }}
                  >
                    <Sliders className="size-3 mr-1" />
                    Tune
                  </UiButton>
                </div>
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
        title="Alert Catalog & Effective Rules"
        description="Global alert catalog provided by the platform. Organizations cannot author custom conditions; projects subscribe to catalog rules and tune thresholds within bounded limits."
      />

      <Readouts cells={readouts} loading={catalogLoading && effectiveLoading} label="Catalog & Effective summary" />

      <PageTabs tabs={tabs} value={activeTab} onChange={setActiveTab} label="Alert views" idBase={TABS_ID} />

      <div {...pageTabPanelProps(TABS_ID, activeTab)}>
        {activeTab === "catalog" ? (
          <Sheet
            label="Global Alert Catalog"
            toolbar={
              <>
                <SearchField
                  value={catalogSearch}
                  onChange={setCatalogSearch}
                  placeholder="Search catalog by name, slug, or description"
                  label="Search catalog"
                />
                <FilterSelect
                  label="Category"
                  value={catalogCategory}
                  onChange={setCatalogCategory}
                  options={CATEGORY_FILTER_OPTIONS}
                />
                <FilterSelect
                  label="Severity"
                  value={catalogSeverity}
                  onChange={setCatalogSeverity}
                  options={SEVERITY_FILTER_OPTIONS}
                />
                <FilterSelect
                  label="Sort"
                  value={catalogSortBy}
                  onChange={(next) => setCatalogSortBy(next as SortOption)}
                  options={SORT_OPTIONS}
                />
                {!catalogLoading && !catalogError && (
                  <ToolbarCount>
                    {formatNumber(filteredCatalogPolicies.length)}{" "}
                    {filteredCatalogPolicies.length === 1 ? "catalog policy" : "catalog policies"}
                  </ToolbarCount>
                )}
              </>
            }
          >
            {catalogBody}
          </Sheet>
        ) : (
          <Sheet
            label="Effective Project Rules"
            toolbar={
              <>
                <SearchField
                  value={effectiveSearch}
                  onChange={setEffectiveSearch}
                  placeholder="Search rules, catalog keys, or projects..."
                  label="Search effective rules"
                />
                <FilterSelect
                  label="Project"
                  value={effectiveProject}
                  onChange={setEffectiveProject}
                  options={projectFilterOptions}
                />
                <FilterSelect
                  label="Status"
                  value={effectiveStatus}
                  onChange={setEffectiveStatus}
                  options={STATUS_FILTER_OPTIONS}
                />
                {!effectiveLoading && !effectiveError && (
                  <ToolbarCount>
                    {formatNumber(effectiveItems.length)}{" "}
                    {effectiveItems.length === 1 ? "effective rule" : "effective rules"}
                  </ToolbarCount>
                )}
              </>
            }
          >
            {effectiveBody}
          </Sheet>
        )}
      </div>

      {/* Project Override / Tuning Modal */}
      <ProjectOverrideModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        subscription={modalSubscription}
        policy={modalPolicy}
        isSaving={isSavingOverride}
        onSave={handleSaveOverride}
        onRemoveOverride={handleRemoveOverride}
      />
    </WorkspacePage>
  );
}
