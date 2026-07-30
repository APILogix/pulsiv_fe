import { useState } from 'react';
import { SectionBanner, FieldTooltip, MicroCopy } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputClass = "w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50";

interface PrivacyTabProps {
  privacy: SdkConfigState['privacy'];
  onChange: (key: keyof SdkConfigState['privacy'], value: any) => void;
}

export function PrivacyTab({ privacy, onChange }: PrivacyTabProps) {
  const [newField, setNewField] = useState('');
  const [newHeader, setNewHeader] = useState('');

  const addField = (e: React.FormEvent) => {
    e.preventDefault();
    if (newField.trim() && !privacy.scrubFields.includes(newField.trim())) {
      onChange('scrubFields', [...privacy.scrubFields, newField.trim()]);
      setNewField('');
    }
  };

  const addHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHeader.trim() && !privacy.scrubHeaders.includes(newHeader.trim())) {
      onChange('scrubHeaders', [...privacy.scrubHeaders, newHeader.trim()]);
      setNewHeader('');
    }
  };

  const removeField = (field: string) => {
    onChange('scrubFields', privacy.scrubFields.filter((f) => f !== field));
  };

  const removeHeader = (header: string) => {
    onChange('scrubHeaders', privacy.scrubHeaders.filter((h) => h !== header));
  };

  const piiSettings = [
    { key: 'maskEmails' as const, label: 'Mask Email Addresses', tooltip: 'Replaces detected email addresses with [EMAIL_REDACTED] before data leaves your process.' },
    { key: 'maskCreditCards' as const, label: 'Mask Credit Card Numbers', tooltip: 'Detects 13–19 digit card numbers (Visa, MC, Amex patterns) and replaces with [CARD_REDACTED].' },
    { key: 'maskPhoneNumbers' as const, label: 'Mask Phone Numbers', tooltip: 'Detects phone number patterns (international formats) and replaces with [PHONE_REDACTED].' },
  ];

  const captureControls = [
    { key: 'body' as const, label: 'Request Body', tooltip: 'Capture the full HTTP request body. HIGH RISK: may contain passwords, tokens, PII. Only enable in staging/debugging.' },
    { key: 'query' as const, label: 'Query Parameters', tooltip: 'Capture URL query strings. May contain API keys or session tokens passed as params.' },
    { key: 'cookies' as const, label: 'Cookies', tooltip: 'Capture cookie headers. Contains session identifiers and auth tokens.' },
    { key: 'headers' as const, label: 'Request Headers', tooltip: 'Capture all request headers. Authorization headers are scrubbed separately, but other sensitive headers may leak.' },
    { key: 'response' as const, label: 'Response Body', tooltip: 'Capture the full HTTP response body. May contain user data, tokens, or internal error details.' },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Privacy & Data Scrubbing"
        type="warning"
      >
        Privacy settings control how personally identifiable information (PII) is handled. Disabling masking may violate GDPR, SOC 2, or HIPAA requirements. Changes are audit-logged.
      </SectionBanner>

      <div className="grid gap-6 md:grid-cols-2">
        {/* PII Masking */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold text-[var(--text)]">PII Masking Engine</h3>
            <Switch
              checked={privacy.enabled}
              onCheckedChange={(val) => onChange('enabled', val)}
            />
          </div>
          <div className={cn("px-5 py-2 transition-opacity", !privacy.enabled && "opacity-50 pointer-events-none")}>
            <p className="mb-4 text-[13px] text-[var(--text2)]">
              When enabled, the SDK runs a local regular expression engine to detect and redact patterns before egress.
            </p>
            <div className="divide-y divide-[var(--border)]">
              {piiSettings.map(({ key, label, tooltip }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div className="flex items-center">
                    <span className="text-[13.5px] font-medium text-[var(--text)]">{label}</span>
                    <FieldTooltip definition={tooltip} />
                  </div>
                  <Switch
                    checked={privacy[key]}
                    onCheckedChange={(val) => onChange(key, val)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capture Controls */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold text-[var(--text)]">Capture Controls</h3>
          </div>
          <div className="divide-y divide-[var(--border)] px-5">
            {captureControls.map(({ key, label, tooltip }) => {
              const isActive = privacy[key];
              return (
                <div key={key} className="flex items-start justify-between py-3">
                  <div className="pr-4">
                    <div className="flex items-center">
                      <span className="text-[13.5px] font-medium text-[var(--text)]">{label}</span>
                      <FieldTooltip definition={tooltip} />
                    </div>
                    <MicroCopy active={isActive}>
                      {isActive ? '⚠️ May contain sensitive data' : 'Currently disabled — safe'}
                    </MicroCopy>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(val) => onChange(key, val)}
                    className="mt-1"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrubbing - Fields */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4 flex items-center">
            <h3 className="font-semibold text-[var(--text)]">Scrubbing — JSON Fields</h3>
            <FieldTooltip definition="JSON body field names that are recursively stripped from any captured payload before it is sent to Pulse. Matching is case-insensitive and applies to nested objects." />
          </div>
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {privacy.scrubFields.map((field) => (
                <span key={field} className="flex items-center gap-1.5 rounded-full bg-[var(--bg3)] px-2.5 py-1 text-[12px] font-mono text-[var(--text)]">
                  {field}
                  <button type="button" onClick={() => removeField(field)} className="text-[var(--text3)] hover:text-[var(--text)]">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={addField} className="flex items-center gap-2">
              <input
                type="text"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                placeholder="e.g. password, token"
                className={inputClass}
              />
              <button type="submit" disabled={!newField.trim()} className="flex h-[32px] shrink-0 items-center justify-center rounded-md bg-[var(--bg3)] px-3 text-[13px] font-medium transition-colors hover:bg-[var(--bg3-hover)] disabled:opacity-50">
                <Plus className="mr-1 size-3.5" />
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Scrubbing - Headers */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4 flex items-center">
            <h3 className="font-semibold text-[var(--text)]">Scrubbing — HTTP Headers</h3>
            <FieldTooltip definition="HTTP header names that are removed from captured request/response metadata. Values are replaced with [REDACTED]." />
          </div>
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {privacy.scrubHeaders.map((header) => (
                <span key={header} className="flex items-center gap-1.5 rounded-full bg-[var(--bg3)] px-2.5 py-1 text-[12px] font-mono text-[var(--text)]">
                  {header}
                  <button type="button" onClick={() => removeHeader(header)} className="text-[var(--text3)] hover:text-[var(--text)]">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={addHeader} className="flex items-center gap-2">
              <input
                type="text"
                value={newHeader}
                onChange={(e) => setNewHeader(e.target.value)}
                placeholder="e.g. authorization, x-api-key"
                className={inputClass}
              />
              <button type="submit" disabled={!newHeader.trim()} className="flex h-[32px] shrink-0 items-center justify-center rounded-md bg-[var(--bg3)] px-3 text-[13px] font-medium transition-colors hover:bg-[var(--bg3-hover)] disabled:opacity-50">
                <Plus className="mr-1 size-3.5" />
                Add
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
