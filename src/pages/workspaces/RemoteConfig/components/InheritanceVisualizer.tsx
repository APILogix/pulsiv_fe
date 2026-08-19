import { ShieldCheck, Check, Sparkles, Building2, Folder, Globe, Cpu } from "lucide-react";
import { SectionCard } from "@/shared/observe";

interface InheritanceVisualizerProps {
  environmentName: string;
}

export function InheritanceVisualizer({ environmentName }: InheritanceVisualizerProps) {
  const layers = [
    {
      level: 1,
      name: "Global Engine Defaults",
      description: "Default fallback values embedded in standard SDK distribution.",
      icon: Cpu,
      status: "Inherited",
      color: "text-[var(--text-tertiary)] border-[var(--border-default)] bg-[var(--surface-3)]",
      overrides: "100% Base",
    },
    {
      level: 2,
      name: "Organization Policies",
      description: "Org-wide compliance rules (e.g. mandatory PII masking, max payload bounds).",
      icon: Building2,
      status: "Active",
      color: "text-[var(--brand)] border-[var(--brand-border)] bg-[var(--brand-muted)]",
      overrides: "Enforced",
    },
    {
      level: 3,
      name: "Project Configuration",
      description: "Shared baseline for all environments within this project.",
      icon: Folder,
      status: "Active",
      color: "text-[var(--info)] border-[var(--info-border)] bg-[var(--info-muted)]",
      overrides: "4 Active Rules",
    },
    {
      level: 4,
      name: `Environment Target: ${environmentName}`,
      description: "Environment-specific overrides (Sampling, retry policies, route routing).",
      icon: Globe,
      status: "Active Scope",
      color: "text-[var(--success)] border-[var(--success-border)] bg-[var(--success-muted)]",
      overrides: "Primary Override",
    },
    {
      level: 5,
      name: "SDK Platform Matrix",
      description: "Platform specific behavior adaptations (Web vs Node vs Mobile).",
      icon: Sparkles,
      status: "Evaluated at Runtime",
      color: "text-[var(--warning)] border-[var(--warning-border)] bg-[var(--warning-muted)]",
      overrides: "Conditional",
    },
  ];

  return (
    <SectionCard title="Configuration Inheritance Stack">
      <p className="text-[12px] text-[var(--text-secondary)] mb-4">
        Visual representation of how effective SDK settings are compiled across organization, project, environment, and SDK layers.
      </p>
      <div className="flex flex-col gap-3">
        {layers.map((layer) => {
          const Icon = layer.icon;
          return (
            <div key={layer.level} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5 transition-colors hover:border-[var(--border-default)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex size-8 items-center justify-center rounded-md border font-medium text-xs shrink-0 ${layer.color}`}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Layer {layer.level}</span>
                    <h4 className="text-[13px] font-medium text-[var(--text-primary)]">{layer.name}</h4>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{layer.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:self-center self-end shrink-0">
                <span className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {layer.overrides}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-[var(--success-muted)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--success)] border border-[var(--success-border)]">
                  <Check className="size-3" /> {layer.status}
                </span>
              </div>
            </div>
          );
        })}

        <div className="mt-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-muted)] p-3 flex items-center justify-between text-[12px] text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--brand)] shrink-0" />
            <div>
              <span className="font-medium text-[var(--text-primary)]">Compiler Resolution Status:</span> All layer rules merged cleanly with 0 conflicts.
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

