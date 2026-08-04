import { useState } from 'react';
import { SectionBanner, FieldTooltip, MicroCopy } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import type { FieldError } from '../bounds';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Shield, Lock, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] font-mono';

interface PrivacyTabProps {
  privacy: SdkConfigState['privacy'];
  onChangeCapture: (key: keyof SdkConfigState['privacy']['capture'], value: boolean) => void;
  onChangePii: (key: keyof SdkConfigState['privacy']['piiDetection'], value: boolean) => void;
  onChangeScrubbing: (key: 'enabled' | 'headers' | 'fields', value: boolean | string[]) => void;
  errors: FieldError[];
}

export function PrivacyTab({ privacy, onChangeCapture, onChangePii, onChangeScrubbing, errors }: PrivacyTabProps) {
  const [newField, setNewField] = useState('');
  const [newHeader, setNewHeader] = useState('');

  const fieldsError = errors.find((e) => e.path === 'privacy.scrubbing.fields')?.message;
  const headersError = errors.find((e) => e.path === 'privacy.scrubbing.headers')?.message;

  const addField = (e: React.FormEvent) => {
    e.preventDefault();
    if (newField.trim() && !privacy.scrubbing.fields.includes(newField.trim())) {
      onChangeScrubbing('fields', [...privacy.scrubbing.fields, newField.trim()]);
      setNewField('');
    }
  };

  const addHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHeader.trim() && !privacy.scrubbing.headers.includes(newHeader.trim())) {
      onChangeScrubbing('headers', [...privacy.scrubbing.headers, newHeader.trim()]);
      setNewHeader('');
    }
  };

  const removeField = (field: string) => onChangeScrubbing('fields', privacy.scrubbing.fields.filter((f) => f !== field));
  const removeHeader = (header: string) => onChangeScrubbing('headers', privacy.scrubbing.headers.filter((h) => h !== header));

  const piiSettings = [
    { key: 'maskEmails' as const, label: 'Mask Email Addresses', tooltip: 'Replaces email addresses with [EMAIL_REDACTED].' },
    { key: 'maskPhones' as const, label: 'Mask Phone Numbers', tooltip: 'Replaces phone numbers with [PHONE_REDACTED].' },
    { key: 'maskIPs' as const, label: 'Mask IP Addresses', tooltip: 'Replaces IPv4/IPv6 addresses with [IP_REDACTED].' },
  ];

  const captureControls = [
    { key: 'body' as const, label: 'Request Body', tooltip: 'Capture full HTTP request body.' },
    { key: 'query' as const, label: 'Query Parameters', tooltip: 'Capture URL query strings.' },
    { key: 'cookies' as const, label: 'Cookies', tooltip: 'Capture cookie headers.' },
    { key: 'headers' as const, label: 'Request Headers', tooltip: 'Capture HTTP request headers.' },
    { key: 'response' as const, label: 'Response Body', tooltip: 'Capture full HTTP response body.' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <SectionBanner title="Data Privacy & Compliance Controls" type="warning">
        Zero-trust data privacy rules enforced at the SDK edge. Redact PII patterns, scrub sensitive JSON keys, and filter auth headers before data leaves your process.
      </SectionBanner>

      <div className="grid gap-6 md:grid-cols-2">
        {/* PII Detection Engine */}
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2">
              <Shield className="size-4 text-emerald-400" /> PII Masking Engine
            </h3>
            <Switch checked={privacy.piiDetection.enabled} onCheckedChange={(val) => onChangePii('enabled', val)} />
          </div>
          <div className={cn('flex flex-col gap-3 transition-opacity', !privacy.piiDetection.enabled && 'opacity-50 pointer-events-none')}>
            <p className="text-[12px] text-[var(--text3)]">
              Local regex engine automatically redacts identified PII strings before egress.
            </p>
            <div className="divide-y divide-[var(--border)]">
              {piiSettings.map(({ key, label, tooltip }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[var(--text)]">{label}</span>
                    <FieldTooltip definition={tooltip} />
                  </div>
                  <Switch checked={privacy.piiDetection[key]} onCheckedChange={(val) => onChangePii(key, val)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payload Field Capture */}
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <EyeOff className="size-4 text-amber-400" /> Payload Data Capture
          </h3>
          <div className="divide-y divide-[var(--border)]">
            {captureControls.map(({ key, label, tooltip }) => {
              const isActive = privacy.capture[key];
              return (
                <div key={key} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-[var(--text)]">{label}</span>
                      <FieldTooltip definition={tooltip} />
                    </div>
                    <MicroCopy active={isActive}>
                      {isActive ? '⚠️ High Risk Payload' : 'Disabled (Safe)'}
                    </MicroCopy>
                  </div>
                  <Switch checked={isActive} onCheckedChange={(val) => onChangeCapture(key, val)} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrubbing - JSON Fields */}
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2">
              <Lock className="size-4 text-indigo-400" /> Redacted JSON Fields
            </h3>
            <Switch checked={privacy.scrubbing.enabled} onCheckedChange={(val) => onChangeScrubbing('enabled', val)} />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {privacy.scrubbing.fields.map((field) => (
                <span key={field} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg2)] px-2.5 py-1 text-[11px] font-mono font-bold text-[var(--brand)] border border-[var(--border)]">
                  {field}
                  <button type="button" onClick={() => removeField(field)} className="text-[var(--text3)] hover:text-red-400">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={addField} className="flex items-center gap-2">
              <input type="text" value={newField} onChange={(e) => setNewField(e.target.value)} placeholder="e.g. password, creditCard" className={inputClass} />
              <button type="submit" disabled={!newField.trim()} className="flex h-[32px] shrink-0 items-center justify-center rounded-lg bg-[var(--bg2)] px-3 text-[12px] font-bold border border-[var(--border)] hover:bg-[var(--bg3)] disabled:opacity-50">
                <Plus className="mr-1 size-3.5" /> Add Key
              </button>
            </form>
            {fieldsError && <p className="text-[11px] text-red-400 font-semibold">{fieldsError}</p>}
          </div>
        </div>

        {/* Scrubbing - Headers */}
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
          <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Lock className="size-4 text-sky-400" /> Redacted HTTP Headers
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {privacy.scrubbing.headers.map((header) => (
                <span key={header} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg2)] px-2.5 py-1 text-[11px] font-mono font-bold text-sky-400 border border-[var(--border)]">
                  {header}
                  <button type="button" onClick={() => removeHeader(header)} className="text-[var(--text3)] hover:text-red-400">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={addHeader} className="flex items-center gap-2">
              <input type="text" value={newHeader} onChange={(e) => setNewHeader(e.target.value)} placeholder="e.g. x-api-key, authorization" className={inputClass} />
              <button type="submit" disabled={!newHeader.trim()} className="flex h-[32px] shrink-0 items-center justify-center rounded-lg bg-[var(--bg2)] px-3 text-[12px] font-bold border border-[var(--border)] hover:bg-[var(--bg3)] disabled:opacity-50">
                <Plus className="mr-1 size-3.5" /> Add Header
              </button>
            </form>
            {headersError && <p className="text-[11px] text-red-400 font-semibold">{headersError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
