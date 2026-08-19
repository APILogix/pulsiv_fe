import { CheckCircle2, Wifi, Activity, RefreshCw } from "lucide-react";
import { SectionCard, StatusBadge } from "@/shared/observe";

interface SdkTelemetryPanelProps {
  environmentName: string;
}

export function SdkTelemetryPanel({ environmentName }: SdkTelemetryPanelProps) {
  const platforms = [
    { name: "Web Browser (JS/TS SDK)", connected: 840, version: "v2.4.2", health: "100%", status: "online" },
    { name: "Node.js Ingestion Service", connected: 380, version: "v2.4.1", health: "99.9%", status: "online" },
    { name: "Python FastAPI Backends", connected: 140, version: "v2.3.9", health: "100%", status: "online" },
    { name: "iOS Native App", connected: 45, version: "v2.2.0", health: "98.5%", status: "lagging" },
    { name: "Android App", connected: 15, version: "v2.1.8", health: "97.0%", status: "lagging" },
  ];

  return (
    <SectionCard title="SDK Telemetry & Sync Network">
      <p className="text-[12px] text-[var(--text-secondary)] mb-4">
        Real-time connectivity, active versions, and configuration refresh health across all SDK instances bound to {environmentName}.
      </p>
      <div className="flex flex-col gap-4">
        {/* Top Metric Strip */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              <span>Connected SDKs</span>
              <Wifi className="size-3.5 text-[var(--success)]" />
            </div>
            <div className="mt-1.5 font-mono text-[20px] font-medium tabular-nums text-[var(--text-primary)]">1,420</div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--success)]">99.8% Online</div>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              <span>Sync Success Rate</span>
              <CheckCircle2 className="size-3.5 text-[var(--info)]" />
            </div>
            <div className="mt-1.5 font-mono text-[20px] font-medium tabular-nums text-[var(--text-primary)]">99.99%</div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">0 Config Fetch Failures</div>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              <span>Config TTL Refresh</span>
              <RefreshCw className="size-3.5 text-[var(--brand)]" />
            </div>
            <div className="mt-1.5 font-mono text-[20px] font-medium tabular-nums text-[var(--text-primary)]">300s</div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--brand)]">Stale-While-Revalidate</div>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              <span>Pending Rollouts</span>
              <Activity className="size-3.5 text-[var(--warning)]" />
            </div>
            <div className="mt-1.5 font-mono text-[20px] font-medium tabular-nums text-[var(--text-primary)]">0</div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--success)]">Fully Synchronized</div>
          </div>
        </div>

        {/* Platform Details Table */}
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <table className="w-full text-left text-[12px] text-[var(--text-secondary)]">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-[10px] uppercase font-mono tracking-wider text-[var(--text-tertiary)]">
              <tr>
                <th className="px-3.5 py-2.5">SDK Platform</th>
                <th className="px-3.5 py-2.5">Active SDK Instances</th>
                <th className="px-3.5 py-2.5">Adopted Version</th>
                <th className="px-3.5 py-2.5">Config Refresh Health</th>
                <th className="px-3.5 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {platforms.map((plat, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-3.5 py-2.5 font-medium text-[var(--text-primary)]">{plat.name}</td>
                  <td className="px-3.5 py-2.5 font-mono font-medium text-[var(--brand)]">{plat.connected} instances</td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--text-secondary)]">{plat.version}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[var(--success)]">{plat.health}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    <StatusBadge status={plat.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

