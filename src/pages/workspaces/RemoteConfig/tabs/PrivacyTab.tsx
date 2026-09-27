import { useState } from 'react';
import { SectionBanner, FieldTooltip, MicroCopy } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import type { FieldError } from '../bounds';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Shield, Lock, EyeOff, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/observe';

interface PrivacyTabProps {
  privacy: SdkConfigState['privacy'];
  onChangeCapture: (key: keyof SdkConfigState['privacy']['capture'], value: boolean) => void;
  onChangePii: (key: keyof SdkConfigState['privacy']['piiDetection'], value: boolean) => void;
  onChangeScrubbing: (key: 'enabled' | 'headers' | 'fields', value: boolean | string[]) => void;
  errors: FieldError[];
}

const COMMON_HEADER_PRESETS = ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key', 'bearer'];
const COMMON_FIELD_PRESETS = ['password', 'secret', 'token', 'apiKey', 'creditCard', 'ssn', 'cvv'];

export function PrivacyTab({
  privacy,
  onChangeCapture,
  onChangePii,
  onChangeScrubbing,
  errors,
}: PrivacyTabProps) {
  const [newField, setNewField] = useState('');
  const [newHeader, setNewHeader] = useState('');

  const fieldsError = errors.find((e) => e.path === 'privacy.scrubbing.fields')?.message;
  const headersError = errors.find((e) => e.path === 'privacy.scrubbing.headers')?.message;

  const addField = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newField.trim().toLowerCase();
    if (val && !privacy.scrubbing.fields.includes(val)) {
      onChangeScrubbing('fields', [...privacy.scrubbing.fields, val]);
      setNewField('');
    }
  };

  const addHeader = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newHeader.trim().toLowerCase();
    if (val && !privacy.scrubbing.headers.includes(val)) {
      onChangeScrubbing('headers', [...privacy.scrubbing.headers, val]);
      setNewHeader('');
    }
  };

  const addFieldPreset = (field: string) => {
    if (!privacy.scrubbing.fields.includes(field)) {
      onChangeScrubbing('fields', [...privacy.scrubbing.fields, field]);
    }
  };

  const addHeaderPreset = (header: string) => {
    if (!privacy.scrubbing.headers.includes(header)) {
      onChangeScrubbing('headers', [...privacy.scrubbing.headers, header]);
    }
  };

  const removeField = (field: string) =>
    onChangeScrubbing('fields', privacy.scrubbing.fields.filter((f) => f !== field));

  const removeHeader = (header: string) =>
    onChangeScrubbing('headers', privacy.scrubbing.headers.filter((h) => h !== header));

  const piiSettings = [
    { key: 'maskEmails' as const, label: 'Mask Email Addresses', desc: 'Replaces detected email addresses with [EMAIL_REDACTED].' },
    { key: 'maskPhones' as const, label: 'Mask Phone Numbers', desc: 'Replaces international and domestic phone numbers with [PHONE_REDACTED].' },
    { key: 'maskIPs' as const, label: 'Mask Client IP Addresses', desc: 'Replaces IPv4 and IPv6 client addresses with [IP_REDACTED].' },
  ];

  const captureControls = [
    { key: 'headers' as const, label: 'HTTP Request Headers', desc: 'Capture header key-value pairs (filtered by scrubbing rules).' },
    { key: 'query' as const, label: 'URL Query Parameters', desc: 'Capture full URL query strings.' },
    { key: 'body' as const, label: 'HTTP Request Body', desc: 'Capture raw request body payloads (risk of secret leakage).' },
    { key: 'response' as const, label: 'HTTP Response Body', desc: 'Capture API response bodies.' },
    { key: 'cookies' as const, label: 'Cookie Headers', desc: 'Capture cookie values sent by browsers.' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <SectionBanner
        title="Privacy, Compliance & Data Scrubbing"
        definition="Zero-trust privacy enforcement executed at the SDK runtime boundary before telemetry packets leave your servers."
      >
        Redact sensitive identifiers, strip authorization headers, and block PII leakage.
      </SectionBanner>

      {/* Top Grid: PII Engine & Ingestion Capture */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* PII Masking Engine */}
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-[var(--green)]" />
              <h3 className="font-semibold text-[13.5px] text-[var(--text)]">PII Masking Engine</h3>
            </div>
            <Switch
              checked={privacy.piiDetection.enabled}
              onCheckedChange={(val) => onChangePii('enabled', val)}
              aria-label="Toggle PII Masking Engine"
            />
          </div>

          <div className={cn('flex flex-col gap-3 transition-opacity', !privacy.piiDetection.enabled && 'opacity-40 pointer-events-none')}>
            <p className="text-[12px] text-[var(--text3)]">
              Embedded client regex parses error messages, log lines, and breadcrumbs to redact personally identifiable data before transmission.
            </p>

            <div className="divide-y divide-[var(--border)]">
              {piiSettings.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2.5">
                  <div className="pr-2">
                    <span className="font-semibold text-[12.5px] text-[var(--text)]">{label}</span>
                    <p className="text-[11px] text-[var(--text3)]">{desc}</p>
                  </div>
                  <Switch
                    checked={privacy.piiDetection[key]}
                    onCheckedChange={(val) => onChangePii(key, val)}
                    aria-label={`Toggle ${label}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payload Field Capture */}
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <EyeOff className="size-4 text-[var(--amber)]" />
              <h3 className="font-semibold text-[13.5px] text-[var(--text)]">Telemetry Ingestion Capture</h3>
            </div>
            <span className="font-mono text-[10px] font-semibold text-[var(--text3)] uppercase">Selective</span>
          </div>

          <div className="flex flex-col gap-1 divide-y divide-[var(--border)]">
            {captureControls.map(({ key, label, desc }) => {
              const isActive = privacy.capture[key];
              const isHighRisk = key === 'body' || key === 'response';
              return (
                <div key={key} className="flex items-center justify-between py-2.5">
                  <div className="pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[12.5px] text-[var(--text)]">{label}</span>
                      {isHighRisk && isActive && (
                        <span className="rounded bg-[var(--red-bg)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--red)] border border-[var(--red)]/30">
                          High Risk
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text3)]">{desc}</p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(val) => onChangeCapture(key, val)}
                    aria-label={`Toggle capture of ${label}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Header Scrubbing & JSON Field Redaction */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Header Scrubbing */}
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-[var(--brand)]" />
              <h3 className="font-semibold text-[13.5px] text-[var(--text)]">Scrubbed HTTP Headers</h3>
            </div>
            <Switch
              checked={privacy.scrubbing.enabled}
              onCheckedChange={(val) => onChangeScrubbing('enabled', val)}
              aria-label="Toggle scrubbing"
            />
          </div>

          <div className={cn('flex flex-col gap-3', !privacy.scrubbing.enabled && 'opacity-40 pointer-events-none')}>
            <p className="text-[12px] text-[var(--text3)]">
              Any header matching these names will have its value scrubbed to <code className="text-[var(--brand)] font-mono text-[11px]">[FILTERED]</code>.
            </p>

            <form onSubmit={addHeader} className="flex gap-2">
              <input
                type="text"
                value={newHeader}
                onChange={(e) => setNewHeader(e.target.value)}
                placeholder="Add header name (e.g. x-custom-token)"
                className="h-8 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
              />
              <Button
                type="submit"
                variant="ghost"
                disabled={!newHeader.trim()}
                className="h-8 border border-[var(--border)] px-2.5 text-xs text-[var(--text)] hover:bg-[var(--bg3)]"
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </form>

            {headersError && <p className="text-[11px] font-semibold text-[var(--red)]">{headersError}</p>}

            {/* Current Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {privacy.scrubbing.headers.map((header) => (
                <span
                  key={header}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--text2)]"
                >
                  {header}
                  <button
                    type="button"
                    onClick={() => removeHeader(header)}
                    className="text-[var(--text3)] hover:text-[var(--red)] transition-colors"
                    aria-label={`Remove header ${header}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-[var(--border)]">
              <span className="eyebrow text-[10px] text-[var(--text3)]">Common Presets:</span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {COMMON_HEADER_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addHeaderPreset(preset)}
                    disabled={privacy.scrubbing.headers.includes(preset)}
                    className="rounded bg-[var(--bg2)] px-2 py-0.5 font-mono text-[10px] text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-40"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* JSON Field Redaction */}
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-[var(--brand)]" />
              <h3 className="font-semibold text-[13.5px] text-[var(--text)]">Redacted JSON Keys</h3>
            </div>
            <span className="font-mono text-[11px] text-[var(--text3)]">
              {privacy.scrubbing.fields.length} Keys Filtered
            </span>
          </div>

          <div className={cn('flex flex-col gap-3', !privacy.scrubbing.enabled && 'opacity-40 pointer-events-none')}>
            <p className="text-[12px] text-[var(--text3)]">
              Keys in request/response bodies or log objects recursively sanitized before dispatch.
            </p>

            <form onSubmit={addField} className="flex gap-2">
              <input
                type="text"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                placeholder="Add JSON key (e.g. ssn, creditCard)"
                className="h-8 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 font-mono text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
              />
              <Button
                type="submit"
                variant="ghost"
                disabled={!newField.trim()}
                className="h-8 border border-[var(--border)] px-2.5 text-xs text-[var(--text)] hover:bg-[var(--bg3)]"
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </form>

            {fieldsError && <p className="text-[11px] font-semibold text-[var(--red)]">{fieldsError}</p>}

            {/* Current Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {privacy.scrubbing.fields.map((field) => (
                <span
                  key={field}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--brand)]"
                >
                  {field}
                  <button
                    type="button"
                    onClick={() => removeField(field)}
                    className="text-[var(--text3)] hover:text-[var(--red)] transition-colors"
                    aria-label={`Remove field ${field}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-[var(--border)]">
              <span className="eyebrow text-[10px] text-[var(--text3)]">Common Presets:</span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {COMMON_FIELD_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addFieldPreset(preset)}
                    disabled={privacy.scrubbing.fields.includes(preset)}
                    className="rounded bg-[var(--bg2)] px-2 py-0.5 font-mono text-[10px] text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-40"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
