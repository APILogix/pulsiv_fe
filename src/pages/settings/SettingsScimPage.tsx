import { Server } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, CopyButton, Button, demoSuccess } from "@/shared/observe";

export default function SettingsScimPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="SCIM Provisioning" description="Automated user provisioning via SCIM 2.0." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Status" value="Active" icon={Server} trend="up" />
        <KpiCard label="Provisioned" value="25" />
        <KpiCard label="Groups" value="6" />
        <KpiCard label="Last sync" value="2m ago" />
      </div>

      <SectionCard title="Endpoint & token">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3"><span className="w-28 text-[12px] text-[var(--text3)]">Base URL</span><CopyButton value="https://api.pulse.io/scim/v2" label="https://api.pulse.io/scim/v2" /></div>
          <div className="flex items-center gap-3"><span className="w-28 text-[12px] text-[var(--text3)]">Bearer token</span><CopyButton value="scim_tok_abc123" label="scim_tok_••••••" /><Button variant="ghost" onClick={() => demoSuccess("Token rotated")}>Rotate</Button></div>
        </div>
      </SectionCard>
    </div>
  );
}
