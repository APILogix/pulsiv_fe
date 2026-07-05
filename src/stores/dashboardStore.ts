import { create } from "zustand";

export interface DashboardState {
  activeDashboard: string;
  layouts: Record<string, unknown>;
  setActiveDashboard: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeDashboard: "executive",
  layouts: {},
  setActiveDashboard: (activeDashboard) => set({ activeDashboard }),
}));
