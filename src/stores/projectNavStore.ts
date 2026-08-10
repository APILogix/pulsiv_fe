import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Collapse state for the "Active project" groups inside the workspace sidebar.
 *
 * Persisted to localStorage so a collapsed group stays collapsed across reloads
 * and across projects — the user is expressing "I don't care about Alerting",
 * not "I don't care about Alerting on this one project".
 *
 * There is deliberately no rail/drawer state here: project navigation has no
 * sidebar of its own. It is a section of the workspace flyout, which owns its
 * open state in `stores/sidebarStore`.
 */
interface ProjectNavState {
  /** Group ids the user has explicitly collapsed. Absent = expanded. */
  collapsedGroups: string[];
  toggleGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
}

export const useProjectNavStore = create<ProjectNavState>()(
  persist(
    (set) => ({
      collapsedGroups: [],

      toggleGroup: (groupId) =>
        set((state) => ({
          collapsedGroups: state.collapsedGroups.includes(groupId)
            ? state.collapsedGroups.filter((id) => id !== groupId)
            : [...state.collapsedGroups, groupId],
        })),

      /** Used when navigation lands inside a collapsed group. */
      expandGroup: (groupId) =>
        set((state) =>
          state.collapsedGroups.includes(groupId)
            ? { collapsedGroups: state.collapsedGroups.filter((id) => id !== groupId) }
            : state,
        ),
    }),
    // Bumped to 2: v1 persisted railCollapsed/mobileOpen for the removed
    // project sidebar. Old payloads are dropped rather than migrated.
    { name: "sentinel.project-nav", version: 2 },
  ),
);
