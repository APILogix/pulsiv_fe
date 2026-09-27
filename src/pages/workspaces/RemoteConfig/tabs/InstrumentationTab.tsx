import { useState, useMemo } from 'react';
import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState, InstrumentationKey } from '../schema';
import { Switch } from '@/components/ui/switch';
import { Radio, Search, Database, Globe, Layers, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/observe';

interface InstrumentationTabProps {
  instrumentation: SdkConfigState['instrumentation'];
  onChange: (key: keyof SdkConfigState['instrumentation'], value: boolean) => void;
}

interface InstrumentDef {
  key: InstrumentationKey;
  label: string;
  desc: string;
  category: 'web' | 'database' | 'async';
  tooltip: string;
}

const INSTRUMENTS: InstrumentDef[] = [
  { key: 'http', label: 'HTTP (Native)', desc: 'Node.js built-in http client & server', category: 'web', tooltip: 'Auto-generates spans for outgoing HTTP requests.' },
  { key: 'https', label: 'HTTPS (Native)', desc: 'Node.js built-in TLS client & server', category: 'web', tooltip: 'Auto-generates spans for secure TLS requests.' },
  { key: 'fetch', label: 'Global Fetch', desc: 'globalThis.fetch API', category: 'web', tooltip: 'Patches globalThis.fetch to propagate W3C tracecontext headers.' },
  { key: 'express', label: 'Express.js', desc: 'Express middleware and routing layer', category: 'web', tooltip: 'Generates route spans for Express HTTP handlers.' },
  { key: 'fastify', label: 'Fastify', desc: 'Fastify hooks and encapsulation tree', category: 'web', tooltip: 'Uses onRequest/onResponse lifecycle hooks to generate spans.' },
  { key: 'axios', label: 'Axios Client', desc: 'Axios HTTP client library', category: 'web', tooltip: 'Intercepts Axios HTTP requests and attaches span metadata.' },
  { key: 'graphql', label: 'GraphQL Server', desc: 'Apollo / graphql-js resolver tree', category: 'web', tooltip: 'Traces GraphQL query and mutation resolver executions.' },

  { key: 'prisma', label: 'Prisma ORM', desc: 'Prisma Client queries and transactions', category: 'database', tooltip: 'Traces database operations through Prisma middleware.' },
  { key: 'redis', label: 'Redis Cache', desc: 'ioredis and node-redis clients', category: 'database', tooltip: 'Generates database spans for GET, SET, and pipeline commands.' },
  { key: 'pg', label: 'PostgreSQL (pg)', desc: 'node-postgres connection pool', category: 'database', tooltip: 'Traces raw Postgres SQL queries and connection checkouts.' },
  { key: 'mysql2', label: 'MySQL2 Driver', desc: 'MySQL2 client pool', category: 'database', tooltip: 'Traces MySQL connection execution and query latency.' },
  { key: 'mongodb', label: 'MongoDB Driver', desc: 'Official MongoDB driver commands', category: 'database', tooltip: 'Traces Mongo queries, aggregations, and cursor operations.' },

  { key: 'bullmq', label: 'BullMQ Queues', desc: 'BullMQ background jobs and workers', category: 'async', tooltip: 'Traces background job dispatch, wait time, and worker processing.' },
  { key: 'eventEmitterPatch', label: 'EventEmitter Context', desc: 'Node.js EventEmitter async continuity', category: 'async', tooltip: 'Propagates active OpenTelemetry trace context across event listeners.' },
];

const CATEGORIES = [
  { id: 'web', title: 'HTTP, Web & APIs', icon: Globe },
  { id: 'database', title: 'Databases & Caches', icon: Database },
  { id: 'async', title: 'Async & Message Queues', icon: Layers },
] as const;

export function InstrumentationTab({ instrumentation, onChange }: InstrumentationTabProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = INSTRUMENTS;
    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.key.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, search]);

  const activeCount = useMemo(
    () => Object.values(instrumentation).filter(Boolean).length,
    [instrumentation]
  );

  const toggleCategoryAll = (catId: 'web' | 'database' | 'async', enable: boolean) => {
    INSTRUMENTS.filter((i) => i.category === catId).forEach((i) => {
      onChange(i.key, enable);
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <SectionBanner
        title="Zero-Code Auto-Instrumentation"
        definition="The SDK automatically monkey-patches HTTP frameworks, database drivers, and ORMs at process boot to generate distributed tracing spans without manual instrumentation code."
      >
        Configure monkey-patching for Node.js modules, web frameworks, and database drivers.
      </SectionBanner>

      {/* Header controls: Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search auto-instrumentation modules..."
            className="h-8.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] pl-9 pr-8 text-[12.5px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              selectedCategory === 'all'
                ? 'bg-[var(--brand)] text-[var(--brand-fg)]'
                : 'bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]'
            )}
          >
            All ({activeCount}/14)
          </button>
          {CATEGORIES.map((cat) => {
            const count = INSTRUMENTS.filter((i) => i.category === cat.id && instrumentation[i.key]).length;
            const total = INSTRUMENTS.filter((i) => i.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap',
                  selectedCategory === cat.id
                    ? 'bg-[var(--brand)] text-[var(--brand-fg)]'
                    : 'bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]'
                )}
              >
                {cat.title} ({count}/{total})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Cards */}
      <div className="flex flex-col gap-6">
        {CATEGORIES.map((cat) => {
          const itemsInCat = filtered.filter((i) => i.category === cat.id);
          if (itemsInCat.length === 0) return null;
          const CatIcon = cat.icon;
          const allActive = itemsInCat.every((i) => instrumentation[i.key]);

          return (
            <div key={cat.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 px-1">
                <div className="flex items-center gap-2">
                  <CatIcon className="size-3.5 text-[var(--brand)]" />
                  <h3 className="eyebrow text-[var(--text)]">{cat.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCategoryAll(cat.id, !allActive)}
                    className="text-[11px] font-semibold text-[var(--brand)] hover:underline"
                  >
                    {allActive ? 'Disable group' : 'Enable all in group'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {itemsInCat.map((item) => {
                  const isActive = instrumentation[item.key];
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border p-3.5 transition-all',
                        isActive
                          ? 'border-[var(--border2)] bg-[var(--bg1)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--bg1)]/60 opacity-70'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[13px] text-[var(--text)]">{item.label}</span>
                          <FieldTooltip definition={item.tooltip} />
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-[var(--text3)] line-clamp-1">{item.desc}</p>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(val) => onChange(item.key, val)}
                        aria-label={`Toggle auto-instrumentation for ${item.label}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg1)]/40 p-8 text-center text-xs text-[var(--text3)]">
            No instrumentation modules match "{search}".
          </div>
        )}
      </div>
    </div>
  );
}
