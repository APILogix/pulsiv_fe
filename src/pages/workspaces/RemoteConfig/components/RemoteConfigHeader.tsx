import {
  ShieldCheck,
  History,
  Hash,
  Clock3,
  Globe2,
  Cpu,
  Layers,
  Rocket,
  Share2,
  Sliders,
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
  onOpenRollout: () => void;
  onOpenInheritance: () => void;
  onOpenTelemetry: () => void;
}

export function RemoteConfigHeader({
  environments,
  selectedEnvironmentId,
  onSelectEnvironment,
  currentRevision,
  revisionHash,
  publishedAt,
  isDraft,
  draftChangesCount,
  hasErrors,
  onOpenPublishDrawer,
  onOpenRollout,
  onOpenInheritance,
  onOpenTelemetry,
}: RemoteConfigHeaderProps) {
  const currentEnv = environments.find((e) => e.id === selectedEnvironmentId);
  const envName = currentEnv ? `${currentEnv.name} (${currentEnv.slug})` : "All Environments Scope";

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-5">
      {/* Top Bar: Scope, Badges, and Primary Control Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Environment Selector & Control Title */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--brand)] shrink-0">
            <Cpu className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-medium tracking-tight text-[var(--text-primary)]">Remote Configuration Control Plane</h1>
              <span className="rounded-full bg-[var(--success-muted)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--success)] border border-[var(--success-border)]">
                Live Engine
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">

              <Globe2 className="size-3 text-[var(--brand)]" /> Active Environment Scope:
              <select
                value={selectedEnvironmentId}
                onChange={(e) => onSelectEnvironment(e.target.value)}
                className="bg-transparent font-semibold text-[var(--brand)] outline-none cursor-pointer hover:underline"
              >
                <option value="" className="bg-[var(--bg1)] text-[var(--text)]">All Environments Scope</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id} className="bg-[var(--bg1)] text-[var(--text)]">
                    {env.name} ({env.slug})
                  </option>
                ))}
              </select>
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Triggers */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenInheritance}
            className="h-9 px-3 text-xs gap-1.5 border border-[var(--border)] bg-[var(--bg2)]/60 text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
          >
            <Layers className="size-3.5 text-indigo-400" />
            Inheritance
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onOpenRollout}
            className="h-9 px-3 text-xs gap-1.5 border border-[var(--border)] bg-[var(--bg2)]/60 text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
          >
            <Sliders className="size-3.5 text-sky-400" />
            Rollout Strategy
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onOpenTelemetry}
            className="h-9 px-3 text-xs gap-1.5 border border-[var(--border)] bg-[var(--bg2)]/60 text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
          >
            <Share2 className="size-3.5 text-emerald-400" />
            SDK Telemetry
          </Button>

          {isDraft && (
            <Button
              type="button"
              onClick={onOpenPublishDrawer}
              disabled={hasErrors}
              className={cn(
                "h-9 px-4 text-xs font-semibold gap-1.5 shadow-md transition-all duration-200",
                hasErrors
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              )}
            >
              <Rocket className="size-3.5" />
              Review & Publish ({draftChangesCount})
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Telemetry & Revision Details Strip */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/40 p-3 text-[12px]">
        <div className="flex items-center gap-2.5 px-2">
          <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Active Target</div>
            <div className="truncate font-semibold text-[var(--text)]">{envName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-[var(--border)]/60">
          <History className="size-4 shrink-0 text-indigo-400" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Revision State</div>
            <div className="truncate font-semibold text-[var(--text)]">Rev #{currentRevision}</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-[var(--border)]/60">
          <Hash className="size-4 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Revision Hash</div>
            <div className="truncate font-mono text-[11px] text-[var(--text2)]">{revisionHash}</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-[var(--border)]/60">
          <Clock3 className="size-4 shrink-0 text-sky-400" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Last Deployed</div>
            <div className="truncate font-semibold text-[var(--text)]">{publishedAt}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
