import { useEndpointsAnalytics } from "@/modules/analytics/hooks/useAnalyticsV2";
import { PageHeader, KpiCard, FillPage, SectionCard, formatCompact } from "@/shared/observe";

export default function AnomaliesPage() {
  const { data, isLoading, error, refetch } = useEndpointsAnalytics();
  const endpoints = data?.data?.table?.rows ?? [];
  const measured = endpoints.filter((endpoint) => endpoint.errorRatePct !== null);
  const highestErrorRate = measured.reduce<number | null>(
    (highest, endpoint) => highest === null || (endpoint.errorRatePct ?? -1) > highest ? endpoint.errorRatePct : highest,
    null,
  );
  const highestLatency = endpoints.reduce<number | null>(
    (highest, endpoint) => endpoint.p95Ms !== null && (highest === null || endpoint.p95Ms > highest) ? endpoint.p95Ms : highest,
    null,
  );

  return (
    <FillPage className="gap-6">
      <PageHeader title="Endpoint signals" description="Live endpoint metrics from the analytics API. The backend does not currently expose a dedicated anomaly feed or configuration endpoint." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Observed endpoints" value={isLoading ? "—" : endpoints.length} />
        <KpiCard label="Highest observed error rate" value={isLoading || highestErrorRate === null ? "—" : `${highestErrorRate.toFixed(2)}%`} />
        <KpiCard label="Highest observed p95" value={isLoading || highestLatency === null ? "—" : `${Math.round(highestLatency)}ms`} />
      </div>

      <SectionCard title="Endpoint measurements" description="Review current error rates and latency to spot routes that need investigation.">
        {isLoading ? (
          <p className="text-[13px] text-[var(--text3)]">Loading endpoint metrics…</p>
        ) : error ? (
          <div className="flex items-center justify-between gap-4">
            <p role="alert" className="text-[13px] text-[var(--red)]">Endpoint metrics could not be loaded.</p>
            <button type="button" onClick={() => void refetch()} className="text-[13px] font-medium text-[var(--brand)]">Retry</button>
          </div>
        ) : endpoints.length === 0 ? (
          <p className="text-[13px] text-[var(--text3)]">No endpoint traffic was recorded for this time range.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {endpoints.map((endpoint) => (
              <div key={`${endpoint.service ?? ""}:${endpoint.endpoint}`} className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <code className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{endpoint.endpoint}</code>
                  {endpoint.service && <span className="text-[11px] text-[var(--text3)]">{endpoint.service}</span>}
                </div>
                <div className="flex items-center gap-5 text-[12px] text-[var(--text2)]">
                  <span>{formatCompact(endpoint.requests)} requests</span>
                  <span>{endpoint.errorRatePct == null ? "—" : `${endpoint.errorRatePct.toFixed(2)}% errors`}</span>
                  <span>p95 {endpoint.p95Ms == null ? "—" : `${Math.round(endpoint.p95Ms)}ms`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </FillPage>
  );
}
