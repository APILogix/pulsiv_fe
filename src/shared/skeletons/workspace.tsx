import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Block, SkeletonShell, SurfaceCard } from "./primitives";

/**
 * Workspace skeletons (design/workspaces/DESIGN.md).
 *
 * Every workspace page reads in the same order: a header on the canvas, one
 * readout band, then the work surface (a sheet with a toolbar and a table, or
 * a stack of panels). These skeletons mirror that anatomy at the same line
 * heights, so nothing moves when the route chunk resolves. The real pages have
 * no icon chips or card grids, so neither do these.
 */

// Same grids as the Readouts band in modules/projects/components/project-page.tsx.
// Duplicated because shared/ must not import from modules/.
const READOUT_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

/** Data columns after the identity column; they drop out on narrow screens like the real ones. */
const DATA_COLUMNS = ["w-16", "hidden w-24 md:block", "hidden w-20 lg:block", "hidden w-24 xl:block"];

const BARS = [42, 58, 36, 70, 52, 84, 61, 74, 47, 80, 56, 66, 50, 72];

// ── Pieces ───────────────────────────────────────────────────

/** The 1400px rail and 24px zone rhythm of WorkspacePage. */
function WorkspaceShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <SkeletonShell label={label} className="mx-auto max-w-[1400px] gap-6">
      {children}
    </SkeletonShell>
  );
}

/** ProjectPageHeader: optional crumbs, title, purpose line, fact line, actions. */
function HeaderSkeleton({
  actions = ["w-28"],
  meta = false,
  crumbs = false,
}: {
  /** One width class per action button; empty for none. */
  actions?: string[];
  meta?: boolean;
  crumbs?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col">
        {crumbs && <Block className="mb-[11px] mt-[3px] h-3 w-40" />}
        {/* Line boxes of the 22px/1.2 title and the 13px/1.6 description. */}
        <Block className="my-[3px] h-5 w-[min(14rem,60vw)]" delay={16} />
        <Block className="mb-[3px] mt-[9px] h-3.5 w-[min(34rem,85vw)]" delay={32} />
        {meta && (
          <div className="mt-3 flex flex-wrap gap-x-5">
            {[0, 1, 2, 3].map((i) => (
              <Block key={i} className="my-[3px] h-3 w-24" delay={48 + i * 16} />
            ))}
          </div>
        )}
      </div>
      {actions.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions.map((width, i) => (
            <Block key={i} className={cn("h-9", width)} delay={48 + i * 24} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Readouts: one hairline band of label, value, and context cells. */
function ReadoutsSkeleton({ count, delay = 64 }: { count: number; delay?: number }) {
  const cells = Math.min(Math.max(count, 1), 6);
  return (
    <SurfaceCard delay={delay} className="overflow-hidden p-0">
      <div className={cn("-mb-px -mr-px grid", READOUT_GRID[cells])}>
        {Array.from({ length: cells }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-r border-[var(--border)] px-5 py-4">
            <Block className="my-[3px] h-3 w-20" delay={delay + i * 24} />
            <Block className="h-[22px] w-16" delay={delay + i * 24 + 8} />
            <Block className="my-[2px] h-3 w-28 max-w-full" delay={delay + i * 24 + 16} />
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

/** Sheet: optional title row, toolbar, table header, then 52px rows. */
function SheetSkeleton({
  rows = 6,
  columns = 3,
  title = false,
  toolbar = true,
  delay = 112,
}: {
  rows?: number;
  /** Data columns after the identity column (at most four). */
  columns?: number;
  title?: boolean;
  toolbar?: boolean;
  delay?: number;
}) {
  const data = DATA_COLUMNS.slice(0, columns);
  return (
    <SurfaceCard delay={delay} className="overflow-hidden p-0">
      {title && (
        <div className="flex flex-col border-b border-[var(--border)] px-5 py-4">
          <Block className="my-[3px] h-3.5 w-32" delay={delay} />
          <Block className="mb-[3px] mt-[7px] h-3 w-[min(24rem,80%)]" delay={delay + 16} />
        </div>
      )}
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Block className="h-9 min-w-[200px] flex-1 sm:max-w-[320px]" delay={delay} />
          <Block className="hidden h-9 w-44 sm:block" rounded="full" delay={delay + 24} />
          <Block className="ml-auto h-3 w-16" delay={delay + 48} />
        </div>
      )}
      <div className="flex h-10 items-center gap-6 border-b border-[var(--border)] px-5">
        <div className="min-w-0 flex-1">
          <Block className="h-3 w-16" delay={delay + 24} />
        </div>
        {data.map((width, i) => (
          <Block key={i} className={cn("h-3 shrink-0", width)} delay={delay + 32 + i * 16} />
        ))}
        <span className="size-7 shrink-0" aria-hidden="true" />
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex h-[52px] items-center gap-6 border-b border-[var(--border)] px-5 last:border-b-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Block className="h-3.5 w-[min(14rem,70%)]" delay={delay + 40 + row * 24} />
            <Block className="h-3 w-[min(20rem,90%)]" delay={delay + 48 + row * 24} />
          </div>
          {data.map((width, col) => (
            <Block key={col} className={cn("h-3 shrink-0", width)} delay={delay + 56 + row * 24 + col * 8} />
          ))}
          <Block className="size-7 shrink-0" delay={delay + 64 + row * 24} />
        </div>
      ))}
    </SurfaceCard>
  );
}

/** Panel: title and description over a hairline, then the body. */
function PanelSkeleton({
  children,
  description = true,
  delay = 0,
  className,
  bodyClassName,
}: {
  children: ReactNode;
  description?: boolean;
  delay?: number;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <SurfaceCard delay={delay} className={cn("overflow-hidden p-0", className)}>
      <div className="flex flex-col border-b border-[var(--border)] px-5 py-4">
        <Block className="my-[3px] h-3.5 w-36" delay={delay} />
        {description && <Block className="mb-[3px] mt-[7px] h-3 w-[min(26rem,85%)]" delay={delay + 16} />}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </SurfaceCard>
  );
}

/** Chart area with grid rails, so it reads as a chart rather than a slab. */
function ChartBodySkeleton({ height = "h-56", delay = 0 }: { height?: string; delay?: number }) {
  return (
    <div className={cn("relative w-full", height)}>
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px w-full bg-[var(--border)]/60" />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-[2%] px-1">
        {BARS.map((pct, i) => (
          <Block key={i} className="flex-1" delay={delay + i * 16} style={{ height: `${pct}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Label and value over a thin meter: breakdowns and short trend lists. */
function MeterRowsSkeleton({ rows = 5, delay = 0 }: { rows?: number; delay?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Block className="h-3 w-28" delay={delay + i * 24} />
            <Block className="h-3 w-12" delay={delay + i * 24 + 8} />
          </div>
          <Block className="h-1.5 w-full" rounded="full" delay={delay + i * 24 + 16} />
        </div>
      ))}
    </div>
  );
}

/** Divided setting rows: label and description, a switch on the right. */
function SettingRowsSkeleton({ rows = 3, delay = 0 }: { rows?: number; delay?: number }) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-6 px-5 py-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Block className="h-3.5 w-36" delay={delay + i * 24} />
            <Block className="h-3 w-[min(22rem,90%)]" delay={delay + i * 24 + 8} />
          </div>
          <Block className="h-5 w-9 shrink-0" rounded="full" delay={delay + i * 24 + 16} />
        </div>
      ))}
    </div>
  );
}

/** Label-over-input fields, like DialogField and NumberField. */
function FieldsSkeleton({ count = 3, delay = 0 }: { count?: number; delay?: number }) {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Block className="my-1 h-3 w-24" delay={delay + i * 24} />
          <Block className="h-9 w-full" delay={delay + i * 24 + 8} />
        </div>
      ))}
    </div>
  );
}

/** Numbered setup steps (SetupSteps). */
function StepsSkeleton({ count = 4, delay = 0 }: { count?: number; delay?: number }) {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Block className="size-6 shrink-0" rounded="full" delay={delay + i * 24} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <Block className="h-3.5 w-32" delay={delay + i * 24 + 8} />
            <Block className="h-3 w-full" delay={delay + i * 24 + 16} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Workspace pages ──────────────────────────────────────────

/** Projects list: header, five readouts, then the filterable project table. */
export function ProjectsSkeleton() {
  return (
    <WorkspaceShell label="Loading projects">
      <HeaderSkeleton actions={["w-32"]} />
      <ReadoutsSkeleton count={5} />
      <SheetSkeleton rows={6} />
    </WorkspaceShell>
  );
}

/** New project: breadcrumb header, the details form, and what creation does. */
export function ProjectCreateSkeleton() {
  return (
    <WorkspaceShell label="Loading new project form">
      <HeaderSkeleton actions={[]} crumbs />
      <div className="grid max-w-[1080px] grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PanelSkeleton delay={64}>
          <FieldsSkeleton count={4} delay={64} />
        </PanelSkeleton>
        <PanelSkeleton delay={96} description={false}>
          <StepsSkeleton delay={96} />
        </PanelSkeleton>
      </div>
    </WorkspaceShell>
  );
}

/** Project overview: header with facts, four readouts, then the traffic panels. */
export function ProjectOverviewSkeleton() {
  return (
    <WorkspaceShell label="Loading project overview">
      <HeaderSkeleton meta actions={["w-32"]} />
      <ReadoutsSkeleton count={4} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PanelSkeleton delay={112}>
          <ChartBodySkeleton height="h-44" delay={112} />
        </PanelSkeleton>
        <PanelSkeleton delay={136}>
          <MeterRowsSkeleton rows={4} delay={136} />
        </PanelSkeleton>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelSkeleton delay={160}>
          <MeterRowsSkeleton rows={4} delay={160} />
        </PanelSkeleton>
        <PanelSkeleton delay={184}>
          <MeterRowsSkeleton rows={4} delay={184} />
        </PanelSkeleton>
      </div>
    </WorkspaceShell>
  );
}

/** Tabs that are one readout band over one table (or list). */
function tableTab(
  label: string,
  { readouts = 4, actions = ["w-28"], rail = false }: { readouts?: number; actions?: string[]; rail?: boolean } = {},
) {
  function ProjectTableSkeleton() {
    const sheet = <SheetSkeleton rows={6} delay={readouts > 0 ? 112 : 64} />;
    return (
      <WorkspaceShell label={label}>
        <HeaderSkeleton actions={actions} />
        {readouts > 0 && <ReadoutsSkeleton count={readouts} />}
        {rail ? (
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            {sheet}
            <PanelSkeleton delay={160} className="hidden xl:block">
              <MeterRowsSkeleton rows={4} delay={160} />
            </PanelSkeleton>
          </div>
        ) : (
          sheet
        )}
      </WorkspaceShell>
    );
  }
  return ProjectTableSkeleton;
}

export const ProjectActivitySkeleton = tableTab("Loading activity", { readouts: 0, actions: [] });
export const ProjectEnvironmentsSkeleton = tableTab("Loading environments");
export const ProjectApiKeysSkeleton = tableTab("Loading API keys", { actions: ["w-28", "w-28"] });
export const ProjectIncidentsSkeleton = tableTab("Loading incidents", { readouts: 5 });
export const ProjectAlertRulesSkeleton = tableTab("Loading alert rules");
export const ProjectAlertChannelsSkeleton = tableTab("Loading alert channels");
export const ProjectRoutesSkeleton = tableTab("Loading routes");
export const ProjectConnectorsSkeleton = tableTab("Loading connectors");
export const ProjectDeliveriesSkeleton = tableTab("Loading deliveries");
export const ProjectDeadLettersSkeleton = tableTab("Loading dead letters", { readouts: 3 });
export const ProjectMembersSkeleton = tableTab("Loading members", { rail: true });

/** Analytics and usage: header, readouts, a trend panel, then a detail table. */
function chartsTab(label: string, { scope = false }: { scope?: boolean } = {}) {
  function ProjectChartsSkeleton() {
    return (
      <WorkspaceShell label={label}>
        {/* Analytics carries its window in the fact line; usage has a refresh action. */}
        <HeaderSkeleton meta={scope} actions={scope ? [] : ["w-24"]} />
        {scope && (
          <div className="flex flex-wrap items-center gap-2">
            <Block className="h-9 w-56" rounded="full" delay={48} />
            <Block className="h-9 w-40" rounded="full" delay={64} />
            <Block className="h-9 w-48" delay={80} />
          </div>
        )}
        <ReadoutsSkeleton count={5} />
        <PanelSkeleton delay={112}>
          <ChartBodySkeleton delay={112} />
        </PanelSkeleton>
        <SheetSkeleton title toolbar={false} rows={4} columns={2} delay={160} />
      </WorkspaceShell>
    );
  }
  return ProjectChartsSkeleton;
}

export const ProjectAnalyticsSkeleton = chartsTab("Loading analytics", { scope: true });
export const ProjectUsageSkeleton = chartsTab("Loading usage");

/** Route editor: breadcrumb header, then the details, conditions, and delivery panels. */
export function ProjectRouteEditorSkeleton() {
  return (
    <WorkspaceShell label="Loading route">
      <HeaderSkeleton actions={[]} crumbs />
      <div className="flex w-full max-w-[720px] flex-col gap-6">
        <PanelSkeleton delay={64} description={false}>
          <FieldsSkeleton count={2} delay={64} />
        </PanelSkeleton>
        <PanelSkeleton delay={112}>
          <FieldsSkeleton count={3} delay={112} />
        </PanelSkeleton>
        <PanelSkeleton delay={160}>
          <FieldsSkeleton count={1} delay={160} />
        </PanelSkeleton>
      </div>
    </WorkspaceShell>
  );
}

/** General settings: header with facts, then the 880px column of panels. */
export function ProjectSettingsSkeleton() {
  return (
    <WorkspaceShell label="Loading project settings">
      <HeaderSkeleton meta actions={[]} />
      <div className="flex w-full max-w-[880px] flex-col gap-6">
        <PanelSkeleton delay={64}>
          <FieldsSkeleton count={3} delay={64} />
        </PanelSkeleton>
        <PanelSkeleton delay={112} bodyClassName="p-0">
          <SettingRowsSkeleton rows={3} delay={112} />
        </PanelSkeleton>
        <PanelSkeleton delay={160} bodyClassName="p-0">
          <SettingRowsSkeleton rows={2} delay={160} />
        </PanelSkeleton>
      </div>
    </WorkspaceShell>
  );
}

/** My notifications: header, then one panel per channel in the settings column. */
export function ProjectPreferencesSkeleton() {
  return (
    <WorkspaceShell label="Loading notification preferences">
      <HeaderSkeleton />
      <div className="flex w-full max-w-[880px] flex-col gap-6">
        <PanelSkeleton delay={64} bodyClassName="p-0">
          <SettingRowsSkeleton rows={3} delay={64} />
        </PanelSkeleton>
        <PanelSkeleton delay={112} bodyClassName="p-0">
          <SettingRowsSkeleton rows={2} delay={112} />
        </PanelSkeleton>
      </div>
    </WorkspaceShell>
  );
}

/** Remote config: header, status readouts, section nav, and the active section. */
export function RemoteConfigSkeleton() {
  return (
    <WorkspaceShell label="Loading remote configuration">
      <HeaderSkeleton actions={["w-60"]} />
      <ReadoutsSkeleton count={4} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        {/* Below lg the section nav is one labelled select. */}
        <div className="flex flex-col gap-1.5 lg:hidden">
          <Block className="my-1 h-3 w-14" delay={96} />
          <Block className="h-9 w-full" delay={104} />
        </div>
        <div className="hidden flex-col gap-4 lg:flex">
          <Block className="h-9 w-full" delay={96} />
          {[7, 3, 3].map((count, group) => (
            <div key={group} className="flex flex-col gap-px">
              <Block className="mx-2.5 mb-1.5 mt-0.5 h-3 w-24" delay={112 + group * 48} />
              {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex h-8 items-center gap-2.5 px-2.5">
                  <Block className="size-4 shrink-0" delay={120 + group * 48 + i * 12} />
                  <Block className="h-3 flex-1" delay={124 + group * 48 + i * 12} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex min-w-0 max-w-[800px] flex-col gap-6">
          {/* SectionBanner: 15px heading and one line of purpose. */}
          <div className="flex flex-col gap-1.5">
            <Block className="my-[2px] h-4 w-32" delay={128} />
            <Block className="my-[3px] h-3.5 w-[min(30rem,90%)]" delay={136} />
          </div>
          <PanelSkeleton delay={160} bodyClassName="p-0">
            <SettingRowsSkeleton rows={5} delay={160} />
          </PanelSkeleton>
          <PanelSkeleton delay={220} bodyClassName="p-0">
            <SettingRowsSkeleton rows={3} delay={220} />
          </PanelSkeleton>
        </div>
      </div>
    </WorkspaceShell>
  );
}
