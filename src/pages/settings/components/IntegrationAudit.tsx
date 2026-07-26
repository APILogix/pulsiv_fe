import { useState } from "react";
import { Activity, ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { useConnectorAudit } from "@/modules/organizations/hooks/useConnectors";
import { EmptyPanel, Panel, Pill, Toolbar } from "@/shared/ui/pulse";
import { Button, JsonViewer, SearchInput, Table, Td, Timestamp, Tr, formatNumber } from "@/shared/observe";
import { Skeleton } from "@/components/ui/skeleton";

// ── module-level constants (rules.md §1.2) ──

const PAGE_SIZE = 20;

const TABLE_HEADERS = ["", "Time", "Action", "Actor", "Detail"];

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5"];

const OUTCOME_TONE: { match: RegExp; tone: "green" | "red" | "amber" | "blue" }[] = [
  { match: /failed|error|dead_letter|revoked|deleted|disconnect/i, tone: "red" },
  { match: /retry|scheduled|pending|skipped|disabled/i, tone: "amber" },
  { match: /sent|created|completed|enabled|success|refresh/i, tone: "green" },
];

function outcomeTone(action: string) {
  return OUTCOME_TONE.find((entry) => entry.match.test(action))?.tone ?? "blue";
}

function humanizeAction(action: string) {
  return action.replace(/[._]/g, " ");
}

// ── one-off local components ─────────────────────────────────

function AuditSkeleton() {
  return (
    <div className="divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="ml-auto h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

interface IntegrationAuditProps {
  integrationId: string;
}

export function IntegrationAudit({ integrationId }: IntegrationAuditProps) {
  const [page, setPage] = useState(0);
  const limit = PAGE_SIZE;

  const { data: auditData, isLoading } = useConnectorAudit(integrationId, { limit, offset: page * limit });
  const logs = auditData?.data ?? [];
  const total = auditData?.meta?.total ?? 0;
  const hasMore = (page + 1) * limit < total;

  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const rows = logs.filter(
    (log: any) =>
      needle.length === 0 ||
      String(log.action).toLowerCase().includes(needle) ||
      String(log.actorId ?? "").toLowerCase().includes(needle),
  );

  const rangeStart = total === 0 ? 0 : page * limit + 1;
  const rangeEnd = Math.min((page + 1) * limit, total);

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        trailing={
          <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
            {rangeStart}-{rangeEnd} of {formatNumber(total)}
          </span>
        }
      >
        <SearchInput placeholder="Search action or actor…" defaultValue={query} onSearch={setQuery} />
      </Toolbar>

      {isLoading && page === 0 ? (
        <AuditSkeleton />
      ) : rows.length === 0 ? (
        <EmptyPanel
          icon={Activity}
          title={logs.length === 0 ? "No audit events yet" : "No events match this search"}
          description={
            logs.length === 0
              ? "Configuration changes, OAuth events, and delivery outcomes for this connector appear here."
              : "Clear the search to see every recorded event."
          }
          action={logs.length === 0 ? undefined : <Button onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <>
          <Table headers={TABLE_HEADERS} maxHeight="32rem">
            {rows.map((log: any) => {
              const expanded = expandedId === log.id;
              const Chevron = expanded ? ChevronDown : ChevronRight;
              return (
                <Tr key={log.id} onClick={() => setExpandedId(expanded ? null : log.id)}>
                  <Td className="w-8">
                    <Chevron className="size-3.5 text-[var(--text3)]" aria-hidden="true" />
                    <span className="sr-only">{expanded ? "Hide detail" : "Show detail"}</span>
                  </Td>
                  <Td className="font-[family-name:var(--mono)] text-[12px] tabular-nums">
                    <Timestamp value={log.createdAt} />
                  </Td>
                  <Td>
                    <Pill tone={outcomeTone(log.action)} dot>
                      {humanizeAction(log.action)}
                    </Pill>
                  </Td>
                  <Td>
                    {log.actorId ? (
                      <span
                        className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]"
                        title={log.actorId}
                      >
                        {log.actorId}
                      </span>
                    ) : (
                      <span className="text-[12px] italic text-[var(--text3)]">System</span>
                    )}
                  </Td>
                  <Td>
                    {log.changesSummary ? (
                      <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">
                        {expanded ? "Expanded" : "View payload"}
                      </span>
                    ) : (
                      <span className="text-[var(--text3)]">-</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Table>

          {expandedId && (
            <Panel title="Event detail" description="Raw change summary recorded with this event." icon={ScrollText}>
              <JsonViewer data={rows.find((log: any) => log.id === expandedId)?.changesSummary ?? null} />
            </Panel>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
            <p className="text-[12px] tabular-nums text-[var(--text3)]">
              Showing {rangeStart} to {rangeEnd} of {formatNumber(total)} events
            </p>
            <div className="flex items-center gap-2">
              <Button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
