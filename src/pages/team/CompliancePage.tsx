import { CalendarClock, ClipboardCheck, Download, FileCheck2, ShieldCheck } from "lucide-react";

import { useCompliance } from "@/hooks/useDummyData";
import type { Compliance } from "@/lib/dummy-data";
import {
  HeroFacts,
  KeyValueGrid,
  Meter,
  PageHero,
  Panel,
  Pill,
  Ring,
  SectionHeading,
  type HeroFact,
  type KeyValueItem,
} from "@/shared/ui/pulse";
import { Button, StatusBadge, Table, Td, Timestamp, Tr, demoSuccess } from "@/shared/observe";

const AUDIT_HEADERS = ["Framework", "State", "Controls", "Coverage", "Last audit", "Next audit"];

function coverage(framework: Compliance) {
  if (framework.controlsTotal === 0) return 0;
  return Math.round((framework.controlsPassing / framework.controlsTotal) * 100);
}

function frameworkFacts(framework: Compliance): KeyValueItem[] {
  return [
    { label: "Controls passing", value: `${framework.controlsPassing} of ${framework.controlsTotal}` },
    { label: "Coverage", value: `${coverage(framework)}%` },
    { label: "Last audit", value: <Timestamp value={framework.lastAuditAt} /> },
    { label: "Next audit", value: <Timestamp value={framework.nextAuditAt} /> },
  ];
}

function statePill(status: string) {
  if (status === "compliant") return <Pill tone="green" dot>Compliant</Pill>;
  if (status === "in-progress") return <Pill tone="amber" dot>In progress</Pill>;
  return <Pill tone="neutral" dot>Not started</Pill>;
}

export default function CompliancePage() {
  const { data } = useCompliance();
  const frameworks = data ?? [];

  const compliant = frameworks.filter((framework) => framework.status === "compliant").length;
  const controlsTotal = frameworks.reduce((sum, framework) => sum + framework.controlsTotal, 0);
  const controlsPassing = frameworks.reduce((sum, framework) => sum + framework.controlsPassing, 0);
  const overall = controlsTotal === 0 ? 0 : Math.round((controlsPassing / controlsTotal) * 100);
  const nextAudit = frameworks.length
    ? frameworks.reduce((soonest, framework) => (framework.nextAuditAt < soonest ? framework.nextAuditAt : soonest), frameworks[0].nextAuditAt)
    : null;

  const facts: HeroFact[] = [
    { label: "Frameworks tracked", value: frameworks.length, icon: FileCheck2 },
    { label: "Compliant", value: compliant, tone: compliant > 0 ? "green" : "neutral", icon: ShieldCheck },
    { label: "Controls passing", value: `${controlsPassing}/${controlsTotal}`, icon: ClipboardCheck },
    {
      label: "Next audit",
      value: nextAudit ? <Timestamp value={nextAudit} /> : "—",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Governance"
        title="Compliance"
        description="Framework coverage, control health, and audit schedule for this organization."
        icon={ShieldCheck}
        actions={
          <Button variant="secondary" onClick={() => demoSuccess("Compliance report generated")}>
            <Download className="size-4" aria-hidden="true" />
            Download report
          </Button>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <Panel
        title="Control coverage"
        description="Share of all tracked controls currently passing across every framework."
        icon={ClipboardCheck}
        tone="brand"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Ring value={overall} label={`${overall}%`} sublabel="Passing" size={112} tone={overall >= 90 ? "green" : overall >= 70 ? "amber" : "red"} />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {frameworks.map((framework) => (
              <Meter
                key={framework.id}
                label={framework.framework}
                used={framework.controlsPassing}
                limit={framework.controlsTotal}
                tone={framework.status === "compliant" ? "green" : "amber"}
                hint={`${coverage(framework)}% of controls passing`}
              />
            ))}
          </div>
        </div>
      </Panel>

      <SectionHeading title="Frameworks" description="Each framework tracks its own control set and audit cadence." />

      <div className="grid gap-4 lg:grid-cols-2">
        {frameworks.map((framework) => (
          <Panel
            key={framework.id}
            title={framework.framework}
            icon={FileCheck2}
            tone={framework.status === "compliant" ? "green" : framework.status === "in-progress" ? "amber" : "neutral"}
            actions={statePill(framework.status)}
          >
            <KeyValueGrid items={frameworkFacts(framework)} columns={2} />
          </Panel>
        ))}
      </div>

      <Panel title="Controls and audits" description="Full framework register with audit history." icon={CalendarClock} tone="blue" bodyClassName="p-0">
        <Table headers={AUDIT_HEADERS} maxHeight="30rem">
          {frameworks.map((framework) => (
            <Tr key={framework.id}>
              <Td className="font-medium">{framework.framework}</Td>
              <Td><StatusBadge status={framework.status} /></Td>
              <Td className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                {framework.controlsPassing}/{framework.controlsTotal}
              </Td>
              <Td className="tabular-nums">{coverage(framework)}%</Td>
              <Td><Timestamp value={framework.lastAuditAt} /></Td>
              <Td><Timestamp value={framework.nextAuditAt} /></Td>
            </Tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
