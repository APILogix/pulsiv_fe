import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Live checklist that mirrors StrongPasswordSchema exactly (auth.schema.ts).
 * It replaces the generic strength meter on auth pages: a meter can say
 * "Strong" for a password the server will still reject; this list cannot.
 */
const RULES: { id: string; label: string; test: (value: string) => boolean }[] = [
  { id: 'length', label: '8 or more characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /[0-9]/.test(v) },
  { id: 'symbol', label: 'A symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function PasswordRequirements({ value, id }: { value: string; id?: string }) {
  const met = RULES.filter((rule) => rule.test(value)).length;
  return (
    <div id={id}>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2" aria-label="Password requirements">
        {RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.id}
              className={cn(
                'flex items-center gap-2 text-[12px] transition-colors duration-150',
                ok ? 'text-[var(--text)]' : 'text-[var(--text3)]'
              )}
            >
              <span
                className={cn(
                  'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150',
                  ok ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]' : 'border-[var(--border2)]'
                )}
                aria-hidden="true"
              >
                {ok && <Check className="size-2.5" strokeWidth={3} />}
              </span>
              {rule.label}
              <span className="sr-only">{ok ? '(met)' : '(not yet met)'}</span>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {met} of {RULES.length} password requirements met.
      </p>
    </div>
  );
}
