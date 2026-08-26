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
import { Activity, Radio, RefreshCw } from 'lucide-react';

const inputClass =
  'w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50 font-mono';
const selectClass = 'w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50 cursor-pointer';

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
  critical: 'bg-red-500/15 text-red-400 border-red-500/30 font-bold',
  high: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold',
  normal: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-semibold',
  low: 'bg-[var(--bg3)] text-[var(--text2)] border-[var(--border)] font-medium',
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <SectionBanner
        title="Transport Layer & Ingestion Pipeline"
        type="info"
        definition="The transport engine manages telemetry batching, compression algorithms, HTTP connection pools, retry backoffs, and route priorities."
      >
        Configure high-throughput telemetry ingestion rules across all SDK routes.
      </SectionBanner>

      {/* Route Matrix */}
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[var(--brand)]" />
            <h3 className="font-bold text-[14px] text-[var(--text)]">Route Ingestion Matrix</h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--text3)]">10 Standard Telemetry Routes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg2)]/60 text-[11px] uppercase font-bold text-[var(--text3)]">
                <th className="px-5 py-3 whitespace-nowrap">Telemetry Route</th>
                <th className="px-5 py-3 whitespace-nowrap">Flush Priority</th>
                <th className="px-5 py-3 whitespace-nowrap">Batch Size</th>
                <th className="px-5 py-3 whitespace-nowrap">Flush Interval (ms)</th>
                <th className="px-5 py-3 whitespace-nowrap">HTTP Timeout (ms)</th>
                <th className="px-5 py-3 whitespace-nowrap">Compression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {ROUTE_KEYS.map((routeKey) => {
                const route = transport.routes[routeKey];
                const prefix = `transport.routes.${routeKey}`;
                return (
                  <tr key={routeKey} className="hover:bg-[var(--bg2)]/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[var(--text)]">{ROUTE_LABELS[routeKey]}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={route.priority}
                        onChange={(e) => onChangeRoute(routeKey, 'priority', e.target.value as TransportPriority)}
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider ${PRIORITY_BADGE[route.priority]} bg-transparent cursor-pointer outline-none`}
                      >
                        {TRANSPORT_PRIORITIES.map((p) => (
                          <option key={p} value={p} className="bg-[var(--bg1)] text-[var(--text)] font-sans">
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="number"
                        value={route.batchSize}
                        onChange={(e) => onChangeRoute(routeKey, 'batchSize', Number(e.target.value))}
                        min={BOUNDS['route.batchSize'].min}
                        max={BOUNDS['route.batchSize'].max}
                        className={`${inputClass} w-24 text-right ${errorFor(`${prefix}.batchSize`) ? 'border-red-500/60' : ''}`}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="number"
                        value={route.flushIntervalMs}
                        onChange={(e) => onChangeRoute(routeKey, 'flushIntervalMs', Number(e.target.value))}
                        min={BOUNDS['route.flushIntervalMs'].min}
                        max={BOUNDS['route.flushIntervalMs'].max}
                        className={`${inputClass} w-28 text-right ${errorFor(`${prefix}.flushIntervalMs`) ? 'border-red-500/60' : ''}`}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="number"
                        value={route.timeoutMs}
                        onChange={(e) => onChangeRoute(routeKey, 'timeoutMs', Number(e.target.value))}
                        min={BOUNDS['route.timeoutMs'].min}
                        max={BOUNDS['route.timeoutMs'].max}
                        className={`${inputClass} w-28 text-right ${errorFor(`${prefix}.timeoutMs`) ? 'border-red-500/60' : ''}`}
                      />
                    </td>
                    <td className="px-5 py-3.5">
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

      {/* Retry & Queue Control Split */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2">
            <RefreshCw className="size-4 text-sky-400" /> Retry & Backoff Policy
          </h3>

          <div className="flex items-center justify-between rounded-xl bg-[var(--bg2)] p-4 border border-[var(--border)]">
            <div>
              <div className="font-bold text-[13px] text-[var(--text)] flex items-center gap-1.5">
                Retry Engine Enabled
                <FieldTooltip definition="When off, a failed upload is dropped immediately instead of retried." />
              </div>
              <MicroCopy active={transport.retry.enabled}>
                {transport.retry.enabled ? 'Failed uploads are retried automatically.' : 'Failed uploads are dropped immediately.'}
              </MicroCopy>
            </div>
            <Switch checked={transport.retry.enabled} onCheckedChange={(val) => onChangeRetry('enabled', val)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-wider">Backoff Strategy</label>
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

          <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2">
            <Radio className="size-4 text-amber-400" /> Memory Queue & Overflow
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-wider">Queue Overflow Strategy</label>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Queue Max Capacity"
              value={transport.queue.maxSize}
              onChange={(v) => onChangeQueue('maxSize', v)}
              bound={BOUNDS['transport.queue.maxSize']}
              tooltip="Maximum events buffered in memory."
              error={errorFor('transport.queue.maxSize')}
            />
            <NumberField
              label="Critical Reserve Slots"
              value={transport.queue.criticalReserve}
              onChange={(v) => onChangeQueue('criticalReserve', v)}
              bound={BOUNDS['transport.queue.criticalReserve']}
              tooltip="Slots reserved exclusively for critical-priority events."
              error={errorFor('transport.queue.criticalReserve')}
            />
          </div>
        </div>
      </div>

      {/* Connection Pool & TTL Delivery */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <h3 className="font-bold text-[14px] text-[var(--text)]">HTTP Connection Pool</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Max Connections"
              value={transport.connections.maxTotalConnections}
              onChange={(v) => onChangeConnections('maxTotalConnections', v)}
              bound={BOUNDS['transport.connections.maxTotalConnections']}
              error={errorFor('transport.connections.maxTotalConnections')}
            />
            <NumberField
              label="Acquire Timeout"
              value={transport.connections.acquireTimeoutMs}
              onChange={(v) => onChangeConnections('acquireTimeoutMs', v)}
              bound={BOUNDS['transport.connections.acquireTimeoutMs']}
              suffix="ms"
              error={errorFor('transport.connections.acquireTimeoutMs')}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[var(--bg2)] p-4 border border-[var(--border)]">
            <div>
              <div className="font-bold text-[13px] text-[var(--text)]">HTTP Keep-Alive</div>
              <MicroCopy active={transport.keepAlive}>
                {transport.keepAlive ? 'TCP connections are reused.' : 'New TCP connections opened for every upload.'}
              </MicroCopy>
            </div>
            <Switch checked={transport.keepAlive} onCheckedChange={(val) => onChange('keepAlive', val)} />
          </div>
        </div>

        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <h3 className="font-bold text-[14px] text-[var(--text)]">Config Refresh TTL</h3>
          <NumberField
            label="Config Cache TTL"
            value={runtime.configTtlSeconds}
            onChange={(v) => onChangeRuntime('configTtlSeconds', v)}
            bound={BOUNDS['runtime.configTtlSeconds']}
            suffix="seconds"
            error={errorFor('runtime.configTtlSeconds')}
          />
          <div className="flex items-center justify-between rounded-xl bg-[var(--bg2)] p-4 border border-[var(--border)]">
            <div>
              <div className="font-bold text-[13px] text-[var(--text)]">Stale-While-Revalidate</div>
              <MicroCopy active={runtime.staleWhileRevalidate}>
                {runtime.staleWhileRevalidate ? 'Non-blocking background refresh.' : 'Blocks SDK until fresh config is returned.'}
              </MicroCopy>
            </div>
            <Switch checked={runtime.staleWhileRevalidate} onCheckedChange={(val) => onChangeRuntime('staleWhileRevalidate', val)} />
          </div>
        </div>
      </div>
    </div>
  );
}
