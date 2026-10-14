import { useId, useState } from "react";

import { Notice, Panel } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

interface RolloutStrategyPanelProps {
  environmentName: string;
}

type Strategy = "full" | "percentage" | "canary";

const STRATEGIES: Array<{ value: Strategy; label: string; description: string; percentage: number }> = [
  {
    value: "full",
    label: "Immediate",
    description: "Every SDK instance receives the update on its next config refresh.",
    percentage: 100,
  },
  {
    value: "percentage",
    label: "Gradual percentage",
    description: "Sticky, hash-based distribution to a share of SDK instances.",
    percentage: 25,
  },
  {
    value: "canary",
    label: "Canary preview",
    description: "Only instances tagged as preview or staging receive the update.",
    percentage: 10,
  },
];

/**
 * Rollout strategies are not wired to publishing. The controls are shown so
 * the intended workflow is visible, but they are disabled: changing them never
 * affected a publish, and an enabled control would suggest it does.
 */
export function RolloutStrategyPanel({ environmentName }: RolloutStrategyPanelProps) {
  const [strategy, setStrategy] = useState<Strategy>("full");
  const [percentage, setPercentage] = useState<number>(100);
  const groupName = useId();
  const percentageId = useId();

  return (
    <Panel
      title="Rollout strategy"
      description={`How a published revision reaches the SDK instances in ${environmentName}.`}
    >
      <div className="flex flex-col gap-5">
        <Notice tone="neutral" title="Preview">
          Rollout strategies aren't connected to publishing yet. Today every published revision reaches all SDK
          instances on their next config refresh.
        </Notice>

        <fieldset disabled className="flex flex-col gap-5">
          <legend className="sr-only">Rollout strategy</legend>
          <div className="flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
            {STRATEGIES.map((option) => {
              const selected = strategy === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5",
                    selected ? "bg-[var(--bg2)]" : undefined,
                    "cursor-not-allowed opacity-70",
                  )}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      setStrategy(option.value);
                      setPercentage(option.percentage);
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--text)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-[var(--text)]">{option.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-[1.5] text-[var(--text2)]">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {strategy !== "full" && (
            <div className="flex flex-col gap-2 opacity-70">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={percentageId} className="text-[13px] font-medium text-[var(--text2)]">
                  Target share of instances
                </label>
                <span className="font-[family-name:var(--mono)] text-[13px] tabular-nums text-[var(--text)]">{percentage}%</span>
              </div>
              <input
                id={percentageId}
                type="range"
                min={1}
                max={100}
                value={percentage}
                onChange={(event) => setPercentage(Number(event.target.value))}
                className="w-full cursor-not-allowed accent-[var(--text)]"
              />
            </div>
          )}
        </fieldset>
      </div>
    </Panel>
  );
}
