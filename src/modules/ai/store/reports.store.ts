import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ReportRecord } from "../types";

/**
 * Report history.
 *
 * Reports run as asynchronous AI jobs. The backend exposes job status by id but
 * no per-org listing, so the ids we create are tracked client-side to build a
 * history view that re-checks live status on demand.
 */
interface ReportsState {
  records: ReportRecord[];
  add: (record: ReportRecord) => void;
  remove: (jobId: string) => void;
  forOrg: (orgId: string) => ReportRecord[];
}

export const useReportsStore = create<ReportsState>()(
  persist(
    (set, get) => ({
      records: [],
      add: (record) =>
        set((state) => ({
          records: [record, ...state.records.filter((r) => r.jobId !== record.jobId)],
        })),
      remove: (jobId) =>
        set((state) => ({ records: state.records.filter((r) => r.jobId !== jobId) })),
      forOrg: (orgId) => get().records.filter((r) => r.orgId === orgId),
    }),
    {
      name: "ai-report-history",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
