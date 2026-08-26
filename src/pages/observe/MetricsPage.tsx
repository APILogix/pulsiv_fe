import { Activity } from "lucide-react";
import { PageHeader, PerformanceComingSoonOverlay } from "@/shared/observe";

export default function MetricsPage() {
  return (
    <div className="flex flex-col gap-5 min-h-full">
      <PageHeader
        title="Custom Metrics"
        description="Custom counters, gauges, and histograms shipped from monitored services."
      />
      <PerformanceComingSoonOverlay
        title="Custom Metrics Stream"
        description="High-cardinality metric counters, gauges, and histogram distribution pipelines are currently under active development."
        icon={Activity}
        features={[
          "Custom Counter & Gauge Ingestion",
          "Prometheus & OpenTelemetry Exporter",
          "Percentile Histogram Distributions",
          "Real-time Metric Anomaly Alerts",
        ]}
      />
    </div>
  );
}
