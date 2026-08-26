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
      color: "text-slate-400 border-slate-500/30 bg-slate-500/10",
      overrides: "100% Base",
    },
    {
      level: 2,
      name: "Organization Policies",
      description: "Org-wide compliance rules (e.g. mandatory PII masking, max payload bounds).",
      icon: Building2,
      status: "Active",
      color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
      overrides: "Enforced",
    },
    {
      level: 3,
      name: "Project Configuration",
      description: "Shared baseline for all environments within this project.",
      icon: Folder,
      status: "Active",
      color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
      overrides: "4 Active Rules",
    },
    {
      level: 4,
      name: `Environment Target: ${environmentName}`,
      description: "Environment-specific overrides (Sampling, retry policies, route routing).",
      icon: Globe,
      status: "Active Scope",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      overrides: "Primary Override",
    },
    {
      level: 5,
      name: "SDK Platform Matrix",
      description: "Platform specific behavior adaptations (Web vs Node vs Mobile).",
      icon: Sparkles,
      status: "Evaluated at Runtime",
      color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      overrides: "Conditional",
    },
  ];

  return (
    <SectionCard
      title="Configuration Inheritance Stack"
      description="Visual representation of how effective SDK settings are compiled across organization, project, environment, and SDK layers."
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-3">
          {layers.map((layer) => {
            const Icon = layer.icon;
            return (
              <div key={layer.level} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4 transition-all hover:bg-[var(--bg2)]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`flex size-10 items-center justify-center rounded-lg border font-bold text-xs shrink-0 ${layer.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text3)] uppercase">Layer {layer.level}</span>
                      <h4 className="text-sm font-bold text-[var(--text)]">{layer.name}</h4>
                    </div>
                    <p className="text-xs text-[var(--text3)] mt-0.5">{layer.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center self-end shrink-0">
                  <span className="rounded-full bg-[var(--bg1)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text2)] border border-[var(--border)]">
                    {layer.overrides}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                    <Check className="size-3" /> {layer.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Compiler Resolution Status:</span> All layer rules merged cleanly with 0 conflicts.
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
