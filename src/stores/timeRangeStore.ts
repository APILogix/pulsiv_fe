import { create } from "zustand";

export interface TimeRangeState {
  timeRange: string;
  isLive: boolean;
  setTimeRange: (range: string) => void;
  toggleLive: () => void;
}

// Per-module store (rules.md §3) — select only the fields you need.
export const useTimeRangeStore = create<TimeRangeState>((set) => ({
  timeRange: "1h",
  isLive: false,
  setTimeRange: (timeRange) => set({ timeRange }),
  toggleLive: () => set((state) => ({ isLive: !state.isLive })),
}));

export const TIME_RANGES = ["15m", "1h", "6h", "24h", "7d", "30d"] as const;
