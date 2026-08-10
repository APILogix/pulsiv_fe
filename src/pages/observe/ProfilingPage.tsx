import { Cpu } from "lucide-react";
import { PageHeader, PerformanceComingSoonOverlay } from "@/shared/observe";

export default function ProfilingPage() {
  return (
    <div className="flex flex-col gap-5 min-h-full">
      <PageHeader
        title="Continuous Profiling"
        description="CPU and memory profiles captured from running production processes."
      />
      <PerformanceComingSoonOverlay
        title="Continuous Profiler Engine"
        description="Continuous CPU sampling, memory flame-graph visualizations, and allocation profilers are currently under active development."
        icon={Cpu}
        features={[
          "Interactive Flame-Graph Visualizations",
          "Hot-Function CPU Time Attribution",
          "Low-Overhead Production Sampling",
          "Differential Profile Comparisons",
        ]}
      />
    </div>
  );
}
