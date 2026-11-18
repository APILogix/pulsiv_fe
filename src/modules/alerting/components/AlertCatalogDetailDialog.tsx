import { useState } from "react";
import {
  Copy,
  Check,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Activity,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { useOrganizationAlertPolicy } from "@/modules/alerting/hooks/useAlerting";
import type { OrganizationAlertPolicy } from "@/modules/alerting/api/types";
import { EnabledPill, labelize } from "@/modules/alerting/components/alerting-ui";
import { SeverityBadge, formatRelativeTime, formatAbsoluteTime } from "@/shared/observe";
import { Pill } from "@/shared/ui/pulse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";

export interface AlertCatalogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string | null;
  /** Optional policy object from the parent table for instant optimistic render */
  initialPolicy?: OrganizationAlertPolicy | null;
  /** Optional callback to open subscription dialog for this rule */
  onSubscribe?: (catalogKey: string) => void;
}

/** Format seconds into compact readable units (e.g. 45s, 5m, 1h 30m) */
function formatSeconds(total: number | null | undefined): string {
  if (total == null || !Number.isFinite(total)) return "—";
  const seconds = Math.max(0, Math.round(total));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}

/** Formats a threshold object or value into human readable text */
function formatThresholdValue(threshold: unknown): string {
  if (threshold == null) return "—";
  if (typeof threshold === "number") return threshold.toLocaleString();
  if (typeof threshold === "string" || typeof threshold === "boolean") return String(threshold);

  if (typeof threshold === "object" && !Array.isArray(threshold)) {
    const record = threshold as Record<string, unknown>;
    const op = record.operator ? `${record.operator} ` : "";
    const rawVal = record.value ?? record.threshold ?? record.default ?? record.amount;
    const unit = typeof record.unit === "string" && record.unit.length > 0 ? ` ${record.unit}` : "";
    if (rawVal != null) {
      const valStr = typeof rawVal === "number" ? rawVal.toLocaleString() : String(rawVal);
      return `${op}${valStr}${unit}`;
    }
  }

  const jsonStr = JSON.stringify(threshold);
  return jsonStr === "{}" ? "—" : jsonStr;
}

export function AlertCatalogDetailDialog({
  open,
  onOpenChange,
  policyId,
  initialPolicy,
  onSubscribe,
}: AlertCatalogDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  // Fetch detailed policy specification
  const {
    data: fetchedPolicy,
    isLoading,
    error: loadError,
    refetch,
  } = useOrganizationAlertPolicy(open && policyId ? policyId : undefined);

  // Use fetched policy or fall back to initial policy passed from caller
  const policy: OrganizationAlertPolicy | null =
    fetchedPolicy ?? (initialPolicy && (initialPolicy.id === policyId || initialPolicy.slug === policyId) ? initialPolicy : null);

  const displayKey = policy?.slug || policy?.id || policyId || "";

  const handleCopyKey = () => {
    if (!displayKey) return;
    void navigator.clipboard.writeText(displayKey);
    setCopied(true);
    toast.success("Alert rule key copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Loading state without prior data */}
        {isLoading && !policy && (
          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 animate-pulse rounded bg-[var(--bg2)]" />
                <div className="h-5 w-20 animate-pulse rounded bg-[var(--bg2)]" />
              </div>
              <div className="h-6 w-3/4 animate-pulse rounded bg-[var(--bg2)]" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--bg2)]" />
            </div>
            <div className="h-20 w-full animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]/60" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]/50" />
              ))}
            </div>
            <div className="h-10 w-full animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]/40" />
          </div>
        )}

        {/* Error state */}
        {!isLoading && !policy && loadError && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <AlertCircle className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[14px] font-medium text-[var(--text)]">Could not load alert catalog rule</h3>
              <p className="max-w-[42ch] text-[12.5px] text-[var(--text2)]">
                {apiErrorMessage(loadError, "The details for this catalog rule are temporarily unavailable.")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="mt-2">
              <RotateCcw className="size-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Content view */}
        {policy && (
          <>
            <DialogHeader className="gap-2">
              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <SeverityBadge severity={policy.severity} />
                <EnabledPill enabled={policy.enabled !== false} />
                <Pill>{labelize(policy.category)}</Pill>
                {policy.isSystem && (
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--bg2)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--text3)]">
                    <ShieldCheck className="size-3 text-emerald-400" />
                    Platform Catalog
                  </span>
                )}
              </div>

              {/* Title & key */}
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-[17px] font-semibold tracking-tight text-[var(--text)]">
                  {policy.name}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)] select-all">
                    {displayKey}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    title="Copy rule key"
                    aria-label="Copy rule key"
                    className="inline-flex size-5 items-center justify-center rounded text-[var(--text3)] transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)]"
                  >
                    {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>

              {/* Description */}
              {policy.description && (
                <DialogDescription className="text-[13px] leading-relaxed text-[var(--text2)]">
                  {policy.description}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              {/* Condition Expression (Read-only) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">
                    Trigger Condition
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text3)] font-[family-name:var(--mono)]">
                    Immutable condition
                  </span>
                </div>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text)] select-all overflow-x-auto whitespace-pre-wrap break-words">
                  {policy.expression || `${policy.category}.${policy.slug} evaluates against ${policy.metricSource}`}
                </div>
              </div>

              {/* Key Parameters 4-Tile Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">
                    Metric Source
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)] truncate" title={policy.metricSource || "metrics"}>
                    {policy.metricSource || "metrics"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">
                    Default Threshold
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)] truncate" title={formatThresholdValue(policy.defaultThreshold)}>
                    {formatThresholdValue(policy.defaultThreshold)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">
                    Eval Window
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)] tabular-nums">
                    {formatSeconds(policy.evaluationWindowSeconds)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--text3)]">
                    Cooldown
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)] tabular-nums">
                    {formatSeconds(policy.cooldownSeconds)}
                  </span>
                </div>
              </div>

              {/* Documentation note (if present and distinct from description) */}
              {policy.documentation && policy.documentation !== policy.description && (
                <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/30 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">
                    <FileText className="size-3" />
                    Guidance & Runbook
                  </div>
                  <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text2)]">
                    {policy.documentation}
                  </p>
                </div>
              )}

              {/* Platform Catalog Read-Only Notice */}
              <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/25 px-3 py-2.5 text-[11.5px] text-[var(--text3)] leading-relaxed">
                <ShieldCheck className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-medium text-[var(--text2)]">Global Platform Catalog:</span> All trigger
                  conditions, math operators, and evaluation schedules are verified and managed by the platform.
                  Projects tune thresholds and routing through per-project subscriptions rather than modifying global
                  catalog logic.
                </div>
              </div>

              {/* Version & Timestamps line */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-[11px] font-[family-name:var(--mono)] text-[var(--text3)]">
                <span>Version v{policy.currentVersion ?? policy.version ?? 1}</span>
                {policy.updatedAt && (
                  <span title={formatAbsoluteTime(policy.updatedAt)}>
                    Updated {formatRelativeTime(policy.updatedAt)}
                  </span>
                )}
              </div>
            </div>

            <DialogFooter className="sm:justify-between items-center">
              <span className="text-[11px] text-[var(--text3)] hidden sm:inline">
                Press <kbd className="rounded border border-[var(--border2)] bg-[var(--bg3)] px-1 py-0.5 text-[10px]">Esc</kbd> to dismiss
              </span>
              <div className="flex items-center gap-2">
                {onSubscribe && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={() => {
                      onOpenChange(false);
                      onSubscribe(policy.slug || policy.id);
                    }}
                  >
                    Subscribe Project...
                  </Button>
                )}
                <Button variant="default" size="sm" className="h-8 text-[12px] px-4" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
