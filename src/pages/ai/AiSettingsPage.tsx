import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  FlaskConical,
  Gauge,
  Info,
  Loader2,
  MessagesSquare,
  FileBarChart,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  FolderGit2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHero,
  Panel,
  Row,
  RowStack,
  SettingRow,
  Toggle,
  Notice,
  EmptyPanel,
  fieldInputClass,
} from "@/shared/ui/pulse";
import { Button } from "@/shared/observe";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeAiError } from "@/modules/ai/lib/errors";
import { useAiSettings, useUpdateAiSettings } from "@/modules/ai/hooks/useAi";
import type { AiFeatureToggle, AiOrgSettings } from "@/modules/ai/types";

const DEFAULT_FEATURES: AiFeatureToggle[] = [
  { key: "assistant", label: "AI Assistant", description: "Grounded natural-language chat over monitoring data.", enabled: true },
  { key: "investigations", label: "AI Investigations", description: "Automated analysis of errors, traces, logs, and deployments.", enabled: true },
  { key: "reports", label: "AI Reports", description: "Weekly, incident, and executive report generation.", enabled: true },
  { key: "knowledge", label: "AI Knowledge", description: "Runbook and documentation grounding.", enabled: true },
];

const FEATURE_ICON: Record<string, typeof MessagesSquare> = {
  assistant: MessagesSquare,
  investigations: FlaskConical,
  reports: FileBarChart,
  knowledge: BookOpen,
};

const DEFAULT_SETTINGS: AiOrgSettings = {
  enabled: true,
  features: DEFAULT_FEATURES,
  allowedProjectIds: [],
  allowedUserIds: [],
  monthlyCreditBudget: null,
  perUserDailyLimit: null,
  notifyOnBudgetThreshold: true,
  budgetThresholdPercent: 80,
};

export default function AiSettingsPage() {
  const query = useAiSettings();
  const update = useUpdateAiSettings();
  const [form, setForm] = useState<AiOrgSettings>(DEFAULT_SETTINGS);

  // Seed the form from server settings when they load.
  useEffect(() => {
    if (query.data) {
      setForm({
        ...DEFAULT_SETTINGS,
        ...query.data,
        features: query.data.features?.length ? query.data.features : DEFAULT_FEATURES,
      });
    }
  }, [query.data]);

  const normalized = query.isError ? normalizeAiError(query.error) : null;
  const apiUnavailable = normalized?.unavailable ?? false;
  const canSave = !!query.data && !apiUnavailable;

  const toggleFeature = (key: string, enabled: boolean) =>
    setForm((f) => ({ ...f, features: f.features.map((ft) => (ft.key === key ? { ...ft, enabled } : ft)) }));

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => toast.success("AI settings saved"),
      onError: (err) => toast.error(normalizeAiError(err).message),
    });
  };

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero eyebrow="Artificial Intelligence" title="AI Settings" icon={SlidersHorizontal} />
        <div className="flex flex-col gap-3">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-24 w-full rounded-[14px]" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError && !apiUnavailable) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero eyebrow="Artificial Intelligence" title="AI Settings" icon={SlidersHorizontal} />
        <Notice icon={ShieldCheck} tone="red" title="Couldn't load AI settings" action={<Button variant="secondary" onClick={() => query.refetch()}>Retry</Button>}>
          {normalized?.message}
        </Notice>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Artificial Intelligence"
        title="AI Settings"
        description="Organization-level AI configuration: enable features, scope access, and set budgets, limits, and notifications."
        icon={SlidersHorizontal}
        actions={
          <Button variant="primary" onClick={handleSave} disabled={!canSave || update.isPending}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        }
      />

      {apiUnavailable && (
        <Notice icon={Info} tone="amber" title="Configuration preview">
          The AI governance API isn't enabled in this environment, so changes can't be saved yet. The controls
          below show how organization AI policy will be configured once it's available.
        </Notice>
      )}

      {/* Master enable + features */}
      <Panel title="Enable features" icon={ShieldCheck} tone="ai" bodyClassName="p-0">
        <RowStack>
          <Row>
            <SettingRow
              label="AI for this organization"
              description="Master switch. When off, all AI features are disabled organization-wide."
            >
              <Toggle
                label="Enable AI"
                checked={form.enabled}
                onChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
            </SettingRow>
          </Row>
          {form.features.map((ft) => {
            const Icon = FEATURE_ICON[ft.key] ?? MessagesSquare;
            return (
              <Row key={ft.key}>
                <SettingRow
                  label={ft.label}
                  description={ft.description}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 text-[var(--text3)]" />
                    <Toggle
                      label={ft.label}
                      checked={form.enabled && ft.enabled}
                      disabled={!form.enabled}
                      onChange={(v) => toggleFeature(ft.key, v)}
                    />
                  </div>
                </SettingRow>
              </Row>
            );
          })}
        </RowStack>
      </Panel>

      {/* Access scoping */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Allowed projects" icon={FolderGit2}>
          {form.allowedProjectIds.length === 0 ? (
            <EmptyPanel
              icon={FolderGit2}
              title="All projects allowed"
              description="AI features apply to every project. Add restrictions to scope AI to specific projects."
            />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {form.allowedProjectIds.map((id) => (
                <li key={id} className="rounded-[8px] bg-[var(--bg2)] px-3 py-2 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                  {id}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Allowed users" icon={Users}>
          {form.allowedUserIds.length === 0 ? (
            <EmptyPanel
              icon={Users}
              title="All members allowed"
              description="Every member with access can use AI features. Add restrictions to limit AI to specific users."
            />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {form.allowedUserIds.map((id) => (
                <li key={id} className="rounded-[8px] bg-[var(--bg2)] px-3 py-2 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                  {id}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Budgets & limits */}
      <Panel title="Budgets & limits" icon={Gauge} bodyClassName="p-0">
        <RowStack>
          <Row>
            <SettingRow
              label="Monthly credit budget"
              description="Soft ceiling on AI credits consumed per billing cycle. Leave blank to use the plan allowance."
              htmlFor="ai-budget"
            >
              <input
                id="ai-budget"
                type="number"
                min={0}
                className={`${fieldInputClass} w-40`}
                value={form.monthlyCreditBudget ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    monthlyCreditBudget: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                placeholder="Plan default"
              />
            </SettingRow>
          </Row>
          <Row>
            <SettingRow
              label="Per-user daily limit"
              description="Maximum AI requests a single member can make per day. Leave blank for no per-user limit."
              htmlFor="ai-user-limit"
            >
              <input
                id="ai-user-limit"
                type="number"
                min={0}
                className={`${fieldInputClass} w-40`}
                value={form.perUserDailyLimit ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    perUserDailyLimit: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                placeholder="Unlimited"
              />
            </SettingRow>
          </Row>
        </RowStack>
      </Panel>

      {/* Notifications */}
      <Panel title="Notifications" icon={Bell} bodyClassName="p-0">
        <RowStack>
          <Row>
            <SettingRow
              label="Budget threshold alerts"
              description="Notify organization admins when AI credit consumption crosses the threshold below."
            >
              <Toggle
                label="Budget alerts"
                checked={form.notifyOnBudgetThreshold}
                onChange={(v) => setForm((f) => ({ ...f, notifyOnBudgetThreshold: v }))}
              />
            </SettingRow>
          </Row>
          <Row>
            <SettingRow
              label="Alert threshold"
              description="Percentage of the monthly budget that triggers a notification."
              htmlFor="ai-threshold"
            >
              <div className="flex items-center gap-2">
                <input
                  id="ai-threshold"
                  type="number"
                  min={1}
                  max={100}
                  disabled={!form.notifyOnBudgetThreshold}
                  className={`${fieldInputClass} w-24`}
                  value={form.budgetThresholdPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, budgetThresholdPercent: Number(e.target.value) }))
                  }
                />
                <span className="text-[13px] text-[var(--text3)]">%</span>
              </div>
            </SettingRow>
          </Row>
        </RowStack>
      </Panel>
    </div>
  );
}
