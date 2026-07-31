import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FlaskConical,
  Hash,
  History,
  Lock,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import {
  Button,
  FillPage,
  PageHeader,
  SectionCard,
  StatusBadge,
  SubmitButton,
  inputClass,
} from "@/shared/observe";
import { cn } from "@/lib/utils";
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

/** Compact horizontal strip replacing the previous 4-tile metric grid. */
function RevisionStrip({
  environmentLabel,
  revision,
  hash,
  publishedAt,
}: {
  environmentLabel: string;
  revision: number;
  hash: string;
  publishedAt: string;
}) {
  const items = [
    { icon: ShieldCheck, label: environmentLabel, brand: true },
    { icon: History, label: `Revision ${revision}` },
    { icon: Hash, label: hash },
    { icon: Clock3, label: publishedAt },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-[13px]">
          <item.icon className={cn("size-3.5 shrink-0", item.brand ? "text-[var(--brand)]" : "text-[var(--text3)]")} />
          <span className={cn("truncate font-medium", item.brand ? "text-[var(--text)]" : "text-[var(--text2)]")}>{item.label}</span>
          {i < items.length - 1 && <span className="hidden text-[var(--border)] sm:inline">·</span>}
        </div>
      ))}
    </div>
  );
}

/** Pill-style section switcher for Editor / History / Resolve, replacing the underline tab bar. */
function TopSwitcher({
  active,
  onChange,
  items,
}: {
  active: string;
  onChange: (id: string) => void;
  items: Array<{ id: string; label: string; icon: typeof ServerCog }>;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-1">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
              isActive ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20" : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg1)]",
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </button>
        );
      })}
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
      <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--bg2)] p-4 text-[13px] text-[var(--text3)]">
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
            className={`group rounded-[12px] border p-3 text-left transition-all duration-200 ${
              active
                ? "border-[var(--brand)] bg-[var(--brand)]/10 shadow-[0_4px_12px_rgba(var(--brand-rgb),0.1)] ring-1 ring-[var(--brand)]"
                : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg1)] hover:shadow-sm hover:-translate-y-0.5"
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

/** Counts leaf-level differences between two compiled snapshots without exposing values. */
function countChangedKeys(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): number {
  const seen = new Set<string>();
  const walk = (prev: any, next: any, path: string) => {
    if (prev && next && typeof prev === "object" && typeof next === "object" && !Array.isArray(prev) && !Array.isArray(next)) {
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      keys.forEach((key) => walk(prev[key], next[key], path ? `${path}.${key}` : key));
      return;
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) seen.add(path);
  };
  walk(a ?? {}, b ?? {}, "");
  return seen.size;
}

function VersionsTab({
  versions,
  rollbackConfig,
  activeOrgId,
  selectedConfigId,
}: {
  versions: any[];
  rollbackConfig: { mutate: (payload: any) => void; isPending: boolean };
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

  const sorted = [...versions].sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));

  return (
    <div className="space-y-3">
      {sorted.map((version, index) => {
        const previous = sorted[index + 1];
        const changedCount = previous ? countChangedKeys(previous.compiledSnapshot, version.compiledSnapshot) : null;
        return (
          <div key={version.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-all hover:shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text)]">Revision {version.revision}</span>
                  <StatusBadge status={version.changeType ?? "publish"} />
                </div>
                <div className="mt-1 text-xs text-[var(--text3)]">
                  {version.environmentName || "Environment"} · {formatDate(version.publishedAt)}
                  {changedCount !== null && (
                    <> · {changedCount === 0 ? "No field changes" : `${changedCount} field${changedCount === 1 ? "" : "s"} changed`}</>
                  )}
                </div>
                {version.changeSummary && <div className="mt-1 text-xs text-[var(--text2)]">{version.changeSummary}</div>}
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={rollbackConfig.isPending}
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
          </div>
        );
      })}
    </div>
  );
}

/** Counts boolean-true leaves in a flat boolean map (features, instrumentation, killswitches). */
function countEnabled(section: unknown): { on: number; total: number } {
  if (!section || typeof section !== "object") return { on: 0, total: 0 };
  const values = Object.values(section as Record<string, unknown>);
  const bools = values.filter((v) => typeof v === "boolean");
  return { on: bools.filter(Boolean).length, total: bools.length };
}

function ResolveSummaryTile({
  label,
  icon: Icon,
  on,
  total,
  tone = "default",
}: {
  label: string;
  icon: typeof ServerCog;
  on: number;
  total: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text3)]">{label}</span>
        <Icon className={`size-4 ${tone === "danger" ? "text-red-500" : "text-[var(--text3)]"}`} />
      </div>
      <div className={`mt-2 text-[16px] font-semibold ${tone === "danger" && on > 0 ? "text-red-500" : "text-[var(--text)]"}`}>
        {on} / {total} on
      </div>
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
  const result = (resolvedResult ?? null) as Record<string, any> | null;

  const features = countEnabled(result?.features);
  const instrumentation = countEnabled(result?.instrumentation);
  const killswitches = countEnabled(result?.killswitches);
  const samplingEntries: Array<[string, number]> = result?.sampling
    ? (Object.entries(result.sampling) as Array<[string, unknown]>).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      )
    : [];

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SectionCard title="Resolver">
        <form onSubmit={handleResolve} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text3)]">Environment</span>
            <select className={inputClass} value={resolveEnv} onChange={(event) => setResolveEnv(event.target.value)}>
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {envLabel(environment)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text3)]">SDK platform</span>
            <select className={inputClass} value={resolvePlatform} onChange={(event) => setResolvePlatform(event.target.value)}>
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

      <SectionCard title={selectedEnvironment ? `Live status: ${selectedEnvironment.name}` : "Live status"}>
        {result ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ResolveSummaryTile label="Features" icon={ShieldCheck} on={features.on} total={features.total} />
              <ResolveSummaryTile label="Instrumentation" icon={ServerCog} on={instrumentation.on} total={instrumentation.total} />
              <ResolveSummaryTile label="Killswitches armed" icon={ShieldOff} on={killswitches.on} total={killswitches.total} tone="danger" />
            </div>

            {samplingEntries.length > 0 && (
              <div>
                <div className="mb-2 text-[12px] font-medium uppercase text-[var(--text3)]">Sampling rates</div>
                <div className="flex flex-wrap gap-2">
                  {samplingEntries.map(([key, value]) => (
                    <span key={key} className="rounded-full border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1 text-[12px] text-[var(--text2)]">
                      {key}: {Math.round(value <= 1 ? value * 100 : value)}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--bg2)] p-3 text-[12px] text-[var(--text3)]">
              <Lock className="size-3.5 shrink-0" />
              Internal fields (project identifiers, ingestion URLs, config hash) are never shown here for security.
            </div>
          </div>
        ) : (
          <div className="rounded-[10px] border border-dashed border-[var(--border)] p-6 text-[13px] text-[var(--text3)]">
            Choose an environment and resolve to see the live, effective SDK status.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

const SECTION_ITEMS = [
  { id: "editor", label: "Editor", icon: ServerCog },
  { id: "history", label: "History", icon: History },
  { id: "resolve", label: "Resolve", icon: FlaskConical },
];

import { useCurrentProject } from "@/pages/workspaces/ProjectShellPage";

export default function RemoteConfigPage() {
  const { projectId } = useCurrentProject();
  const { activeOrgId } = useOrganizations();
  const [environmentId, setEnvironmentId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("editor");
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
      [config.environmentName, config.environmentSlug, config.environmentId, config.revisionHash, String(config.revision)].some(
        (value) => value?.toLowerCase().includes(needle),
      ),
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

  /**
   * `editableConfig` is already allowlist-filtered by RemoteConfigPanel
   * (see mapping.ts buildEditableConfig). This sends the primary backend
   * contract `{ editableConfig, changeSummary }` — never the full compiled
   * document — so protected fields are never even attempted.
   */
  const handleSave = (editableConfig: Record<string, unknown>, changeSummary: string) => {
    if (!selectedConfig || !activeOrgId) return;
    updateConfig.mutate(
      {
        orgId: activeOrgId,
        configId: selectedConfig.id,
        projectId,
        data: {
          editableConfig,
          changeSummary: changeSummary || `Updated ${selectedConfig.environmentName} SDK config`,
        },
      },
      {
        onSuccess: () => toast.success(`Published revision ${selectedConfig.revision + 1}`),
        onError: (error: any) => {
          const message = error?.response?.data?.error?.message ?? "Failed to publish SDK config";
          toast.error(message);
        },
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
        title="Remote SDK Config"
        description="Environment-scoped configuration delivered live to connected SDKs."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={`${configs.length} configs`} />
            <StatusBadge status={`${environments.length} environments`} />
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="sidebar-scroll min-h-0 overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-4">
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
              <RevisionStrip
                environmentLabel={selectedConfig.environmentName || selectedEnvironment?.name || selectedConfig.environmentId}
                revision={selectedConfig.revision}
                hash={shortHash(selectedConfig.revisionHash)}
                publishedAt={formatDate(selectedConfig.publishedAt)}
              />

              {updateConfig.isSuccess && !updateConfig.isPending && (
                <div className="flex items-center gap-2 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] text-emerald-500">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  Published as revision {selectedConfig.revision}. SDKs pick up the change on their next config TTL refresh.
                </div>
              )}

              <div className="flex items-center justify-between">
                <TopSwitcher active={activeSection} onChange={setActiveSection} items={SECTION_ITEMS} />
              </div>

              {activeSection === "editor" && (
                <RemoteConfigPanel
                  initialConfig={selectedConfig.compiledSnapshot}
                  onSave={handleSave}
                  isSaving={updateConfig.isPending}
                  environmentName={selectedConfig.environmentName || selectedConfig.environmentSlug}
                  currentRevision={selectedConfig.revision}
                />
              )}

              {activeSection === "history" && (
                <VersionsTab
                  versions={versions}
                  rollbackConfig={rollbackConfig}
                  activeOrgId={activeOrgId}
                  selectedConfigId={selectedConfig.id}
                />
              )}

              {activeSection === "resolve" && (
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
              )}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--bg1)] p-8 text-center text-sm text-[var(--text3)]">
              Select another environment or create an environment so its SDK config can be provisioned.
            </div>
          )}
        </main>
      </div>
    </FillPage>
  );
}
