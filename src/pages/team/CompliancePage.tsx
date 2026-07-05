import { useCompliance } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, StatusBadge, Table, Tr, Td, Button, Timestamp, demoSuccess } from "@/shared/observe";

export default function CompliancePage() {
  const { data } = useCompliance();
  const frameworks = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Compliance"
        description="Enterprise compliance frameworks, controls, and reports."
        actions={<Button variant="secondary" onClick={() => demoSuccess("Compliance report generated")}>Download report</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {frameworks.map((f) => {
          const pct = Math.round((f.controlsPassing / f.controlsTotal) * 100);
          return (
            <div key={f.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text)]">{f.framework}</span>
                <StatusBadge status={f.status} />
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold tabular-nums text-[var(--text)]">{pct}%</div>
                  <div className="text-[12px] text-[var(--text3)]">{f.controlsPassing}/{f.controlsTotal} controls</div>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg3)]"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <SectionCard title="Controls & audits" className="p-0">
        <Table headers={["Framework", "Status", "Controls", "Last audit", "Next audit"]}>
          {frameworks.map((f) => (
            <Tr key={f.id}>
              <Td className="font-medium">{f.framework}</Td>
              <Td><StatusBadge status={f.status} /></Td>
              <Td className="tabular-nums">{f.controlsPassing}/{f.controlsTotal}</Td>
              <Td><Timestamp value={f.lastAuditAt} /></Td>
              <Td><Timestamp value={f.nextAuditAt} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
