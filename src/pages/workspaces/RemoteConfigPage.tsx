import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Clock3,
  Code2,
  FlaskConical,
  Hash,
  History,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  FillPage,
  PageHeader,
  SectionCard,
  StatusBadge,
  SubmitButton,
  Tabs,
  inputClass,
} from "@/shared/observe";
import { RouteLoadingRegion } from "@/shared/ui/loading";
import { toast } from "sonner";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  useResolveSdkConfig,
  useSdkConfigs,
  useSdkConfigMutations,
  useSdkConfigVersions,
} from "@/modules/projects/hooks/useSdkConfigs";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import type { ProjectEnvironment } from "@/modules/projects/api/types";
import type { SdkConfigView } from "@/modules/projects/api/sdk-configs.api";
import { RemoteConfigPanel } from "./RemoteConfig/RemoteConfigPanel";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function shortHash(value?: string | null) {
  return value ? `${value.slice(0, 12)}...${value.slice(-6)}` : "-";
}

function envLabel(environment?: Pick<ProjectEnvironment, "name" | "slug"> | null) {
  return environment ? `${environment.name} (${environment.slug})` : "All environments";
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof ServerCog;
}) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium uppercase text-[var(--text3)]">{label}</span>
        <Icon className="size-4 text-[var(--text3)]" />
      </div>
      <div className="mt-2 min-w-0 truncate text-[15px] font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

function ConfigList({
  configs,
  selectedConfig,
  onSelect,
}: {
  configs: SdkConfigView[];
  selectedConfig: SdkConfigView | null;
  onSelect: (id: string) => void;
}) {
  if (configs.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--bg2)] p-4 text-[13px] text-[var(--text3)]">
        No SDK config matches the selected environment or search.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {configs.map((config) => {
        const active = selectedConfig?.id === config.id;
        return (
          <button
            key={config.id}
            type="button"
            onClick={() => onSelect(config.id)}
            className={`rounded-[8px] border p-3 text-left transition-colors ${
              active
                ? "border-[var(--brand)] bg-[var(--brand)]/10"
                : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--input)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[14px] font-semibold text-[var(--text)]">
                {config.environmentName || config.environmentSlug || config.environmentId}
              </span>
              <StatusBadge status={`rev ${config.revision}`} />
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-[12px] text-[var(--text3)]">
              <span className="truncate">{config.environmentSlug}</span>
              <span className="font-mono">{shortHash(config.revisionHash)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function VersionsTab({
  versions,
  rollbackConfig,
  activeOrgId,
  selectedConfigId,
}: {
  versions: any[];
  rollbackConfig: { mutate: (payload: any) => void };
  activeOrgId?: string | null;
  selectedConfigId: string;
}) {
  if (!versions.length) {
    return (
      <SectionCard>
        <div className="text-[13px] text-[var(--text3)]">No revisions have been published for this config yet.</div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <div key={version.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-[var(--text)]">Revision {version.revision}</div>
              <div className="mt-1 text-xs text-[var(--text3)]">
                {version.environmentName || "Environment"} / {version.changeType ?? "publish"} / {formatDate(version.publishedAt)}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                rollbackConfig.mutate({
                  orgId: activeOrgId,
                  configId: selectedConfigId,
                  revision: version.revision,
                })
              }
            >
              <RotateCcw className="size-4" />
              Rollback
            </Button>
          </div>
          <pre className="mt-3 max-h-[320px] overflow-auto rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] p-3 text-[12px] text-[var(--text2)]">
            {JSON.stringify(version.configValue ?? {}, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ResolveTab({
  environments,
  resolveEnv,
  setResolveEnv,
  resolvePlatform,
  setResolvePlatform,
  handleResolve,
  resolvedResult,
  isResolving,
}: {
  environments: ProjectEnvironment[];
  resolveEnv: string;
  setResolveEnv: (value: string) => void;
  resolvePlatform: string;
  setResolvePlatform: (value: string) => void;
  handleResolve: (event: React.FormEvent) => void;
  resolvedResult: unknown;
  isResolving: boolean;
}) {
  const selectedEnvironment = environments.find((environment) => environment.id === resolveEnv);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SectionCard title="Resolver">
        <form onSubmit={handleResolve} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text3)]">Environment</span>
            <select
              className={inputClass}
              value={resolveEnv}
              onChange={(event) => setResolveEnv(event.target.value)}
            >
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {envLabel(environment)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text3)]">SDK platform</span>
            <select
              className={inputClass}
              value={resolvePlatform}
              onChange={(event) => setResolvePlatform(event.target.value)}
            >
              <option value="web">Web</option>
              <option value="node">Node.js</option>
              <option value="python">Python</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
            </select>
          </label>
          <SubmitButton>{isResolving ? "Resolving..." : "Resolve remote SDK config"}</SubmitButton>
        </form>
      </SectionCard>

      <SectionCard title={selectedEnvironment ? `Resolved payload: ${selectedEnvironment.name}` : "Resolved payload"}>
        {resolvedResult ? (
          <pre className="max-h-[520px] overflow-auto rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] p-4 text-[12px] text-[var(--text2)]">
            {JSON.stringify(resolvedResult, null, 2)}
          </pre>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--border)] p-6 text-[13px] text-[var(--text3)]">
            Choose an environment and resolve to inspect the exact backend response.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function RemoteConfigPage() {
  const { projectId = "" } = useParams();
  const { activeOrgId } = useOrganizations();
  const [environmentId, setEnvironmentId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [resolveEnv, setResolveEnv] = useState("");
  const [resolvePlatform, setResolvePlatform] = useState("web");
  const [resolvedResult, setResolvedResult] = useState<unknown>(null);

  const { data: environments = [], isLoading: environmentsLoading } = useEnvironments(projectId);
  const { data: configs = [], isLoading: configsLoading } = useSdkConfigs(
    activeOrgId ?? "",
    projectId,
    environmentId ? { environmentId } : undefined,
  );
  const { updateConfig, rollbackConfig } = useSdkConfigMutations();
  const resolveMutation = useResolveSdkConfig();

  const filteredConfigs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return configs;
    return configs.filter((config) =>
      [
        config.environmentName,
        config.environmentSlug,
        config.environmentId,
        config.revisionHash,
        String(config.revision),
      ].some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [configs, search]);

  const selectedConfig = useMemo(
    () => filteredConfigs.find((config) => config.id === selectedConfigId) ?? filteredConfigs[0] ?? null,
    [filteredConfigs, selectedConfigId],
  );
  const selectedEnvironment = useMemo(
    () => environments.find((environment) => environment.id === (environmentId || selectedConfig?.environmentId)),
    [environmentId, environments, selectedConfig?.environmentId],
  );
  const { data: versions = [] } = useSdkConfigVersions(activeOrgId ?? "", selectedConfig?.id ?? "");

  useEffect(() => {
    if (filteredConfigs.length > 0 && !filteredConfigs.some((config) => config.id === selectedConfigId)) {
      setSelectedConfigId(filteredConfigs[0].id);
    }
    if (filteredConfigs.length === 0) setSelectedConfigId(null);
  }, [filteredConfigs, selectedConfigId]);

  useEffect(() => {
    if (!resolveEnv && environments.length > 0) setResolveEnv(environments[0].id);
  }, [environments, resolveEnv]);

  useEffect(() => {
    setResolvedResult(null);
  }, [resolveEnv, resolvePlatform]);

  const handleSave = (payload: Record<string, unknown>) => {
    if (!selectedConfig || !activeOrgId) return;
    updateConfig.mutate(
      {
        orgId: activeOrgId,
        configId: selectedConfig.id,
        projectId,
        data: {
          configValue: payload,
          schemaVersion: selectedConfig.schemaVersion ?? "1",
          changeSummary: `Updated ${selectedConfig.environmentName} SDK config`,
        },
      },
      {
        onSuccess: () => toast.success("SDK config published"),
        onError: () => toast.error("Failed to publish SDK config"),
      },
    );
  };

  const handleResolve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrgId || !resolveEnv) return;
    try {
      const result = await resolveMutation.mutateAsync({
        orgId: activeOrgId,
        projectId,
        environmentId: resolveEnv,
        platform: resolvePlatform,
      });
      setResolvedResult(result);
      toast.success("Resolved SDK config loaded");
    } catch {
      toast.error("Failed to resolve SDK config");
    }
  };

  if (configsLoading || environmentsLoading) {
    return (
      <FillPage>
        <RouteLoadingRegion className="p-0" label="Loading remote configuration" />
      </FillPage>
    );
  }

  return (
    <FillPage>
      <PageHeader
        title="Project SDK Config"
        description="Environment-scoped remote SDK configuration."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={`${configs.length} configs`} />
            <StatusBadge status={`${environments.length} environments`} />
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="sidebar-scroll min-h-0 overflow-auto rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
            <ServerCog className="size-4 text-[var(--brand)]" />
            Environment scope
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text3)]">Environment</span>
              <select
                className={inputClass}
                value={environmentId}
                onChange={(event) => {
                  setEnvironmentId(event.target.value);
                  setSelectedConfigId(null);
                }}
              >
                <option value="">All environments</option>
                {environments.map((environment) => (
                  <option key={environment.id} value={environment.id}>
                    {envLabel(environment)}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text3)]">Search configs</span>
              <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-[var(--text3)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Environment, slug, revision"
                className={`${inputClass} pl-9`}
              />
            </label>
          </div>

          <div className="mt-4">
            <ConfigList configs={filteredConfigs} selectedConfig={selectedConfig} onSelect={setSelectedConfigId} />
          </div>
        </aside>

        <main className="sidebar-scroll min-h-0 overflow-auto">
          {selectedConfig ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="Environment"
                  value={selectedConfig.environmentName || selectedEnvironment?.name || selectedConfig.environmentId}
                  icon={ShieldCheck}
                />
                <MetricTile label="Revision" value={selectedConfig.revision} icon={History} />
                <MetricTile label="Hash" value={shortHash(selectedConfig.revisionHash)} icon={Hash} />
                <MetricTile label="Published" value={formatDate(selectedConfig.publishedAt)} icon={Clock3} />
              </div>

              <Tabs
                tabs={[
                  {
                    id: "editor",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <ServerCog className="size-4" />
                        Editor
                      </span>
                    ),
                    content: <RemoteConfigPanel initialConfig={selectedConfig.configValue} onSave={handleSave} />,
                  },
                  {
                    id: "history",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <History className="size-4" />
                        History
                      </span>
                    ),
                    content: (
                      <VersionsTab
                        versions={versions}
                        rollbackConfig={rollbackConfig}
                        activeOrgId={activeOrgId}
                        selectedConfigId={selectedConfig.id}
                      />
                    ),
                  },
                  {
                    id: "resolve",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <FlaskConical className="size-4" />
                        Resolve
                      </span>
                    ),
                    content: (
                      <ResolveTab
                        environments={environments}
                        resolveEnv={resolveEnv}
                        setResolveEnv={setResolveEnv}
                        resolvePlatform={resolvePlatform}
                        setResolvePlatform={setResolvePlatform}
                        handleResolve={handleResolve}
                        resolvedResult={resolvedResult}
                        isResolving={resolveMutation.isPending}
                      />
                    ),
                  },
                  {
                    id: "raw",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <Code2 className="size-4" />
                        Raw
                      </span>
                    ),
                    content: (
                      <pre className="max-h-[620px] overflow-auto rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] p-4 text-[12px] text-[var(--text2)]">
                        {JSON.stringify(selectedConfig, null, 2)}
                      </pre>
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <div className="rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--bg1)] p-8 text-center text-sm text-[var(--text3)]">
              Select another environment or create an environment so its SDK config can be provisioned.
            </div>
          )}
        </main>
      </div>
    </FillPage>
  );
}
