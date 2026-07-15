import { PageHeader, SectionCard, Button, Timestamp } from "@/shared/observe";
import { Mail, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

interface ReportItem {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  lastSent: number;
}

const REPORTS: ReportItem[] = [
  { id: "1", name: "Weekly Executive Performance", frequency: "weekly", recipients: ["ceo@company.com", "cto@company.com"], lastSent: new Date("2026-06-30").getTime() },
  { id: "2", name: "Daily Operations Health", frequency: "daily", recipients: ["infra-leads@company.com"], lastSent: new Date("2026-07-04").getTime() },
];

export default function ScheduledReportsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader 
        title="Scheduled Reports" 
        description="Deliver weekly or daily executive status reports and performance digests directly to email distribution lists."
        actions={<Button variant="primary" onClick={() => navigate("/dashboards/reports/new")}><Plus className="size-4 mr-2" /> New report</Button>}
      />

      <div className="grid grid-cols-1 gap-4">
        {REPORTS.map((report) => (
          <SectionCard key={report.id} className="hover:border-[var(--brand)] transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-[var(--text2)]">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[var(--text)]">{report.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text3)]">
                    <span className="capitalize font-medium text-[var(--brand)]">{report.frequency} digest</span>
                    <span>•</span>
                    <span>Recipients: {report.recipients.join(", ")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-right">
                  <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">Last Sent</div>
                  <div className="text-sm text-[var(--text2)] mt-0.5"><Timestamp value={report.lastSent} /></div>
                </div>
                <Button variant="secondary" onClick={() => toast.success("Draft report email dispatched!")}><Send className="size-3.5 mr-1.5" /> Send now</Button>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
