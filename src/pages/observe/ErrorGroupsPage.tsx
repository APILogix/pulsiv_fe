import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useErrorGroups } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput, FilterSelect,
  SeverityBadge, Timestamp, InfiniteCards, formatCompact,
} from "@/shared/observe";

const SEV_OPTS = [
  { value: "", label: "All severities" },
  { value: "fatal", label: "Fatal" }, { value: "error", label: "Error" },
  { value: "warning", label: "Warning" }, { value: "info", label: "Info" },
];

export default function ErrorGroupsPage() {
  const navigate = useNavigate();
  const [severity, setSeverity] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useErrorGroups();

  let groups = (data ?? []).slice().sort((a, b) => b.count - a.count);
  if (severity) groups = groups.filter((g) => g.severity === severity);
  if (query) groups = groups.filter((g) => g.message.toLowerCase().includes(query.toLowerCase()) || g.name.toLowerCase().includes(query.toLowerCase()));

  const totalOccurrences = groups.reduce((s, g) => s + g.count, 0);
  const totalUsers = groups.reduce((s, g) => s + g.affectedUsers.size, 0);

  return (
    <FillPage>
      <PageHeader title="Error Groups" description="Triage grouped errors by fingerprint and resolution state." />

      <div className="flex items-center gap-3 rounded-[12px] border border-[var(--amber)]/30 bg-[var(--amber-bg)] px-4 py-3 text-[13px] text-[var(--amber)]">
        <TrendingUp className="size-4 shrink-0" />
        <span><strong>Regression detected:</strong> {groups[0]?.name ?? "TypeError"} occurrences up 240% since release v2.1.0.</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Error groups" value={groups.length} icon={AlertTriangle} />
        <KpiCard label="Total occurrences" value={formatCompact(totalOccurrences)} />
        <KpiCard label="Affected users" value={totalUsers} />
        <KpiCard label="Unresolved" value={Math.round(groups.length * 0.7)} />
      </div>

      <FilterBar onClear={() => { setSeverity(""); setQuery(""); }}>
        <SearchInput placeholder="Search errors…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={severity} onChange={setSeverity} options={SEV_OPTS} />
      </FilterBar>

      <InfiniteCards
        className="flex-1"
        loading={isLoading}
        items={groups}
        queryKey={["errorGroups", severity, query]}
        getKey={(g) => g.fingerprint}
        gridClassName="flex flex-col gap-2"
        renderCard={(g) => (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/observability/errors/${encodeURIComponent(g.fingerprint)}`)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/observability/errors/${encodeURIComponent(g.fingerprint)}`); } }}
            className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--input)]"
          >
            <div className="flex items-start gap-3">
              <SeverityBadge severity={g.severity} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text)]">{g.name}</div>
                <div className="truncate text-[13px] text-[var(--text2)]">{g.message}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--text3)]">
                  <span>{Array.from(g.services).join(", ")}</span>
                  <span>{g.affectedUsers.size} users</span>
                  <span>{g.releases.size} releases</span>
                  <span>first seen <Timestamp value={g.firstSeen} /></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold tabular-nums text-[var(--text)]">{formatCompact(g.count)}</div>
                <div className="text-[12px] text-[var(--text3)]">events</div>
                <div className="mt-1 text-[12px] text-[var(--text3)]">last <Timestamp value={g.lastSeen} /></div>
              </div>
            </div>
          </div>
        )}
      />
    </FillPage>
  );
}
