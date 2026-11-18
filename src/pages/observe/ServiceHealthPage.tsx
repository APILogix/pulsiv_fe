import { useServicesAnalytics } from "@/modules/analytics/hooks/useAnalyticsV2";
import { useIncidentSummary } from "@/modules/alerting/hooks/useAlerting";
import { PageHeader, KpiCard, SectionCard, Table, Tr, Td, StatusBadge, TimeRangePicker, formatCompact } from "@/shared/observe";

export default function ServiceHealthPage() {
  const { data, isLoading, error, refetch } = useServicesAnalytics();
  const { data: incidentSummary } = useIncidentSummary();
  const services = data?.data?.table?.rows ?? [];
  const healthyCount = services.filter((service) => service.status === "healthy").length;
  const availabilityValues = services.flatMap((service) => service.availabilityPct == null ? [] : [service.availabilityPct]);
  const meanAvailability = availabilityValues.length
    ? availabilityValues.reduce((sum, value) => sum + value, 0) / availabilityValues.length
    : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Service health" actions={<TimeRangePicker />} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Healthy services" value={isLoading ? "—" : `${healthyCount} / ${services.length}`} />
        <KpiCard label="Mean availability" value={meanAvailability == null ? "—" : `${meanAvailability.toFixed(2)}%`} />
        <KpiCard label="Open incidents" value={incidentSummary?.activeTotal ?? "—"} />
        <KpiCard label="Observed requests" value={formatCompact(services.reduce((sum, service) => sum + service.requests, 0))} />
      </div>

      <SectionCard title="Service measurements" className="p-0">
        {isLoading ? (
          <p className="p-5 text-[13px] text-[var(--text3)]">Loading service metrics…</p>
        ) : error ? (
          <div className="flex items-center justify-between gap-4 p-5">
            <p role="alert" className="text-[13px] text-[var(--red)]">Service metrics could not be loaded.</p>
            <button type="button" onClick={() => void refetch()} className="text-[13px] font-medium text-[var(--brand)]">Retry</button>
          </div>
        ) : services.length === 0 ? (
          <p className="p-5 text-[13px] text-[var(--text3)]">No service traffic was recorded for this time range.</p>
        ) : (
          <Table headers={["Service", "Status", "Requests", "Error rate", "p95 latency", "Availability", "Apdex"]}>
            {services.map((service) => (
              <Tr key={service.service}>
                <Td className="font-medium">{service.service}</Td>
                <Td><StatusBadge status={service.status ?? "unknown"} /></Td>
                <Td className="tabular-nums">{formatCompact(service.requests)}</Td>
                <Td className="tabular-nums">{service.errorRatePct == null ? "—" : `${service.errorRatePct.toFixed(2)}%`}</Td>
                <Td className="tabular-nums">{service.p95Ms == null ? "—" : `${Math.round(service.p95Ms)}ms`}</Td>
                <Td className="tabular-nums">{service.availabilityPct == null ? "—" : `${service.availabilityPct.toFixed(2)}%`}</Td>
                <Td className="tabular-nums">{service.apdex == null ? "—" : service.apdex.toFixed(2)}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
