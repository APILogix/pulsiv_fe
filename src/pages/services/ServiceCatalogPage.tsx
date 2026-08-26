import { useState } from "react";
import { useNavigate } from "react-router";
import { FolderGit2, Search, ArrowUpRight } from "lucide-react";
import { PageHeader, SectionCard, StatusBadge, formatNumber } from "@/shared/observe";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedEmptyState } from "@/shared/motion";
import { Button } from "@/components/ui/button";
import { useServicesAnalytics } from "@/modules/analytics";

export default function ServiceCatalogPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: servicesRes, isLoading } = useServicesAnalytics();

  const servicesList = servicesRes?.data?.table?.rows ?? [];
  const filtered = servicesList.filter((s) => s.service.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-[1400px] w-full">
      <PageHeader
        title="Service Catalog"
        description="Unified registry of all monitored services, runtime technologies, and health indicators."
      />

      <div className="flex items-center gap-3 bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] px-3 py-2 max-w-[600px] w-full">
        <Search className="size-4 text-[var(--text3)] shrink-0" />
        <input
          type="text"
          placeholder="Filter services by name..."
          className="bg-transparent border-none outline-none text-sm text-[var(--text)] w-full placeholder:text-[var(--text3)]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg shrink-0" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>

              <div className="flex items-center gap-8 flex-wrap">
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        query ? (
          <AnimatedEmptyState
            illustration="search"
            title="No matching services"
            description={`No registered services match "${query}". Try adjusting your search query or clear the filter.`}
            action={
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear filter
              </Button>
            }
          />
        ) : (
          <AnimatedEmptyState
            illustration="folder"
            title="No services discovered yet"
            description="Monitored microservices, background workers, and API gateways will automatically register here once telemetry is ingested."
            action={
              <Button variant="default" size="sm" onClick={() => navigate("/admin/sdk-config")}>
                Install Telemetry SDK
              </Button>
            }
            secondaryAction={
              <Button variant="outline" size="sm" onClick={() => navigate("/ingestion/endpoints")}>
                View Ingestion Endpoints
              </Button>
            }
            hint="Services instrumented with the Pulsiv OpenTelemetry exporter will automatically appear above."
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((service) => {
            const availability = service.availabilityPct ?? 100;
            const status = availability >= 99 ? "active" : availability >= 95 ? "warning" : "suspended";
            const errRate = service.errorRatePct ?? 0;

            return (
              <div
                key={service.service}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--brand)] transition-colors cursor-pointer group p-5"
                onClick={() => navigate(`/dashboards/performance?service=${encodeURIComponent(service.service)}`)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-[var(--text2)] group-hover:text-[var(--brand)] group-hover:bg-[var(--brand-bg)] transition-colors">
                      <FolderGit2 className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text)] text-[15px] group-hover:text-[var(--brand)] transition-colors">
                          {service.service}
                        </h3>
                        <ArrowUpRight className="size-3.5 text-[var(--text3)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text3)]">
                        <span className="rounded bg-[var(--bg3)] px-1.5 py-0.5 font-medium">Service</span>
                        <span>•</span>
                        <span>Apdex {service.apdex ? service.apdex.toFixed(2) : "1.00"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 flex-wrap">
                    <div className="text-right">
                      <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">Requests</div>
                      <div className="text-sm font-semibold text-[var(--text)] mt-0.5">{formatNumber(service.requests)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">P95 Latency</div>
                      <div className="text-sm font-semibold text-[var(--text)] mt-0.5">
                        {service.p95Ms ? `${Math.round(service.p95Ms)} ms` : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[var(--text3)] uppercase tracking-wider font-medium">Error Rate</div>
                      <div className={`text-sm font-semibold mt-0.5 ${errRate > 4 ? "text-[var(--red)]" : "text-[var(--text)]"}`}>
                        {errRate.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

