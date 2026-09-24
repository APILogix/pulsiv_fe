import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstrumentationTabProps {
  instrumentation: SdkConfigState['instrumentation'];
  onChange: (key: keyof SdkConfigState['instrumentation'], value: boolean) => void;
}

const INSTRUMENTS = [
  { key: 'http' as const, label: 'http (native)', desc: 'Node.js built-in http module', category: 'network', tooltip: 'Auto-generates spans for outgoing HTTP calls.' },
  { key: 'https' as const, label: 'https (native)', desc: 'Node.js built-in https module', category: 'network', tooltip: 'Same as http for TLS connections.' },
  { key: 'fetch' as const, label: 'fetch (global)', desc: 'Global fetch API', category: 'network', tooltip: 'Patches globalThis.fetch to trace outgoing requests.' },
  { key: 'express' as const, label: 'Express.js', desc: 'Express middleware & routes', category: 'web', tooltip: 'Traces incoming requests and route handlers.' },
  { key: 'fastify' as const, label: 'Fastify', desc: 'Fastify hooks & routes', category: 'web', tooltip: 'Uses onRequest/onResponse hooks to generate spans.' },
  { key: 'axios' as const, label: 'Axios Client', desc: 'Axios HTTP client', category: 'network', tooltip: 'Intercepts Axios HTTP requests.' },
  { key: 'redis' as const, label: 'Redis Cache', desc: 'ioredis / node-redis', category: 'database', tooltip: 'Traces Redis commands (GET, SET, etc).' },
  { key: 'bullmq' as const, label: 'BullMQ Queues', desc: 'BullMQ job queues', category: 'async', tooltip: 'Traces background job lifecycle.' },
  { key: 'prisma' as const, label: 'Prisma ORM', desc: 'Prisma ORM queries', category: 'database', tooltip: 'Traces Prisma database queries.' },
  { key: 'graphql' as const, label: 'GraphQL Server', desc: 'Apollo / graphql-js', category: 'web', tooltip: 'Traces resolver execution.' },
  { key: 'mongodb' as const, label: 'MongoDB Driver', desc: 'MongoDB driver operations', category: 'database', tooltip: 'Traces Mongo operations.' },
  { key: 'pg' as const, label: 'PostgreSQL (pg)', desc: 'node-postgres driver', category: 'database', tooltip: 'Traces raw Postgres SQL queries.' },
  { key: 'mysql2' as const, label: 'MySQL2 Driver', desc: 'MySQL driver', category: 'database', tooltip: 'Traces mysql2 SQL queries.' },
  { key: 'eventEmitterPatch' as const, label: 'EventEmitter', desc: 'Node.js EventEmitter context', category: 'async', tooltip: 'Propagates trace context across async events.' },
];

export function InstrumentationTab({ instrumentation, onChange }: InstrumentationTabProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <SectionBanner
        title="Auto-Instrumentation Library Integration"
        definition="The SDK automatically monkey-patches HTTP frameworks, database drivers, and ORMs at process startup to generate zero-code distributed tracing spans."
      >
        Manage auto-patching for Node.js modules, web frameworks, and database drivers.
      </SectionBanner>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2">
            <Radio className="size-4 text-[var(--brand)]" /> Supported Frameworks & Drivers
          </h3>
          <span className="text-[11px] font-mono text-[var(--text3)]">14 Auto-Patches</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSTRUMENTS.map(({ key, label, desc, tooltip }) => {
            const isActive = instrumentation[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border p-3.5 transition-all",
                  isActive
                    ? "border-[var(--brand)]/40 bg-[var(--bg2)]/80 shadow-xs"
                    : "border-[var(--border)] bg-[var(--bg2)]/30 opacity-70"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px] text-[var(--text)]">{label}</span>
                    <FieldTooltip definition={tooltip} />
                  </div>
                  <div className="text-[11px] text-[var(--text3)] truncate mt-0.5">{desc}</div>
                </div>
                <Switch checked={isActive} onCheckedChange={(val) => onChange(key, val)} className="shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
