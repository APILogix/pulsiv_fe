import { useState } from "react";
import { Activity, Cable, ChevronDown, ChevronRight, ScrollText, User } from "lucide-react";
import { useConnectorAudit } from "@/modules/organizations/hooks/useConnectors";
import { EmptyPanel, HeroFacts, PageHero, Panel, Pill, Toolbar, type HeroFact } from "@/shared/ui/pulse";
import {
  Button,
  FilterSelect,
  JsonViewer,
  SearchInput,
  Table,
  Td,
  Timestamp,
  Tr,
  formatNumber,
} from "@/shared/observe";
import { Skeleton } from "@/components/ui/skeleton";

// ── module-level constants (rules.md §1.2) ──

const PAGE_SIZE = 20;

const TABLE_HEADERS = ["", "Time", "Action", "Actor", "Target connector", "Detail"];

const SCOPE_OPTIONS = [
  { value: "all", label: "All events" },
  { value: "connector", label: "Connector scoped" },
  { value: "global", label: "Organization wide" },
];

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5", "r6"];

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

function LogSkeleton() {
  return (
    <Panel bodyClassName="p-0">
      <div className="divide-y divide-[var(--border)]">
        {SKELETON_ROWS.map((row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-32" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MonoCell({ value, fallback }: { value: string | null | undefined; fallback: string }) {
  if (!value) return <span className="text-[12px] italic text-[var(--text3)]">{fallback}</span>;
  return (
    <span className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={value}>
      {value}
    </span>
  );
}

export default function IntegrationsAuditPage() {
  const [page, setPage] = useState(0);
  const limit = PAGE_SIZE;

  // No connectorId passed means fetch across all connectors
  const { data: auditData, isLoading } = useConnectorAudit(undefined, { limit, offset: page * limit });
  const logs = auditData?.data ?? [];
  const total = auditData?.meta?.total ?? 0;
  const hasMore = (page + 1) * limit < total;

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const rows = logs.filter((log: any) => {
    const matchesScope =
      scope === "all" || (scope === "connector" ? Boolean(log.connectorId) : !log.connectorId);
    const matchesQuery =
      needle.length === 0 ||
      String(log.action).toLowerCase().includes(needle) ||
      String(log.actorId ?? "").toLowerCase().includes(needle) ||
      String(log.connectorId ?? "").toLowerCase().includes(needle);
    return matchesScope && matchesQuery;
  });

  const facts: HeroFact[] = [
    { label: "Total events", value: formatNumber(total), tone: "brand", icon: ScrollText },
    { label: "On this page", value: formatNumber(logs.length), tone: "neutral" },
    { label: "Connector scoped", value: formatNumber(logs.filter((log: any) => log.connectorId).length), tone: "ai", icon: Cable },
    { label: "System actors", value: formatNumber(logs.filter((log: any) => !log.actorId).length), tone: "blue", icon: User },
  ];

  const rangeStart = total === 0 ? 0 : page * limit + 1;
  const rangeEnd = Math.min((page + 1) * limit, total);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Developer"
        title="Delivery logs"
        description="Every configuration change, OAuth event, and delivery outcome recorded across the connectors in this organization."
        icon={Activity}
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <Toolbar
        trailing={
          <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
            {rangeStart}-{rangeEnd} of {formatNumber(total)}
          </span>
        }
      >
        <SearchInput placeholder="Search action, actor, or connector id…" defaultValue={query} onSearch={setQuery} />
        <FilterSelect label="Scope" value={scope} onChange={setScope} options={SCOPE_OPTIONS} />
      </Toolbar>

      {isLoading && page === 0 ? (
        <LogSkeleton />
      ) : rows.length === 0 ? (
        <EmptyPanel
          icon={Activity}
          title={logs.length === 0 ? "No audit events yet" : "No events match these filters"}
          description={
            logs.length === 0
              ? "When connectors are added, configured, or deliver events, the trail appears here."
              : "Clear the search or widen the scope to see more events."
          }
          action={
            logs.length === 0 ? undefined : (
              <Button
                onClick={() => {
                  setQuery("");
                  setScope("all");
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Table headers={TABLE_HEADERS} maxHeight="38rem">
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
                    <MonoCell value={log.actorId} fallback="System" />
                  </Td>
                  <Td>
                    <MonoCell value={log.connectorId} fallback="Organization" />
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
        </div>
      )}
    </div>
  );
}
