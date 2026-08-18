import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import {
  PageHeader,
  FillPage,
  TableToolbar,
  SeverityBadge,
  Timestamp,
  InfiniteTable,
  formatCompact,
  SelectionProvider,
  useSelection,
  AskAiModal,
  KpiCard,
  TimeRangePicker,
  useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ErrorGroup, ErrorGroupFilterState } from "../types/error-group";
import { ErrorGroupStatusBadge, RegressionBadge } from "../components/ErrorGroupStatusBadge";
import { ErrorGroupFilters } from "../components/ErrorGroupFilters";
import { MergeDialog } from "../components/MergeDialog";
import { ResolveDialog } from "../components/ResolveDialog";
import { MoreVertical, Eye, CheckCircle2, EyeOff, GitMerge, AlertTriangle, Layers, Activity, RefreshCw } from "lucide-react";
import { useErrorGroupsList, useErrorGroupMutations } from "../hooks/useErrorGroups";
import { useOrgStore } from "@/modules/organizations/store/org.store";

function ErrorGroupsListPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const { timeRangeState } = useTimeRangeParams();

  const [filters, setFilters] = useState<ErrorGroupFilterState>({
    status: "",
    severity: "",
    isRegression: "",
    environment: "",
    release: "",
    sdkVersion: "",
    appVersion: "",
    minOccurrences: "",
    search: "",
  });

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [targetResolveGroup, setTargetResolveGroup] = useState<ErrorGroup | null>(null);
  const [targetMergeGroup, setTargetMergeGroup] = useState<ErrorGroup | null>(null);

  const { selectedKeys, toggleSelect, selectAll, clearSelection, selectedCount } = useSelection();

  // Combine local filter state with project slug and time range params
  const apiFilters = useMemo<ErrorGroupFilterState>(
    () => ({
      ...filters,
      project: activeProjectSlug ?? undefined,
      range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
      from: timeRangeState.from,
      to: timeRangeState.to,
    }),
    [filters, activeProjectSlug, timeRangeState],
  );

  const { groups: filteredGroups, refetch, isLoading, error } = useErrorGroupsList(apiFilters);
  const { updateStatus, mergeGroups } = useErrorGroupMutations();
  const allGroups = filteredGroups;

  // Calculate summary metrics across loaded groups
  const summaryMetrics = useMemo(() => {
    const totalGroups = filteredGroups.length;
    const openCount = filteredGroups.filter((g) => {
      const s = String(g.status).toLowerCase();
      return s === "open" || s === "unresolved";
    }).length;
    const regressionCount = filteredGroups.filter((g) =>
      Boolean((g.regression?.count ?? 0) > 0 || g.isRegression || g.is_regression),
    ).length;
    const totalOccurrences = filteredGroups.reduce(
      (acc, g) => acc + Number(g.occurrences?.count ?? g.occurrenceCount ?? g.occurrence_count ?? 1),
      0,
    );

    return { totalGroups, openCount, regressionCount, totalOccurrences };
  }, [filteredGroups]);

  const handleFilterChange = (key: keyof ErrorGroupFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: "",
      severity: "",
      isRegression: "",
      environment: "",
      release: "",
      sdkVersion: "",
      appVersion: "",
      minOccurrences: "",
      search: "",
    });
  };

  const columns: Column<ErrorGroup>[] = [
    {
      key: "firstSeen",
      header: "First Seen",
      width: "120px",
      cell: (g) => <Timestamp value={g.occurrences?.firstSeenAt ?? g.firstSeenAt ?? g.firstSeen ?? g.first_seen_at} />,
    },
    {
      key: "issue",
      header: "Issue",
      width: "1fr",
      cell: (g) => {
        const errorName = g.latestEvent?.errorName ?? g.lastErrorName ?? g.last_error_name ?? "Error";
        const message = g.latestEvent?.message ?? g.lastErrorMessage ?? g.last_error_message ?? g.fingerprint;
        const targetId = g.publicId ?? g.id;
        return (
          <div className="min-w-0 flex flex-col justify-center py-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {g.publicId && (
                <span className="font-[family-name:var(--mono)] text-[10px] font-semibold text-[var(--brand)] bg-[var(--brand)]/10 px-1.5 py-0.5 rounded border border-[var(--brand)]/20 shrink-0">
                  {g.publicId}
                </span>
              )}
              <Link
                to={`/observability/error-groups/${targetId}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate font-semibold text-[13px] text-[var(--text)] hover:text-[var(--brand)] hover:underline flex items-center gap-1.5"
                title={errorName}
              >
                <AlertTriangle className="size-3.5 shrink-0 text-[var(--red)]" />
                <span className="truncate">{errorName}</span>
              </Link>
            </div>
            <div className="truncate text-[12px] text-[var(--text2)] font-[family-name:var(--mono)] mt-0.5" title={message}>
              {message}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      cell: (g) => <ErrorGroupStatusBadge status={g.status} />,
    },
    {
      key: "occurrences",
      header: "Occurrences",
      width: "110px",
      cell: (g) => (
        <span className="font-[family-name:var(--mono)] text-[12px] font-bold tabular-nums text-[var(--text)] bg-[var(--bg2)] px-2 py-0.5 rounded border border-[var(--border)]">
          {formatCompact(g.occurrences?.count ?? g.occurrenceCount ?? g.occurrence_count ?? 1)}
        </span>
      ),
    },
    {
      key: "lastSeen",
      header: "Last Seen",
      width: "120px",
      cell: (g) => <Timestamp value={g.occurrences?.lastSeenAt ?? g.lastSeenAt ?? g.lastSeen ?? g.last_seen_at} />,
    },
    {
      key: "regression",
      header: "Regression",
      width: "120px",
      cell: (g) => (
        <RegressionBadge
          isRegression={Boolean((g.regression?.count ?? 0) > 0 || g.isRegression || g.is_regression)}
        />
      ),
    },
    {
      key: "severity",
      header: "Severity",
      width: "110px",
      cell: (g) => (
        <SeverityBadge
          severity={g.severity?.highest ?? g.highestSeverity ?? g.highest_severity ?? g.severity?.latest ?? "error"}
        />
      ),
    },
    {
      key: "release",
      header: "Release",
      width: "110px",
      cell: (g) => (
        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text2)] bg-[var(--bg2)] px-1.5 py-0.5 rounded">
          {g.release?.latest ?? g.latestRelease ?? g.latest_release ?? "v1.0.0"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "48px",
      align: "right",
      cell: (g) => {
        const targetId = g.publicId ?? g.id;
        return (
          <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveMenuId(activeMenuId === targetId ? null : targetId)}
              className="flex size-7 items-center justify-center rounded-md text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)] cursor-pointer"
            >
              <MoreVertical className="size-4" />
            </button>

            {activeMenuId === targetId && (
              <div className="absolute right-0 top-8 z-30 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg1)] shadow-xl p-1 text-[12px] animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    navigate(`/observability/error-groups/${targetId}`);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg2)] cursor-pointer font-medium"
                >
                  <Eye className="size-3.5 text-[var(--brand)]" />
                  View Full Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    setTargetResolveGroup(g);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg2)] cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5 text-[var(--green)]" />
                  Resolve / Change Status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    setTargetResolveGroup(g);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg2)] cursor-pointer"
                >
                  <EyeOff className="size-3.5 text-[var(--text3)]" />
                  Ignore Issue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    setTargetMergeGroup(g);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[var(--text)] hover:bg-[var(--bg2)] cursor-pointer"
                >
                  <GitMerge className="size-3.5 text-[var(--violet)]" />
                  Merge into another Group
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Error Groups"
        description="Enterprise error triage workspace grouped by unique fingerprints, releases, and regression signals."
        actions={<TimeRangePicker />}
      />

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 my-1">
        <KpiCard label="Total Error Groups" value={formatCompact(summaryMetrics.totalGroups)} icon={Layers} />
        <KpiCard label="Open Issues" value={formatCompact(summaryMetrics.openCount)} icon={AlertTriangle} />
        <KpiCard label="Regressed Issues" value={formatCompact(summaryMetrics.regressionCount)} icon={RefreshCw} />
        <KpiCard label="Total Occurrences" value={formatCompact(summaryMetrics.totalOccurrences)} icon={Activity} />
      </div>

      <TableToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onAskAi={() => setIsAiModalOpen(true)}
        resourceName="error-groups"
      >
        <ErrorGroupFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      </TableToolbar>

      {error && (
        <div className="rounded-[var(--radius)] border border-[var(--red)]/30 bg-[var(--red-bg)] px-4 py-3 text-[12px] text-[var(--red)]">
          {error.message || "Error groups could not be loaded."}
        </div>
      )}

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={filteredGroups}
        queryKey={["error-groups-list", JSON.stringify(apiFilters)]}
        columns={columns}
        getKey={(g) => g.publicId ?? g.id}
        onRowClick={(g) => navigate(`/observability/error-groups/${g.publicId ?? g.id}`)}
        selectable
        selectedKeys={selectedKeys}
        onSelectToggle={toggleSelect}
        onSelectAllToggle={selectAll}
      />

      <AskAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        resource="error-groups"
        selectedIds={Array.from(selectedKeys)}
        filters={apiFilters as any}
      />

      {targetResolveGroup && (
        <ResolveDialog
          isOpen={!!targetResolveGroup}
          onClose={() => setTargetResolveGroup(null)}
          group={targetResolveGroup}
          onConfirm={async (st, reason) => {
            await updateStatus(targetResolveGroup.publicId ?? targetResolveGroup.id, st, reason);
            refetch();
          }}
        />
      )}

      {targetMergeGroup && (
        <MergeDialog
          isOpen={!!targetMergeGroup}
          onClose={() => setTargetMergeGroup(null)}
          currentGroup={targetMergeGroup}
          allGroups={allGroups}
          onMerge={async (targetId) => {
            await mergeGroups(targetMergeGroup.publicId ?? targetMergeGroup.id, targetId);
            refetch();
          }}
        />
      )}
    </FillPage>
  );
}

export default function ErrorGroupsListPage() {
  return (
    <SelectionProvider>
      <ErrorGroupsListPageContent />
    </SelectionProvider>
  );
}
