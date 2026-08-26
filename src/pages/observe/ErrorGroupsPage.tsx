import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { AlertTriangle, GitBranch, ShieldCheck, ShieldAlert } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, TableToolbar, SearchInput, FilterSelect,
  SeverityBadge, StatusCodeBadge, EnvironmentBadge, AskAiModal, Timestamp,
  InfiniteTable, formatCompact, SelectionProvider, useSelection,
  TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";

interface ErrorRow {
  id: string;
  publicId?: string;
  occurredAt?: string | number;
  message?: string;
  errorGroupId?: string;
  errorGroupPublicId?: string;
  errorGroup?: { publicId?: string };
  traceId?: string;
  tracePublicId?: string;
  trace?: { publicId?: string; traceId?: string };
  route?: string;
  statusCode?: number;
  severity?: string;
  handled?: boolean;
  environment?: string;
  projectName?: string;
  projectSlug?: string;
  project?: string;
}

const SEV_OPTS = [
  { value: "", label: "All severities" },
  { value: "fatal", label: "Fatal" },
  { value: "error", label: "Error" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const HANDLED_OPTS = [
  { value: "", label: "Handled & Unhandled" },
  { value: "true", label: "Handled" },
  { value: "false", label: "Unhandled" },
];

const ENV_OPTS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "pre_production", label: "Pre-production" },
  { value: "pre_staging", label: "Pre-staging" },
  { value: "testing", label: "Testing" },
  { value: "preview", label: "Preview" },
  { value: "pre_deployment", label: "Pre-deployment" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTS = [
  { value: "", label: "All HTTP statuses" },
  { value: "5xx", label: "5xx Server Error" },
  { value: "4xx", label: "4xx Client Error" },
  { value: "500", label: "500 Internal Error" },
  { value: "502", label: "502 Bad Gateway" },
  { value: "503", label: "503 Service Unavailable" },
  { value: "404", label: "404 Not Found" },
  { value: "401", label: "401 Unauthorized" },
];

const getInitialFromDate = () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const getInitialToDate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const formatIsoBounds = (fromDate: string, toDate: string) => {
  if (!fromDate) return { from: undefined, to: undefined };
  const fromMs = new Date(fromDate).getTime();
  if (isNaN(fromMs)) return { from: undefined, to: undefined };

  let toMs = toDate ? new Date(toDate).getTime() : NaN;
  if (isNaN(toMs) || toMs <= fromMs) {
    toMs = fromMs + 24 * 60 * 60 * 1000;
  }
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
};

function ErrorGroupsPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [environment, setEnvironment] = useState("");
  const [severity, setSeverity] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [handled, setHandled] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const { timeRangeState } = useTimeRangeParams();
  const { selectedKeys, toggleSelect, selectAll, clearSelection, selectedCount } = useSelection();

  // Reset cursor when any filter changes
  useEffect(() => {
    setCursor(undefined);
    setCursorHistory([]);
  }, [activeProjectSlug, environment, severity, statusClass, handled, timeRangeState, query]);

  const { data, isLoading } = useObservabilityList<ErrorRow>("errors", {
    project: activeProjectSlug ?? undefined,
    environment: environment || undefined,
    severity: severity || undefined,
    status: statusClass || undefined,
    handled: handled || undefined,
    range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
    from: timeRangeState.from,
    to: timeRangeState.to,
    search: query,
    cursor,
  });

  const handleNextPage = (nextCursor: string) => {
    setCursorHistory((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  };

  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    setCursor(prevCursor || undefined);
  };

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  const total = Number(summary.total ?? rows.length);
  const uniqueFingerprints = Number(summary.uniqueFingerprints ?? 0);
  const affectedUsers = Number(summary.affectedUsers ?? 0);
  const fatal = Number(summary.fatal ?? rows.filter((e) => e.severity === "fatal").length);

  const baseColumns: Column<ErrorRow>[] = [
    {
      key: "time",
      header: "TIME",
      width: "120px",
      cell: (e) => <Timestamp value={e.occurredAt} />,
    },
    {
      key: "error",
      header: "ERROR",
      width: "1fr",
      cell: (e) => (
        <span className="truncate text-[12px] font-medium text-[var(--text)]" title={e.message}>
          {e.message ?? "—"}
        </span>
      ),
    },
    {
      key: "errorGroup",
      header: "ERROR GROUP",
      width: "110px",
      cell: (e) => {
        const errorGroupPubId = e.errorGroupPublicId ?? e.errorGroup?.publicId;
        const targetGroup = errorGroupPubId ?? e.errorGroupId;
        const labelText = errorGroupPubId ?? (e.errorGroupId ? e.errorGroupId.slice(0, 6) : "Group");
        return targetGroup ? (
          <Link
            to={`/observability/error-groups/${encodeURIComponent(targetGroup)}`}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--red-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--red)] hover:underline"
            title={errorGroupPubId ? `Error Group Public ID: ${errorGroupPubId}` : `Group: ${e.errorGroupId}`}
          >
            <AlertTriangle className="size-3 shrink-0" />
            <span>{labelText}</span>
          </Link>
        ) : (
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">—</span>
        );
      },
    },
    {
      key: "trace",
      header: "TRACE",
      width: "115px",
      cell: (e) => {
        const tracePubId = e.tracePublicId ?? e.trace?.publicId;
        const targetTrace = tracePubId ?? e.traceId;
        const labelText = tracePubId ?? (e.traceId ? e.traceId.slice(0, 6) : "Trace");
        return targetTrace ? (
          <Link
            to={`/observability/traces/${encodeURIComponent(targetTrace)}`}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--violet)] hover:underline"
            title={tracePubId ? `Trace Public ID: ${tracePubId}` : `Trace: ${e.traceId}`}
          >
            <GitBranch className="size-3 shrink-0" />
            <span>{labelText}</span>
          </Link>
        ) : (
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">—</span>
        );
      },
    },
    {
      key: "route",
      header: "ROUTE",
      width: "160px",
      cell: (e) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={e.route}>
          {e.route ?? "—"}
        </span>
      ),
    },
    {
      key: "statusCode",
      header: "HTTP",
      width: "75px",
      cell: (e) => e.statusCode ? <StatusCodeBadge code={e.statusCode} /> : <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">—</span>,
    },
    {
      key: "severity",
      header: "SEVERITY",
      width: "90px",
      cell: (e) => <SeverityBadge severity={e.severity ?? "error"} />,
    },
    {
      key: "handled",
      header: "HANDLED",
      width: "85px",
      cell: (e) =>
        e.handled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--green)]">
            <ShieldCheck className="size-3 shrink-0" />
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--red-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--red)]">
            <ShieldAlert className="size-3 shrink-0" />
            No
          </span>
        ),
    },
  ];

  const columns = environment
    ? baseColumns
    : [
        ...baseColumns,
        {
          key: "env",
          header: "ENV",
          width: "100px",
          cell: (e: ErrorRow) => <EnvironmentBadge environment={e.environment ?? "production"} />,
        },
      ];

  return (
    <FillPage>
      <PageHeader
        title="Errors"
        description="Error events across monitored services."
        actions={<TimeRangePicker />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total errors" value={formatCompact(total)} icon={AlertTriangle} />
        <KpiCard label="Unique groups" value={uniqueFingerprints} />
        <KpiCard label="Affected users" value={affectedUsers} />
        <KpiCard label="Fatal" value={fatal} trend="down" />
      </div>

      <TableToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onAskAi={() => setIsAiModalOpen(true)}
        resourceName="errors"
      >
        <SearchInput placeholder="Search errors, routes…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={environment} onChange={setEnvironment} options={ENV_OPTS} />
        <FilterSelect value={severity} onChange={setSeverity} options={SEV_OPTS} />
        <FilterSelect value={statusClass} onChange={setStatusClass} options={STATUS_OPTS} />
        <FilterSelect value={handled} onChange={setHandled} options={HANDLED_OPTS} />
      </TableToolbar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["errors", activeProjectSlug, environment, severity, statusClass, handled, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(e) => e.publicId ?? e.id}
        onRowClick={(e) => navigate(`/observability/errors/${encodeURIComponent(e.publicId ?? e.id)}`)}
        selectable
        selectedKeys={selectedKeys}
        onSelectToggle={toggleSelect}
        onSelectAllToggle={selectAll}
        pagination={{
          nextCursor: data?.pagination?.nextCursor,
          previousCursor: data?.pagination?.previousCursor,
          hasNext: data?.pagination?.hasNext,
          hasPrevious: cursorHistory.length > 0 || !!data?.pagination?.hasPrevious,
          limit: data?.pagination?.limit,
        }}
        onNextPage={handleNextPage}
        onPreviousPage={cursorHistory.length > 0 ? handlePreviousPage : undefined}
      />

      <AskAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        resource="errors"
        selectedIds={Array.from(selectedKeys)}
        filters={{ project: activeProjectSlug, environment, severity, statusClass, handled, timeRange: timeRangeState }}
        search={query}
      />
    </FillPage>
  );
}

export default function ErrorGroupsPage() {
  return (
    <SelectionProvider>
      <ErrorGroupsPageContent />
    </SelectionProvider>
  );
}
