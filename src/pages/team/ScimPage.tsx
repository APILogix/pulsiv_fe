import { Server, KeyRound } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, CopyButton, Button, Table, Tr, Td, StatusBadge, Timestamp, demoSuccess, demoAction } from "@/shared/observe";

export default function ScimPage() {
  const syncLog = Array.from({ length: 8 }, (_, i) => ({
    id: i, action: ["user.created", "user.updated", "group.synced", "user.deactivated"][i % 4], status: i === 3 ? "failed" : "success", ts: Date.now() - i * 5400000,
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="SCIM"
        description="Provisioning tokens and SCIM surfaces."
        actions={<Button variant="primary" onClick={() => demoAction("Generate SCIM token")}><KeyRound className="size-4" /> New token</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Status" value="Active" icon={Server} trend="up" />
        <KpiCard label="Provisioned users" value="25" />
        <KpiCard label="Synced groups" value="6" />
        <KpiCard label="Last sync" value="2m ago" />
      </div>

      <SectionCard title="SCIM endpoint & token">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="w-28 text-[12px] text-[var(--text3)]">Base URL</span>
            <CopyButton value="https://api.pulse.io/scim/v2" label="https://api.pulse.io/scim/v2" />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 text-[12px] text-[var(--text3)]">Bearer token</span>
            <CopyButton value="scim_tok_abc123def456" label="scim_tok_••••••" />
            <Button variant="ghost" onClick={() => demoSuccess("Token rotated")}>Rotate</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Sync log" className="p-0">
        <Table headers={["Action", "Status", "Time"]}>
          {syncLog.map((s) => (
            <Tr key={s.id}><Td className="font-[family-name:var(--mono)] text-[12px]">{s.action}</Td><Td><StatusBadge status={s.status} /></Td><Td><Timestamp value={s.ts} /></Td></Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
