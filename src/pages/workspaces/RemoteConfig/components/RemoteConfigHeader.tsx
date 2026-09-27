import {
  ChevronDown,
  Cpu,
  Globe2,
  Layers,
  Rocket,
  Share2,
  Sliders,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/shared/observe";
import { cn } from "@/lib/utils";
import type { ProjectEnvironment } from "@/modules/projects/api/types";

interface RemoteConfigHeaderProps {
  environments: ProjectEnvironment[];
  selectedEnvironmentId: string;
  onSelectEnvironment: (id: string) => void;
  currentRevision: number;
  revisionHash: string;
  publishedAt: string;
  isDraft: boolean;
  draftChangesCount: number;
  hasErrors: boolean;
  onOpenPublishDrawer: () => void;
  onDiscardDraft?: () => void;
  onOpenRollout: () => void;
  onOpenInheritance: () => void;
  onOpenTelemetry: () => void;
}

function HeaderAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Layers;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="h-8 gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 text-[12px] font-medium text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-colors"
    >
      <Icon className="size-3.5 text-[var(--text3)]" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function RemoteConfigHeader({
  environments,
  selectedEnvironmentId,
  onSelectEnvironment,
  currentRevision: _currentRevision,
  revisionHash: _revisionHash,
  publishedAt: _publishedAt,
  isDraft,
  draftChangesCount,
  hasErrors,
  onOpenPublishDrawer,
  onDiscardDraft: _onDiscardDraft,
  onOpenRollout,
  onOpenInheritance,
  onOpenTelemetry,
}: RemoteConfigHeaderProps) {
  const currentEnv = environments.find((e) => e.id === selectedEnvironmentId);

  return (
    <header className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Title, Identity & Status */}
        <div className="flex items-start gap-3.5">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)] text-[var(--brand)] shadow-xs"
            aria-hidden="true"
          >
            <Cpu className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-[family-name:var(--display)] text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
                Remote Configuration
              </h1>
              {hasErrors ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--red)]/40 bg-[var(--red-bg)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--red)]">
                  <span className="size-1.5 rounded-full bg-[var(--red)]" />
                  Validation Error
                </span>
              ) : isDraft ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--amber)]/40 bg-[var(--amber-bg)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--amber)]">
                  <span className="size-1.5 rounded-full bg-[var(--amber)] animate-pulse" />
                  Draft ({draftChangesCount} changed)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green)]/30 bg-[var(--green-bg)] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--green)]">
                  <span className="size-1.5 rounded-full bg-[var(--green)] pulse-dot" />
                  Serving Live
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-[var(--text3)]">
              Dynamic telemetry controls and rules compiled in real-time for connected SDK instances.
            </p>
          </div>
        </div>

        {/* Primary Action & Scope */}
        <div className="flex flex-wrap items-center gap-2.5 sm:self-start">
          {/* Prominent Environment Selector */}
          <div className="relative inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1 text-xs transition-colors hover:border-[var(--border2)]">
            <Globe2 className="mr-1.5 size-3.5 text-[var(--text3)]" aria-hidden="true" />
            <span className="mr-1 font-semibold text-[var(--text3)]">Env:</span>
            <select
              id="rc-environment-scope"
              aria-label="Select target environment scope"
              value={selectedEnvironmentId}
              onChange={(e) => onSelectEnvironment(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent pr-4 font-semibold text-[var(--text)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            >
              <option value="" className="bg-[var(--bg1)] text-[var(--text)]">
                All Environments
              </option>
              {environments.map((env) => (
                <option key={env.id} value={env.id} className="bg-[var(--bg1)] text-[var(--text)]">
                  {env.name} ({env.slug})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-3 text-[var(--text3)]" aria-hidden="true" />
          </div>

          {/* Review & Publish CTA */}
          {isDraft && (
            <Button
              type="button"
              onClick={onOpenPublishDrawer}
              disabled={hasErrors}
              className={cn(
                "h-8 gap-1.5 rounded-[var(--radius)] px-3 text-xs font-semibold shadow-xs transition-all",
                hasErrors
                  ? "cursor-not-allowed border border-[var(--red)]/40 bg-[var(--red-bg)] text-[var(--red)]"
                  : "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]"
              )}
            >
              {hasErrors ? (
                <TriangleAlert className="size-3.5" aria-hidden="true" />
              ) : (
                <Rocket className="size-3.5" aria-hidden="true" />
              )}
              {hasErrors ? "Fix errors to publish" : "Review & publish"}
              {!hasErrors && draftChangesCount > 0 && (
                <span className="rounded-full bg-[var(--brand-fg)]/15 px-1.5 py-px font-mono text-[10px] tabular">
                  {draftChangesCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Auxiliary Operational Navigation */}
      <div className="flex flex-wrap items-center justify-between border-t border-[var(--border)] pt-3.5 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[var(--text3)]">
          <span>Active Target:</span>
          <span className="font-semibold text-[var(--text)]">
            {currentEnv ? `${currentEnv.name} (${currentEnv.slug})` : "All Environments"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HeaderAction icon={Layers} label="Inheritance Stack" onClick={onOpenInheritance} />
          <HeaderAction icon={Sliders} label="Rollout Strategy" onClick={onOpenRollout} />
          <HeaderAction icon={Share2} label="SDK Telemetry" onClick={onOpenTelemetry} />
        </div>
      </div>
    </header>
  );
}
