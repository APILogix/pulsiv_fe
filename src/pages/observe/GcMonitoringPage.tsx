import { Recycle } from "lucide-react";
import { PageHeader, PerformanceComingSoonOverlay } from "@/shared/observe";

export default function GcMonitoringPage() {
  return (
    <div className="flex flex-col gap-5 min-h-full">
      <PageHeader
        title="GC Monitoring"
        description="V8 garbage collection pauses, memory reclamation, and stop-the-world events."
      />
      <PerformanceComingSoonOverlay
        title="Garbage Collection Analyzer"
        description="Scavenge vs. Mark-Sweep pause profiling, memory reclamation efficiency, and long GC pause warnings will be available soon."
        icon={Recycle}
        features={[
          "V8 Scavenge vs. Mark-Sweep Pause Breakdown",
          "Heap Reclamation Efficiency Metrics",
          "Long Stop-The-World Pause Alerts",
          "GC Pause Latency Attribution",
        ]}
      />
    </div>
  );
}
