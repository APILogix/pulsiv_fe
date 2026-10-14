import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Panel, Pill, RowStack, Toggle, fieldMonoClass } from '@/shared/ui/pulse';
import { Button as UiButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { SectionBanner } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import type { FieldError } from '../bounds';

interface PrivacyTabProps {
  privacy: SdkConfigState['privacy'];
  onChangeCapture: (key: keyof SdkConfigState['privacy']['capture'], value: boolean) => void;
  onChangePii: (key: keyof SdkConfigState['privacy']['piiDetection'], value: boolean) => void;
  onChangeScrubbing: (key: 'enabled' | 'headers' | 'fields', value: boolean | string[]) => void;
  errors: FieldError[];
}

const COMMON_HEADER_PRESETS = ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key', 'bearer'];
const COMMON_FIELD_PRESETS = ['password', 'secret', 'token', 'apiKey', 'creditCard', 'ssn', 'cvv'];

const PII_SETTINGS = [
  { key: 'maskEmails' as const, label: 'Mask email addresses', desc: 'Replaces detected email addresses with', token: '[EMAIL_REDACTED]' },
  { key: 'maskPhones' as const, label: 'Mask phone numbers', desc: 'Replaces international and domestic phone numbers with', token: '[PHONE_REDACTED]' },
  { key: 'maskIPs' as const, label: 'Mask client IP addresses', desc: 'Replaces IPv4 and IPv6 client addresses with', token: '[IP_REDACTED]' },
];

const CAPTURE_CONTROLS = [
  { key: 'headers' as const, label: 'Request headers', desc: 'Header names and values, filtered by the scrubbing rules below.', risky: false },
  { key: 'query' as const, label: 'Query parameters', desc: 'Full URL query strings.', risky: false },
  { key: 'body' as const, label: 'Request body', desc: 'Raw request payloads. These can contain secrets.', risky: true },
  { key: 'response' as const, label: 'Response body', desc: 'API response payloads.', risky: true },
  { key: 'cookies' as const, label: 'Cookies', desc: 'Cookie values sent by browsers.', risky: false },
];

/** Divided row: copy on the left, one switch on the right. */
function SwitchRow({
  label,
  description,
  badge,
  checked,
  onChange,
  toggleLabel,
}: {
  label: string;
  description: React.ReactNode;
  badge?: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  toggleLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--text)]">{label}</span>
          {badge}
        </div>
        <p className="mt-0.5 max-w-[68ch] text-[12px] leading-[1.5] text-[var(--text2)]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={toggleLabel} />
    </div>
  );
}

/** Add, list, and remove scrub patterns, with one-click suggestions. */
function PatternListEditor({
  title,
  description,
  placeholder,
  noun,
  items,
  presets,
  error,
  onChange,
}: {
  title: string;
  description: string;
  placeholder: string;
  /** Singular name used in labels, e.g. "header". */
  noun: string;
  items: string[];
  presets: string[];
  error?: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const inputId = useId();
  const noteId = `${inputId}-note`;
  const suggestions = presets.filter((preset) => !items.includes(preset));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = draft.trim().toLowerCase();
    if (!value) return;
    if (items.includes(value)) {
      setDuplicate(true);
      return;
    }
    onChange([...items, value]);
    setDraft('');
  };

  const note = error ?? (duplicate ? `That ${noun} is already in the list.` : undefined);

  return (
    <div className="flex min-w-0 flex-col gap-3 px-5 py-4">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[13px] font-medium text-[var(--text)]">{title}</h3>
          <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">{items.length}</span>
        </div>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">{description}</p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Add {noun}
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setDuplicate(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={note ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={cn(fieldMonoClass, 'min-w-0 flex-1')}
        />
        <UiButton type="submit" variant="outline" size="sm" className="h-9" disabled={!draft.trim()}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add
        </UiButton>
      </form>

      {note && (
        <p id={noteId} role={error ? 'alert' : 'status'} className={cn('text-[12px] leading-[1.5]', error ? 'text-[var(--red)]' : 'text-[var(--text3)]')}>
          {note}
        </p>
      )}

      {items.length > 0 ? (
        <ul aria-label={title} className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-0.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg2)] py-0.5 pl-2 pr-0.5 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((current) => current !== item))}
                aria-label={`Remove ${noun} ${item}`}
                className="inline-flex size-5 items-center justify-center rounded-[3px] text-[var(--text3)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-[var(--text3)]">Nothing scrubbed yet.</p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
          <span className="mr-1 text-[12px] text-[var(--text3)]">Suggestions</span>
          {suggestions.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange([...items, preset])}
              aria-label={`Add ${noun} ${preset}`}
              className="inline-flex items-center gap-1 rounded-[4px] border border-dashed border-[var(--border)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)] transition-colors hover:border-[var(--border2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
            >
              <Plus className="size-3" aria-hidden="true" />
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PrivacyTab({ privacy, onChangeCapture, onChangePii, onChangeScrubbing, errors }: PrivacyTabProps) {
  const fieldsError = errors.find((e) => e.path === 'privacy.scrubbing.fields')?.message;
  const headersError = errors.find((e) => e.path === 'privacy.scrubbing.headers')?.message;
  const piiEnabled = privacy.piiDetection.enabled;
  const scrubbingEnabled = privacy.scrubbing.enabled;

  return (
    <div className="flex flex-col gap-6">
      <SectionBanner
        title="Privacy and scrubbing"
        definition="Privacy rules run inside the SDK, before telemetry leaves your servers."
      >
        Redact personal data, strip credentials from headers, and choose what request data is captured.
      </SectionBanner>

      <Panel
        title="PII masking"
        description="Client-side patterns redact personal data in error messages, log lines, and breadcrumbs before sending."
        actions={
          <Toggle checked={piiEnabled} onChange={(next) => onChangePii('enabled', next)} label="Mask personal data" />
        }
        bodyClassName="p-0"
      >
        <fieldset disabled={!piiEnabled} className="m-0 min-w-0 border-0 p-0 transition-opacity duration-150 disabled:opacity-60">
          <legend className="sr-only">Masking rules</legend>
          <RowStack>
            {PII_SETTINGS.map(({ key, label, desc, token }) => (
              <SwitchRow
                key={key}
                label={label}
                description={
                  <>
                    {desc} <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text)]">{token}</code>.
                  </>
                }
                checked={privacy.piiDetection[key]}
                onChange={(next) => onChangePii(key, next)}
                toggleLabel={label}
              />
            ))}
          </RowStack>
        </fieldset>
      </Panel>

      <Panel
        title="Request capture"
        description="What the SDK records from each HTTP exchange."
        bodyClassName="p-0"
      >
        <RowStack>
          {CAPTURE_CONTROLS.map(({ key, label, desc, risky }) => {
            const isActive = privacy.capture[key];
            return (
              <SwitchRow
                key={key}
                label={label}
                description={desc}
                badge={risky && isActive ? <Pill tone="amber">High risk</Pill> : undefined}
                checked={isActive}
                onChange={(next) => onChangeCapture(key, next)}
                toggleLabel={`Capture ${label.toLowerCase()}`}
              />
            );
          })}
        </RowStack>
      </Panel>

      <Panel
        title="Scrubbing"
        description="Matching header values are replaced with [FILTERED]. Matching keys in bodies and log objects are sanitized recursively."
        actions={
          <Toggle
            checked={scrubbingEnabled}
            onChange={(next) => onChangeScrubbing('enabled', next)}
            label="Scrub headers and JSON keys"
          />
        }
        bodyClassName="p-0"
      >
        <fieldset
          disabled={!scrubbingEnabled}
          className="m-0 grid min-w-0 border-0 p-0 transition-opacity duration-150 disabled:opacity-60 md:grid-cols-2 md:divide-x md:divide-[var(--border)] max-md:divide-y max-md:divide-[var(--border)]"
        >
          <legend className="sr-only">Scrub patterns</legend>
          <PatternListEditor
            title="Headers"
            description="Header names whose values are scrubbed."
            placeholder="x-custom-token"
            noun="header"
            items={privacy.scrubbing.headers}
            presets={COMMON_HEADER_PRESETS}
            error={headersError}
            onChange={(next) => onChangeScrubbing('headers', next)}
          />
          <PatternListEditor
            title="JSON keys"
            description="Keys in request and response bodies and in log objects."
            placeholder="ssn"
            noun="key"
            items={privacy.scrubbing.fields}
            presets={COMMON_FIELD_PRESETS}
            error={fieldsError}
            onChange={(next) => onChangeScrubbing('fields', next)}
          />
        </fieldset>
      </Panel>
    </div>
  );
}
