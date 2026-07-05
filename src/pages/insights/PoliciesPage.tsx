import { useAuditLogs } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, Tabs, Table, Tr, Td, StatusBadge, Timestamp, Button, demoAction } from "@/shared/observe";

const TEMPLATES = [
  { name: "Incident summary", desc: "Summarize an incident for stakeholders." },
  { name: "RCA generator", desc: "Generate a root cause analysis draft." },
  { name: "Alert triage", desc: "Classify and prioritize incoming alerts." },
  { name: "Release notes", desc: "Draft release notes from commit history." },
];
const RULES = [
  { rule: "Block PII in prompts", status: "active" },
  { rule: "Require approval for prod actions", status: "active" },
  { rule: "Redact secrets in outputs", status: "active" },
  { rule: "Max token budget per request", status: "active" },
];

export default function PoliciesPage() {
  const { data: audit } = useAuditLogs();
  const logs = (audit ?? []).slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Prompt & Policy Controls"
        description="Prompt governance and approval controls."
        actions={<Button variant="primary" onClick={() => demoAction("New prompt template")}>New template</Button>}
      />

      <Tabs
        tabs={[
          {
            id: "templates",
            label: "Prompt templates",
            content: (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TEMPLATES.map((t) => (
                  <div key={t.name} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
                    <div className="font-medium text-[var(--text)]">{t.name}</div>
                    <p className="mt-1 text-[13px] text-[var(--text2)]">{t.desc}</p>
                    <div className="mt-3"><Button variant="ghost" onClick={() => demoAction(`Edit ${t.name}`)}>Edit template</Button></div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            id: "rules",
            label: "Policy rules",
            content: (
              <SectionCard className="p-0">
                <Table headers={["Rule", "Status"]}>
                  {RULES.map((r) => (<Tr key={r.rule}><Td>{r.rule}</Td><Td><StatusBadge status={r.status} /></Td></Tr>))}
                </Table>
              </SectionCard>
            ),
          },
          {
            id: "audit",
            label: "Audit log",
            content: (
              <SectionCard className="p-0">
                <Table headers={["Actor", "Action", "Resource", "Time"]}>
                  {logs.map((l) => (
                    <Tr key={l.id}>
                      <Td>{l.actor}</Td>
                      <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{l.action}</Td>
                      <Td className="text-[var(--text2)]">{l.resourceName}</Td>
                      <Td><Timestamp value={l.timestamp} /></Td>
                    </Tr>
                  ))}
                </Table>
              </SectionCard>
            ),
          },
        ]}
      />
    </div>
  );
}
