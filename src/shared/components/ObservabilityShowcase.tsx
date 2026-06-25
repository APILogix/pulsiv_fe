/**
 * ObservabilityShowcase — Left-panel monitoring preview for the auth layout.
 *
 * Displays realistic observability widgets: API health, error rate,
 * P95 latency, throughput, service status, and a trace waterfall.
 * All data is static/decorative — it communicates product value instantly.
 */

export function ObservabilityShowcase() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md">

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="API health" value="99.99%" status="healthy" />
        <StatCard label="Error rate" value="0.02%" status="healthy" />
        <StatCard label="P95 latency" value="128ms" status="healthy" />
        <StatCard label="Throughput" value="2.4M/day" status="healthy" />
      </div>

      {/* Service status strip */}
      <div className="rounded-lg border border-[#262626] bg-[#111111]/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#555555]">Service status</span>
          <span className="flex items-center gap-1.5 text-xs text-[#34d399] font-medium">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34d399] pulse-dot" />
            All systems operational
          </span>
        </div>
        <div className="space-y-2">
          <ServiceRow name="API gateway" latency="12ms" status="healthy" />
          <ServiceRow name="Auth service" latency="8ms" status="healthy" />
          <ServiceRow name="User service" latency="23ms" status="healthy" />
          <ServiceRow name="Database" latency="4ms" status="healthy" />
        </div>
      </div>

      {/* Trace preview */}
      <div className="rounded-lg border border-[#262626] bg-[#111111]/80 p-4 space-y-3">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#555555]">Trace preview</span>
        <div className="space-y-1.5">
          <TraceSpan name="GET /api/orders" service="Gateway" duration="142ms" width="100%" color="#818cf8" depth={0} />
          <TraceSpan name="authenticate" service="Auth" duration="8ms" width="5.6%" color="#34d399" depth={1} />
          <TraceSpan name="getUser" service="User" duration="23ms" width="16.2%" color="#34d399" depth={2} />
          <TraceSpan name="SELECT orders" service="Database" duration="96ms" width="67.6%" color="#f59e0b" depth={2} />
          <TraceSpan name="serialize" service="Gateway" duration="4ms" width="2.8%" color="#818cf8" depth={1} />
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({ label, value, status }: { label: string; value: string; status: 'healthy' | 'warning' | 'error' }) {
  const dotColor = status === 'healthy' ? '#34d399' : status === 'warning' ? '#f59e0b' : '#ef4444';
  return (
    <div className="rounded-lg border border-[#262626] bg-[#111111]/80 p-3.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full pulse-dot" style={{ backgroundColor: dotColor }} />
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#555555]">{label}</span>
      </div>
      <p className="font-mono text-xl font-medium text-[#e8e8e8] tracking-tight">{value}</p>
    </div>
  );
}

function ServiceRow({ name, latency, status }: { name: string; latency: string; status: 'healthy' | 'warning' | 'error' }) {
  const dotColor = status === 'healthy' ? '#34d399' : status === 'warning' ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center justify-between text-xs py-1 border-t border-[#262626]/50 first:border-0">
      <div className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-[#e8e8e8]">{name}</span>
      </div>
      <span className="font-mono text-[#999999]">{latency}</span>
    </div>
  );
}

function TraceSpan({ name, service, duration, width, color, depth }: {
  name: string; service: string; duration: string; width: string; color: string; depth: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]" style={{ paddingLeft: depth * 16 }} title={name}>
      <span className="text-[#999999] min-w-[52px] font-mono text-[10px]">{service}</span>
      <div className="flex-1 h-4 bg-[#1e1e1e] rounded overflow-hidden relative">
        <div
          className="h-full rounded"
          style={{ width, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="font-mono text-[#999999] min-w-[40px] text-right">{duration}</span>
    </div>
  );
}
