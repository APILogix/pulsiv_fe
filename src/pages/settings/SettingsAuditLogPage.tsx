import { useState } from "react";
import { useAuditLogs } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, FilterBar, SearchInput, VirtualList, Timestamp } from "@/shared/observe";

export default function SettingsAuditLogPage() {
  const { data } = useAuditLogs();
  const [query, setQuery] = useState("");
  let logs = (data ?? []).filter((l) => ["setting", "api_key", "webhook", "integration"].includes(l.resourceType));
  if (query) logs = logs.filter((l) => l.actor.toLowerCase().includes(query.toLowerCase()) || l.resourceName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Audit Log" description="Settings-context configuration changes." />

      <FilterBar onClear={() => setQuery("")}>
        <SearchInput placeholder="Search settings audit…" onSearch={setQuery} defaultValue={query} />
      </FilterBar>

      <SectionCard className="p-0">
        <div className="grid grid-cols-[1fr_100px_1fr_140px] gap-3 border-b border-[var(--border)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
          <span>Actor</span><span>Action</span><span>Resource</span><span>Time</span>
        </div>
        <VirtualList
          items={logs}
          rowHeight={44}
          height={480}
          getKey={(l) => l.id}
          renderRow={(l) => (
            <div className="grid h-11 grid-cols-[1fr_100px_1fr_140px] items-center gap-3 border-b border-[var(--border)] px-4 text-[13px]">
              <span className="truncate text-[var(--text)]">{l.actor}</span>
              <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{l.action}</span>
              <span className="truncate text-[var(--text2)]">{l.resourceType}: {l.resourceName}</span>
              <Timestamp value={l.timestamp} />
            </div>
          )}
        />
      </SectionCard>
    </div>
  );
}
