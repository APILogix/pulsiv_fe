import { Notice, Panel } from "@/shared/ui/pulse";

interface InheritanceVisualizerProps {
  environmentName: string;
}

/**
 * Explains the layering model. It is static: it does not read this project's
 * per-layer overrides, so it says so instead of showing invented counts.
 */
export function InheritanceVisualizer({ environmentName }: InheritanceVisualizerProps) {
  const layers = [
    {
      name: "Built-in defaults",
      description: "Fallback values embedded in the standard SDK distribution.",
    },
    {
      name: "Organization policies",
      description: "Org-wide compliance rules, such as mandatory PII masking and maximum payload bounds.",
    },
    {
      name: "Project configuration",
      description: "The shared baseline for every environment in this project.",
    },
    {
      name: `Environment: ${environmentName}`,
      description: "Environment-specific overrides, such as sampling, retry policies, and route settings.",
    },
    {
      name: "SDK platform",
      description: "Platform-specific adaptations evaluated at runtime (web, Node.js, mobile).",
    },
  ];

  return (
    <Panel
      title="Inheritance"
      description="How the settings an SDK receives are layered, from built-in defaults up to this environment. Later layers override earlier ones."
    >
      <div className="flex flex-col gap-5">
        <Notice tone="neutral" title="Preview">
          This view explains the layering model. It doesn't show this project's per-layer overrides yet.
        </Notice>
        <ol className="flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {layers.map((layer, index) => (
            <li key={layer.name} className="flex items-baseline gap-4 py-3">
              <span className="w-5 shrink-0 text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--text)]">{layer.name}</p>
                <p className="mt-0.5 text-[12px] leading-[1.55] text-[var(--text2)]">{layer.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}
