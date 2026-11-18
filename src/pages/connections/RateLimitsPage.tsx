import { useRequestSeries } from "@/modules/analytics/hooks/useAnalyticsV2";
import { PageHeader, KpiCard, SectionCard, MetricSparkline, formatCompact } from "@/shared/observe";

export default function RateLimitsPage() {
  const { data, isLoading, error, refetch } = useRequestSeries("total,rate_limited");
  const series = data?.data?.series ?? [];
  const requestSeries = series.find((item) => item.key === "requests.total");
  const limitedSeries = series.find((item) => item.key === "requests.rate_limited");
  const requests = requestSeries?.points.reduce((sum, point) => sum + (point.v ?? 0), 0) ?? 0;
  const rateLimited = limitedSeries?.points.reduce((sum, point) => sum + (point.v ?? 0), 0) ?? 0;
  const peakLimited = Math.max(0, ...(limitedSeries?.points.map((point) => point.v ?? 0) ?? []));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rate-limited traffic" description="Observed request throttling for the selected organization or project and time range." />

      {error ? (
        <SectionCard title="Request throttling">
          <div className="flex items-center justify-between gap-4">
            <p role="alert" className="text-[13px] text-[var(--red)]">Rate-limit metrics could not be loaded.</p>
            <button type="button" onClick={() => void refetch()} className="text-[13px] font-medium text-[var(--brand)]">Retry</button>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <KpiCard label="Requests" value={isLoading ? "—" : formatCompact(requests)} />
            <KpiCard label="Rate-limited requests" value={isLoading ? "—" : formatCompact(rateLimited)} />
            <KpiCard label="Peak in a bucket" value={isLoading ? "—" : formatCompact(peakLimited)} />
          </div>

          <SectionCard title="Rate-limited requests over time" description="Bucket values come from the analytics request-series endpoint.">
            {isLoading ? (
              <p className="text-[13px] text-[var(--text3)]">Loading request metrics…</p>
            ) : limitedSeries?.points.length ? (
              <MetricSparkline data={limitedSeries.points.map((point) => point.v ?? 0)} color="var(--amber)" width={760} height={120} />
            ) : (
              <p className="text-[13px] text-[var(--text3)]">No rate-limited requests were recorded in this range.</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
