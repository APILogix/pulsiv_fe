import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useEnvironments } from "./useEnvironments";
import type { ProjectEnvironment } from "../api/types";

/**
 * Selected environment, per project.
 *
 * The environment is a *scope*, not a page, so it belongs in the project header
 * next to the identity — never in the navigation tree. Persisted per project id
 * because "I work in staging on project A and production on project B" is the
 * normal case.
 */
interface EnvironmentScopeState {
  byProject: Record<string, string>;
  select: (projectId: string, environmentId: string) => void;
  clear: (projectId: string) => void;
}

const useEnvironmentScopeStore = create<EnvironmentScopeState>()(
  persist(
    (set) => ({
      byProject: {},
      select: (projectId, environmentId) =>
        set((state) => ({ byProject: { ...state.byProject, [projectId]: environmentId } })),
      clear: (projectId) =>
        set((state) => {
          const next = { ...state.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: "pulsiv.environment-scope", version: 1 },
  ),
);

export interface EnvironmentScope {
  environments: ProjectEnvironment[];
  environment: ProjectEnvironment | null;
  environmentId: string | null;
  isLoading: boolean;
  select: (environmentId: string) => void;
}

export function useEnvironmentScope(projectId: string): EnvironmentScope {
  const { data, isLoading } = useEnvironments(projectId);
  const selectedId = useEnvironmentScopeStore((state) => state.byProject[projectId]);
  const select = useEnvironmentScopeStore((state) => state.select);
  const clear = useEnvironmentScopeStore((state) => state.clear);

  const environments = useMemo(
    () => (data ?? []).filter((environment) => environment.isActive && !environment.deletedAt),
    [data],
  );

  const environment =
    environments.find((candidate) => candidate.id === selectedId) ??
    environments.find((candidate) => candidate.isDefault) ??
    environments[0] ??
    null;

  // A stored id can outlive the environment it points at (deleted, deactivated).
  // Drop it rather than silently scoping queries to something that is gone.
  useEffect(() => {
    if (selectedId && environments.length > 0 && !environments.some((e) => e.id === selectedId)) {
      clear(projectId);
    }
  }, [selectedId, environments, projectId, clear]);

  return {
    environments,
    environment,
    environmentId: environment?.id ?? null,
    isLoading,
    select: (environmentId: string) => select(projectId, environmentId),
  };
}
