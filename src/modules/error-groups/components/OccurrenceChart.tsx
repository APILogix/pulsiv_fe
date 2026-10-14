import { useState } from "react";
import { Panel, SignalHistogram, useSignalTimeline, useTimeWindow } from "@/shared/observe";
import type { PresetRange } from "@/shared/observe/controls/useTimeRangeParams";
import { cn } from "@/lib/utils";
import type { ErrorGroup } from "../types/error-group";

const RANGES: PresetRange[] = ["24h", "7d", "30d"];

/** Occurrence volume for this fingerprint, read from the raw error events. */
export function OccurrenceChart({ group }: { group: ErrorGroup }) {
  const [range, setRange] = useState<PresetRange>("24h");
  const window = useTimeWindow({ mode: "preset", range });
  const timeline = useSignalTimeline("errors", { range, search: `fingerprint:${group.fingerprint}` }, window, 48);

  return (
    <Panel
      title="Occurrences"
      description="Error events carrying this fingerprint. Fatal and 5xx events stack in red."
      flush
      action={
        <div role="radiogroup" aria-label="Range" className="flex items-center rounded-[var(--radius)] border border-[var(--border)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "h-7 cursor-pointer rounded-[4px] px-2.5 font-[family-name:var(--mono)] text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)]",
                range === r ? "bg-[var(--bg3)] text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text)]",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      <SignalHistogram bars={timeline.bars} loading={timeline.isLoading} height={96} countLabel="Events" errorLabel="Fatal or 5xx" className="px-5 pb-4 pt-4" />
    </Panel>
  );
}
