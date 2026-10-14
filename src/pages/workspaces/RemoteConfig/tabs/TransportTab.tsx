import { useId, useState } from 'react';

import {
  Sheet,
  SheetCell,
  SheetRow,
  SheetTable,
  ToolbarCount,
  type SheetColumn,
} from '@/modules/projects/components/project-page';
import { Panel, RowStack, Toggle, fieldInputClass, fieldMonoClass } from '@/shared/ui/pulse';
import { cn } from '@/lib/utils';

import { SectionBanner } from '../components/HelpSystem';
import { NumberField } from '../components/NumberField';
import { ROUTE_KEYS, ROUTE_LABELS, type RouteKey, type SdkConfigState } from '../schema';
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

const PRIORITY_LABEL: Record<TransportPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

const COMPRESSION_LABEL: Record<CompressionMode, string> = {
  gzip: 'gzip',
  none: 'None',
};

const BACKOFF_LABEL: Record<RetryBackoff, string> = {
  exponential: 'Exponential',
  linear: 'Linear',
  fixed: 'Fixed',
};

const OVERFLOW_LABEL: Record<QueueOverflowStrategy, string> = {
  drop_oldest: 'Drop oldest events',
  drop_newest: 'Drop newest events',
  reject: 'Reject new events',
};

type PriorityFilter = 'all' | TransportPriority;

const ROUTE_COLUMNS: SheetColumn[] = [
  { key: 'route', header: 'Route' },
  { key: 'priority', header: 'Priority', className: 'w-[132px]' },
  { key: 'batch', header: 'Batch size', className: 'w-[120px]' },
  { key: 'flush', header: 'Flush interval', className: 'w-[136px]' },
  { key: 'timeout', header: 'Timeout', className: 'w-[136px]' },
  { key: 'compression', header: 'Compression', className: 'w-[124px]' },
];

const ERROR_INPUT = 'border-[var(--red)]/60 hover:border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red-bg)]';
const CELL_SELECT = cn(fieldInputClass, 'h-8 pr-7 text-[12.5px]');

/** Compact numeric input for a table cell, with its unit inside the field. */
function CellNumber({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={1}
          aria-label={unit ? `${label} (${unit})` : label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(fieldMonoClass, 'h-8 text-right tabular-nums', unit && 'pr-9', error && ERROR_INPUT)}
        />
        {unit && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]"
          >
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="whitespace-normal text-[11.5px] leading-[1.4] text-[var(--red)]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Label + native select, matching NumberField's geometry. */
function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-[var(--text2)]">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={fieldInputClass}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

/** One switch row at the top of a panel. */
function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--text)]">{label}</p>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

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
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all');
  const filterId = useId();
  const errorFor = (path: string) => errors.find((e) => e.path === path)?.message;

  const filteredRoutes = ROUTE_KEYS.filter(
    (key) => filterPriority === 'all' || transport.routes[key].priority === filterPriority,
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionBanner
        title="Transport"
        definition="Batching, compression, keep-alive connection pools, and delivery priority for every telemetry route."
      >
        Network tuning and retry behaviour for high-throughput delivery.
      </SectionBanner>

      <Sheet
        title="Routes"
        description="Per-endpoint batching, timeouts, compression, and delivery priority."
        toolbar={
          <>
            <label htmlFor={filterId} className="text-[12px] text-[var(--text3)]">
              Priority
            </label>
            <select
              id={filterId}
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as PriorityFilter)}
              className={cn(fieldInputClass, 'h-8 w-auto pr-7 text-[12.5px]')}
            >
              <option value="all">All priorities</option>
              {TRANSPORT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABEL[priority]}
                </option>
              ))}
            </select>
            <ToolbarCount>
              {filteredRoutes.length} of {ROUTE_KEYS.length} routes
            </ToolbarCount>
          </>
        }
      >
        {filteredRoutes.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-[var(--text2)]">
            No routes use {PRIORITY_LABEL[filterPriority as TransportPriority].toLowerCase()} priority.
          </p>
        ) : (
          <SheetTable columns={ROUTE_COLUMNS} caption="Transport settings per telemetry route" minWidth={820}>
            {filteredRoutes.map((routeKey) => {
              const route = transport.routes[routeKey];
              const name = ROUTE_LABELS[routeKey];
              const prefix = `transport.routes.${routeKey}`;
              return (
                <SheetRow key={routeKey}>
                  <SheetCell>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[var(--text)]">{name}</div>
                      <div className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">/{routeKey}</div>
                    </div>
                  </SheetCell>
                  <SheetCell>
                    <select
                      value={route.priority}
                      onChange={(e) => onChangeRoute(routeKey, 'priority', e.target.value as TransportPriority)}
                      aria-label={`${name} priority`}
                      className={CELL_SELECT}
                    >
                      {TRANSPORT_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {PRIORITY_LABEL[priority]}
                        </option>
                      ))}
                    </select>
                  </SheetCell>
                  <SheetCell>
                    <CellNumber
                      label={`${name} batch size`}
                      value={route.batchSize}
                      onChange={(v) => onChangeRoute(routeKey, 'batchSize', v)}
                      min={BOUNDS['route.batchSize'].min}
                      max={BOUNDS['route.batchSize'].max}
                      error={errorFor(`${prefix}.batchSize`)}
                    />
                  </SheetCell>
                  <SheetCell>
                    <CellNumber
                      label={`${name} flush interval`}
                      value={route.flushIntervalMs}
                      onChange={(v) => onChangeRoute(routeKey, 'flushIntervalMs', v)}
                      min={BOUNDS['route.flushIntervalMs'].min}
                      max={BOUNDS['route.flushIntervalMs'].max}
                      unit="ms"
                      error={errorFor(`${prefix}.flushIntervalMs`)}
                    />
                  </SheetCell>
                  <SheetCell>
                    <CellNumber
                      label={`${name} timeout`}
                      value={route.timeoutMs}
                      onChange={(v) => onChangeRoute(routeKey, 'timeoutMs', v)}
                      min={BOUNDS['route.timeoutMs'].min}
                      max={BOUNDS['route.timeoutMs'].max}
                      unit="ms"
                      error={errorFor(`${prefix}.timeoutMs`)}
                    />
                  </SheetCell>
                  <SheetCell>
                    <select
                      value={route.compression}
                      onChange={(e) => onChangeRoute(routeKey, 'compression', e.target.value as CompressionMode)}
                      aria-label={`${name} compression`}
                      className={CELL_SELECT}
                    >
                      {COMPRESSION_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {COMPRESSION_LABEL[mode]}
                        </option>
                      ))}
                    </select>
                  </SheetCell>
                </SheetRow>
              );
            })}
          </SheetTable>
        )}
      </Sheet>

      {/* Forms stay in the reading column; only the route table runs wide. */}
      <div className="flex max-w-[800px] flex-col gap-6">
        <Panel title="Connection pool" description="Shared HTTP connections to the ingestion endpoints." bodyClassName="p-0">
          <RowStack>
            <SwitchRow
              label="Keep-alive"
              description="Reuse open connections between batches instead of reconnecting."
              checked={transport.keepAlive}
              onChange={(next) => onChange('keepAlive', next)}
            />
            <div className="grid gap-x-5 gap-y-5 px-5 py-4 sm:grid-cols-2">
              <NumberField
                label="Max total connections"
                value={transport.connections.maxTotalConnections}
                onChange={(v) => onChangeConnections('maxTotalConnections', v)}
                bound={BOUNDS['transport.connections.maxTotalConnections']}
                error={errorFor('transport.connections.maxTotalConnections')}
              />
              <NumberField
                label="Acquire timeout"
                value={transport.connections.acquireTimeoutMs}
                onChange={(v) => onChangeConnections('acquireTimeoutMs', v)}
                bound={BOUNDS['transport.connections.acquireTimeoutMs']}
                suffix="ms"
                error={errorFor('transport.connections.acquireTimeoutMs')}
              />
            </div>
          </RowStack>
        </Panel>

        <Panel title="Retry and queue" description="What happens when a batch fails or the send queue fills up." bodyClassName="p-0">
          <RowStack>
            <SwitchRow
              label="Automatic retries"
              description="Retry failed batches using the backoff below."
              checked={transport.retry.enabled}
              onChange={(next) => onChangeRetry('enabled', next)}
            />
            <div className="grid gap-x-5 gap-y-5 px-5 py-4 sm:grid-cols-2">
              <NumberField
                label="Max retry attempts"
                value={transport.retry.maxRetries}
                onChange={(v) => onChangeRetry('maxRetries', v)}
                bound={BOUNDS['transport.retry.maxRetries']}
                error={errorFor('transport.retry.maxRetries')}
              />
              <NumberField
                label="Base delay"
                value={transport.retry.baseDelayMs}
                onChange={(v) => onChangeRetry('baseDelayMs', v)}
                bound={BOUNDS['transport.retry.baseDelayMs']}
                suffix="ms"
                error={errorFor('transport.retry.baseDelayMs')}
              />
              <SelectField
                label="Backoff"
                value={transport.retry.backoff}
                options={RETRY_BACKOFF_MODES}
                labels={BACKOFF_LABEL}
                onChange={(value) => onChangeRetry('backoff', value)}
              />
              <SelectField
                label="When the queue is full"
                value={transport.queue.overflowStrategy}
                options={QUEUE_OVERFLOW_STRATEGIES}
                labels={OVERFLOW_LABEL}
                onChange={(value) => onChangeQueue('overflowStrategy', value)}
              />
            </div>
          </RowStack>
        </Panel>

        <Panel
          title="Configuration refresh"
          description={`Connected SDKs cache their active configuration for ${runtime.configTtlSeconds.toLocaleString()} seconds before checking the Pulse configuration endpoint again.`}
          bodyClassName="p-0"
        >
          <RowStack>
            <div className="grid gap-x-5 gap-y-5 px-5 py-4 sm:grid-cols-2">
              <NumberField
                label="Config TTL"
                value={runtime.configTtlSeconds}
                onChange={(v) => onChangeRuntime('configTtlSeconds', v)}
                bound={BOUNDS['runtime.configTtlSeconds']}
                suffix="s"
                error={errorFor('runtime.configTtlSeconds')}
              />
            </div>
            <SwitchRow
              label="Stale while revalidate"
              description="Keep using the cached configuration while a refresh is in flight."
              checked={runtime.staleWhileRevalidate}
              onChange={(next) => onChangeRuntime('staleWhileRevalidate', next)}
            />
          </RowStack>
        </Panel>
      </div>
    </div>
  );
}
