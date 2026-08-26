import React, { useEffect, useState } from "react";
import {
  Sliders,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Trash2,
  Code2,
  FormInput,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  OrganizationAlertPolicy,
  ProjectSubscription,
  AlertSeverity,
} from "../api/types";
import { SeverityBadge } from "@/shared/observe";
import { cn } from "@/lib/utils";

export interface ProjectOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: ProjectSubscription | null;
  policy: OrganizationAlertPolicy | null;
  isSaving: boolean;
  onSave: (payload: {
    subscriptionId: string;
    override: {
      threshold?: Record<string, unknown> | null;
      cooldownSeconds?: number | null;
      evaluationWindowSeconds?: number | null;
      severity?: AlertSeverity | null;
      channels?: string[] | null;
      environment?: string | null;
    };
  }) => void;
  onRemoveOverride?: (subscriptionId: string) => void;
}

const COMMON_UNITS = [
  { value: "percent", label: "% (Percent)" },
  { value: "ms", label: "ms (Milliseconds)" },
  { value: "seconds", label: "s (Seconds)" },
  { value: "minutes", label: "min (Minutes)" },
  { value: "hours", label: "hrs (Hours)" },
  { value: "days", label: "days (Days)" },
  { value: "requests", label: "requests" },
  { value: "failures", label: "failures" },
  { value: "messages", label: "messages" },
  { value: "events", label: "events" },
  { value: "attempts", label: "attempts" },
  { value: "ratio", label: "ratio" },
  { value: "score", label: "score" },
  { value: "number", label: "number" },
];

const AVAILABLE_CHANNELS = [
  { id: "slack", label: "Slack", icon: "💬" },
  { id: "email", label: "Email", icon: "✉️" },
  { id: "discord", label: "Discord", icon: "🎮" },
  { id: "pagerduty", label: "PagerDuty", icon: "📟" },
  { id: "webhook", label: "Webhook", icon: "🔗" },
  { id: "teams", label: "Microsoft Teams", icon: "👥" },
  { id: "sms", label: "SMS", icon: "📱" },
];

const COOLDOWN_PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "10m", seconds: 600 },
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
];

const WINDOW_PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "10m", seconds: 600 },
  { label: "15m", seconds: 900 },
  { label: "1h", seconds: 3600 },
];

/** Formats a threshold object or value into human readable text */
export function formatThreshold(threshold: unknown): string {
  if (threshold === null || threshold === undefined) return "—";
  if (typeof threshold === "number") return threshold.toLocaleString();
  if (typeof threshold === "string") return threshold;

  if (typeof threshold === "object" && threshold !== null) {
    const obj = threshold as Record<string, unknown>;
    if ("value" in obj && obj.value !== undefined) {
      const val = typeof obj.value === "number" ? obj.value.toLocaleString() : String(obj.value);
      const unit = typeof obj.unit === "string" ? obj.unit : "";
      if (unit === "percent" || unit === "%") return `${val}%`;
      if (unit === "ms") return `${val} ms`;
      if (unit === "seconds" || unit === "s") return `${val}s`;
      if (unit === "minutes") return `${val} min`;
      if (unit === "hours") return `${val} hrs`;
      if (unit === "days") return `${val} days`;
      if (unit) return `${val} ${unit}`;
      return val;
    }

    // Map of fields (e.g. { "errors.rate": 5 })
    const entries = Object.entries(obj);
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ");
    }
  }

  return JSON.stringify(threshold);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds)) return "—";
  if (seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder > 0 ? `${mins}m ${remainder}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const ProjectOverrideModal: React.FC<ProjectOverrideModalProps> = ({
  open,
  onOpenChange,
  subscription,
  policy,
  isSaving,
  onSave,
  onRemoveOverride,
}) => {
  const [editorMode, setEditorMode] = useState<"visual" | "json">("visual");

  // Form states
  const [overrideThresholdEnabled, setOverrideThresholdEnabled] = useState(false);
  const [thresholdValue, setThresholdValue] = useState<string>("");
  const [thresholdUnit, setThresholdUnit] = useState<string>("");
  const [rawThresholdJson, setRawThresholdJson] = useState<string>("");

  const [overrideCooldownEnabled, setOverrideCooldownEnabled] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<string>("");

  const [overrideWindowEnabled, setOverrideWindowEnabled] = useState(false);
  const [windowSeconds, setWindowSeconds] = useState<string>("");

  const [overrideSeverityEnabled, setOverrideSeverityEnabled] = useState(false);
  const [severity, setSeverity] = useState<AlertSeverity>("warning");

  const [overrideEnvEnabled, setOverrideEnvEnabled] = useState(false);
  const [environment, setEnvironment] = useState<string>("");

  const [overrideChannelsEnabled, setOverrideChannelsEnabled] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Initialize form whenever subscription/policy changes
  useEffect(() => {
    if (!subscription || !open) return;

    const override = subscription.override;
    const defaultThreshold = policy?.defaultThreshold as Record<string, unknown> | undefined;

    // Threshold init
    if (override && override.threshold !== undefined && override.threshold !== null) {
      setOverrideThresholdEnabled(true);
      const thr = override.threshold as Record<string, unknown>;
      if (thr && typeof thr === "object" && "value" in thr) {
        setThresholdValue(thr.value !== undefined ? String(thr.value) : "");
        setThresholdUnit(typeof thr.unit === "string" ? thr.unit : (defaultThreshold?.unit as string) || "percent");
      } else if (typeof thr === "number") {
        setThresholdValue(String(thr));
        setThresholdUnit((defaultThreshold?.unit as string) || "");
      } else {
        setThresholdValue("");
        setThresholdUnit((defaultThreshold?.unit as string) || "");
      }
      setRawThresholdJson(JSON.stringify(override.threshold, null, 2));
    } else {
      setOverrideThresholdEnabled(false);
      if (defaultThreshold && "value" in defaultThreshold) {
        setThresholdValue(String(defaultThreshold.value));
        setThresholdUnit(typeof defaultThreshold.unit === "string" ? defaultThreshold.unit : "percent");
      } else {
        setThresholdValue("");
        setThresholdUnit("percent");
      }
      setRawThresholdJson(defaultThreshold ? JSON.stringify(defaultThreshold, null, 2) : "");
    }

    // Cooldown init
    if (override?.cooldownSeconds != null) {
      setOverrideCooldownEnabled(true);
      setCooldownSeconds(String(override.cooldownSeconds));
    } else {
      setOverrideCooldownEnabled(false);
      setCooldownSeconds(policy ? String(policy.cooldownSeconds) : "");
    }

    // Window init
    if (override?.evaluationWindowSeconds != null) {
      setOverrideWindowEnabled(true);
      setWindowSeconds(String(override.evaluationWindowSeconds));
    } else {
      setOverrideWindowEnabled(false);
      setWindowSeconds(policy ? String(policy.evaluationWindowSeconds) : "");
    }

    // Severity init
    if (override?.severity != null) {
      setOverrideSeverityEnabled(true);
      setSeverity(override.severity);
    } else {
      setOverrideSeverityEnabled(false);
      setSeverity(policy?.severity || "warning");
    }

    // Environment init
    if (override?.environment != null && override.environment.trim() !== "") {
      setOverrideEnvEnabled(true);
      setEnvironment(override.environment);
    } else {
      setOverrideEnvEnabled(false);
      setEnvironment("");
    }

    // Channels init
    if (override?.channels != null && Array.isArray(override.channels) && override.channels.length > 0) {
      setOverrideChannelsEnabled(true);
      setSelectedChannels(override.channels);
    } else {
      setOverrideChannelsEnabled(false);
      setSelectedChannels([]);
    }

    setEditorMode("visual");
  }, [subscription, policy, open]);

  // Keep JSON string in sync when visual fields change in visual mode
  const syncJsonFromVisual = () => {
    if (overrideThresholdEnabled) {
      const num = Number(thresholdValue);
      const payload: Record<string, unknown> = {
        value: isNaN(num) ? thresholdValue : num,
      };
      if (thresholdUnit) payload.unit = thresholdUnit;
      setRawThresholdJson(JSON.stringify(payload, null, 2));
    } else {
      setRawThresholdJson(policy?.defaultThreshold ? JSON.stringify(policy.defaultThreshold, null, 2) : "");
    }
  };

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!subscription) return;

    let finalThreshold: Record<string, unknown> | null = null;

    if (overrideThresholdEnabled) {
      if (editorMode === "json") {
        if (rawThresholdJson.trim()) {
          try {
            const parsed = JSON.parse(rawThresholdJson);
            if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
              toast.error("Threshold JSON must be an object (e.g. {\"value\": 10}).");
              return;
            }
            finalThreshold = parsed;
          } catch {
            toast.error("Invalid JSON syntax in Threshold override.");
            return;
          }
        }
      } else {
        if (!thresholdValue.trim()) {
          toast.error("Please provide a valid threshold value or disable the threshold override.");
          return;
        }
        const num = Number(thresholdValue);
        finalThreshold = {
          value: isNaN(num) ? thresholdValue : num,
          ...(thresholdUnit ? { unit: thresholdUnit } : {}),
        };
      }
    }

    const finalCooldown =
      overrideCooldownEnabled && cooldownSeconds.trim() !== ""
        ? Math.max(0, parseInt(cooldownSeconds, 10))
        : null;

    const finalWindow =
      overrideWindowEnabled && windowSeconds.trim() !== ""
        ? Math.max(1, parseInt(windowSeconds, 10))
        : null;

    const finalSeverity = overrideSeverityEnabled ? severity : null;
    const finalEnv = overrideEnvEnabled && environment.trim() ? environment.trim() : null;
    const finalChannels = overrideChannelsEnabled && selectedChannels.length > 0 ? selectedChannels : null;

    onSave({
      subscriptionId: subscription.id,
      override: {
        threshold: finalThreshold,
        cooldownSeconds: finalCooldown,
        evaluationWindowSeconds: finalWindow,
        severity: finalSeverity,
        environment: finalEnv,
        channels: finalChannels,
      },
    });
  };

  if (!subscription || !policy) return null;

  const defaultThresholdStr = formatThreshold(policy.defaultThreshold);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[700px] overflow-y-auto bg-[var(--bg1)] border-[var(--border)] p-6 shadow-2xl">
        <DialogHeader className="border-b border-[var(--border)] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)]">
                <Sliders className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[var(--text)]">
                  Configure Policy Override
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--text3)] flex items-center gap-2 mt-0.5 font-mono">
                  <span>{policy.name}</span>
                  <span>•</span>
                  <span>{policy.slug}</span>
                </DialogDescription>
              </div>
            </div>

            {/* Mode switch */}
            <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  syncJsonFromVisual();
                  setEditorMode("visual");
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer",
                  editorMode === "visual"
                    ? "bg-[var(--bg1)] text-[var(--text)] shadow-xs"
                    : "text-[var(--text3)] hover:text-[var(--text)]"
                )}
              >
                <FormInput className="size-3.5" />
                Form Inputs
              </button>
              <button
                type="button"
                onClick={() => {
                  syncJsonFromVisual();
                  setEditorMode("json");
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer",
                  editorMode === "json"
                    ? "bg-[var(--bg1)] text-[var(--text)] shadow-xs"
                    : "text-[var(--text3)] hover:text-[var(--text)]"
                )}
              >
                <Code2 className="size-3.5" />
                Raw JSON
              </button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Policy Context Badge */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-3 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text3)]">
                Metric Expression
              </span>
              <div className="font-mono text-xs text-[var(--text)]">{policy.expression}</div>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text3)]">
                Base Org Default
              </span>
              <div className="font-semibold text-emerald-400 font-mono">{defaultThresholdStr}</div>
            </div>
          </div>

          {/* 1. THRESHOLD OVERRIDE SECTION */}
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideThresholdEnabled}
                  onChange={(e) => {
                    setOverrideThresholdEnabled(e.target.checked);
                    if (e.target.checked && !thresholdValue) {
                      const def = policy.defaultThreshold as Record<string, unknown> | undefined;
                      if (def && "value" in def) setThresholdValue(String(def.value));
                    }
                  }}
                  className="rounded border-[var(--border2)] text-[var(--brand)] focus:ring-[var(--brand)]"
                />
                <span className="font-semibold text-xs text-[var(--text)]">
                  Override Alert Threshold
                </span>
              </label>

              {overrideThresholdEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    const def = policy.defaultThreshold as Record<string, unknown> | undefined;
                    if (def && "value" in def) {
                      setThresholdValue(String(def.value));
                      setThresholdUnit(typeof def.unit === "string" ? def.unit : "percent");
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--brand)] hover:underline cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  Reset to Org Value ({defaultThresholdStr})
                </button>
              )}
            </div>

            {overrideThresholdEnabled ? (
              editorMode === "visual" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text2)] mb-1">
                      Threshold Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      required={overrideThresholdEnabled}
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)] font-mono focus:border-[var(--brand)] focus:outline-none"
                    />
                    <span className="text-[10px] text-[var(--text3)] mt-1 block">
                      Org default value: <strong className="text-[var(--text2)] font-mono">{defaultThresholdStr}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text2)] mb-1">
                      Unit of Measurement
                    </label>
                    <select
                      value={thresholdUnit}
                      onChange={(e) => setThresholdUnit(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--brand)] focus:outline-none"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-[var(--text3)] mt-1 block">
                      Metric unit applied to evaluation trigger
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <label className="block text-[11px] font-medium text-[var(--text2)] mb-1 font-mono">
                    Threshold JSON Object
                  </label>
                  <textarea
                    rows={4}
                    value={rawThresholdJson}
                    onChange={(e) => setRawThresholdJson(e.target.value)}
                    placeholder='{"value": 10, "unit": "percent"}'
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs text-[var(--text)] font-mono focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              )
            ) : (
              <div className="rounded-lg bg-[var(--bg2)]/50 p-2.5 text-xs text-[var(--text3)] flex items-center justify-between">
                <span>Currently using organization default threshold:</span>
                <span className="font-mono font-semibold text-emerald-400">{defaultThresholdStr}</span>
              </div>
            )}
          </div>

          {/* 2. TIMING & DURATION (COOLDOWN + EVALUATION WINDOW) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cooldown */}
            <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideCooldownEnabled}
                    onChange={(e) => setOverrideCooldownEnabled(e.target.checked)}
                    className="rounded border-[var(--border2)] text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                  <span className="font-semibold text-xs text-[var(--text)]">
                    Cooldown Period
                  </span>
                </label>
                <span className="text-[10px] text-[var(--text3)]">
                  Org: {formatDuration(policy.cooldownSeconds)}
                </span>
              </div>

              {overrideCooldownEnabled ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={cooldownSeconds}
                      onChange={(e) => setCooldownSeconds(e.target.value)}
                      placeholder="e.g. 900"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-xs text-[var(--text)] font-mono pr-12 focus:border-[var(--brand)] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-[11px] text-[var(--text3)]">sec</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {COOLDOWN_PRESETS.map((p) => (
                      <button
                        key={p.seconds}
                        type="button"
                        onClick={() => setCooldownSeconds(String(p.seconds))}
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer",
                          cooldownSeconds === String(p.seconds)
                            ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)] font-semibold"
                            : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text3)]">
                  Inherited: <strong className="text-[var(--text2)] font-mono">{formatDuration(policy.cooldownSeconds)} ({policy.cooldownSeconds}s)</strong>
                </div>
              )}
            </div>

            {/* Evaluation Window */}
            <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideWindowEnabled}
                    onChange={(e) => setOverrideWindowEnabled(e.target.checked)}
                    className="rounded border-[var(--border2)] text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                  <span className="font-semibold text-xs text-[var(--text)]">
                    Evaluation Window
                  </span>
                </label>
                <span className="text-[10px] text-[var(--text3)]">
                  Org: {formatDuration(policy.evaluationWindowSeconds)}
                </span>
              </div>

              {overrideWindowEnabled ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={windowSeconds}
                      onChange={(e) => setWindowSeconds(e.target.value)}
                      placeholder="e.g. 300"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-xs text-[var(--text)] font-mono pr-12 focus:border-[var(--brand)] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-[11px] text-[var(--text3)]">sec</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {WINDOW_PRESETS.map((p) => (
                      <button
                        key={p.seconds}
                        type="button"
                        onClick={() => setWindowSeconds(String(p.seconds))}
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer",
                          windowSeconds === String(p.seconds)
                            ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)] font-semibold"
                            : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text3)]">
                  Inherited: <strong className="text-[var(--text2)] font-mono">{formatDuration(policy.evaluationWindowSeconds)} ({policy.evaluationWindowSeconds}s)</strong>
                </div>
              )}
            </div>
          </div>

          {/* 3. SEVERITY & ENVIRONMENT OVERRIDES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Severity Override */}
            <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideSeverityEnabled}
                    onChange={(e) => setOverrideSeverityEnabled(e.target.checked)}
                    className="rounded border-[var(--border2)] text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                  <span className="font-semibold text-xs text-[var(--text)]">
                    Severity Override
                  </span>
                </label>
                <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                  Org: <SeverityBadge severity={policy.severity} />
                </span>
              </div>

              {overrideSeverityEnabled ? (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {(["info", "warning", "error", "critical"] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-center text-xs capitalize font-medium transition-all cursor-pointer",
                        severity === sev
                          ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)] shadow-xs"
                          : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:border-[var(--border2)]"
                      )}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text3)] flex items-center gap-1.5">
                  <span>Using default severity:</span>
                  <SeverityBadge severity={policy.severity} />
                </div>
              )}
            </div>

            {/* Target Environment */}
            <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideEnvEnabled}
                    onChange={(e) => setOverrideEnvEnabled(e.target.checked)}
                    className="rounded border-[var(--border2)] text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                  <span className="font-semibold text-xs text-[var(--text)]">
                    Target Environment
                  </span>
                </label>
                <span className="text-[10px] text-[var(--text3)]">Scope restriction</span>
              </div>

              {overrideEnvEnabled ? (
                <div className="pt-1">
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    <option value="">All Environments (Global)</option>
                    <option value="production">production</option>
                    <option value="staging">staging</option>
                    <option value="development">development</option>
                    <option value="preview">preview</option>
                  </select>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text3)]">
                  Applies globally across <strong>all project environments</strong>
                </div>
              )}
            </div>
          </div>

          {/* 4. NOTIFICATION CHANNELS OVERRIDE */}
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideChannelsEnabled}
                  onChange={(e) => setOverrideChannelsEnabled(e.target.checked)}
                  className="rounded border-[var(--border2)] text-[var(--brand)] focus:ring-[var(--brand)]"
                />
                <span className="font-semibold text-xs text-[var(--text)]">
                  Override Notification Destinations
                </span>
              </label>
              <span className="text-[10px] text-[var(--text3)]">Project-specific alert routing</span>
            </div>

            {overrideChannelsEnabled ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {AVAILABLE_CHANNELS.map((ch) => {
                  const active = selectedChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleToggleChannel(ch.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                        active
                          ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)] shadow-xs"
                          : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]"
                      )}
                    >
                      <span>{ch.icon}</span>
                      <span>{ch.label}</span>
                      {active && <CheckCircle2 className="size-3.5 ml-0.5 text-[var(--brand)]" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-[11px] text-[var(--text3)]">
                Default routing rules configured at the organization level are applied.
              </div>
            )}
          </div>

          {/* 5. LIVE COMPARISON PREVIEW */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                Live Effective Policy Preview
              </span>
              <span className="text-[10px] uppercase tracking-wider font-mono">
                {overrideThresholdEnabled ||
                overrideCooldownEnabled ||
                overrideWindowEnabled ||
                overrideSeverityEnabled ||
                overrideEnvEnabled ||
                overrideChannelsEnabled
                  ? "Project Overrides Active"
                  : "Inheriting Org Defaults"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="rounded-lg bg-[var(--bg1)]/80 border border-[var(--border)] p-2">
                <span className="text-[10px] text-[var(--text3)] uppercase block font-semibold">Threshold</span>
                <span className={cn("font-mono font-medium", overrideThresholdEnabled ? "text-amber-400 font-semibold" : "text-[var(--text)]")}>
                  {overrideThresholdEnabled
                    ? `${thresholdValue || "0"} ${thresholdUnit || ""}`
                    : defaultThresholdStr}
                </span>
              </div>

              <div className="rounded-lg bg-[var(--bg1)]/80 border border-[var(--border)] p-2">
                <span className="text-[10px] text-[var(--text3)] uppercase block font-semibold">Cooldown</span>
                <span className={cn("font-mono font-medium", overrideCooldownEnabled ? "text-amber-400 font-semibold" : "text-[var(--text)]")}>
                  {overrideCooldownEnabled
                    ? formatDuration(Number(cooldownSeconds))
                    : formatDuration(policy.cooldownSeconds)}
                </span>
              </div>

              <div className="rounded-lg bg-[var(--bg1)]/80 border border-[var(--border)] p-2">
                <span className="text-[10px] text-[var(--text3)] uppercase block font-semibold">Window</span>
                <span className={cn("font-mono font-medium", overrideWindowEnabled ? "text-amber-400 font-semibold" : "text-[var(--text)]")}>
                  {overrideWindowEnabled
                    ? formatDuration(Number(windowSeconds))
                    : formatDuration(policy.evaluationWindowSeconds)}
                </span>
              </div>

              <div className="rounded-lg bg-[var(--bg1)]/80 border border-[var(--border)] p-2">
                <span className="text-[10px] text-[var(--text3)] uppercase block font-semibold">Severity</span>
                <div className="mt-0.5">
                  <SeverityBadge severity={overrideSeverityEnabled ? severity : policy.severity} />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <div>
              {subscription.override && onRemoveOverride && (
                <button
                  type="button"
                  onClick={() => onRemoveOverride(subscription.id)}
                  className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Clear all overrides
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-[var(--brand)] px-5 py-2 text-xs font-semibold text-[var(--bg)] shadow-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Save Override</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
