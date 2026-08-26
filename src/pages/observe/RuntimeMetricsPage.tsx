import { MemoryStick } from "lucide-react";
import { PageHeader, PerformanceComingSoonOverlay } from "@/shared/observe";

export default function RuntimeMetricsPage() {
  return (
    <div className="flex flex-col gap-5 min-h-full">
      <PageHeader
        title="Runtime Metrics"
        description="V8 / Node.js internals: heap usage, external memory, and active handles."
      />
      <PerformanceComingSoonOverlay
        title="Runtime Telemetry Engine"
        description="Low-overhead V8 memory profiler, active handle tracker, and heap space allocation monitors will be available in an upcoming release."
        icon={MemoryStick}
        features={[
          "V8 Heap Space Allocation Breakdown",
          "Active Handles & Socket Leak Detection",
          "RSS & External Buffer Memory Tracking",
          "Automated Heap Dump Triggers",
        ]}
      />
    </div>
  );
}
