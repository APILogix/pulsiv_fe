/**
 * Alert metrics — `GET /organizations/:orgId/alerting/metrics`.
 *
 * Rolled-up metric buckets (rule firing counts, notification counts, etc.)
 * keyed by metricType + granularity. This is an operator-facing analytics
 * view, not a dashboard-builder — it renders the raw bucket rows plus a
 * simple sparkline per metric type.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Gauge } from "lucide-react";
import { PageHeader, KpiCard, FillPage, Table, Tr, Td, Timestamp, MetricSparkline } from "@/shared/observe";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { useAlertMetrics } from "@/modules/alerting/hooks/useAlerting";
import { fieldInputClass } from "@/shared/ui/pulse";
import { METRIC_GRANULARITIES, type MetricGranularity } from "@/modules/alerting/api/types";

export default function AlertMetricsPage() {
  const [granularity, setGranularity] = useState<MetricGranularity>("hour");
  const [metricType, setMetricType] = useState("");
  const { data, isLoading, error } = useAlertMetrics({
    granularity,
    limit: 168,
    ...(metricType ? { metricType } : {}),
  });
  const metrics = data ?? [];

  if (error) toast.error(apiErrorMessage(error, "Could not load alert metrics."));

  const byType = useMemo(() => {
    const grouped = new Map<string, typeof metrics>();
    for (const m of metrics) {
      const list = grouped.get(m.metricType) ?? [];
      list.push(m);
      grouped.set(m.metricType, list);
    }
    return grouped;
  }, [metrics]);

  const totalValue = metrics.reduce((sum, m) => sum + Number(m.value || 0), 0);

  return (
    <FillPage>
      <PageHeader
        title="Metrics"
        description="Rolled-up counters for rule firings, notifications, and delivery outcomes."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Buckets" value={metrics.length} icon={Gauge} />
        <KpiCard label="Metric types" value={byType.size} />
        <KpiCard label="Sum (period)" value={totalValue.toFixed(0)} />
        <KpiCard label="Granularity" value={granularity} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Granularity</span>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as MetricGranularity)} className={`${fieldInputClass} h-9 w-auto`}>
            {METRIC_GRANULARITIES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Metric type</span>
          <input value={metricType} onChange={(e) => setMetricType(e.target.value)} placeholder="e.g. rule_fired" className={`${fieldInputClass} h-9 w-56`} />
        </label>
      </div>

      {byType.size > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from(byType.entries()).map(([type, rows]) => {
            const series = rows
              .slice()
              .sort((a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime())
              .map((r) => Number(r.value || 0));
            return (
              <div key={type} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text)]">{type}</span>
                  <span className="tabular-nums text-[12px] text-[var(--text3)]">{rows.length} buckets</span>
                </div>
                <div className="mt-2">
                  <MetricSparkline data={series} width={220} height={40} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="loading-skeleton h-11 rounded-[var(--radius)] bg-[var(--bg2)]" />)}
        </div>
      ) : metrics.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--text3)]">No metrics recorded for this window yet.</div>
      ) : (
        <Table headers={["Metric type", "Value", "Bucket start", "Bucket end", "Rule"]} maxHeight="calc(100vh - 30rem)">
          {metrics.map((m) => (
            <Tr key={m.id}>
              <Td>{m.metricType}</Td>
              <Td><span className="tabular-nums">{m.value}</span></Td>
              <Td><Timestamp value={m.bucketStart} /></Td>
              <Td><Timestamp value={m.bucketEnd} /></Td>
              <Td>{m.ruleId ? <code className="font-[family-name:var(--mono)] text-[11.5px]">{m.ruleId.slice(0, 8)}…</code> : <span className="text-[var(--text3)]">Org-level</span>}</Td>
            </Tr>
          ))}
        </Table>
      )}
    </FillPage>
  );
}
