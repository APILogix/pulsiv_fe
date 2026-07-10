import fs from 'fs';
const p = 'src/modules/projects/hooks/useProjects.ts';
let content = fs.readFileSync(p, 'utf8');

// 1. Update projectQueryKeys
content = content.replace(
  '  detail: (id: string) => [...projectQueryKeys.all, "detail", id] as const,',
  `  detail: (id: string) => [...projectQueryKeys.all, "detail", id] as const,
  settings: (id: string) => [...projectQueryKeys.all, "settings", id] as const,
  overview: (id: string) => [...projectQueryKeys.all, "overview", id] as const,`
);

// 2. Add queries
const queries = `
export const useProjectSettings = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.settings(projectId), activeOrgId],
    queryFn: () => projectsApi.getSettings(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useProjectOverview = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.overview(projectId), activeOrgId],
    queryFn: () => projectsApi.getOverview(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};
`;

content = content.replace(
  'export const useProjectStats = (projectId: string) => {',
  queries + '\nexport const useProjectStats = (projectId: string) => {'
);

// 3. Add mutations
const mutation = `
    updateSettings: useMutation({
      mutationFn: ({ id, data }: { id: string; data: any }) => projectsApi.updateSettings(orgId(), id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.settings(id) });
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.overview(id) });
      },
    }),
`;

content = content.replace(
  '    updateProject: useMutation({',
  mutation + '\n    updateProject: useMutation({'
);

fs.writeFileSync(p, content);
console.log('Added hooks');
