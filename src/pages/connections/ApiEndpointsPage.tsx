import { PageHeader, SectionCard, formatCompact } from "@/shared/observe";
import { useEndpointsAnalytics } from "@/modules/analytics/hooks/useAnalyticsV2";

export default function ApiEndpointsPage() {
  const { data, isLoading, error } = useEndpointsAnalytics();
  const endpoints = data?.data?.table?.rows ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="API endpoints" description="Observed endpoints and request metrics for the selected time range." />

      {isLoading ? (
        <SectionCard title="Endpoint activity"><p className="text-[13px] text-[var(--text3)]">Loading endpoint metrics…</p></SectionCard>
      ) : error ? (
        <SectionCard title="Endpoint activity"><p role="alert" className="text-[13px] text-[var(--red)]">Endpoint metrics could not be loaded.</p></SectionCard>
      ) : endpoints.length === 0 ? (
        <SectionCard title="Endpoint activity"><p className="text-[13px] text-[var(--text3)]">No endpoint traffic was recorded for this time range.</p></SectionCard>
      ) : (
        <div className="flex flex-col gap-4">
          {endpoints.map((endpoint) => (
            <SectionCard key={`${endpoint.service ?? ""}:${endpoint.endpoint}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <code className="break-all font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{endpoint.endpoint}</code>
                  {endpoint.service && <div className="mt-1 text-[12px] text-[var(--text3)]">{endpoint.service}</div>}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right text-[12px] sm:grid-cols-4">
                  <div><span className="block text-[var(--text3)]">Requests</span><span className="font-[family-name:var(--mono)] text-[var(--text)]">{formatCompact(endpoint.requests)}</span></div>
                  <div><span className="block text-[var(--text3)]">Errors</span><span className="font-[family-name:var(--mono)] text-[var(--text)]">{endpoint.errorRatePct == null ? "—" : `${endpoint.errorRatePct.toFixed(2)}%`}</span></div>
                  <div><span className="block text-[var(--text3)]">p50 / p95</span><span className="font-[family-name:var(--mono)] text-[var(--text)]">{endpoint.p50Ms == null ? "—" : Math.round(endpoint.p50Ms)} / {endpoint.p95Ms == null ? "—" : Math.round(endpoint.p95Ms)} ms</span></div>
                  <div><span className="block text-[var(--text3)]">p99</span><span className="font-[family-name:var(--mono)] text-[var(--text)]">{endpoint.p99Ms == null ? "—" : `${Math.round(endpoint.p99Ms)}ms`}</span></div>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
