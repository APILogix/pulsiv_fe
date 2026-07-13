import { useActionState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Code2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { orgApi } from '@/modules/organizations/api/org.api';
import { orgQueryKeys, useOrganizations } from '@/modules/organizations/hooks/useOrganizations';
import { Field, PageHeader, SectionCard, SubmitButton, inputClass, textareaClass } from '@/shared/observe';

type PublishState = {
  ok: boolean;
  error: string | null;
};

export default function SdkConfigPage() {
  const { activeOrgId } = useOrganizations();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: orgQueryKeys.sdkConfigs(activeOrgId!),
    queryFn: () => orgApi.listSdkConfigs(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const configs = data ?? [];

  const [state, action] = useActionState(
    async (_: PublishState, form: FormData): Promise<PublishState> => {
      if (!activeOrgId) return { ok: false, error: 'No active organization' };

      try {
        const configValue = JSON.parse(String(form.get('configValue') ?? '{}'));
        await orgApi.createSdkConfig(activeOrgId, {
          configKey: String(form.get('configKey') ?? ''),
          configValue,
          environment: String(form.get('environment') ?? 'production'),
        });
        await queryClient.invalidateQueries({ queryKey: orgQueryKeys.sdkConfigs(activeOrgId) });
        return { ok: true, error: null };
      } catch (error: any) {
        return {
          ok: false,
          error:
            error instanceof SyntaxError
              ? 'Configuration must be valid JSON'
              : error?.response?.data?.error?.message ?? 'Unable to publish configuration',
        };
      }
    },
    { ok: false, error: null }
  );

  useEffect(() => {
    if (state.ok) toast.success('SDK configuration published');
    if (state.error) toast.error(state.error);
  }, [state]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="SDK configuration"
        description="Versioned organization-level configuration delivered to supported SDKs."
      />

      <SectionCard title="Publish configuration">
        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <Field label="Configuration key">
            <input
              name="configKey"
              required
              placeholder="capture-settings"
              className={inputClass}
            />
          </Field>

          <Field label="Environment">
            <input name="environment" defaultValue="production" className={inputClass} />
          </Field>

          <div className="lg:col-span-2">
            <Field label="JSON value">
              <textarea
                name="configValue"
                required
                defaultValue="{}"
                rows={8}
                className={textareaClass}
              />
            </Field>
          </div>

          <div>
            <SubmitButton>
              <Code2 className="mr-1.5 size-4" />
              Publish version
            </SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Published configurations">
        <div className="divide-y divide-[var(--border)]">
          {configs.map((config) => (
            <div className="flex items-center justify-between gap-4 py-3" key={config.id}>
              <div>
                <div className="font-mono text-sm text-[var(--text)]">{config.configKey}</div>
                <div className="text-xs text-[var(--text3)]">
                  v{config.version} | {config.environment} | {config.isActive ? 'active' : 'inactive'}
                </div>
              </div>

              <code className="max-w-[45%] truncate text-xs text-[var(--text2)]">
                {JSON.stringify(config.configValue)}
              </code>
            </div>
          ))}

          {!configs.length && (
            <p className="py-6 text-sm text-[var(--text2)]">No SDK configurations published.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
