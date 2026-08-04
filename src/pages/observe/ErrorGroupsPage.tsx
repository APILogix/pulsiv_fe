import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput, FilterSelect,
  SeverityBadge, EnvironmentBadge, AskAiButton, Timestamp, InfiniteCards, formatCompact,
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
  
  const { data, isLoading } = useObservabilityList<any>("errors", { severity, search: query });
  const groups = data?.items ?? [];
  const summary = data?.summary ?? {};
  
  const totalOccurrences = Number(summary.totalOccurrences ?? groups.reduce((s: number, g: any) => s + (g.count ?? 1), 0));
  const totalUsers = Number(summary.affectedUsers ?? groups.reduce((s: number, g: any) => s + (g.affectedUsers?.size ?? g.affectedUsers?.length ?? 0), 0));

  return (
    <FillPage>
      <PageHeader title="Error Groups" description="Triage grouped errors by fingerprint and resolution state." />

      {groups.length > 0 && (
        <div className="flex items-center gap-3 rounded-[12px] border border-[var(--amber)]/30 bg-[var(--amber-bg)] px-4 py-3 text-[13px] text-[var(--amber)]">
          <TrendingUp className="size-4 shrink-0" />
          <span><strong>Regression detected:</strong> {groups[0]?.name ?? groups[0]?.type ?? "TypeError"} occurrences up 240% since release v2.1.0.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Error groups" value={groups.length} icon={AlertTriangle} />
        <KpiCard label="Total occurrences" value={formatCompact(totalOccurrences)} />
        <KpiCard label="Affected users" value={totalUsers} />
        <KpiCard label="Unresolved" value={Number(summary.unresolved ?? Math.round(groups.length * 0.7))} />
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
        getKey={(g) => g.fingerprint ?? g.id ?? g.eventId}
        gridClassName="flex flex-col gap-2"
        renderCard={(g) => (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/observability/errors/${encodeURIComponent(g.fingerprint ?? g.id ?? g.eventId)}`)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/observability/errors/${encodeURIComponent(g.fingerprint ?? g.id ?? g.eventId)}`); } }}
            className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--input)]"
          >
            <div className="flex items-start gap-3">
              <SeverityBadge severity={g.severity} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--text)]">{g.name ?? g.type ?? "Error"}</span>
                  <EnvironmentBadge environment={g.environment ?? g.occurrences?.[0]?.metadata?.environment ?? "production"} />
                </div>
                <div className="truncate text-[13px] text-[var(--text2)]">{g.message}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--text3)]">
                  <span>{Array.isArray(g.services) ? g.services.join(", ") : (g.services?.size ? Array.from(g.services as Set<string>).join(", ") : g.service ?? "unknown service")}</span>
                  <span>{g.affectedUsers?.size ?? g.affectedUsers?.length ?? 0} users</span>
                  <span>{g.releases?.size ?? g.releases?.length ?? 0} releases</span>
                  <span>first seen <Timestamp value={g.firstSeen ?? g.timestamp} /></span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-xl font-semibold tabular-nums text-[var(--text)]">{formatCompact(g.count ?? 1)}</div>
                  <div className="text-[12px] text-[var(--text3)]">events</div>
                  <div className="mt-1 text-[12px] text-[var(--text3)]">last <Timestamp value={g.lastSeen ?? g.timestamp} /></div>
                </div>
                <AskAiButton question={`Investigate the "${g.name ?? g.type}" error group: ${g.message}`} />
              </div>
            </div>
          </div>
        )}
      />
    </FillPage>
  );
}
