import { PageHeader, SectionCard, Button } from "@/shared/observe";
import { FolderGit2, Info, Plus } from "lucide-react";
import { toast } from "sonner";

interface OwnershipItem {
  id: string;
  serviceName: string;
  owningTeam: string;
  projectContext: string;
  backupContact: string;
}

const OWNERSHIPS: OwnershipItem[] = [
  { id: "1", serviceName: "auth-service", owningTeam: "Core Infrastructure", projectContext: "Identity Management", backupContact: "infra-oncall@company.com" },
  { id: "2", serviceName: "billing-worker", owningTeam: "Billing & Accounts", projectContext: "Revenue Systems", backupContact: "billing-ops@company.com" },
  { id: "3", serviceName: "ingestion-gateway", owningTeam: "Core Infrastructure", projectContext: "Telemetry Ingestion", backupContact: "infra-oncall@company.com" },
  { id: "4", serviceName: "query-api", owningTeam: "Product Engineering", projectContext: "Analytics Gateway", backupContact: "prod-eng-leads@company.com" },
  { id: "5", serviceName: "alerting-engine", owningTeam: "Product Engineering", projectContext: "Notification Dispatcher", backupContact: "prod-eng-leads@company.com" },
];

export default function TeamOwnershipPage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader 
        title="Team Ownership" 
        description="Establish explicit mapping rules that align monitored resources and service runtimes to engineering teams."
        actions={<Button variant="primary" onClick={() => toast.info("Ownership mapping flow coming soon")}><Plus className="size-4 mr-2" /> Map owner</Button>}
      />

      <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--brand)]/20 bg-[var(--brand-bg)] px-4 py-3 text-[13px] text-[var(--brand)]">
        <Info className="size-4 shrink-0" />
        Correct service ownership mapping routing resolves incident escalations to the proper on-call alert channels.
      </div>

      <div className="grid grid-cols-1 gap-4">
        {OWNERSHIPS.map((own) => (
          <SectionCard key={own.id} className="hover:border-[var(--brand)] transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-[var(--text2)]">
                  <FolderGit2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[var(--text)]">{own.serviceName}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text3)]">
                    <span>Project: {own.projectContext}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">Owner Team</div>
                  <div className="text-sm font-semibold text-[var(--brand)] mt-0.5">{own.owningTeam}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">Alert Destination</div>
                  <div className="text-sm font-medium text-[var(--text2)] mt-0.5">{own.backupContact}</div>
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
