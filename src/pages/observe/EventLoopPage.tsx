import { Timer } from "lucide-react";
import { PageHeader, PerformanceComingSoonOverlay } from "@/shared/observe";

export default function EventLoopPage() {
  return (
    <div className="flex flex-col gap-5 min-h-full">
      <PageHeader
        title="Event Loop Monitoring"
        description="Event loop lag, phase utilization, and microtask queue delays for Node.js services."
      />
      <PerformanceComingSoonOverlay
        title="Event Loop Lag Telemetry"
        description="Real-time event loop lag tracking, libuv thread pool utilization, and blocked loop alerts will be available in an upcoming release."
        icon={Timer}
        features={[
          "Sub-millisecond Event Loop Lag Tracking",
          "Libuv Thread Pool Utilization Graphs",
          "Sync Blocked-Loop Anomaly Warnings",
          "Node.js Microtask Queue Latency",
        ]}
      />
    </div>
  );
}
