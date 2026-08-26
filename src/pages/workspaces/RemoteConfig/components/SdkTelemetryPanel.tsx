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
    <SectionCard
      title="SDK Telemetry & Sync Network"
      description={`Real-time connectivity, active versions, and configuration refresh health across all SDK instances bound to ${environmentName}.`}
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Top Metric Strip */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text3)]">
              <span>Connected SDKs</span>
              <Wifi className="size-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[var(--text)]">1,420</div>
            <div className="mt-1 text-[11px] text-emerald-400 font-semibold">99.8% Online</div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text3)]">
              <span>Sync Success Rate</span>
              <CheckCircle2 className="size-4 text-sky-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[var(--text)]">99.99%</div>
            <div className="mt-1 text-[11px] text-[var(--text3)]">0 Config Fetch Failures</div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text3)]">
              <span>Config TTL Refresh</span>
              <RefreshCw className="size-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[var(--text)]">300s</div>
            <div className="mt-1 text-[11px] text-indigo-400 font-semibold">Stale-While-Revalidate</div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text3)]">
              <span>Pending Rollouts</span>
              <Activity className="size-4 text-amber-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[var(--text)]">0</div>
            <div className="mt-1 text-[11px] text-emerald-400 font-semibold">Fully Synchronized</div>
          </div>
        </div>

        {/* Platform Details Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg2)]/40">
          <table className="w-full text-left text-xs text-[var(--text2)]">
            <thead className="border-b border-[var(--border)] bg-[var(--bg2)] text-[10px] uppercase font-bold text-[var(--text3)]">
              <tr>
                <th className="p-3">SDK Platform</th>
                <th className="p-3">Active SDK Instances</th>
                <th className="p-3">Adopted Version</th>
                <th className="p-3">Config Refresh Health</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/60">
              {platforms.map((plat, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg1)] transition-colors">
                  <td className="p-3 font-semibold text-[var(--text)]">{plat.name}</td>
                  <td className="p-3 font-mono font-bold text-[var(--brand)]">{plat.connected} instances</td>
                  <td className="p-3 font-mono text-[11px] text-[var(--text2)]">{plat.version}</td>
                  <td className="p-3 font-semibold text-emerald-400">{plat.health}</td>
                  <td className="p-3 text-right">
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
