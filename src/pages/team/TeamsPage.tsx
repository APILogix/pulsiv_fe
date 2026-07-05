import { PageHeader, SectionCard, Button } from "@/shared/observe";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface TeamItem {
  id: string;
  name: string;
  membersCount: number;
  servicesOwned: number;
  description: string;
}

const TEAMS: TeamItem[] = [
  { id: "1", name: "Core Infrastructure", membersCount: 4, servicesOwned: 2, description: "Responsible for ingestion pipelines, Kafka brokers, and database replication." },
  { id: "2", name: "Billing & Accounts", membersCount: 3, servicesOwned: 1, description: "Handles subscription lifecycle, invoice sync, and stripe webhook triggers." },
  { id: "3", name: "Product Engineering", membersCount: 8, servicesOwned: 2, description: "Builds and optimizes the frontend dashboard, query APIs, and alerting logic." },
];

export default function TeamsPage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader 
        title="Teams" 
        description="Organize members into functional teams to assign service ownership and configure on-call rotations."
        actions={<Button variant="primary" onClick={() => toast.info("Team creation flow coming soon")}><Plus className="size-4 mr-2" /> Create team</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TEAMS.map((team) => (
          <SectionCard key={team.id} className="flex flex-col justify-between min-h-[180px]">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-[var(--brand)]" />
                <h3 className="font-semibold text-[15px] text-[var(--text)]">{team.name}</h3>
              </div>
              <p className="text-xs text-[var(--text3)] mt-2 line-clamp-3">{team.description}</p>
            </div>

            <div className="flex items-center gap-4 mt-5 border-t border-[var(--border)] pt-3 text-xs text-[var(--text2)]">
              <span><strong>{team.membersCount}</strong> Members</span>
              <span className="text-[var(--border)]">|</span>
              <span><strong>{team.servicesOwned}</strong> Services Owned</span>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
