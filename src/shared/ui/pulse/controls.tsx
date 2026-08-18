import { useId, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Field shells ─────────────────────────────────────────────

export const fieldInputClass =
  "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-55";

export const fieldTextareaClass =
  "min-h-[96px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-3 text-[13px] leading-[1.5] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-55";

export const fieldMonoClass = `${fieldInputClass} font-[family-name:var(--mono)] text-[12px]`;

// ── Segmented control ────────────────────────────────────────

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg2)] p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]",
              active
                ? "bg-[var(--brand-bg)] text-[var(--brand)]"
                : "text-[var(--text3)] hover:text-[var(--text2)]"
            )}
          >
            {option.icon && <option.icon className="size-3.5" aria-hidden="true" />}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-mono text-[10px] font-medium tabular-nums",
                  active ? "bg-[var(--brand-bg)] text-[var(--brand)]" : "bg-[var(--bg3)] text-[var(--text3)]"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Password input ───────────────────────────────────────────
// Uncontrolled by default so it plays nicely with react-hook-form + form actions.

export function PasswordInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(fieldInputClass, "h-10 pr-11", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] transition-colors hover:text-[var(--text2)]"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}

// ── Password strength meter ──────────────────────────────────

const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Strong", "Excellent"] as const;
const STRENGTH_COLOR = ["var(--bg3)", "var(--red)", "var(--amber)", "var(--green)", "var(--green)"] as const;

export function scorePassword(value: string): number {
  if (value.length === 0) return 0;
  let score = 1;
  if (value.length >= 8) score += 1;
  if (/[0-9]/.test(value) && /[a-z]/i.test(value)) score += 1;
  if (value.length >= 12 && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(4, score);
}

export function PasswordStrength({ value }: { value: string }) {
  const score = scorePassword(value);
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: score >= step ? STRENGTH_COLOR[score] : "var(--bg3)" }}
          />
        ))}
      </div>
      {value.length > 0 && (
        <span className="font-mono text-[10px] font-medium tabular-nums" style={{ color: STRENGTH_COLOR[score] }}>
          {STRENGTH_LABEL[score]}
        </span>
      )}
    </div>
  );
}

// ── One-time code input ──────────────────────────────────────
// Single hidden-ish input with letter-spacing beats N inputs for paste + a11y.

export function CodeInput({
  length = 6,
  name,
  onComplete,
  autoFocus,
  disabled,
  className,
  inputMode = "numeric",
}: {
  length?: number;
  name: string;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  inputMode?: "numeric" | "text";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned =
      inputMode === "numeric"
        ? event.target.value.replace(/\D/g, "").slice(0, length)
        : event.target.value.replace(/\s/g, "").slice(0, length);
    event.target.value = cleaned;
    if (cleaned.length === length) onComplete?.(cleaned);
  };

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type="text"
      inputMode={inputMode}
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      disabled={disabled}
      maxLength={length}
      onChange={handleChange}
      aria-label={`${length}-character verification code`}
      className={cn(
        "h-14 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)] text-center font-[family-name:var(--mono)] text-[24px] font-medium tracking-[0.5em] text-[var(--text)] outline-none transition-colors placeholder:tracking-[0.5em] placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)] disabled:opacity-55",
        className
      )}
      placeholder={"•".repeat(length)}
    />
  );
}

// ── Copy-to-clipboard field ──────────────────────────────────

export function SecretField({
  value,
  label,
  masked = false,
  className,
}: {
  value: string;
  label?: string;
  masked?: boolean;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(!masked);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const display = revealed ? value : "•".repeat(Math.min(28, Math.max(12, value.length)));

  return (
    <div className={cn("flex min-w-0 max-w-full w-full flex-col gap-1.5", className)}>
      {label && <span className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{label}</span>}
      <div className="flex min-w-0 max-w-full w-full items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] pl-3 pr-1.5 py-1.5">
        <code className="min-w-0 flex-1 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)] select-all" title={revealed ? value : undefined}>
          {display}
        </code>
        {masked && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide value" : "Reveal value"}
            className="shrink-0 rounded-[var(--radius)] p-1.5 text-[var(--text3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)]"
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-[var(--radius)] px-2 py-1 text-[11px] font-medium text-[var(--text2)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
