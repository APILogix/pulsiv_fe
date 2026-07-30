import { SectionBanner } from '../components/HelpSystem';
import { Lock } from 'lucide-react';

export function LimitsTab() {
  const securityLimits = [
    { key: 'maxPayloadSize', label: 'Max Payload Size', value: '1.0 MB', note: 'Prevents memory-exhaustion attacks on ingestion. A larger payload × full queue = OOM.' },
    { key: 'maxAttributeLength', label: 'Max Attribute Length', value: '4,096 chars', note: 'Prevents log injection and stored XSS in dashboards.' },
    { key: 'maxCpuOverheadPercent', label: 'Max CPU Overhead', value: '5%', note: 'Hard ceiling on SDK CPU usage. Protects your application\'s performance SLA.' },
  ];

  const adminLimits = [
    { key: 'maxMemoryMb', label: 'Max Memory', value: '256 MB', note: 'Adjustable up to 512 MB with org-admin approval.' },
    { key: 'maxQueueSize', label: 'Max Queue Size', value: '10,000', note: 'Adjustable up to 25,000 for high-throughput orgs.' },
    { key: 'maxSpansPerTrace', label: 'Max Spans / Trace', value: '2,000', note: 'Adjustable up to 5,000 for complex microservice graphs.' },
    { key: 'maxSpanAttributes', label: 'Max Span Attributes', value: '128', note: 'Adjustable up to 256.' },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Platform Limits"
        type="warning"
      >
        These limits are platform-enforced safety boundaries. They protect your application from resource exhaustion and protect the ingestion pipeline from abuse. They cannot be modified from this panel. Contact your organization admin to request changes.
      </SectionBanner>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Security Boundaries */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h3 className="font-semibold text-[var(--text)]">Security Boundaries</h3>
            <span className="text-[12px] text-[var(--text3)]">(Never editable)</span>
          </div>
          <div className="flex flex-col gap-3">
            {securityLimits.map((limit) => (
              <div key={limit.key} className="flex flex-col justify-between overflow-hidden rounded-[12px] border border-[var(--border)] border-l-[4px] border-l-red-500 bg-[var(--bg1)] p-4 shadow-sm">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                  {limit.label}
                </div>
                <div className="mb-3 font-mono text-[24px] font-bold text-[var(--text)]">
                  {limit.value}
                </div>
                <div className="flex items-start gap-1.5 text-[12px] text-red-500/80">
                  <Lock className="mt-0.5 size-3 shrink-0" />
                  <span className="leading-relaxed">{limit.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Org-Admin Adjustable */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h3 className="font-semibold text-[var(--text)]">Organization Limits</h3>
            <span className="text-[12px] text-[var(--text3)]">(Requires admin approval)</span>
          </div>
          <div className="flex flex-col gap-3">
            {adminLimits.map((limit) => (
              <div key={limit.key} className="flex flex-col justify-between overflow-hidden rounded-[12px] border border-[var(--border)] border-l-[4px] border-l-amber-500 bg-[var(--bg1)] p-4 shadow-sm">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                  {limit.label}
                </div>
                <div className="mb-3 font-mono text-[24px] font-bold text-[var(--text)]">
                  {limit.value}
                </div>
                <div className="flex items-start gap-1.5 text-[12px] text-amber-500/80">
                  <Lock className="mt-0.5 size-3 shrink-0" />
                  <span className="leading-relaxed">{limit.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
