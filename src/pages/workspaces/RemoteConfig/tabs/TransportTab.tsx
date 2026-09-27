import { useState } from 'react';
import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
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
import { Activity, Network, RefreshCw, Zap, Shield, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  critical: 'bg-[var(--red)]/15 text-[var(--red)] border-[var(--red)]/30 font-bold',
  high: 'bg-[var(--amber)]/15 text-[var(--amber)] border-[var(--amber)]/30 font-bold',
  normal: 'bg-[var(--brand)]/10 text-[var(--text)] border-[var(--border)] font-semibold',
  low: 'bg-[var(--bg3)] text-[var(--text3)] border-[var(--border)] font-medium',
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
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const errorFor = (path: string) => errors.find((e) => e.path === path)?.message;

  const filteredRoutes = ROUTE_KEYS.filter((key) => {
    if (filterPriority === 'all') return true;
    return transport.routes[key].priority === filterPriority;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <SectionBanner
        title="Transport Pipeline & Route Ingestion Matrix"
        type="info"
        definition="Manages batching buffers, gzip compression algorithms, HTTP keep-alive connection pools, and route delivery priorities for all telemetry routes."
      >
        High-throughput network transport tuning and backoff recovery parameters.
      </SectionBanner>

      {/* Route Matrix — Expanded to wide display */}
      <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-[var(--border)] p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Activity className="size-4 text-[var(--brand)]" />
            <h3 className="font-semibold text-[13.5px] text-[var(--text)]">Route Ingestion Matrix</h3>
            <span className="font-mono text-[11px] text-[var(--text3)]">
              (10 Telemetry Endpoints)
            </span>
          </div>

          {/* Filter by Priority */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text3)]">
            <span>Filter priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--bg2)] px-2 py-0.5 font-mono text-[11px] text-[var(--text)] outline-none"
            >
              <option value="all">All Priorities</option>
              {TRANSPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg2)]/60 font-mono text-[10.5px] uppercase tracking-wider text-[var(--text3)]">
                <th className="px-5 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold text-right">Batch Size</th>
                <th className="px-4 py-3 font-semibold text-right">Flush Interval</th>
                <th className="px-4 py-3 font-semibold text-right">Timeout</th>
                <th className="px-4 py-3 font-semibold">Compression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredRoutes.map((routeKey) => {
                const route = transport.routes[routeKey];
                const prefix = `transport.routes.${routeKey}`;
                const batchErr = errorFor(`${prefix}.batchSize`);
                const flushErr = errorFor(`${prefix}.flushIntervalMs`);
                const timeoutErr = errorFor(`${prefix}.timeoutMs`);

                return (
                  <tr key={routeKey} className="hover:bg-[var(--bg2)]/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-[var(--text)] whitespace-nowrap">
                      {ROUTE_LABELS[routeKey]}
                      <div className="font-mono text-[10px] text-[var(--text3)]">/{routeKey}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={route.priority}
                        onChange={(e) =>
                          onChangeRoute(routeKey, 'priority', e.target.value as TransportPriority)
                        }
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider outline-none cursor-pointer',
                          PRIORITY_BADGE[route.priority]
                        )}
                      >
                        {TRANSPORT_PRIORITIES.map((p) => (
                          <option key={p} value={p} className="bg-[var(--bg1)] text-[var(--text)] font-sans">
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <input
                        type="number"
                        value={route.batchSize}
                        onChange={(e) => onChangeRoute(routeKey, 'batchSize', Number(e.target.value))}
                        min={BOUNDS['route.batchSize'].min}
                        max={BOUNDS['route.batchSize'].max}
                        className={cn(
                          'w-20 rounded-[var(--radius)] border bg-[var(--bg2)] px-2 py-1 text-right font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]',
                          batchErr ? 'border-[var(--red)]' : 'border-[var(--border)]'
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={route.flushIntervalMs}
                          onChange={(e) => onChangeRoute(routeKey, 'flushIntervalMs', Number(e.target.value))}
                          min={BOUNDS['route.flushIntervalMs'].min}
                          max={BOUNDS['route.flushIntervalMs'].max}
                          className={cn(
                            'w-24 rounded-[var(--radius)] border bg-[var(--bg2)] px-2 py-1 text-right font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]',
                            flushErr ? 'border-[var(--red)]' : 'border-[var(--border)]'
                          )}
                        />
                        <span className="font-mono text-[11px] text-[var(--text3)]">ms</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={route.timeoutMs}
                          onChange={(e) => onChangeRoute(routeKey, 'timeoutMs', Number(e.target.value))}
                          min={BOUNDS['route.timeoutMs'].min}
                          max={BOUNDS['route.timeoutMs'].max}
                          className={cn(
                            'w-24 rounded-[var(--radius)] border bg-[var(--bg2)] px-2 py-1 text-right font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]',
                            timeoutErr ? 'border-[var(--red)]' : 'border-[var(--border)]'
                          )}
                        />
                        <span className="font-mono text-[11px] text-[var(--text3)]">ms</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={route.compression}
                        onChange={(e) => onChangeRoute(routeKey, 'compression', e.target.value as CompressionMode)}
                        className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 font-mono text-[11px] text-[var(--text)] outline-none cursor-pointer"
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

      {/* Transport Connection Pool & Retry Settings */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Connection Pool */}
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <Network className="size-4 text-[var(--brand)]" />
              <h3 className="font-semibold text-[13.5px] text-[var(--text)]">HTTP Connection Pool</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text3)]">Keep-Alive</span>
              <Switch
                checked={transport.keepAlive}
                onCheckedChange={(val) => onChange('keepAlive', val)}
                aria-label="Toggle HTTP keep-alive"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Max Total Connections"
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
        </div>

        {/* Retry & Queue Policies */}
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-[var(--blue)]" />
              <h3 className="font-semibold text-[13.5px] text-[var(--text)]">Retry & Backoff Policy</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text3)]">Auto-Retry</span>
              <Switch
                checked={transport.retry.enabled}
                onCheckedChange={(val) => onChangeRetry('enabled', val)}
                aria-label="Toggle auto-retry"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Max Retry Attempts"
              value={transport.retry.maxRetries}
              onChange={(v) => onChangeRetry('maxRetries', v)}
              bound={BOUNDS['transport.retry.maxRetries']}
              error={errorFor('transport.retry.maxRetries')}
            />
            <NumberField
              label="Base Delay"
              value={transport.retry.baseDelayMs}
              onChange={(v) => onChangeRetry('baseDelayMs', v)}
              bound={BOUNDS['transport.retry.baseDelayMs']}
              suffix="ms"
              error={errorFor('transport.retry.baseDelayMs')}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[var(--text2)]">Backoff Algorithm</label>
              <select
                value={transport.retry.backoff}
                onChange={(e) => onChangeRetry('backoff', e.target.value as RetryBackoff)}
                className="h-8.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
              >
                {RETRY_BACKOFF_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[var(--text2)]">Queue Overflow Action</label>
              <select
                value={transport.queue.overflowStrategy}
                onChange={(e) => onChangeQueue('overflowStrategy', e.target.value as QueueOverflowStrategy)}
                className="h-8.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
              >
                {QUEUE_OVERFLOW_STRATEGIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Runtime Caching & TTL Settings */}
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-[var(--amber)]" />
            <h3 className="font-semibold text-[13.5px] text-[var(--text)]">SDK Runtime Configuration TTL</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text3)]">Stale While Revalidate</span>
            <Switch
              checked={runtime.staleWhileRevalidate}
              onCheckedChange={(val) => onChangeRuntime('staleWhileRevalidate', val)}
              aria-label="Toggle stale while revalidate"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Config TTL Seconds"
            value={runtime.configTtlSeconds}
            onChange={(v) => onChangeRuntime('configTtlSeconds', v)}
            bound={BOUNDS['runtime.configTtlSeconds']}
            suffix="s"
            error={errorFor('runtime.configTtlSeconds')}
          />
          <div className="flex flex-col justify-center text-xs text-[var(--text3)] leading-relaxed">
            Connected SDKs cache their active configuration in memory for {runtime.configTtlSeconds} seconds before querying the Pulse configuration endpoint.
          </div>
        </div>
      </div>
    </div>
  );
}
