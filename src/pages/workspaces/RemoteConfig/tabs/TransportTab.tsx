import { SectionBanner, FieldTooltip, MicroCopy } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';

const inputClass = "w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50";

interface TransportTabProps {
  transport: SdkConfigState['transport'];
  onChange: (key: keyof SdkConfigState['transport'], value: any) => void;
  onRouteUpdate: (routeId: string, field: string, value: any) => void;
}

export function TransportTab({ transport, onChange, onRouteUpdate }: TransportTabProps) {
  const getBadgeClass = (priority: number) => {
    if (priority === 1) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (priority === 2) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (priority === 3) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    return 'bg-[var(--bg3)] text-[var(--text2)] border-[var(--border)]';
  };

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Transport & Ingestion"
        type="info"
        definition="The transport layer manages how buffered telemetry is shipped to the Pulse ingestion servers. It controls batching, timeouts, and connection pooling. Improper settings here can lead to dropped data (if queues fill up) or high memory usage (if batches are too large)."
      >
        Configure how the SDK batches and ships data to Pulse. Priority 1 (Errors) routes are always processed before lower priority routes when the network is constrained.
      </SectionBanner>

      <div className="mb-6 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text)]">Route Configuration</h3>
        </div>
        <div className="overflow-x-auto p-0">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Priority <FieldTooltip definition="Determines the order in which routes are flushed when the queue is under pressure. P1 (errors) is always flushed first. P9 (replays) is flushed last. You cannot change priority." />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">Route Name</th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Batch Size <FieldTooltip definition="How many events of this type are collected before being sent in a single HTTP request. Larger = fewer network calls but more memory and longer delay." recommendation="Recommended: 50–200." />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Flush Interval (ms) <FieldTooltip definition="Maximum time (in milliseconds) the SDK waits before sending a batch, even if the batch isn't full. Lower = fresher data but more network calls." recommendation="Recommended: 3000–10000." />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Timeout (ms) <FieldTooltip definition="How long the SDK waits for the ingestion server to respond before aborting the request." recommendation="Recommended: 5000–15000." />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Compression <FieldTooltip definition="The compression algorithm applied to the payload before sending. Currently fixed to gzip. Not editable." />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {transport.routes.map((route) => (
                <tr key={route.id} className="hover:bg-[var(--bg2)]/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getBadgeClass(route.priority)}`}>
                      P{route.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-[var(--text)]">{route.name}</td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      value={route.batchSize}
                      onChange={(e) => onRouteUpdate(route.id, 'batchSize', Number(e.target.value))}
                      className={`${inputClass} w-24 text-right`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      value={route.flushInterval}
                      onChange={(e) => onRouteUpdate(route.id, 'flushInterval', Number(e.target.value))}
                      className={`${inputClass} w-28 text-right`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      value={route.timeout}
                      onChange={(e) => onRouteUpdate(route.id, 'timeout', Number(e.target.value))}
                      className={`${inputClass} w-28 text-right`}
                    />
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-[var(--text3)]">
                    {route.compression}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text)]">Connection Pool & Retry</h3>
        </div>
        <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-2 block font-medium text-[13px] text-[var(--text)] flex items-center">
              Max Connections
              <FieldTooltip definition="Total HTTP connection pool size shared across all routes. Higher = more parallel uploads but more file descriptors." />
            </label>
            <input
              type="number"
              value={transport.maxConnections}
              onChange={(e) => onChange('maxConnections', Number(e.target.value))}
              min={1} max={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-[13px] text-[var(--text)] flex items-center">
              Acquire Timeout (ms)
              <FieldTooltip definition="How long to wait for a free connection from the pool before failing the request." />
            </label>
            <input
              type="number"
              value={transport.acquireTimeout}
              onChange={(e) => onChange('acquireTimeout', Number(e.target.value))}
              min={1000} max={30000}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-[13px] text-[var(--text)] flex items-center">
              Max Retries
              <FieldTooltip definition="How many times to retry a failed upload before dropping the batch. Uses exponential backoff." />
            </label>
            <input
              type="number"
              value={transport.maxRetries}
              onChange={(e) => onChange('maxRetries', Number(e.target.value))}
              min={0} max={10}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-[13px] text-[var(--text)] flex items-center">
              Base Delay (ms)
              <FieldTooltip definition="Initial delay before the first retry. Subsequent retries double this value (500 → 1000 → 2000)." />
            </label>
            <input
              type="number"
              value={transport.baseDelay}
              onChange={(e) => onChange('baseDelay', Number(e.target.value))}
              min={100} max={10000}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-[13px] text-[var(--text)] flex items-center">
              Queue Max Size
              <FieldTooltip definition="Maximum number of events that can be buffered in memory while waiting to be sent. Exceeding this drops the oldest events." />
            </label>
            <input
              type="number"
              value={transport.queueMaxSize}
              onChange={(e) => onChange('queueMaxSize', Number(e.target.value))}
              min={100} max={50000}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-[13px] text-[var(--text)] flex items-center">
              Critical Reserve
              <FieldTooltip definition="Slots in the queue reserved exclusively for P1 (errors) and P2 (traces) events. Prevents critical signals from being dropped when the queue is full." />
            </label>
            <input
              type="number"
              value={transport.criticalReserve}
              onChange={(e) => onChange('criticalReserve', Number(e.target.value))}
              min={0} max={5000}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between rounded-lg bg-[var(--bg2)] p-4 border border-[var(--border)] mt-2">
            <div>
              <div className="font-medium text-[13px] text-[var(--text)] flex items-center">
                Keep Alive
                <FieldTooltip definition="Reuse TCP connections across requests instead of opening a new one each time. Recommended: ON." />
              </div>
              <MicroCopy active={transport.keepAlive}>
                {transport.keepAlive ? 'TCP connections are reused, lowering latency.' : 'New connections created for every request.'}
              </MicroCopy>
            </div>
            <Switch
              checked={transport.keepAlive}
              onCheckedChange={(val) => onChange('keepAlive', val)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
