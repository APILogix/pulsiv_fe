/**
 * RemoteConfigHeader — scope, revision state, and the publish action.
 *
 * ## Mono-theme rules applied here (index.css §0, §3, §6)
 *
 * 1. **Colour must mean something.** The previous version tinted every icon a
 *    different hue (indigo Inheritance, sky Rollout, emerald Telemetry) purely
 *    for decoration, which spends the semantic channels on chrome and leaves
 *    nothing to signal an actual problem. Here colour appears only for state:
 *    amber = unpublished draft, red = blocking validation error, green = live
 *    and serving. Every navigational icon is a neutral.
 * 2. **No linear gradients.** The old identity chip used a three-stop
 *    indigo → sky → emerald gradient. §3 permits exactly one linear gradient in
 *    the system — `.logo-gradient` on the logo mark.
 * 3. **A hairline border carries the card** (§6). `shadow-lg backdrop-blur-md`
 *    is not part of the system and reads as a different product.
 * 4. **Tokenised radii.** `rounded-[16px]` / `rounded-xl` became
 *    `--radius-lg` / `--radius`.
 * 5. **`.eyebrow` for labels** instead of re-declaring
 *    `text-[11px] uppercase tracking-wider` per label.
 * 6. **Identifiers are monospace and tabular** (§4) — revision numbers and
 *    hashes are compared by eye, so they must not shift width between digits.
 */
import {
  Clock3,
  Cpu,
  Globe2,
  Hash,
  History,
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

/** Secondary header action. Neutral by design — these are navigation, not state. */
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
      className="h-8 gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-transparent px-2.5 text-[12px] font-medium text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
    >
      <Icon className="size-3.5 text-[var(--text3)]" aria-hidden="true" />
      {label}
    </Button>
  );
}

/** One cell of the revision strip. */
function MetaCell({
  icon: Icon,
  label,
  children,
  mono = false,
}: {
  icon: typeof Hash;
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 border-[var(--border)] px-3 py-2 first:pl-0 sm:border-l sm:first:border-l-0">
      <Icon className="size-3.5 shrink-0 text-[var(--text3)]" aria-hidden="true" />
      <div className="min-w-0">
        <div className="eyebrow">{label}</div>
        <div
          className={cn(
            "mt-0.5 truncate text-[12px] text-[var(--text)]",
            mono ? "font-mono tabular" : "font-medium",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
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
  onDiscardDraft: _onDiscardDraft,
  onOpenRollout,
  onOpenInheritance,
  onOpenTelemetry,
}: RemoteConfigHeaderProps) {
  const currentEnv = environments.find((e) => e.id === selectedEnvironmentId);
  const envName = currentEnv ? `${currentEnv.name} (${currentEnv.slug})` : "All environments";

  return (
    <header className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Identity + scope */}
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)]"
            aria-hidden="true"
          >
            <Cpu className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[family-name:var(--display)] text-[16px] font-semibold tracking-[-0.02em] text-[var(--text)]">
                Remote configuration
              </h1>
              {/* Green is the truth channel: this reports that the revision is
                  actually being served, not decoration. */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--green-bg)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--green)]">
                <span className="size-1.5 rounded-full bg-[var(--green)] pulse-dot" />
                Serving
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text3)]">
              <Globe2 className="size-3 shrink-0" aria-hidden="true" />
              <label htmlFor="rc-env" className="shrink-0">
                Scope
              </label>
              <select
                id="rc-env"
                value={selectedEnvironmentId}
                onChange={(e) => onSelectEnvironment(e.target.value)}
                className="cursor-pointer rounded-sm bg-transparent font-medium text-[var(--text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]"
              >
                <option value="" className="bg-[var(--bg1)] text-[var(--text)]">
                  All environments
                </option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id} className="bg-[var(--bg1)] text-[var(--text)]">
                    {env.name} ({env.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <HeaderAction icon={Layers} label="Inheritance" onClick={onOpenInheritance} />
          <HeaderAction icon={Sliders} label="Rollout" onClick={onOpenRollout} />
          <HeaderAction icon={Share2} label="SDK telemetry" onClick={onOpenTelemetry} />

          {isDraft && (
            <Button
              type="button"
              onClick={onOpenPublishDrawer}
              disabled={hasErrors}
              className={cn(
                "h-8 gap-1.5 rounded-[var(--radius)] px-3 text-[12px] font-semibold transition-colors duration-150",
                hasErrors
                  ? "cursor-not-allowed border border-[var(--red)]/30 bg-[var(--red-bg)] text-[var(--red)]"
                  // Primary action -> brand channel, which is white in mono.
                  : "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]",
              )}
            >
              {hasErrors ? (
                <TriangleAlert className="size-3.5" aria-hidden="true" />
              ) : (
                <Rocket className="size-3.5" aria-hidden="true" />
              )}
              {hasErrors ? "Fix errors to publish" : "Review & publish"}
              {!hasErrors && draftChangesCount > 0 && (
                <span className="tabular rounded-full bg-[var(--brand-fg)]/12 px-1.5 py-px font-mono text-[10px]">
                  {draftChangesCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Revision strip */}
      <div className="grid grid-cols-1 gap-y-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 p-1 sm:grid-cols-2 md:grid-cols-4">
        <MetaCell icon={Globe2} label="Active target">
          {envName}
        </MetaCell>
        <MetaCell icon={History} label="Revision" mono>
          #{currentRevision}
        </MetaCell>
        <MetaCell icon={Hash} label="Hash" mono>
          {revisionHash}
        </MetaCell>
        <MetaCell icon={Clock3} label="Last deployed">
          {publishedAt}
        </MetaCell>
      </div>
    </header>
  );
}
