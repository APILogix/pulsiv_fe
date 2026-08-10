import { LineChart } from "lucide-react";
import { PageHeader, PerformanceComingSoonOverlay } from "@/shared/observe";

export default function LatencyPage() {
  return (
    <div className="flex flex-col gap-5 min-h-full">
      <PageHeader
        title="Latency Analysis"
        description="Sub-millisecond percentile breakdown, slow request breakdown, and latency distribution."
      />
      <PerformanceComingSoonOverlay
        title="Latency Analysis Engine"
        description="Our high-resolution percentile breakdown, latency heatmaps, and slow route analyzer are currently being provisioned."
        icon={LineChart}
        features={[
          "p50, p90, p95, & p99 Latency Percentiles",
          "Slow-Route Automated Diagnostics",
          "Latency Distribution Heatmaps",
          "AI-Powered Bottleneck Root-Cause",
        ]}
      />
    </div>
  );
}
