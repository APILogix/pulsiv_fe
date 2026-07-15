import { PageHeader, SectionCard, StatusBadge } from "@/shared/observe";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/observe";

interface SloItem {
  id: string;
  name: string;
  target: string;
  current: string;
  metric: string;
  status: "active" | "warning" | "error";
  service: string;
}

const SLOS: SloItem[] = [
  { id: "1", name: "Auth Service Latency p95", target: "< 100ms", current: "12ms", metric: "HTTP latency", status: "active", service: "auth-service" },
  { id: "2", name: "Billing Processing Success", target: "99.9%", current: "99.82%", metric: "Worker transaction rate", status: "warning", service: "billing-worker" },
  { id: "3", name: "API Gateway Availability", target: "99.99%", current: "99.995%", metric: "Status 2xx/3xx", status: "active", service: "ingestion-gateway" },
  { id: "4", name: "Alert Delivery Success", target: "99.5%", current: "87.5%", metric: "Dispatch dispatch logs", status: "error", service: "alerting-engine" },
];

export default function ServiceSlosPage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader 
        title="Service Level Objectives" 
        description="Establish and monitor performance budgets, SLA compliance targets, and alert warnings."
        actions={<Button variant="primary" onClick={() => toast.info("SLO creation flow coming soon")}><Plus className="size-4 mr-2" /> Define SLO</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SLOS.map((slo) => (
          <SectionCard key={slo.id} className="flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold font-mono uppercase text-[var(--text3)]">{slo.service}</span>
                <StatusBadge status={slo.status === "active" ? "active" : slo.status === "warning" ? "warning" : "suspended"} />
              </div>
              <h3 className="font-semibold text-[15px] text-[var(--text)] mt-2">{slo.name}</h3>
              <p className="text-xs text-[var(--text3)] mt-1">Measured via: {slo.metric}</p>
            </div>

            <div className="flex items-end justify-between border-t border-[var(--border)] pt-3 mt-4">
              <div>
                <div className="text-[10px] uppercase text-[var(--text3)] tracking-wider">Target</div>
                <div className="text-sm font-medium text-[var(--text2)] mt-0.5">{slo.target}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-[var(--text3)] tracking-wider">Current Period</div>
                <div className={`text-base font-bold mt-0.5 ${slo.status === "error" ? "text-[var(--red)]" : slo.status === "warning" ? "text-[var(--amber)]" : "text-[var(--green)]"}`}>
                  {slo.current}
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
