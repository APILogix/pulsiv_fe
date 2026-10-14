import type { ExplorerPagination } from "@/pages/observe/hooks/useObservabilityApi";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { MoreHorizontal, Eye, CheckCircle2, EyeOff, GitMerge } from "lucide-react";
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
  TimeRangePicker,
  useTimeRangeParams,
  SignalSheet,
  useSignalTimeline,
  useTimeWindow,
  rangeParams,
  pct,
  MUTED_DASH,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ErrorGroup, ErrorGroupFilterState } from "../types/error-group";
import { ErrorGroupStatusBadge, RegressionBadge } from "../components/ErrorGroupStatusBadge";
import { ErrorGroupFilters } from "../components/ErrorGroupFilters";
import { MergeDialog } from "../components/MergeDialog";
import { ResolveDialog } from "../components/ResolveDialog";
import { useErrorGroupsList, useErrorGroupMutations } from "../hooks/useErrorGroups";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useCursorPagination } from "@/pages/observe/hooks/useCursorPagination";

const EMPTY_FILTERS: ErrorGroupFilterState = {
  status: "",
  severity: "",
  isRegression: "",
  environment: "",
  release: "",
  sdkVersion: "",
  appVersion: "",
  minOccurrences: "",
  search: "",
};

const occurrencesOf = (g: ErrorGroup) => Number(g.occurrences?.count ?? g.occurrenceCount ?? g.occurrence_count ?? 0);
const isRegressed = (g: ErrorGroup) => Boolean((g.regression?.count ?? 0) > 0 || g.isRegression || g.is_regression);

function ErrorGroupsListPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);

  const [filters, setFilters] = useState<ErrorGroupFilterState>(EMPTY_FILTERS);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [targetResolveGroup, setTargetResolveGroup] = useState<ErrorGroup | null>(null);
  const [targetMergeGroup, setTargetMergeGroup] = useState<ErrorGroup | null>(null);

  const { selectedKeys, toggleSelect, selectAll, clearSelection, selectedCount } = useSelection();
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [filters, activeProjectSlug, timeRangeState],
  });

  const apiFilters = useMemo<ErrorGroupFilterState>(
    () => ({
      ...filters,
      project: activeProjectSlug ?? undefined,
      range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
      from: timeRangeState.from,
      to: timeRangeState.to,
      cursor,
    }),
    [filters, activeProjectSlug, timeRangeState, cursor],
  );

  const { groups, pagination, summary, refetch, isLoading, error } = useErrorGroupsList(apiFilters);
  // Error-group rows are keyed by last_seen; the volume strip plots the raw
  // error events for the same scope, which is what the counts are made of.
  const timeline = useSignalTimeline(
    "errors",
    { project: activeProjectSlug ?? undefined, environment: filters.environment || undefined, ...rangeParams(timeRangeState) },
    window,
  );

  useEffect(() => {
    if (pagination) setActivePagination(pagination);
  }, [pagination]);
  const { updateStatus, mergeGroups } = useErrorGroupMutations();

  const total = Number(summary.total ?? groups.length);
  const open = Number(summary.open ?? groups.filter((g) => String(g.status).toLowerCase() === "open").length);
  const resolved = Number(summary.resolved ?? groups.filter((g) => String(g.status).toLowerCase() === "resolved").length);
  const regressions = Number(summary.regressions ?? groups.filter(isRegressed).length);
  const occurrences = Number(summary.totalOccurrences ?? groups.reduce((s, g) => s + occurrencesOf(g), 0));
  const maxOcc = Math.max(1, ...groups.map(occurrencesOf));

  const cells: ReadoutCell[] = [
    { label: "Groups", value: formatCompact(total), sub: "distinct fingerprints" },
    { label: "Open", value: formatCompact(open), sub: `${pct(open, total, 0)} of groups`, tone: open > 0 ? "warn" : "good" },
    { label: "Regressed", value: formatCompact(regressions), sub: "came back after a fix", tone: regressions > 0 ? "bad" : "neutral" },
    { label: "Resolved", value: formatCompact(resolved), sub: `${pct(resolved, total, 0)} of groups` },
    { label: "Occurrences", value: formatCompact(occurrences), sub: total ? `${(occurrences / total).toFixed(1)} per group` : undefined },
  ];

  const columns: Column<ErrorGroup>[] = [
    {
      key: "issue",
      header: "Issue",
      width: "minmax(280px, 1fr)",
      cell: (g) => {
        const errorName = g.latestEvent?.errorName ?? g.lastErrorName ?? g.last_error_name ?? "Error";
        const message = g.latestEvent?.message ?? g.lastErrorMessage ?? g.last_error_message ?? g.fingerprint;
        return (
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                to={`/observability/error-groups/${encodeURIComponent(g.publicId ?? g.id)}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-[13px] font-medium text-[var(--text)] hover:underline focus-visible:underline focus-visible:outline-none"
                title={errorName}
              >
                {errorName}
              </Link>
              {g.publicId && <span className="shrink-0 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{g.publicId}</span>}
            </div>
            <div className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]" title={message}>{message}</div>
          </div>
        );
      },
    },
    { key: "status", header: "Status", width: "92px", cell: (g) => <ErrorGroupStatusBadge status={g.status} /> },
    {
      key: "severity",
      header: "Severity",
      width: "86px",
      cell: (g) => <SeverityBadge severity={g.severity?.highest ?? g.highestSeverity ?? g.highest_severity ?? "error"} />,
    },
    {
      key: "occurrences",
      header: "Events",
      width: "118px",
      cell: (g) => {
        const n = occurrencesOf(g);
        return (
          <span className="flex items-center gap-2">
            <span className="w-10 text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">{formatCompact(n)}</span>
            <span className="h-[3px] w-12 overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true">
              <span className="block h-full rounded-full bg-[var(--red)]" style={{ width: `${Math.max(4, (n / maxOcc) * 100)}%` }} />
            </span>
          </span>
        );
      },
    },
    { key: "regression", header: "Regression", width: "104px", cell: (g) => <RegressionBadge isRegression={isRegressed(g)} /> },
    { key: "lastSeen", header: "Last seen", width: "96px", cell: (g) => <Timestamp value={g.occurrences?.lastSeenAt ?? g.lastSeenAt ?? g.lastSeen ?? g.last_seen_at} /> },
    { key: "firstSeen", header: "First seen", width: "96px", cell: (g) => <Timestamp value={g.occurrences?.firstSeenAt ?? g.firstSeenAt ?? g.firstSeen ?? g.first_seen_at} /> },
    {
      key: "release",
      header: "Release",
      width: "104px",
      cell: (g) => {
        const rel = g.release?.latest ?? g.latestRelease ?? g.latest_release;
        return rel ? <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={rel}>{rel}</span> : MUTED_DASH;
      },
    },
    {
      key: "actions",
      header: "",
      width: "40px",
      align: "right",
      cell: (g) => {
        const targetId = g.publicId ?? g.id;
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${targetId}`}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-[var(--radius)] text-[var(--text3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)]"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuItem onClick={() => navigate(`/observability/error-groups/${encodeURIComponent(targetId)}`)}>
                  <Eye className="size-3.5" /> Open issue
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTargetResolveGroup(g)}>
                  <CheckCircle2 className="size-3.5 text-[var(--green)]" /> Resolve or change status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTargetResolveGroup(g)}>
                  <EyeOff className="size-3.5" /> Ignore
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTargetMergeGroup(g)}>
                  <GitMerge className="size-3.5" /> Merge into another group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Error groups"
        description="Errors folded by fingerprint into issues you can resolve, ignore, or merge. Regressions reopen automatically."
        actions={<TimeRangePicker />}
      />

      <SignalSheet cells={cells} loading={isLoading && groups.length === 0} bars={timeline.bars} timelineLoading={timeline.isLoading} countLabel="Error events" errorLabel="Fatal or 5xx" />

      <TableToolbar selectedCount={selectedCount} onClearSelection={clearSelection} onAskAi={() => setIsAiModalOpen(true)} resourceName="issues">
        <ErrorGroupFilters
          filters={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />
      </TableToolbar>

      {error && (
        <div role="alert" className="rounded-[var(--radius)] bg-[var(--red-bg)] px-4 py-3 text-[13px] text-[var(--red)]">
          Error groups could not be loaded: {error.message || "the request failed"}. Check the time range and try again.
        </div>
      )}

      <InfiniteTable
        className="min-h-[320px] flex-1"
        loading={isLoading}
        items={groups}
        queryKey={["error-groups-list", JSON.stringify(apiFilters), cursor]}
        columns={columns}
        getKey={(g) => g.publicId ?? g.id}
        onRowClick={(g) => navigate(`/observability/error-groups/${encodeURIComponent(g.publicId ?? g.id)}`)}
        emptyTitle="No issues match"
        emptyIllustration="inbox"
        emptyMessage="No error groups were seen in this window for these filters."
        selectable
        selectedKeys={selectedKeys}
        onSelectToggle={toggleSelect}
        onSelectAllToggle={selectAll}
        pagination={paginationProps}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />

      <AskAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        resource="error-groups"
        selectedIds={Array.from(selectedKeys)}
        filters={apiFilters as unknown as Record<string, unknown>}
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
          allGroups={groups}
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
