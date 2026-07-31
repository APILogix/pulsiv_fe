import { SectionBanner, FieldTooltip, MicroCopy } from '../components/HelpSystem';
import { NumberField } from '../components/NumberField';
import { ROUTE_KEYS, ROUTE_LABELS, type RouteKey, type SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';
import {
  BOUNDS,
  COMPRESSION_MODES,
  TRANSPORT_PRIORITIES,
  RETRY_BACKOFF_MODES,
  QUEUE_OVERFLOW_STRATEGIES,
  type CompressionMode,
  type TransportPriority,
  type RetryBackoff,
  type QueueOverflowStrategy,
  type FieldError,
} from '../bounds';

const inputClass =
  'w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50';
const selectClass = inputClass + ' cursor-pointer';

interface TransportTabProps {
  transport: SdkConfigState['transport'];
  runtime: SdkConfigState['runtime'];
  onChange: (key: 'keepAlive', value: boolean) => void;
  onChangeRetry: (key: keyof SdkConfigState['transport']['retry'], value: number | boolean | RetryBackoff) => void;
  onChangeQueue: (key: keyof SdkConfigState['transport']['queue'], value: number | QueueOverflowStrategy) => void;
  onChangeConnections: (key: keyof SdkConfigState['transport']['connections'], value: number) => void;
  onChangeRoute: (route: RouteKey, field: keyof SdkConfigState['transport']['routes'][RouteKey], value: number | CompressionMode | TransportPriority) => void;
  onChangeRuntime: (key: keyof SdkConfigState['runtime'], value: number | boolean) => void;
  errors: FieldError[];
}

const PRIORITY_BADGE: Record<TransportPriority, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  normal: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  low: 'bg-[var(--bg3)] text-[var(--text2)] border-[var(--border)]',
};

export function TransportTab({
  transport,
  runtime,
  onChange,
  onChangeRetry,
  onChangeQueue,
  onChangeConnections,
  onChangeRoute,
  onChangeRuntime,
  errors,
}: TransportTabProps) {
  const errorFor = (path: string) => errors.find((e) => e.path === path)?.message;

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Transport & Ingestion"
        type="info"
        definition="The transport layer manages how buffered telemetry is shipped to the Pulse ingestion servers. It controls batching, timeouts, connection pooling, retry policy, and overflow behavior."
      >
        Configure how the SDK batches and ships data to Pulse. Critical-priority routes are always processed before lower priority routes when the network is constrained.
      </SectionBanner>

      <div className="mb-6 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text)]">Route Configuration</h3>
        </div>
        <div className="overflow-x-auto p-0">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">Route</th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Priority <FieldTooltip definition="Determines the order in which routes are flushed when the queue is under pressure. Critical is always flushed first." />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Batch Size <FieldTooltip definition="How many events of this type are collected before being sent in a single HTTP request." recommendation="1–5000" />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Flush Interval (ms) <FieldTooltip definition="Maximum time the SDK waits before sending a batch, even if not full." recommendation="0–300000" />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Timeout (ms) <FieldTooltip definition="How long the SDK waits for the ingestion server to respond before aborting." recommendation="250–60000" />
                </th>
                <th className="px-5 py-3 font-medium text-[var(--text2)] whitespace-nowrap">
                  Compression <FieldTooltip definition="Compression algorithm applied to the payload before sending." />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {ROUTE_KEYS.map((routeKey) => {
                const route = transport.routes[routeKey];
                const prefix = `transport.routes.${routeKey}`;
                return (
                  <tr key={routeKey} className="hover:bg-[var(--bg2)]/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--text)]">{ROUTE_LABELS[routeKey]}</td>
                    <td className="px-5 py-3">
                      <select
                        value={route.priority}
                        onChange={(e) => onChangeRoute(routeKey, 'priority', e.target.value as TransportPriority)}
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${PRIORITY_BADGE[route.priority]} bg-transparent cursor-pointer outline-none`}
                      >
                        {TRANSPORT_PRIORITIES.map((p) => (
                          <option key={p} value={p} className="bg-[var(--bg1)] text-[var(--text)]">
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        value={route.batchSize}
                        onChange={(e) => onChangeRoute(routeKey, 'batchSize', Number(e.target.value))}
                        min={BOUNDS['route.batchSize'].min}
                        max={BOUNDS['route.batchSize'].max}
                        className={`${inputClass} w-24 text-right ${errorFor(`${prefix}.batchSize`) ? 'border-red-500/60' : ''}`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        value={route.flushIntervalMs}
                        onChange={(e) => onChangeRoute(routeKey, 'flushIntervalMs', Number(e.target.value))}
                        min={BOUNDS['route.flushIntervalMs'].min}
                        max={BOUNDS['route.flushIntervalMs'].max}
                        className={`${inputClass} w-28 text-right ${errorFor(`${prefix}.flushIntervalMs`) ? 'border-red-500/60' : ''}`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        value={route.timeoutMs}
                        onChange={(e) => onChangeRoute(routeKey, 'timeoutMs', Number(e.target.value))}
                        min={BOUNDS['route.timeoutMs'].min}
                        max={BOUNDS['route.timeoutMs'].max}
                        className={`${inputClass} w-28 text-right ${errorFor(`${prefix}.timeoutMs`) ? 'border-red-500/60' : ''}`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={route.compression}
                        onChange={(e) => onChangeRoute(routeKey, 'compression', e.target.value as CompressionMode)}
                        className="rounded-[6px] border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 font-mono text-[12px] text-[var(--text)] outline-none cursor-pointer"
                      >
                        {COMPRESSION_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold text-[var(--text)]">Retry Policy</h3>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg2)] p-4 border border-[var(--border)]">
              <div>
                <div className="font-medium text-[13px] text-[var(--text)] flex items-center">
                  Retry Enabled
                  <FieldTooltip definition="When off, a failed upload is dropped immediately instead of retried." />
                </div>
                <MicroCopy active={transport.retry.enabled}>{transport.retry.enabled ? 'Failed uploads are retried.' : 'Failed uploads are dropped immediately.'}</MicroCopy>
              </div>
              <Switch checked={transport.retry.enabled} onCheckedChange={(val) => onChangeRetry('enabled', val)} />
            </div>
            <div>
              <label className="mb-2 flex items-center font-medium text-[13px] text-[var(--text)]">
                Backoff Strategy
                <FieldTooltip definition="How the delay between retries grows. Exponential doubles each attempt; linear increases steadily; fixed keeps the same delay." />
              </label>
              <select
                value={transport.retry.backoff}
                onChange={(e) => onChangeRetry('backoff', e.target.value as RetryBackoff)}
                className={selectClass}
                disabled={!transport.retry.enabled}
              >
                {RETRY_BACKOFF_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <NumberField
              label="Max Retries"
              value={transport.retry.maxRetries}
              onChange={(v) => onChangeRetry('maxRetries', v)}
              bound={BOUNDS['transport.retry.maxRetries']}
              tooltip="How many times to retry a failed upload before dropping the batch."
              error={errorFor('transport.retry.maxRetries')}
            />
            <NumberField
              label="Base Delay"
              value={transport.retry.baseDelayMs}
              onChange={(v) => onChangeRetry('baseDelayMs', v)}
              bound={BOUNDS['transport.retry.baseDelayMs']}
              tooltip="Initial delay before the first retry."
              suffix="ms"
              error={errorFor('transport.retry.baseDelayMs')}
            />
          </div>
        </div>

        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold text-[var(--text)]">Queue & Overflow</h3>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div>
              <label className="mb-2 flex items-center font-medium text-[13px] text-[var(--text)]">
                Overflow Strategy
                <FieldTooltip definition="What happens when the local queue is full. drop_oldest evicts the earliest queued event, drop_newest rejects the incoming one, reject fails the SDK call outright." />
              </label>
              <select
                value={transport.queue.overflowStrategy}
                onChange={(e) => onChangeQueue('overflowStrategy', e.target.value as QueueOverflowStrategy)}
                className={selectClass}
              >
                {QUEUE_OVERFLOW_STRATEGIES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <NumberField
              label="Queue Max Size"
              value={transport.queue.maxSize}
              onChange={(v) => onChangeQueue('maxSize', v)}
              bound={BOUNDS['transport.queue.maxSize']}
              tooltip="Maximum events buffered in memory. Limits → Max Queue Size must stay ≤ this value."
              error={errorFor('transport.queue.maxSize')}
            />
            <NumberField
              label="Critical Reserve"
              value={transport.queue.criticalReserve}
              onChange={(v) => onChangeQueue('criticalReserve', v)}
              bound={BOUNDS['transport.queue.criticalReserve']}
              tooltip="Slots reserved exclusively for critical-priority events. Must be ≤ Queue Max Size."
              error={errorFor('transport.queue.criticalReserve')}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text)]">Connection Pool</h3>
        </div>
        <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Max Connections"
            value={transport.connections.maxTotalConnections}
            onChange={(v) => onChangeConnections('maxTotalConnections', v)}
            bound={BOUNDS['transport.connections.maxTotalConnections']}
            tooltip="Total HTTP connection pool size shared across all routes."
            error={errorFor('transport.connections.maxTotalConnections')}
          />
          <NumberField
            label="Acquire Timeout"
            value={transport.connections.acquireTimeoutMs}
            onChange={(v) => onChangeConnections('acquireTimeoutMs', v)}
            bound={BOUNDS['transport.connections.acquireTimeoutMs']}
            tooltip="How long to wait for a free connection from the pool before failing the request."
            suffix="ms"
            error={errorFor('transport.connections.acquireTimeoutMs')}
          />
          <div className="flex items-center justify-between rounded-lg bg-[var(--bg2)] p-4 border border-[var(--border)] sm:col-span-2 lg:col-span-1">
            <div>
              <div className="font-medium text-[13px] text-[var(--text)] flex items-center">
                Keep Alive
                <FieldTooltip definition="Reuse TCP connections across requests instead of opening a new one each time." />
              </div>
              <MicroCopy active={transport.keepAlive}>{transport.keepAlive ? 'Connections are reused.' : 'New connections every request.'}</MicroCopy>
            </div>
            <Switch checked={transport.keepAlive} onCheckedChange={(val) => onChange('keepAlive', val)} />
          </div>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text)]">Config Delivery</h3>
        </div>
        <div className="grid gap-6 p-5 sm:grid-cols-2">
          <NumberField
            label="Config TTL"
            value={runtime.configTtlSeconds}
            onChange={(v) => onChangeRuntime('configTtlSeconds', v)}
            bound={BOUNDS['runtime.configTtlSeconds']}
            tooltip="How long the SDK caches this configuration before checking for a newer revision."
            suffix="sec"
            error={errorFor('runtime.configTtlSeconds')}
          />
          <div className="flex items-center justify-between rounded-lg bg-[var(--bg2)] p-4 border border-[var(--border)]">
            <div>
              <div className="font-medium text-[13px] text-[var(--text)] flex items-center">
                Stale-While-Revalidate
                <FieldTooltip definition="When the cached config expires, serve the stale copy immediately while fetching a fresh one in the background instead of blocking." />
              </div>
              <MicroCopy active={runtime.staleWhileRevalidate}>
                {runtime.staleWhileRevalidate ? 'Stale config served during refresh.' : 'SDK blocks until a fresh config is fetched.'}
              </MicroCopy>
            </div>
            <Switch checked={runtime.staleWhileRevalidate} onCheckedChange={(val) => onChangeRuntime('staleWhileRevalidate', val)} />
          </div>
        </div>
      </div>
    </div>
  );
}
