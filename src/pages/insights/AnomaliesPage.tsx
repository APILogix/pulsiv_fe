import { useAnomalies } from "@/hooks/useDummyData";
import { PageHeader, KpiCard, FillPage, InfiniteCards, SeverityBadge, StatusBadge, Timestamp, MetricSparkline, Button, demoAction } from "@/shared/observe";

export default function AnomaliesPage() {
  const { data, isLoading } = useAnomalies();
  const anomalies = data ?? [];

  return (
    <FillPage>
      <PageHeader
        title="Anomaly Detection"
        description="AI-driven anomaly summaries across services."
        actions={<Button variant="secondary" onClick={() => demoAction("Configure detection")}>Configure</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active anomalies" value={anomalies.filter((a) => a.status === "active").length} trend="down" />
        <KpiCard label="Resolved (7d)" value={anomalies.filter((a) => a.status === "resolved").length} trend="up" />
        <KpiCard label="Avg confidence" value={`${Math.round(anomalies.reduce((s, a) => s + a.confidence, 0) / (anomalies.length || 1))}%`} />
        <KpiCard label="High severity" value={anomalies.filter((a) => a.severity === "high").length} />
      </div>

      <InfiniteCards
        className="flex-1"
        loading={isLoading}
        items={anomalies}
        queryKey={["anomalies"]}
        getKey={(a) => a.id}
        gridClassName="flex flex-col gap-3"
        renderCard={(a) => (
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={a.severity} />
                  <span className="font-medium text-[var(--text)]">{a.title}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-[var(--text3)]">
                  <span>{a.service}</span>
                  <code className="font-[family-name:var(--mono)]">{a.metric}</code>
                  <span className="text-[var(--red)]">+{a.deviation} deviation</span>
                  <span>detected <Timestamp value={a.detectedAt} /></span>
                </div>
              </div>
              <MetricSparkline data={Array.from({ length: 24 }, (_, i) => (i > 18 ? 80 + Math.random() * 40 : 30 + Math.random() * 15))} color="var(--red)" />
              <div className="text-right">
                <div className="text-[11px] text-[var(--text3)]">confidence</div>
                <div className="text-lg font-semibold text-[var(--brand)]">{a.confidence}%</div>
              </div>
            </div>
          </div>
        )}
      />
    </FillPage>
  );
}
