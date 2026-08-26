import { GitCommit, ArrowRight, ShieldCheck } from "lucide-react";
import { SectionCard } from "@/shared/observe";

export function DependencyGraphModal() {
  const dependencies = [
    {
      feature: "Profiling Engine",
      requires: "Distributed Tracing",
      reason: "Profiling spans require trace context IDs to bind flamegraphs to trace transactions.",
      status: "Satisfied",
      satisfied: true,
    },
    {
      feature: "Session Replay",
      requires: "Request Capture",
      reason: "DOM event playback requires captured API payloads for complete network reproduction.",
      status: "Satisfied",
      satisfied: true,
    },
    {
      feature: "Tenant Governance",
      requires: "Queue Buffer Size >= 1,000",
      reason: "Per-tenant quotas buffer overflow spikes into the primary queue before dropping messages.",
      status: "Satisfied",
      satisfied: true,
    },
    {
      feature: "GC & Event Loop Monitoring",
      requires: "Runtime Metrics Enabled",
      reason: "Node.js internal metrics require performance observer hooks.",
      status: "Satisfied",
      satisfied: true,
    },
  ];

  return (
    <SectionCard
      title="Configuration Dependency & Constraint Matrix"
      description="Visual verification of strict inter-feature relationships and system bounds."
    >
      <div className="flex flex-col gap-3 py-2">
        {dependencies.map((dep, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand)] font-bold shrink-0">
                <GitCommit className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
                  <span>{dep.feature}</span>
                  <ArrowRight className="size-3 text-[var(--text3)]" />
                  <span className="text-[var(--brand)]">{dep.requires}</span>
                </div>
                <div className="text-[11px] text-[var(--text3)] mt-0.5">{dep.reason}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="size-3" /> {dep.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
