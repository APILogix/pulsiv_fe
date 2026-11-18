import { useEndpointsAnalytics } from "@/modules/analytics/hooks/useAnalyticsV2";
import { PageHeader, KpiCard, SectionCard, formatCompact } from "@/shared/observe";

export default function ConnectionsOverview() {
  const { data, isLoading, error } = useEndpointsAnalytics();
  const endpoints = data?.data?.table?.rows ?? [];
  const totalRequests = endpoints.reduce((sum, endpoint) => sum + endpoint.requests, 0);
  const observedErrors = endpoints.reduce(
    (sum, endpoint) => sum + endpoint.requests * (endpoint.errorRatePct ?? 0) / 100,
    0,
  );
  const p95Values = endpoints.flatMap((endpoint) => endpoint.p95Ms == null ? [] : [endpoint.p95Ms]);
  const meanP95 = p95Values.length ? Math.round(p95Values.reduce((sum, value) => sum + value, 0) / p95Values.length) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Connections overview" description="Observed request volume and latency for your API endpoints." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Requests" value={formatCompact(totalRequests)} />
        <KpiCard label="Observed endpoints" value={endpoints.length} />
        <KpiCard label="Estimated errors" value={formatCompact(Math.round(observedErrors))} />
        <KpiCard label="Mean endpoint p95" value={meanP95 == null ? "—" : `${meanP95}ms`} />
      </div>

      <SectionCard title="Observed routes" description="Metrics come from the analytics API for the selected organization or project.">
        {isLoading ? (
          <p className="text-[13px] text-[var(--text3)]">Loading endpoint metrics…</p>
        ) : error ? (
          <p role="alert" className="text-[13px] text-[var(--red)]">Endpoint metrics could not be loaded.</p>
        ) : endpoints.length === 0 ? (
          <p className="text-[13px] text-[var(--text3)]">No endpoint traffic was recorded for this time range.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {endpoints.map((endpoint) => (
              <div key={`${endpoint.service ?? ""}:${endpoint.endpoint}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <code className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{endpoint.endpoint}</code>
                  {endpoint.service && <span className="mt-1 block text-[11px] text-[var(--text3)]">{endpoint.service}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-4 text-[12px] text-[var(--text2)]">
                  <span>{formatCompact(endpoint.requests)} requests</span>
                  <span>{endpoint.errorRatePct == null ? "—" : `${endpoint.errorRatePct.toFixed(2)}% errors`}</span>
                  <span>p95 {endpoint.p95Ms == null ? "—" : `${Math.round(endpoint.p95Ms)}ms`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
