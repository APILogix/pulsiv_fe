import {
  Block,
  SkeletonCardGrid,
  SkeletonChartCard,
  SkeletonDetailPanels,
  SkeletonForm,
  SkeletonKpiRow,
  SkeletonLogStream,
  SkeletonPageHeader,
  SkeletonPeopleList,
  SkeletonShell,
  SkeletonTable,
  SurfaceCard,
} from "./primitives";

/**
 * Page-shaped skeletons — Phase 3.
 *
 * Every route family gets a skeleton that mirrors its real layout, so clicking
 * a sidebar item paints structure on the next frame instead of a blank pane.
 * These are pure presentation with no data dependencies, which is what lets
 * them render as a Suspense fallback before the route chunk has downloaded.
 */

/* ─────────────────────────── Dashboards / metrics ────────────────────────── */

/** Executive/overview dashboards: KPI row, dual charts, ranked table. */
export function DashboardSkeleton() {
  return (
    <SkeletonShell label="Loading dashboard">
      <SkeletonPageHeader />
      <SkeletonKpiRow count={4} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SkeletonChartCard delay={180} height="h-64" />
        <SkeletonChartCard delay={210} height="h-64" legend={false} />
      </div>
      <SkeletonTable rows={6} withToolbar={false} delay={240} />
    </SkeletonShell>
  );
}

/** Dashboard gallery — a grid of saved dashboards. */
export function DashboardGallerySkeleton() {
  return (
    <SkeletonShell label="Loading dashboards">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={9} delay={96} />
    </SkeletonShell>
  );
}

/** Metrics explorer: query bar then a wall of small multiples. */
export function MetricsSkeleton() {
  return (
    <SkeletonShell label="Loading metrics">
      <SkeletonPageHeader />
      <SurfaceCard delay={72} className="flex flex-wrap items-center gap-2 p-3">
        <Block className="h-8 w-56" />
        <Block className="h-8 w-32" />
        <Block className="h-8 w-32" />
        <Block className="ml-auto h-8 w-24" />
      </SurfaceCard>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonChartCard key={i} delay={120 + i * 40} height="h-40" legend={false} />
        ))}
      </div>
    </SkeletonShell>
  );
}

/** Geo analytics — map slab plus regional breakdown. */
export function GeoSkeleton() {
  return (
    <SkeletonShell label="Loading geographic analytics">
      <SkeletonPageHeader />
      <SkeletonKpiRow count={4} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SurfaceCard delay={180} className="relative overflow-hidden">
          <div className="flex h-[22rem] w-full items-center justify-center">
            <Block className="size-full" rounded="lg" />
          </div>
        </SurfaceCard>
        <SurfaceCard delay={210} className="flex flex-col gap-3">
          <Block className="h-4 w-28" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Block className="size-4 shrink-0" rounded="full" delay={i * 24} />
              <Block className="h-3 flex-1" delay={i * 24 + 8} />
              <Block className="h-3 w-12 shrink-0" delay={i * 24 + 16} />
            </div>
          ))}
        </SurfaceCard>
      </div>
    </SkeletonShell>
  );
}

/* ──────────────────────────── Observability ─────────────────────────────── */

/** Request/event/trace explorers: filter rail then a dense table. */
export function ExplorerTableSkeleton({ label = "Loading records" }: { label?: string }) {
  return (
    <SkeletonShell label={label}>
      <SkeletonPageHeader withActions={false} />
      <SurfaceCard delay={72} className="flex flex-wrap items-center gap-2 p-3">
        <Block className="h-8 min-w-[16rem] flex-1" />
        <Block className="h-8 w-28" />
        <Block className="h-8 w-28" />
        <Block className="h-8 w-24" />
      </SurfaceCard>
      <SkeletonChartCard delay={120} height="h-24" title={false} legend={false} />
      <SkeletonTable
        rows={12}
        withToolbar={false}
        delay={160}
        columns={["w-24", "w-16", "w-1/3", "w-20", "w-16", "w-24"]}
      />
    </SkeletonShell>
  );
}

/** Log explorer — timestamp gutter + monospace stream. */
export function LogsSkeleton() {
  return (
    <SkeletonShell label="Loading logs">
      <SkeletonPageHeader withActions={false} />
      <SurfaceCard delay={72} className="flex flex-wrap items-center gap-2 p-3">
        <Block className="h-8 min-w-[18rem] flex-1" />
        <Block className="h-8 w-24" />
        <Block className="h-8 w-24" />
        <Block className="h-8 w-20" />
      </SurfaceCard>
      <SkeletonLogStream rows={16} delay={120} />
    </SkeletonShell>
  );
}

/** Error groups — grouped rows each with an occurrence sparkline. */
export function ErrorGroupsSkeleton() {
  return (
    <SkeletonShell label="Loading error groups">
      <SkeletonPageHeader />
      <SkeletonKpiRow count={4} />
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0"
          >
            <Block className="size-2 shrink-0" rounded="full" delay={160 + i * 30} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Block className="h-3.5 w-2/5" delay={160 + i * 30 + 8} />
              <Block className="h-3 w-3/5" delay={160 + i * 30 + 16} />
            </div>
            <div className="hidden items-end gap-[2px] sm:flex">
              {[6, 10, 7, 14, 9, 16, 11, 8].map((h, barIndex) => (
                <Block
                  key={barIndex}
                  className="w-[3px]"
                  style={{ height: `${h}px` }}
                  delay={160 + i * 30 + barIndex * 8}
                />
              ))}
            </div>
            <Block className="h-3 w-14 shrink-0" delay={160 + i * 30 + 24} />
            <Block className="h-5 w-16 shrink-0" rounded="full" delay={160 + i * 30 + 32} />
          </div>
        ))}
      </div>
    </SkeletonShell>
  );
}

/** Trace waterfall — nested spans with indentation and bar offsets. */
export function TraceWaterfallSkeleton() {
  const spans = [
    { indent: 0, offset: 0, width: 96 },
    { indent: 1, offset: 4, width: 62 },
    { indent: 2, offset: 8, width: 34 },
    { indent: 2, offset: 40, width: 18 },
    { indent: 1, offset: 66, width: 26 },
    { indent: 2, offset: 70, width: 14 },
    { indent: 1, offset: 84, width: 12 },
    { indent: 0, offset: 0, width: 30 },
  ];
  return (
    <SkeletonShell label="Loading trace">
      <SkeletonPageHeader withTabs />
      <SkeletonKpiRow count={4} baseDelay={140} />
      <SurfaceCard delay={200} className="flex flex-col gap-2.5 p-4">
        <Block className="h-3 w-32" />
        {spans.map((span, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2" style={{ paddingLeft: span.indent * 16 }}>
              <Block className="size-3 shrink-0" rounded="full" delay={i * 30} />
              <Block className="h-3 w-32" delay={i * 30 + 8} />
            </div>
            <div className="relative hidden h-4 flex-[2] sm:block">
              <Block
                className="absolute h-3"
                style={{ left: `${span.offset}%`, width: `${span.width}%` }}
                delay={i * 30 + 16}
              />
            </div>
            <Block className="h-3 w-12 shrink-0" delay={i * 30 + 24} />
          </div>
        ))}
      </SurfaceCard>
    </SkeletonShell>
  );
}

/** Service health / SLO grids. */
export function ServiceHealthSkeleton() {
  return (
    <SkeletonShell label="Loading service health">
      <SkeletonPageHeader />
      <SkeletonKpiRow count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SurfaceCard key={i} delay={160 + i * 40} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Block className="size-2" rounded="full" />
                <Block className="h-4 w-32" />
              </div>
              <Block className="h-5 w-16" rounded="full" />
            </div>
            <div className="flex items-end gap-[3px]">
              {Array.from({ length: 30 }).map((_, barIndex) => (
                <Block
                  key={barIndex}
                  className="flex-1"
                  style={{ height: `${18 + ((barIndex * 7) % 22)}px` }}
                  delay={barIndex * 10}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Block className="h-3 w-20" />
              <Block className="h-3 w-16" />
            </div>
          </SurfaceCard>
        ))}
      </div>
    </SkeletonShell>
  );
}

/* ───────────────────────────── Workspaces ──────────────────────────────── */

/** Projects list — project cards with health chips. */
export function ProjectsSkeleton() {
  return (
    <SkeletonShell label="Loading projects">
      <SkeletonPageHeader />
      <div className="flex flex-wrap items-center gap-2">
        <Block className="h-8 w-64" delay={80} />
        <Block className="h-8 w-28" delay={104} />
        <Block className="ml-auto h-8 w-24" delay={128} />
      </div>
      <SkeletonCardGrid count={6} delay={150} />
    </SkeletonShell>
  );
}

/** Project overview — env chips, KPI row, chart, recent activity. */
export function ProjectOverviewSkeleton() {
  return (
    <SkeletonShell label="Loading project overview">
      <SkeletonPageHeader />
      <div className="flex flex-wrap items-center gap-2">
        {[0, 1, 2].map((i) => (
          <Block key={i} className="h-7 w-24" rounded="full" delay={80 + i * 24} />
        ))}
      </div>
      <SkeletonKpiRow count={4} baseDelay={140} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SkeletonChartCard delay={220} height="h-56" />
        <SurfaceCard delay={250} className="flex flex-col gap-3">
          <Block className="h-4 w-32" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Block className="mt-0.5 size-6 shrink-0" rounded="full" delay={i * 24} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Block className="h-3 w-4/5" delay={i * 24 + 8} />
                <Block className="h-3 w-1/3" delay={i * 24 + 16} />
              </div>
            </div>
          ))}
        </SurfaceCard>
      </div>
    </SkeletonShell>
  );
}

/** Creation wizard — step rail + focused form. */
export function WizardSkeleton() {
  return (
    <SkeletonShell label="Loading wizard" className="mx-auto max-w-[900px]">
      <SkeletonPageHeader withActions={false} />
      <div className="flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <Block className="size-6 shrink-0" rounded="full" delay={80 + i * 30} />
            <Block className="h-3 flex-1" delay={80 + i * 30 + 10} />
          </div>
        ))}
      </div>
      <SkeletonForm sections={1} fieldsPerSection={4} delay={160} className="max-w-none" />
    </SkeletonShell>
  );
}

/** API keys / environments / tokens tables with a copy affordance column. */
export function KeysSkeleton() {
  return (
    <SkeletonShell label="Loading keys">
      <SkeletonPageHeader />
      <SkeletonTable
        rows={6}
        delay={96}
        columns={["w-1/4", "w-1/3", "w-20", "w-24", "w-16"]}
      />
    </SkeletonShell>
  );
}

/* ─────────────────────────────── Alerting ──────────────────────────────── */

/** Alert feed — severity chip, title, target, age, actions. */
export function AlertsSkeleton() {
  return (
    <SkeletonShell label="Loading alerts">
      <SkeletonPageHeader withTabs />
      <SkeletonKpiRow count={4} baseDelay={140} />
      <SkeletonTable
        rows={10}
        delay={200}
        columns={["w-16", "w-1/3", "w-24", "w-20", "w-16", "w-20"]}
      />
    </SkeletonShell>
  );
}

/** Alert rules / routing / escalation policies — rule rows with condition chips. */
export function RulesSkeleton() {
  return (
    <SkeletonShell label="Loading rules">
      <SkeletonPageHeader />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <SurfaceCard key={i} delay={96 + i * 40} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <Block className="h-4 w-48" />
                <Block className="h-3 w-64" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Block className="h-5 w-9" rounded="full" />
                <Block className="h-8 w-8" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
              {[0, 1, 2].map((chip) => (
                <Block key={chip} className="h-6 w-24" rounded="full" delay={chip * 24} />
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </SkeletonShell>
  );
}

/* ─────────────────────────────── Automation ────────────────────────────── */

/** Workflows list — node-graph preview cards. */
export function WorkflowsSkeleton() {
  return (
    <SkeletonShell label="Loading workflows">
      <SkeletonPageHeader />
      <SkeletonKpiRow count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SurfaceCard key={i} delay={180 + i * 40} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Block className="h-4 w-40" />
              <Block className="h-5 w-16" rounded="full" />
            </div>
            <div className="flex items-center gap-2 py-2">
              {[0, 1, 2, 3].map((node) => (
                <div key={node} className="flex flex-1 items-center gap-2">
                  <Block className="size-7 shrink-0" rounded="lg" delay={node * 30} />
                  {node < 3 && <Block className="h-px flex-1" delay={node * 30 + 12} />}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <Block className="h-3 w-24" />
              <Block className="h-3 w-20" />
            </div>
          </SurfaceCard>
        ))}
      </div>
    </SkeletonShell>
  );
}

/* ──────────────────────────────── People ──────────────────────────────── */

/** Members / team / invitations — avatar rows. */
export function MembersSkeleton() {
  return (
    <SkeletonShell label="Loading members">
      <SkeletonPageHeader />
      <div className="flex flex-wrap items-center gap-2">
        <Block className="h-8 w-64" delay={80} />
        <Block className="h-8 w-28" delay={104} />
        <Block className="ml-auto h-8 w-32" delay={128} />
      </div>
      <SkeletonPeopleList rows={8} delay={150} />
    </SkeletonShell>
  );
}

/* ─────────────────────────────── Settings ─────────────────────────────── */

/** Settings / account panels — form-shaped. */
export function SettingsSkeleton() {
  return (
    <SkeletonShell label="Loading settings">
      <div className="flex flex-col gap-2">
        <Block className="h-6 w-48" />
        <Block className="h-4 w-72" delay={24} />
      </div>
      <SkeletonForm sections={2} fieldsPerSection={3} delay={72} />
    </SkeletonShell>
  );
}

/** Integrations / connectors gallery — logo tiles. */
export function IntegrationsSkeleton() {
  return (
    <SkeletonShell label="Loading integrations">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={9} delay={96} columns="sm:grid-cols-2 xl:grid-cols-3" />
    </SkeletonShell>
  );
}

/** Audit/security event logs — timestamped table. */
export function AuditSkeleton() {
  return (
    <SkeletonShell label="Loading audit log">
      <SkeletonPageHeader withActions={false} />
      <SkeletonTable
        rows={12}
        delay={96}
        columns={["w-28", "w-24", "w-1/4", "w-1/5", "w-20"]}
      />
    </SkeletonShell>
  );
}

/* ──────────────────────────────── Billing ─────────────────────────────── */

/** Plan / usage / invoices. */
export function BillingSkeleton() {
  return (
    <SkeletonShell label="Loading billing">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SurfaceCard key={i} delay={96 + i * 40} className="flex flex-col gap-3 p-5">
            <Block className="h-3 w-20" />
            <Block className="h-8 w-28" />
            <Block className="h-3 w-full" />
            <Block className="h-3 w-4/5" />
            <Block className="mt-2 h-8 w-full" />
          </SurfaceCard>
        ))}
      </div>
      <SurfaceCard delay={220} className="flex flex-col gap-3">
        <Block className="h-4 w-32" />
        <Block className="h-2 w-full" rounded="full" />
        <div className="flex items-center justify-between">
          <Block className="h-3 w-24" />
          <Block className="h-3 w-20" />
        </div>
      </SurfaceCard>
      <SkeletonTable rows={5} withToolbar={false} delay={260} columns={["w-28", "w-1/4", "w-20", "w-20", "w-16"]} />
    </SkeletonShell>
  );
}

/* ────────────────────────────────── AI ───────────────────────────────── */

/** AI assistant — conversation transcript + composer. */
export function AiConversationSkeleton() {
  return (
    <SkeletonShell label="Loading AI assistant" className="h-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Block className="size-8" rounded="lg" />
          <div className="flex flex-col gap-1.5">
            <Block className="h-4 w-32" delay={24} />
            <Block className="h-3 w-44" delay={48} />
          </div>
        </div>
        <Block className="h-8 w-24" delay={72} />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {/* user turn */}
        <div className="flex justify-end">
          <Block className="h-10 w-[min(22rem,70%)]" rounded="lg" delay={120} />
        </div>
        {/* assistant turn — reasoning line, prose, then a chart block */}
        <div className="flex max-w-[min(44rem,90%)] flex-col gap-2">
          <div className="flex items-center gap-2">
            <Block className="size-4" rounded="full" delay={150} />
            <Block className="h-3 w-28" delay={160} />
          </div>
          <Block className="h-3 w-full" delay={180} />
          <Block className="h-3 w-11/12" delay={200} />
          <Block className="h-3 w-3/4" delay={220} />
          <Block className="h-28 w-full" rounded="lg" delay={250} />
          <Block className="h-3 w-2/3" delay={280} />
        </div>
        {/* suggested prompts */}
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="h-7 w-40" rounded="full" delay={310 + i * 30} />
          ))}
        </div>
      </div>

      <SurfaceCard delay={360} className="flex items-center gap-3 p-3">
        <Block className="h-8 flex-1" />
        <Block className="h-8 w-8" />
      </SurfaceCard>
    </SkeletonShell>
  );
}

/** AI overview / investigations / reports — insight cards. */
export function AiOverviewSkeleton() {
  return (
    <SkeletonShell label="Loading AI workspace">
      <SkeletonPageHeader />
      <SkeletonKpiRow count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SurfaceCard key={i} delay={180 + i * 40} className="ai-glow relative flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Block className="size-6" rounded="lg" />
              <Block className="h-4 w-36" />
            </div>
            <Block className="h-3 w-full" />
            <Block className="h-3 w-5/6" />
            <Block className="h-3 w-2/3" />
            <div className="flex gap-2 border-t border-[var(--border)] pt-3">
              <Block className="h-7 w-24" />
              <Block className="h-7 w-20" />
            </div>
          </SurfaceCard>
        ))}
      </div>
    </SkeletonShell>
  );
}

/* ──────────────────────────────── Generic ────────────────────────────── */

/** Detail page — breadcrumb, header with tabs, panels + metadata rail. */
export function DetailSkeleton() {
  return (
    <SkeletonShell label="Loading details">
      <Block className="h-3 w-40" />
      <SkeletonPageHeader withTabs withEyebrow={false} />
      <SkeletonDetailPanels delay={160} />
    </SkeletonShell>
  );
}

/** Catalogue / index pages that are mostly a list of rows. */
export function ListSkeleton() {
  return (
    <SkeletonShell label="Loading list">
      <SkeletonPageHeader />
      <SkeletonTable rows={10} delay={96} />
    </SkeletonShell>
  );
}

/**
 * Last-resort fallback: header + KPI + panel. Used only for routes with no
 * declared shape, so it should be rare — the resolver covers every registered
 * route family.
 */
export function GenericPageSkeleton() {
  return (
    <SkeletonShell label="Loading page">
      <SkeletonPageHeader />
      <SkeletonKpiRow count={4} />
      <SkeletonChartCard delay={200} height="h-52" />
    </SkeletonShell>
  );
}
