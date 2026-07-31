import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { orgApi } from '@/modules/organizations/api/org.api';
import { orgQueryKeys, useOrganizations } from '@/modules/organizations/hooks/useOrganizations';
import { Button, Field, PageHeader, SectionCard, inputClass } from '@/shared/observe';
import { RouteLoadingRegion } from '@/shared/ui/loading';
import { RemoteConfigPanel } from '../workspaces/RemoteConfig/RemoteConfigPanel';
import { DEFAULT_SDK_CONFIG } from '../workspaces/RemoteConfig/schema';
import { buildEditableConfig } from '../workspaces/RemoteConfig/mapping';

export default function SdkConfigPage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [configKey, setConfigKey] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: orgQueryKeys.sdkConfigs(activeOrgId!),
    queryFn: () => orgApi.listSdkConfigs(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const configs = data ?? [];

  const handleSave = async (editableConfig: Record<string, unknown>, _changeSummary: string) => {
    if (!activeOrgId) return;
    if (!configKey.trim()) {
      toast.error('Configuration key is required');
      return;
    }

    setIsSaving(true);
    try {
      await orgApi.createSdkConfig(activeOrgId, {
        configKey: configKey.trim(),
        configValue: editableConfig,
        environment: environment.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: orgQueryKeys.sdkConfigs(activeOrgId) });
      toast.success('SDK configuration published');
      setIsCreating(false);
      setConfigKey('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message ?? 'Unable to publish configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <RouteLoadingRegion label="Loading SDK configuration" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organization SDK Configuration"
        description="Versioned organization-level configuration delivered to supported SDKs."
        actions={
          !isCreating && (
            <Button onClick={() => setIsCreating(true)} className="bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]">
              <Plus className="mr-1.5 size-4" />
              New Configuration
            </Button>
          )
        }
      />

      {isCreating && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <SectionCard title="Configuration Details">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Configuration key">
                <input
                  value={configKey}
                  onChange={(e) => setConfigKey(e.target.value)}
                  placeholder="capture-settings"
                  className={inputClass}
                />
              </Field>

              <Field label="Environment">
                <input
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="production"
                  className={inputClass}
                />
              </Field>
            </div>
          </SectionCard>

          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm p-4">
             <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
                <Settings2 className="size-4 text-[var(--brand)]" />
                Configuration Values
             </div>
             <RemoteConfigPanel
                initialConfig={buildEditableConfig(DEFAULT_SDK_CONFIG)}
                onSave={handleSave}
                isSaving={isSaving}
                environmentName={environment || 'production'}
                currentRevision={0}
             />
          </div>
        </div>
      )}

      {!isCreating && (
        <SectionCard title="Published configurations">
          <div className="divide-y divide-[var(--border)]">
            {configs.map((config) => (
              <div className="flex items-center justify-between gap-4 py-3" key={config.id}>
                <div>
                  <div className="font-mono text-[13px] font-semibold text-[var(--text)]">{config.configKey}</div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--text3)]">
                    <span className="rounded-full bg-[var(--bg2)] px-2 py-0.5 border border-[var(--border)]">v{config.version}</span>
                    <span className="rounded-full bg-[var(--bg2)] px-2 py-0.5 border border-[var(--border)]">{config.environment}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${config.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--bg2)] text-[var(--text3)]'}`}>
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="h-8 px-2.5 text-[12px]"
                  onClick={() => {
                  setConfigKey(config.configKey);
                  setEnvironment(config.environment ?? 'production');
                  setIsCreating(true);
                }}>
                  New Version
                </Button>
              </div>
            ))}

            {!configs.length && (
              <p className="py-6 text-sm text-[var(--text2)]">No SDK configurations published.</p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
