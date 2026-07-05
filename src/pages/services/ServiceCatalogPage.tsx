import { PageHeader, SectionCard, StatusBadge, Button, formatNumber } from "@/shared/observe";
import { FolderGit2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ServiceItem {
  id: string;
  name: string;
  language: string;
  rps: number;
  errorRate: number;
  latencyMs: number;
  status: "healthy" | "degraded" | "critical";
  lastDeploys: string;
}

const SERVICES: ServiceItem[] = [
  { id: "1", name: "auth-service", language: "Go", rps: 1450, errorRate: 0.02, latencyMs: 12, status: "healthy", lastDeploys: "10m ago" },
  { id: "2", name: "billing-worker", language: "TypeScript", rps: 120, errorRate: 1.4, latencyMs: 150, status: "healthy", lastDeploys: "1h ago" },
  { id: "3", name: "ingestion-gateway", language: "Rust", rps: 18500, errorRate: 0.001, latencyMs: 2, status: "healthy", lastDeploys: "2d ago" },
  { id: "4", name: "query-api", language: "Go", rps: 450, errorRate: 4.8, latencyMs: 240, status: "degraded", lastDeploys: "3h ago" },
  { id: "5", name: "alerting-engine", language: "TypeScript", rps: 80, errorRate: 12.5, latencyMs: 85, status: "critical", lastDeploys: "5m ago" },
];

export default function ServiceCatalogPage() {
  const [query, setQuery] = useState("");
  const filtered = SERVICES.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader 
        title="Service Catalog" 
        description="Unified registry of all monitored services, runtime technologies, and health indicators."
        actions={<Button variant="primary" onClick={() => toast.info("Service registration flow coming soon")}><Plus className="size-4 mr-2" /> Register service</Button>}
      />

      <div className="flex items-center gap-3 bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] px-3 py-2 max-w-md">
        <Search className="size-4 text-[var(--text3)]" />
        <input 
          type="text" 
          placeholder="Filter services..." 
          className="bg-transparent border-none outline-none text-sm text-[var(--text)] w-full placeholder:text-[var(--text3)]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(service => (
          <SectionCard key={service.id} className="hover:border-[var(--brand)] transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-[var(--text2)]">
                  <FolderGit2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text)] text-[15px]">{service.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text3)]">
                    <span className="rounded bg-[var(--bg3)] px-1.5 py-0.5 font-medium">{service.language}</span>
                    <span>•</span>
                    <span>Deployed {service.lastDeploys}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">Throughput</div>
                  <div className="text-sm font-semibold text-[var(--text)] mt-0.5">{formatNumber(service.rps)} rps</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">P95 Latency</div>
                  <div className="text-sm font-semibold text-[var(--text)] mt-0.5">{service.latencyMs} ms</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">Error Rate</div>
                  <div className={`text-sm font-semibold mt-0.5 ${service.errorRate > 4 ? "text-[var(--red)]" : "text-[var(--text)]"}`}>{service.errorRate}%</div>
                </div>
                <div>
                  <StatusBadge status={service.status === "healthy" ? "active" : service.status === "degraded" ? "warning" : "suspended"} />
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
