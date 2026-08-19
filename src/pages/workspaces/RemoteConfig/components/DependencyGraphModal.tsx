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
    <SectionCard title="Configuration Dependency & Constraint Matrix">
      <p className="text-[12px] text-[var(--text-secondary)] mb-4">
        Visual verification of strict inter-feature relationships and system bounds.
      </p>
      <div className="flex flex-col gap-3">
        {dependencies.map((dep, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-md bg-[var(--brand-muted)] text-[var(--brand)] font-medium shrink-0">
                <GitCommit className="size-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                  <span>{dep.feature}</span>
                  <ArrowRight className="size-3 text-[var(--text-tertiary)]" />
                  <span className="text-[var(--brand)] font-mono text-[12px]">{dep.requires}</span>
                </div>
                <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{dep.reason}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <span className="flex items-center gap-1 rounded-full bg-[var(--success-muted)] px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-[0.08em] text-[var(--success)] border border-[var(--success-border)]">
                <ShieldCheck className="size-3" />
                {dep.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
