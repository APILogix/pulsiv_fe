import fs from 'fs';
const p = 'src/modules/projects/api/projects.api.ts';
let content = fs.readFileSync(p, 'utf8');

// Add types
const newTypes = `
export type ProjectSettingsView = {
  retentionDays: number;
  maxEventsPerSecond: number;
  autoArchive: boolean;
  alertingEnabled: boolean;
  ingestionEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProjectOverviewView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "suspended" | "archived";
  settings: ProjectSettingsView;
  memberCount: number;
  apiKeysCount: number;
  activeApiKeysCount: number;
  usage: {
    totalEvents: number;
    totalBytes: number;
  };
  createdAt: number;
  updatedAt: number;
};

`;

content = content.replace(
  'const toTime = (value: unknown): number => {',
  newTypes + 'const toTime = (value: unknown): number => {'
);

const newMethods = `
  // --- New Core Endpoints ---
  getSettings: async (orgId: string, projectId: string): Promise<ProjectSettingsView> => {
    const { data } = await apiClient.get(\`\${projectPath(orgId, projectId)}/settings\`);
    return data.data;
  },
  updateSettings: async (orgId: string, projectId: string, payload: Partial<ProjectSettingsView>): Promise<ProjectSettingsView> => {
    const { data } = await apiClient.patch(\`\${projectPath(orgId, projectId)}/settings\`, payload);
    return data.data;
  },
  getOverview: async (orgId: string, projectId: string): Promise<ProjectOverviewView> => {
    const { data } = await apiClient.get(\`\${projectPath(orgId, projectId)}/overview\`);
    return data.data;
  },
`;

content = content.replace(
  '  getStats: async (orgId: string, projectId: string) => {',
  newMethods + '\n  getStats: async (orgId: string, projectId: string) => {'
);

fs.writeFileSync(p, content);
console.log('Added API methods');
