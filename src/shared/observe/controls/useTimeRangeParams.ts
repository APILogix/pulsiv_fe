import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";

export type PresetRange = "15m" | "1h" | "6h" | "24h" | "3d" | "7d" | "30d";

export interface TimeRangeState {
  mode: "preset" | "custom";
  range: PresetRange;
  from?: string;
  to?: string;
}

export const PRESET_OPTIONS: { value: PresetRange; label: string; shortLabel: string }[] = [
  { value: "15m", label: "Last 15 minutes", shortLabel: "15m" },
  { value: "1h", label: "Last 1 hour", shortLabel: "1h" },
  { value: "6h", label: "Last 6 hours", shortLabel: "6h" },
  { value: "24h", label: "Last 24 hours", shortLabel: "24h" },
  { value: "3d", label: "Last 3 days", shortLabel: "3d" },
  { value: "7d", label: "Last 7 days", shortLabel: "7d" },
  { value: "30d", label: "Last 30 days", shortLabel: "30d" },
];

export function useTimeRangeParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<TimeRangeState>(() => {
    const rawFrom = searchParams.get("from");
    const rawTo = searchParams.get("to");
    const rawRange = searchParams.get("range");

    if (rawFrom || rawTo) {
      return {
        mode: "custom",
        range: "24h",
        from: rawFrom ?? undefined,
        to: rawTo ?? undefined,
      };
    }

    const validPreset = PRESET_OPTIONS.find((p) => p.value === rawRange);
    return {
      mode: "preset",
      range: validPreset ? validPreset.value : "24h",
      from: undefined,
      to: undefined,
    };
  }, [searchParams]);

  const setPresetRange = useCallback(
    (newRange: PresetRange) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("range", newRange);
          next.delete("from");
          next.delete("to");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setCustomRange = useCallback(
    (fromIso: string, toIso: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("range");
          if (fromIso) next.set("from", fromIso);
          else next.delete("from");
          if (toIso) next.set("to", toIso);
          else next.delete("to");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const resetToDefault = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("range", "24h");
        next.delete("from");
        next.delete("to");
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const activeLabel = useMemo(() => {
    if (state.mode === "custom") {
      if (state.from && state.to) {
        const f = state.from.slice(0, 16).replace("T", " ");
        const t = state.to.slice(0, 16).replace("T", " ");
        return `${f} → ${t}`;
      }
      if (state.from) {
        return `From ${state.from.slice(0, 16).replace("T", " ")}`;
      }
      return "Custom Range";
    }
    const match = PRESET_OPTIONS.find((p) => p.value === state.range);
    return match ? match.label : "Last 24 hours";
  }, [state]);

  return {
    timeRangeState: state,
    setPresetRange,
    setCustomRange,
    resetToDefault,
    activeLabel,
  };
}
