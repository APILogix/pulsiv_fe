import { useMemo, useState } from 'react';

import { SearchField, ToolbarCount } from '@/modules/projects/components/project-page';
import { Panel, RowStack, SegmentedControl, Toggle } from '@/shared/ui/pulse';
import { Button as UiButton } from '@/components/ui/button';

import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState, InstrumentationKey } from '../schema';

interface InstrumentationTabProps {
  instrumentation: SdkConfigState['instrumentation'];
  onChange: (key: keyof SdkConfigState['instrumentation'], value: boolean) => void;
}

type CategoryId = 'web' | 'database' | 'async';

interface InstrumentDef {
  key: InstrumentationKey;
  label: string;
  desc: string;
  category: CategoryId;
  tooltip: string;
}

const INSTRUMENTS: InstrumentDef[] = [
  { key: 'http', label: 'HTTP (native)', desc: 'Node.js built-in http client and server', category: 'web', tooltip: 'Auto-generates spans for outgoing HTTP requests.' },
  { key: 'https', label: 'HTTPS (native)', desc: 'Node.js built-in TLS client and server', category: 'web', tooltip: 'Auto-generates spans for secure TLS requests.' },
  { key: 'fetch', label: 'Global fetch', desc: 'globalThis.fetch API', category: 'web', tooltip: 'Patches globalThis.fetch to propagate W3C tracecontext headers.' },
  { key: 'express', label: 'Express.js', desc: 'Express middleware and routing layer', category: 'web', tooltip: 'Generates route spans for Express HTTP handlers.' },
  { key: 'fastify', label: 'Fastify', desc: 'Fastify hooks and encapsulation tree', category: 'web', tooltip: 'Uses onRequest/onResponse lifecycle hooks to generate spans.' },
  { key: 'axios', label: 'Axios client', desc: 'Axios HTTP client library', category: 'web', tooltip: 'Intercepts Axios HTTP requests and attaches span metadata.' },
  { key: 'graphql', label: 'GraphQL server', desc: 'Apollo and graphql-js resolver tree', category: 'web', tooltip: 'Traces GraphQL query and mutation resolver executions.' },

  { key: 'prisma', label: 'Prisma ORM', desc: 'Prisma Client queries and transactions', category: 'database', tooltip: 'Traces database operations through Prisma middleware.' },
  { key: 'redis', label: 'Redis', desc: 'ioredis and node-redis clients', category: 'database', tooltip: 'Generates database spans for GET, SET, and pipeline commands.' },
  { key: 'pg', label: 'PostgreSQL (pg)', desc: 'node-postgres connection pool', category: 'database', tooltip: 'Traces raw Postgres SQL queries and connection checkouts.' },
  { key: 'mysql2', label: 'MySQL2 driver', desc: 'MySQL2 client pool', category: 'database', tooltip: 'Traces MySQL connection execution and query latency.' },
  { key: 'mongodb', label: 'MongoDB driver', desc: 'Official MongoDB driver commands', category: 'database', tooltip: 'Traces Mongo queries, aggregations, and cursor operations.' },

  { key: 'bullmq', label: 'BullMQ queues', desc: 'BullMQ background jobs and workers', category: 'async', tooltip: 'Traces background job dispatch, wait time, and worker processing.' },
  { key: 'eventEmitterPatch', label: 'EventEmitter context', desc: 'Node.js EventEmitter async continuity', category: 'async', tooltip: 'Propagates active OpenTelemetry trace context across event listeners.' },
];

const CATEGORIES: { id: CategoryId; title: string; short: string }[] = [
  { id: 'web', title: 'HTTP, web, and APIs', short: 'Web' },
  { id: 'database', title: 'Databases and caches', short: 'Databases' },
  { id: 'async', title: 'Async and message queues', short: 'Async' },
];

type CategoryFilter = 'all' | CategoryId;

const FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...CATEGORIES.map((category) => ({ value: category.id, label: category.short })),
];

export function InstrumentationTab({ instrumentation, onChange }: InstrumentationTabProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = INSTRUMENTS;
    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCategory);
    }
    if (query) {
      list = list.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.desc.toLowerCase().includes(query) ||
          item.key.toLowerCase().includes(query),
      );
    }
    return list;
  }, [selectedCategory, query]);

  const activeCount = INSTRUMENTS.filter((item) => instrumentation[item.key]).length;

  // Bulk actions always cover the whole group, so they stay hidden while a
  // search hides part of it.
  const toggleCategoryAll = (categoryId: CategoryId, enable: boolean) => {
    INSTRUMENTS.filter((item) => item.category === categoryId).forEach((item) => {
      onChange(item.key, enable);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionBanner
        title="Auto-instrumentation"
        definition="The SDK patches HTTP frameworks, database drivers, and ORMs when the process starts, so they emit tracing spans without manual instrumentation code."
      >
        Choose which Node.js modules, web frameworks, and database drivers the SDK patches.
      </SectionBanner>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Filter modules"
          label="Filter auto-instrumentation modules"
        />
        <SegmentedControl
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={FILTER_OPTIONS}
          ariaLabel="Module category"
        />
        <ToolbarCount>
          {activeCount} of {INSTRUMENTS.length} on
        </ToolbarCount>
      </div>

      {filtered.length === 0 && (
        <p className="text-[13px] text-[var(--text3)]">
          {query ? `No modules match “${search.trim()}”.` : 'No modules in this category.'}
        </p>
      )}

      {CATEGORIES.map((category) => {
        const visible = filtered.filter((item) => item.category === category.id);
        if (visible.length === 0) return null;

        const all = INSTRUMENTS.filter((item) => item.category === category.id);
        const onCount = all.filter((item) => instrumentation[item.key]).length;
        const allOn = onCount === all.length;

        return (
          <Panel
            key={category.id}
            title={category.title}
            description={`${onCount} of ${all.length} on.`}
            actions={
              query ? undefined : (
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCategoryAll(category.id, !allOn)}
                  aria-label={`${allOn ? 'Disable' : 'Enable'} all ${category.title.toLowerCase()} modules`}
                >
                  {allOn ? 'Disable all' : 'Enable all'}
                </UiButton>
              )
            }
            bodyClassName="p-0"
          >
            <RowStack>
              {visible.map((item) => {
                const isActive = instrumentation[item.key];
                return (
                  <div key={item.key} className="flex items-center justify-between gap-6 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="text-[13px] font-medium text-[var(--text)]">{item.label}</span>
                        <FieldTooltip label={item.label} definition={item.tooltip} />
                        <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">{item.key}</code>
                      </div>
                      <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={isActive}
                      onChange={(value) => onChange(item.key, value)}
                      label={`Auto-instrument ${item.label}`}
                    />
                  </div>
                );
              })}
            </RowStack>
          </Panel>
        );
      })}
    </div>
  );
}
