import { useSystemHealth } from "@/modules/analytics/hooks/useAnalyticsV2";
import { PageHeader, KpiCard, SectionCard, StatusBadge, Table, Tr, Td, Timestamp } from "@/shared/observe";

export default function ConnectionHealthPage() {
  const { data, isLoading, error, refetch } = useSystemHealth();
  const health = data?.data;
  const workers = health?.workers ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics health" description="Worker freshness and processing status from the backend health endpoint." />

      {error ? (
        <SectionCard title="Health status">
          <div className="flex items-center justify-between gap-4">
            <p role="alert" className="text-[13px] text-[var(--red)]">The analytics health endpoint did not return a healthy response.</p>
            <button type="button" onClick={() => void refetch()} className="text-[13px] font-medium text-[var(--brand)]">Retry</button>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="System status" value={isLoading ? "Loading" : health?.status ?? "—"} />
            <KpiCard label="Workers" value={workers.length} />
            <KpiCard label="Healthy workers" value={workers.filter((worker) => worker.status === "healthy").length} />
            <KpiCard label="Worst data lag" value={health ? `${health.worstLagSeconds}s` : "—"} />
          </div>

          <SectionCard title="Analytics workers" className="p-0">
            {isLoading ? (
              <p className="p-5 text-[13px] text-[var(--text3)]">Loading worker health…</p>
            ) : workers.length === 0 ? (
              <p className="p-5 text-[13px] text-[var(--text3)]">The backend did not report any analytics workers.</p>
            ) : (
              <Table headers={["Worker", "Status", "Data lag", "Failures", "Last run", "Rows processed"]}>
                {workers.map((worker) => (
                  <Tr key={worker.id}>
                    <Td className="font-[family-name:var(--mono)] text-[12px]">{worker.id}</Td>
                    <Td><StatusBadge status={worker.status} /></Td>
                    <Td className="tabular-nums">{worker.lagSeconds}s</Td>
                    <Td className="tabular-nums">{worker.consecutiveFailures}</Td>
                    <Td>{worker.lastRunAt ? <Timestamp value={worker.lastRunAt} /> : "Never"}</Td>
                    <Td className="tabular-nums">{worker.rowsProcessedLastRun.toLocaleString()}</Td>
                  </Tr>
                ))}
              </Table>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
