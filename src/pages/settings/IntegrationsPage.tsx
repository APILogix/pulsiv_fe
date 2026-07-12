import { useState } from "react";
import { useNavigate } from "react-router";
import { Blocks, Plug } from "lucide-react";

import { useConnectors } from "@/modules/organizations/hooks/useConnectors";
import {
  Button,
  demoSuccess,
  EmptyState,
  FillPage,
  InfiniteCards,
  PageHeader,
  SearchInput,
  StatusBadge,
  Timestamp,
} from "@/shared/observe";

const TYPE_CATEGORY: Record<string, string> = {
  slack: "Alerting",
  pagerduty: "Alerting",
  jira: "Dev tools",
  github: "Dev tools",
  datadog: "Observability",
  grafana: "Observability",
  aws: "Cloud",
  azure: "Cloud",
  gcp: "Cloud",
  custom: "Custom",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "disconnected", label: "Disconnected" },
];

function categoryFor(integration: any): string {
  return TYPE_CATEGORY[integration.type as string] ?? "Integration";
}

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useConnectors();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const integrations: any[] = data ?? [];
  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  const filtered = integrations.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (search && !String(i.name).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <FillPage>
      <PageHeader
        title="Integrations"
        description={`Connect Pulse to your existing tools. ${connectedCount} of ${integrations.length} connected.`}
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search integrations…" onSearch={setSearch} />
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`h-8 rounded-full px-3 text-[12px] font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-[var(--brand-bg)] text-[var(--brand)]"
                  : "border border-[var(--border)] bg-[var(--bg1)] text-[var(--text2)] hover:border-[var(--input)] hover:text-[var(--text)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
          <EmptyState
            icon={Blocks}
            message={
              integrations.length === 0
                ? "No integrations available yet."
                : "No integrations match the current filters."
            }
          />
        </div>
      ) : (
        <InfiniteCards
          className="flex-1"
          loading={isLoading}
          items={filtered}
          queryKey={["integrations", statusFilter, search]}
          getKey={(i) => i.id}
          renderCard={(i) => (
            <div className="group flex flex-col rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--input)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-bg)] text-sm font-semibold text-[var(--brand)]">
                    {String(i.name).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text)]">{i.name}</div>
                    <div className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-wider text-[var(--text3)]">
                      {categoryFor(i)}
                    </div>
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--text3)]">
                <Plug className="size-3.5" />
                Last sync <Timestamp value={i.lastSyncAt} />
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
                <Button variant="secondary" onClick={() => navigate(`/settings/integrations/${i.id}`)}>
                  Configure
                </Button>
                {i.status === "connected" ? (
                  <Button variant="ghost" onClick={() => demoSuccess(`${i.name} disconnected`)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => demoSuccess(`${i.name} connected`)}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )}
        />
      )}
    </FillPage>
  );
}
