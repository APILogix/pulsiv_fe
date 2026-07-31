import { SectionBanner, FieldTooltip, MicroCopy } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';

interface InstrumentationTabProps {
  instrumentation: SdkConfigState['instrumentation'];
  onChange: (key: keyof SdkConfigState['instrumentation'], value: boolean) => void;
}

const INSTRUMENTS = [
  { key: 'http' as const, label: 'http (native)', desc: 'Node.js built-in http module', tooltip: 'Wraps http.request/http.get to auto-generate spans for outgoing HTTP calls.' },
  { key: 'https' as const, label: 'https (native)', desc: 'Node.js built-in https module', tooltip: 'Same as http but for TLS connections.' },
  { key: 'fetch' as const, label: 'fetch', desc: 'Global fetch API', tooltip: 'Patches globalThis.fetch to trace outgoing requests.' },
  { key: 'express' as const, label: 'Express', desc: 'Express.js middleware & routes', tooltip: 'Adds middleware to trace incoming requests, route matching, and response timing.' },
  { key: 'fastify' as const, label: 'Fastify', desc: 'Fastify hooks & routes', tooltip: "Uses Fastify's onRequest/onResponse hooks to generate spans." },
  { key: 'axios' as const, label: 'Axios', desc: 'Axios HTTP client', tooltip: 'Intercepts Axios requests/responses. Redundant if http/https instrumentation is on.' },
  { key: 'redis' as const, label: 'Redis', desc: 'ioredis / node-redis', tooltip: 'Traces Redis commands (GET, SET, HGETALL, etc.) with command name and key.' },
  { key: 'bullmq' as const, label: 'BullMQ', desc: 'BullMQ job queues', tooltip: 'Traces job add, process, complete, and fail lifecycle events.' },
  { key: 'prisma' as const, label: 'Prisma', desc: 'Prisma ORM', tooltip: 'Traces Prisma queries with model name and operation type. Does NOT capture query parameters.' },
  { key: 'graphql' as const, label: 'GraphQL', desc: 'Apollo / graphql-js', tooltip: 'Traces resolver execution with field path and parent type.' },
  { key: 'mongodb' as const, label: 'MongoDB', desc: 'MongoDB driver', tooltip: 'Traces MongoDB operations (find, insert, update) with collection name.' },
  { key: 'pg' as const, label: 'pg', desc: 'node-postgres', tooltip: 'Traces raw node-postgres queries with statement text (parameters scrubbed).' },
  { key: 'mysql2' as const, label: 'mysql2', desc: 'MySQL driver', tooltip: 'Traces mysql2 queries with statement text (parameters scrubbed).' },
  { key: 'eventEmitterPatch' as const, label: 'EventEmitter Patch', desc: 'Node.js EventEmitter', tooltip: 'Patches EventEmitter to propagate trace context across emit/on boundaries.' },
];

export function InstrumentationTab({ instrumentation, onChange }: InstrumentationTabProps) {
  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Auto-Instrumentation"
        definition="The SDK can monkey-patch common libraries and frameworks at runtime to automatically generate trace spans without manual code changes. Disabling these is useful if a patch conflicts with another APM tool."
      >
        Control which libraries are automatically wrapped to generate distributed tracing spans.
      </SectionBanner>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text)]">Library Patching</h3>
        </div>
        <div className="divide-y divide-[var(--border)] px-5">
          {INSTRUMENTS.map(({ key, label, desc, tooltip }) => {
            const isActive = instrumentation[key];
            return (
              <div key={key} className="flex items-center justify-between py-4">
                <div className="pr-4">
                  <div className="flex items-center">
                    <span className="font-medium text-[var(--text)]">{label}</span>
                    <FieldTooltip definition={tooltip} />
                  </div>
                  <MicroCopy active={isActive}>{desc}</MicroCopy>
                </div>
                <Switch checked={isActive} onCheckedChange={(val) => onChange(key, val)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
