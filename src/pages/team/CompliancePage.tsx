import { Button as UiButton } from "@/components/ui/button";
import { useCompliance } from "@/hooks/useDummyData";
import type { Compliance } from "@/lib/dummy-data";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetRow,
  SheetTable,
  WorkspacePage,
  type Readout,
  type ReadoutTone,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Timestamp, demoSuccess, formatDate, formatRelativeTime } from "@/shared/observe";
import { Notice, Pill, type SurfaceTone } from "@/shared/ui/pulse";

// ── Helpers ──────────────────────────────────────────────────

const STATE_LABEL: Record<string, string> = {
  compliant: "Compliant",
  "in-progress": "In progress",
  "not-started": "Not started",
};

const STATE_TONE: Record<string, SurfaceTone> = {
  compliant: "green",
  "in-progress": "amber",
  "not-started": "neutral",
};

function coverage(framework: Compliance) {
  if (framework.controlsTotal === 0) return 0;
  return Math.round((framework.controlsPassing / framework.controlsTotal) * 100);
}

function coverageTone(percent: number): ReadoutTone {
  if (percent >= 90) return "good";
  if (percent >= 70) return "warn";
  return "bad";
}

function StatePill({ status }: { status: string }) {
  return (
    <Pill tone={STATE_TONE[status] ?? "neutral"} dot={status === "compliant" || status === "in-progress"}>
      {STATE_LABEL[status] ?? status}
    </Pill>
  );
}

const FRAMEWORK_COLUMNS: SheetColumn[] = [
  { key: "framework", header: "Framework" },
  { key: "state", header: "State", className: "w-[130px]" },
  { key: "controls", header: "Controls", className: `w-[110px] ${HIDE_BELOW_SM}`, align: "right" },
  { key: "coverage", header: "Coverage", className: "w-[96px]", align: "right" },
  { key: "last", header: "Last audit", className: `w-[130px] ${HIDE_BELOW_MD}` },
  { key: "next", header: "Next audit", className: `w-[130px] ${HIDE_BELOW_MD}` },
];

// ── Page ─────────────────────────────────────────────────────

export default function CompliancePage() {
  const { data } = useCompliance();
  const frameworks = data;

  const compliant = frameworks.filter((framework) => framework.status === "compliant").length;
  const inProgress = frameworks.filter((framework) => framework.status === "in-progress").length;
  const controlsTotal = frameworks.reduce((sum, framework) => sum + framework.controlsTotal, 0);
  const controlsPassing = frameworks.reduce((sum, framework) => sum + framework.controlsPassing, 0);
  const overall = controlsTotal === 0 ? 0 : Math.round((controlsPassing / controlsTotal) * 100);
  const nextFramework = frameworks.length
    ? frameworks.reduce((soonest, framework) => (framework.nextAuditAt < soonest.nextAuditAt ? framework : soonest))
    : null;

  const readouts: Readout[] = [
    {
      label: "Frameworks tracked",
      value: frameworks.length,
      sub: inProgress > 0 ? `${inProgress} in progress` : "Each with its own control set",
    },
    {
      label: "Compliant",
      value: `${compliant}/${frameworks.length}`,
      sub: compliant === frameworks.length ? "Every framework" : `${frameworks.length - compliant} not yet compliant`,
      tone: frameworks.length > 0 && compliant === frameworks.length ? "good" : "neutral",
    },
    {
      label: "Controls passing",
      value: `${controlsPassing}/${controlsTotal}`,
      sub: `${overall}% across every framework`,
      tone: controlsTotal > 0 ? coverageTone(overall) : "neutral",
    },
    {
      label: "Next audit",
      value: nextFramework ? formatDate(nextFramework.nextAuditAt) : "—",
      sub: nextFramework
        ? `${nextFramework.framework}, ${formatRelativeTime(nextFramework.nextAuditAt)}`
        : "No audit scheduled",
    },
  ];

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Compliance"
        badges={<Pill tone="neutral">Demo data</Pill>}
        description="Framework coverage, control health, and audit schedule for this organization."
        actions={
          <UiButton variant="outline" size="lg" onClick={() => demoSuccess("Compliance report generated")}>
            Download report
          </UiButton>
        }
      />

      <Notice tone="neutral">
        These records are sample data until the compliance API is connected.
      </Notice>

      <Readouts cells={readouts} label="Compliance summary" />

      <Sheet
        title="Frameworks"
        description="Each framework tracks its own control set and audit cadence."
        footer={
          <span>
            {compliant} of {frameworks.length} frameworks compliant, {controlsPassing} of {controlsTotal} controls passing
          </span>
        }
      >
        {frameworks.length === 0 ? (
          <SheetEmpty
            title="No frameworks tracked"
            description="Frameworks such as SOC 2 or GDPR appear here with their control coverage once the compliance API is connected."
          />
        ) : (
          <SheetTable columns={FRAMEWORK_COLUMNS} caption="Compliance frameworks, control coverage, and audit dates" minWidth={440}>
            {frameworks.map((framework) => (
              <SheetRow key={framework.id}>
                <SheetCell>
                  <RowTitle
                    title={framework.framework}
                    subtitle={`${framework.controlsPassing} of ${framework.controlsTotal} controls passing`}
                  />
                </SheetCell>
                <SheetCell>
                  <StatePill status={framework.status} />
                </SheetCell>
                <SheetCell align="right" className={HIDE_BELOW_SM}>
                  <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                    {framework.controlsPassing}/{framework.controlsTotal}
                  </span>
                </SheetCell>
                <SheetCell align="right">
                  <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                    {coverage(framework)}%
                  </span>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  <Timestamp value={framework.lastAuditAt} />
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  <Timestamp value={framework.nextAuditAt} />
                </SheetCell>
              </SheetRow>
            ))}
          </SheetTable>
        )}
      </Sheet>
    </WorkspacePage>
  );
}
